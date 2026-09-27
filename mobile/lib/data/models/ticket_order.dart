import 'json_utils.dart';

/// TicketOrder — maps the fan projection of `JSO.Domain.TicketOrder`
/// (`GET /api/tickets/mine`: id, matchId, ticketTypeName, quantity, total,
/// currency, status, createdAt).
///
/// The reservation status follows the manual-gateway flow: `Pending` right
/// after a fan reserves, `Confirmed` once an admin validates it, or
/// `Cancelled`. The `POST /api/tickets/reserve` response omits `matchId` and
/// `createdAt`, so both are optional here.
class TicketOrder {
  const TicketOrder({
    required this.id,
    this.matchId,
    required this.ticketTypeName,
    required this.quantity,
    required this.total,
    required this.currency,
    required this.status,
    this.createdAt,
  });

  final String id;
  final String? matchId;
  final String ticketTypeName;
  final int quantity;
  final double total;
  final String currency;
  final String status;
  final DateTime? createdAt;

  bool get isPending => status == 'Pending';
  bool get isConfirmed => status == 'Confirmed';
  bool get isCancelled => status == 'Cancelled';

  factory TicketOrder.fromJson(Map<String, dynamic> json) => TicketOrder(
    id: asString(json['id']),
    matchId: asStringOrNull(json['matchId']),
    ticketTypeName: asString(json['ticketTypeName']),
    quantity: asInt(json['quantity'], fallback: 1),
    total: asDouble(json['total']),
    currency: asString(json['currency'], fallback: 'TND'),
    status: asString(json['status'], fallback: 'Pending'),
    createdAt: asDateTimeOrNull(json['createdAt']),
  );
}
