import '../../core/api/api_client.dart';
import '../models/ticket_order.dart';
import '../models/ticket_type.dart';

/// Repository over the ticketing endpoints in
/// `backend/src/JSO.Api/Controllers/TicketsController.cs`.
///
/// [getForMatch] is public (anonymous), while [myTickets] and [reserve] carry
/// the fan JWT as a Bearer token — the same manual-gateway flow as the web
/// app: reserving creates a `Pending` order that an admin later confirms.
class TicketsRepository {
  TicketsRepository(this._client);

  final ApiClient _client;

  /// `GET /api/tickets/match/{matchId}` — active ticket types with remaining
  /// availability for a published match. Public, no auth.
  Future<List<TicketType>> getForMatch(String matchId) async {
    final json = await _client.getJson('/tickets/match/$matchId');
    return _mapList(json, TicketType.fromJson);
  }

  /// `GET /api/tickets/mine` — the current fan's reservations, most recent
  /// first. Requires a fan [token].
  Future<List<TicketOrder>> myTickets(String token) async {
    final json = await _client.getJson('/tickets/mine', bearerToken: token);
    return _mapList(json, TicketOrder.fromJson);
  }

  /// `POST /api/tickets/reserve` — reserves [quantity] tickets of
  /// [ticketTypeId]; the server recomputes the price and returns a `Pending`
  /// order. Requires a fan [token].
  Future<TicketOrder> reserve({
    required String token,
    required String ticketTypeId,
    required int quantity,
  }) async {
    final json = await _client.postJson(
      '/tickets/reserve',
      body: {'ticketTypeId': ticketTypeId, 'quantity': quantity},
      bearerToken: token,
    );
    return TicketOrder.fromJson(_asMap(json));
  }

  Map<String, dynamic> _asMap(Object? json) =>
      json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{};

  List<T> _mapList<T>(Object? json, T Function(Map<String, dynamic>) fromJson) {
    if (json is! List) return <T>[];
    return json
        .whereType<Map>()
        .map((e) => fromJson(Map<String, dynamic>.from(e)))
        .toList(growable: false);
  }
}
