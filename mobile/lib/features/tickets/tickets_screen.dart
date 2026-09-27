import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_exception.dart';
import '../../core/config/jso_theme.dart';
import '../../data/models/match.dart';
import '../../data/models/ticket_type.dart';
import '../../data/repositories/tickets_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../auth/auth_controller.dart';
import '../auth/login_screen.dart';

/// Billetterie for a single match: lists the active ticket types
/// (`GET /api/tickets/match/{matchId}`) with remaining availability, and lets
/// a signed-in fan reserve a quantity (`POST /api/tickets/reserve`).
///
/// Reserving follows the manual gateway: it creates a `Pending` order that an
/// admin confirms later, so the UI just confirms the reservation was recorded
/// and points the fan to "Mes billets". Anonymous fans see a call to log in.
class TicketsScreen extends StatefulWidget {
  const TicketsScreen({super.key, required this.match});

  final Match match;

  @override
  State<TicketsScreen> createState() => _TicketsScreenState();
}

class _TicketsScreenState extends State<TicketsScreen> {
  late Future<List<TicketType>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = context.read<TicketsRepository>().getForMatch(widget.match.id);
  }

  Future<void> _reserve(TicketType type) async {
    final auth = context.read<AuthController>();
    final token = auth.accessToken;
    if (token == null) {
      _promptLogin();
      return;
    }

    final quantity = await showModalBottomSheet<int>(
      context: context,
      backgroundColor: JsoColors.navy2,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(JsoRadius.hero),
        ),
      ),
      builder: (_) => _ReserveSheet(type: type),
    );
    if (quantity == null || !mounted) return;

    final repo = context.read<TicketsRepository>();
    final messenger = ScaffoldMessenger.of(context);
    try {
      final order = await repo.reserve(
        token: token,
        ticketTypeId: type.id,
        quantity: quantity,
      );
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: JsoColors.navy3,
          content: Text(
            'Réservation enregistrée · ${order.quantity} × ${order.ticketTypeName}. '
            'En attente de confirmation.',
            style: const TextStyle(color: JsoColors.white),
          ),
        ),
      );
      setState(_load);
    } on ApiException catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: JsoColors.navy3,
          content: Text(
            e.message,
            style: const TextStyle(color: JsoColors.white),
          ),
        ),
      );
    }
  }

  void _promptLogin() {
    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      SnackBar(
        backgroundColor: JsoColors.navy3,
        content: const Text(
          'Connectez-vous pour réserver vos billets.',
          style: TextStyle(color: JsoColors.white),
        ),
        action: SnackBarAction(
          label: 'Se connecter',
          textColor: JsoColors.gold,
          onPressed: () => Navigator.of(
            context,
          ).push(MaterialPageRoute<void>(builder: (_) => const LoginScreen())),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Billetterie')),
      body: FutureBuilder<List<TicketType>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Chargement des billets…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Impossible de charger la billetterie.',
              onRetry: () => setState(_load),
            );
          }

          final types = snapshot.data ?? const <TicketType>[];
          return RefreshIndicator(
            color: JsoColors.gold,
            onRefresh: () async => setState(_load),
            child: ListView(
              padding: const EdgeInsets.all(JsoSpacing.md),
              children: [
                _MatchBanner(match: widget.match),
                const SizedBox(height: JsoSpacing.md),
                if (types.isEmpty)
                  const EmptyView(
                    message: 'Aucun billet disponible pour ce match.',
                    icon: Icons.confirmation_number_outlined,
                  )
                else
                  ...types.map(
                    (t) =>
                        _TicketTypeCard(type: t, onReserve: () => _reserve(t)),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _MatchBanner extends StatelessWidget {
  const _MatchBanner({required this.match});

  final Match match;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(JsoSpacing.lg),
        child: Column(
          children: [
            Text(
              JsoFormat.fixture(match),
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: JsoColors.white,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: JsoSpacing.xs),
            Text(
              JsoFormat.dateTime(match.kickoffAt),
              style: const TextStyle(color: JsoColors.muted),
            ),
            if (match.venue != null && match.venue!.isNotEmpty) ...[
              const SizedBox(height: JsoSpacing.xs),
              Text(
                match.venue!,
                style: const TextStyle(color: JsoColors.muted2),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TicketTypeCard extends StatelessWidget {
  const _TicketTypeCard({required this.type, required this.onReserve});

  final TicketType type;
  final VoidCallback onReserve;

  @override
  Widget build(BuildContext context) {
    final soldOut = type.isSoldOut;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(JsoSpacing.md),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    type.name,
                    style: const TextStyle(
                      color: JsoColors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: JsoSpacing.xs),
                  Text(
                    JsoFormat.money(type.price, type.currency),
                    style: const TextStyle(
                      color: JsoColors.gold,
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: JsoSpacing.xs),
                  Text(
                    soldOut
                        ? 'Épuisé'
                        : '${type.available} place(s) disponible(s)',
                    style: TextStyle(
                      color: soldOut
                          ? Theme.of(context).colorScheme.error
                          : JsoColors.muted,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: JsoSpacing.md),
            ElevatedButton(
              onPressed: soldOut ? null : onReserve,
              child: const Text('Réserver'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Quantity picker shown in a bottom sheet before confirming a reservation.
///
/// The backend caps a reservation between 1 and 10 tickets, and never above
/// the remaining availability, so the picker enforces the same bounds.
class _ReserveSheet extends StatefulWidget {
  const _ReserveSheet({required this.type});

  final TicketType type;

  @override
  State<_ReserveSheet> createState() => _ReserveSheetState();
}

class _ReserveSheetState extends State<_ReserveSheet> {
  int _quantity = 1;

  int get _maxQuantity {
    final cap = widget.type.available < 10 ? widget.type.available : 10;
    return cap < 1 ? 1 : cap;
  }

  @override
  Widget build(BuildContext context) {
    final total = widget.type.price * _quantity;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(JsoSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.type.name,
              style: const TextStyle(
                color: JsoColors.white,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: JsoSpacing.xs),
            Text(
              '${JsoFormat.money(widget.type.price, widget.type.currency)} / billet',
              style: const TextStyle(color: JsoColors.muted),
            ),
            const SizedBox(height: JsoSpacing.lg),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  onPressed: _quantity > 1
                      ? () => setState(() => _quantity--)
                      : null,
                  icon: const Icon(Icons.remove_circle_outline),
                  color: JsoColors.gold,
                  iconSize: 32,
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: JsoSpacing.lg,
                  ),
                  child: Text(
                    '$_quantity',
                    style: const TextStyle(
                      color: JsoColors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: _quantity < _maxQuantity
                      ? () => setState(() => _quantity++)
                      : null,
                  icon: const Icon(Icons.add_circle_outline),
                  color: JsoColors.gold,
                  iconSize: 32,
                ),
              ],
            ),
            const SizedBox(height: JsoSpacing.lg),
            Text(
              'Total : ${JsoFormat.money(total, widget.type.currency)}',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: JsoColors.white,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: JsoSpacing.lg),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(_quantity),
              child: const Text('Confirmer la réservation'),
            ),
            const SizedBox(height: JsoSpacing.sm),
            Text(
              'Paiement au club · en attente de confirmation.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: JsoColors.muted2, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
