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
    String? gateId,
  }) async {
    final json = await _client.postJson(
      '/admin/tickets/scan/validate',
      body: _body(scannedValue, matchId, deviceId, gateId),
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
    String? gateId,
  }) async {
    final json = await _client.postJson(
      '/admin/tickets/scan/check-in',
      body: _body(scannedValue, matchId, deviceId, gateId),
      bearerToken: adminToken,
    );
    return TicketScanResult.fromJson(_asMap(json));
  }

  Future<List<ScannerMatch>> matches({required String adminToken}) async {
    final json = await _client.getJson(
      '/admin/tickets/scan/matches',
      bearerToken: adminToken,
    );
    final list = json is List ? json : const <dynamic>[];
    return list
        .whereType<Map>()
        .map((e) => ScannerMatch.fromJson(Map<String, dynamic>.from(e)))
        .toList(growable: false);
  }

  Future<ScannerConfiguration> configuration({
    required String adminToken,
  }) async {
    final json = await _client.getJson(
      '/admin/tickets/scan/configuration',
      bearerToken: adminToken,
    );
    return ScannerConfiguration.fromJson(_asMap(json));
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
    String? gateId,
  ) => {
    'token': extractToken(scannedValue),
    'matchId': ?matchId,
    'deviceId': ?deviceId,
    'gateId': ?gateId,
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

class ScannerConfiguration {
  const ScannerConfiguration({required this.gates, required this.devices});

  final List<ScannerGate> gates;
  final List<ScannerDevice> devices;

  factory ScannerConfiguration.fromJson(Map<String, dynamic> json) {
    final gates = json['gates'] is List
        ? (json['gates'] as List)
              .whereType<Map>()
              .map((e) => ScannerGate.fromJson(Map<String, dynamic>.from(e)))
              .toList(growable: false)
        : const <ScannerGate>[];
    final devices = json['devices'] is List
        ? (json['devices'] as List)
              .whereType<Map>()
              .map((e) => ScannerDevice.fromJson(Map<String, dynamic>.from(e)))
              .toList(growable: false)
        : const <ScannerDevice>[];
    return ScannerConfiguration(gates: gates, devices: devices);
  }
}

class ScannerGate {
  const ScannerGate({
    required this.id,
    required this.code,
    required this.name,
    this.facilityId,
  });

  final String id;
  final String code;
  final String name;
  final String? facilityId;

  factory ScannerGate.fromJson(Map<String, dynamic> json) => ScannerGate(
    id: '${json['id'] ?? ''}',
    code: '${json['code'] ?? ''}',
    name: '${json['name'] ?? ''}',
    facilityId: json['facilityId']?.toString(),
  );
}

class ScannerDevice {
  const ScannerDevice({
    required this.id,
    required this.deviceCode,
    required this.name,
    this.gateId,
  });

  final String id;
  final String deviceCode;
  final String name;
  final String? gateId;

  factory ScannerDevice.fromJson(Map<String, dynamic> json) => ScannerDevice(
    id: '${json['id'] ?? ''}',
    deviceCode: '${json['deviceCode'] ?? ''}',
    name: '${json['name'] ?? ''}',
    gateId: json['gateId']?.toString(),
  );
}

class ScannerMatch {
  const ScannerMatch({
    required this.id,
    required this.kickoffAt,
    required this.opponentName,
    this.venue,
    required this.isHome,
    required this.status,
  });

  final String id;
  final DateTime kickoffAt;
  final String opponentName;
  final String? venue;
  final bool isHome;
  final String status;

  factory ScannerMatch.fromJson(Map<String, dynamic> json) => ScannerMatch(
    id: '${json['id'] ?? ''}',
    kickoffAt:
        DateTime.tryParse('${json['kickoffAt'] ?? ''}') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    opponentName: '${json['opponentName'] ?? ''}',
    venue: json['venue']?.toString(),
    isHome: json['isHome'] == true,
    status: '${json['status'] ?? ''}',
  );
}
