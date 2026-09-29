import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/digital_ticket.dart';
import '../../data/models/ticket_order.dart';
import '../../data/repositories/tickets_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../auth/auth_controller.dart';

/// "Voir le billet" — the fan's digital ticket for a confirmed reservation.
///
/// Loads `GET /api/tickets/{id}/digital` and renders a large, high-contrast QR
/// built from the opaque public token (payload `JSO1.<token>`). The QR is only
/// a representation of the ticket: it carries no personal data and no auth
/// token, and the backend stays the source of truth at check-in.
class TicketDetailScreen extends StatefulWidget {
  const TicketDetailScreen({super.key, required this.order});

  final TicketOrder order;

  static Route<void> route(TicketOrder order) =>
      MaterialPageRoute<void>(builder: (_) => TicketDetailScreen(order: order));

  @override
  State<TicketDetailScreen> createState() => _TicketDetailScreenState();
}

class _TicketDetailScreenState extends State<TicketDetailScreen> {
  late Future<DigitalTicket> _future;

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
        : repo.getDigitalTicket(token: token, ticketId: widget.order.id);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mon billet')),
      body: FutureBuilder<DigitalTicket>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Chargement du billet…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Impossible de charger ce billet numérique.',
              onRetry: () => setState(_load),
            );
          }
          final ticket = snapshot.data;
          if (ticket == null) {
            return ErrorView(
              message: 'Billet numérique indisponible.',
              onRetry: () => setState(_load),
            );
          }
          return _TicketBody(ticket: ticket);
        },
      ),
    );
  }
}

class _TicketBody extends StatelessWidget {
  const _TicketBody({required this.ticket});

  final DigitalTicket ticket;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(JsoSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            ticket.ticketTypeName,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: JsoColors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: JsoSpacing.xs),
          Text(
            'Quantité : ${ticket.quantity} · ${JsoFormat.money(ticket.total, ticket.currency)}',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: JsoColors.gold,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: JsoSpacing.lg),
          // High-contrast QR on a solid white card for maximum readability at
          // the stadium gate (dark scanner conditions, high glare).
          Center(
            child: Container(
              padding: const EdgeInsets.all(JsoSpacing.lg),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(JsoRadius.largeCard),
              ),
              child: QrImageView(
                data: ticket.qrPayload,
                version: QrVersions.auto,
                size: 260,
                backgroundColor: Colors.white,
                // ignore: deprecated_member_use
                foregroundColor: const Color(0xFF000000),
                gapless: true,
                semanticsLabel: 'Code QR du billet',
              ),
            ),
          ),
          const SizedBox(height: JsoSpacing.md),
          const Text(
            'Présentez ce QR à l’entrée du stade',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: JsoColors.muted,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: JsoSpacing.lg),
          _StatusBanner(status: ticket.status, checkedInAt: ticket.checkedInAt),
          const SizedBox(height: JsoSpacing.md),
          if (ticket.issuedAt != null)
            _MetaRow(
              label: 'Émis le',
              value: JsoFormat.dateTime(ticket.issuedAt!),
            ),
        ],
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  const _StatusBanner({required this.status, required this.checkedInAt});

  final String status;
  final DateTime? checkedInAt;

  @override
  Widget build(BuildContext context) {
    final checkedIn = status == 'CheckedIn';
    final (Color color, String label) = checkedIn
        ? (JsoColors.muted, 'Déjà utilisé')
        : (JsoColors.cyan, 'Confirmé — valide');
    return Container(
      padding: const EdgeInsets.all(JsoSpacing.md),
      decoration: BoxDecoration(
        color: JsoColors.navy2,
        borderRadius: BorderRadius.circular(JsoRadius.control),
        border: Border.all(color: color),
      ),
      child: Row(
        children: [
          Icon(
            checkedIn ? Icons.how_to_reg_rounded : Icons.verified_rounded,
            color: color,
          ),
          const SizedBox(width: JsoSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(color: color, fontWeight: FontWeight.w800),
                ),
                if (checkedIn && checkedInAt != null)
                  Text(
                    'Entré le ${JsoFormat.dateTime(checkedInAt!)}',
                    style: const TextStyle(
                      color: JsoColors.muted,
                      fontSize: 12,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: JsoSpacing.xs),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: JsoColors.muted)),
          Text(
            value,
            style: const TextStyle(
              color: JsoColors.white,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
