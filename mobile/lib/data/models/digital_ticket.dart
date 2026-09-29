import 'json_utils.dart';

/// DigitalTicket — maps `GET /api/tickets/{id}/digital`.
///
/// Carries only what the QR/ticket UI needs: the opaque public [token] (the QR
/// payload, NOT a credential and free of any PII/JWT), plus match/type/quantity
/// /status metadata. The backend only returns this for a `Confirmed` or
/// `CheckedIn` order, so [token] is always a non-empty issued value here.
class DigitalTicket {
  const DigitalTicket({
    required this.id,
    this.matchId,
    required this.ticketTypeName,
    required this.quantity,
    required this.currency,
    required this.total,
    required this.status,
    required this.token,
    this.issuedAt,
    this.checkedInAt,
  });

  final String id;
  final String? matchId;
  final String ticketTypeName;
  final int quantity;
  final String currency;
  final double total;
  final String status;
  final String token;
  final DateTime? issuedAt;
  final DateTime? checkedInAt;

  bool get isCheckedIn => status == 'CheckedIn';

  /// Compact, versioned QR payload. The scanner strips the `JSO1.` prefix and
  /// sends the raw token to the backend for verification. Deliberately opaque:
  /// no personal data, no auth token, just the ticket's public identifier.
  String get qrPayload => 'JSO1.$token';

  factory DigitalTicket.fromJson(Map<String, dynamic> json) => DigitalTicket(
    id: asString(json['id']),
    matchId: asStringOrNull(json['matchId']),
    ticketTypeName: asString(json['ticketTypeName']),
    quantity: asInt(json['quantity'], fallback: 1),
    currency: asString(json['currency'], fallback: 'TND'),
    total: asDouble(json['total']),
    status: asString(json['status'], fallback: 'Confirmed'),
    token: asString(json['token']),
    issuedAt: asDateTimeOrNull(json['issuedAt']),
    checkedInAt: asDateTimeOrNull(json['checkedInAt']),
  );
}
