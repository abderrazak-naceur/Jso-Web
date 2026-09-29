import '../../core/api/api_client.dart';
import '../models/ticket_scan_result.dart';

/// Repository over the staff scanner endpoints in
/// `backend/src/JSO.Api/Controllers/AdminTicketsController.cs`
/// (`[Authorize(Roles = "SuperAdmin,ClubAdmin,MatchManager")]`).
///
/// Requires an ADMIN JWT (from [AdminAuthController]), never a fan token: the
/// two roles are fully separate server-side. The scanned QR carries a compact
/// `JSO1.<token>` payload; [_extractToken] strips the prefix before sending the
/// opaque token to the backend, which stays the source of truth for validation.
class AdminTicketsRepository {
  AdminTicketsRepository(this._client);

  final ApiClient _client;

  /// `POST /api/admin/tickets/validate` — read-only pre-check of a scanned
  /// token. Does not change ticket state.
  Future<TicketScanResult> validate({
    required String adminToken,
    required String scannedValue,
    String? matchId,
    String? deviceId,
  }) async {
    final json = await _client.postJson(
      '/admin/tickets/validate',
      body: _body(scannedValue, matchId, deviceId),
      bearerToken: adminToken,
    );
    return TicketScanResult.fromJson(_asMap(json));
  }

  /// `POST /api/admin/tickets/check-in` — atomic entry. The backend flips
  /// Confirmed -> CheckedIn once; a second scan returns `AlreadyUsed`.
  Future<TicketScanResult> checkIn({
    required String adminToken,
    required String scannedValue,
    String? matchId,
    String? deviceId,
  }) async {
    final json = await _client.postJson(
      '/admin/tickets/check-in',
      body: _body(scannedValue, matchId, deviceId),
      bearerToken: adminToken,
    );
    return TicketScanResult.fromJson(_asMap(json));
  }

  /// `GET /api/admin/tickets/check-ins` — recent scan history.
  Future<List<TicketCheckInEntry>> recentCheckIns({
    required String adminToken,
    String? matchId,
    int take = 50,
  }) async {
    final json = await _client.getJson(
      '/admin/tickets/check-ins',
      bearerToken: adminToken,
      queryParameters: {'take': '$take', 'matchId': ?matchId},
    );
    if (json is! List) return const <TicketCheckInEntry>[];
    return json
        .whereType<Map>()
        .map((e) => TicketCheckInEntry.fromJson(Map<String, dynamic>.from(e)))
        .toList(growable: false);
  }

  Map<String, dynamic> _body(
    String scannedValue,
    String? matchId,
    String? deviceId,
  ) => {
    'token': extractToken(scannedValue),
    'matchId': ?matchId,
    'deviceId': ?deviceId,
  };

  /// Strips the compact `JSO1.` prefix (or a full ticket URL) from a scanned QR
  /// payload, returning the raw opaque token. Falls back to the trimmed input
  /// when no known wrapper is present (e.g. manual code entry).
  static String extractToken(String scannedValue) {
    final value = scannedValue.trim();
    if (value.startsWith('JSO1.')) return value.substring(5);
    final uri = Uri.tryParse(value);
    if (uri != null && uri.pathSegments.isNotEmpty && value.contains('://')) {
      return uri.pathSegments.last;
    }
    return value;
  }

  Map<String, dynamic> _asMap(Object? json) =>
      json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{};
}
