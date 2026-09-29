import 'json_utils.dart';

/// TicketScanResult — maps the structured response of the staff scanner
/// endpoints `POST /api/admin/tickets/validate` and `.../check-in`.
///
/// [result] is one of Valid / AlreadyUsed / Invalid / Cancelled / WrongMatch;
/// [message] is a ready-to-show French sentence; [ticket] carries the minimal
/// resolved ticket data (null when the token did not resolve).
class TicketScanResult {
  const TicketScanResult({
    required this.result,
    required this.message,
    this.ticket,
  });

  final String result;
  final String message;
  final ScannedTicket? ticket;

  bool get isValid => result == 'Valid';
  bool get isAlreadyUsed => result == 'AlreadyUsed';

  factory TicketScanResult.fromJson(Map<String, dynamic> json) =>
      TicketScanResult(
        result: asString(json['result'], fallback: 'Invalid'),
        message: asString(json['message']),
        ticket: json['ticket'] is Map
            ? ScannedTicket.fromJson(
                Map<String, dynamic>.from(json['ticket'] as Map),
              )
            : null,
      );
}

/// Minimal ticket projection returned alongside a scan outcome.
class ScannedTicket {
  const ScannedTicket({
    required this.id,
    this.matchId,
    required this.ticketTypeName,
    required this.quantity,
    required this.status,
    this.checkedInAt,
  });

  final String id;
  final String? matchId;
  final String ticketTypeName;
  final int quantity;
  final String status;
  final DateTime? checkedInAt;

  factory ScannedTicket.fromJson(Map<String, dynamic> json) => ScannedTicket(
    id: asString(json['id']),
    matchId: asStringOrNull(json['matchId']),
    ticketTypeName: asString(json['ticketTypeName']),
    quantity: asInt(json['quantity'], fallback: 1),
    status: asString(json['status']),
    checkedInAt: asDateTimeOrNull(json['checkedInAt']),
  );
}

/// TicketCheckInEntry — maps an item of `GET /api/admin/tickets/check-ins`.
class TicketCheckInEntry {
  const TicketCheckInEntry({
    required this.id,
    this.ticketOrderId,
    this.matchId,
    required this.result,
    this.checkedInAt,
    this.deviceId,
  });

  final String id;
  final String? ticketOrderId;
  final String? matchId;
  final String result;
  final DateTime? checkedInAt;
  final String? deviceId;

  factory TicketCheckInEntry.fromJson(Map<String, dynamic> json) =>
      TicketCheckInEntry(
        id: asString(json['id']),
        ticketOrderId: asStringOrNull(json['ticketOrderId']),
        matchId: asStringOrNull(json['matchId']),
        result: asString(json['result']),
        checkedInAt: asDateTimeOrNull(json['checkedInAt']),
        deviceId: asStringOrNull(json['deviceId']),
      );
}
