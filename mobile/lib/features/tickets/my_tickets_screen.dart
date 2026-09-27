import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/ticket_order.dart';
import '../../data/repositories/tickets_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../auth/auth_controller.dart';

/// "Mes billets" — the current fan's reservations from `GET /api/tickets/mine`,
/// most recent first, with a status chip (Pending / Confirmed / Cancelled).
///
/// This screen is only reachable from the authenticated profile, but it reads
/// the token defensively and shows the ERROR state if the session vanished.
class MyTicketsScreen extends StatefulWidget {
  const MyTicketsScreen({super.key});

  @override
  State<MyTicketsScreen> createState() => _MyTicketsScreenState();
}

class _MyTicketsScreenState extends State<MyTicketsScreen> {
  late Future<List<TicketOrder>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    final token = context.read<AuthController>().accessToken;
    final repo = context.read<TicketsRepository>();
    _future = token == null
        ? Future.error(StateError('not-authenticated'))
        : repo.myTickets(token);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes billets')),
      body: FutureBuilder<List<TicketOrder>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Chargement de vos billets…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Impossible de charger vos billets.',
              onRetry: () => setState(_load),
            );
          }

          final orders = snapshot.data ?? const <TicketOrder>[];
          if (orders.isEmpty) {
            return const EmptyView(
              message: 'Vous n\'avez pas encore de billets.',
              icon: Icons.confirmation_number_outlined,
            );
          }

          return RefreshIndicator(
            color: JsoColors.gold,
            onRefresh: () async => setState(_load),
            child: ListView.builder(
              padding: const EdgeInsets.all(JsoSpacing.md),
              itemCount: orders.length,
              itemBuilder: (context, i) => _OrderCard(order: orders[i]),
            ),
          );
        },
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order});

  final TicketOrder order;

  @override
  Widget build(BuildContext context) {
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
                    order.ticketTypeName,
                    style: const TextStyle(
                      color: JsoColors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: JsoSpacing.xs),
                  Text(
                    '${order.quantity} × · ${JsoFormat.money(order.total, order.currency)}',
                    style: const TextStyle(
                      color: JsoColors.gold,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (order.createdAt != null) ...[
                    const SizedBox(height: JsoSpacing.xs),
                    Text(
                      JsoFormat.date(order.createdAt!),
                      style: const TextStyle(
                        color: JsoColors.muted2,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: JsoSpacing.md),
            _StatusChip(status: order.status),
          ],
        ),
      ),
    );
  }
}

/// Status pill mirroring the web admin styling: amber Pending, green Confirmed,
/// muted Cancelled. French labels for the fan-facing UI.
class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final (Color color, String label) = switch (status) {
      'Confirmed' => (JsoColors.cyan, 'Confirmé'),
      'Cancelled' => (JsoColors.muted, 'Annulé'),
      _ => (JsoColors.gold, 'En attente'),
    };
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: JsoSpacing.md,
        vertical: JsoSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: JsoColors.navy2,
        borderRadius: BorderRadius.circular(JsoRadius.pill),
        border: Border.all(color: color),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
      ),
    );
  }
}
