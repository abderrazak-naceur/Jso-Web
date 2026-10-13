import '../../core/api/api_client.dart';
import '../models/admin_fan_account.dart';

/// Client for existing role-protected supporter management endpoints.
class AdminFanAccountsRepository {
  AdminFanAccountsRepository(this._client);

  final ApiClient _client;

  Future<List<AdminFanAccount>> list({
    required String adminToken,
    String? query,
  }) async {
    final params = <String, String>{
      if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
    };
    final json = await _client.getJson(
      '/admin/fan-accounts',
      queryParameters: params,
      bearerToken: adminToken,
    );
    if (json is! List) return const [];
    return json
        .whereType<Map>()
        .map(
          (item) => AdminFanAccount.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList(growable: false);
  }

  Future<void> setActive({
    required String adminToken,
    required String accountId,
    required bool isActive,
  }) async {
    await _client.putJson(
      '/admin/fan-accounts/$accountId/status',
      body: {'isActive': isActive},
      bearerToken: adminToken,
    );
  }

  Future<AdminFanAccount> setRating({
    required String adminToken,
    required AdminFanAccount account,
    required int stars,
  }) async {
    if (!const {1, 3, 5}.contains(stars)) {
      throw ArgumentError.value(stars, 'stars', 'Must be 1, 3 or 5');
    }
    final json = await _client.putJson(
      '/admin/fan-accounts/${account.id}/rating',
      body: {'stars': stars},
      bearerToken: adminToken,
    );
    final response = json is Map
        ? Map<String, dynamic>.from(json)
        : <String, dynamic>{};
    final resultStars = response['fanRatingStars'];
    final resultVip = response['isVip'];
    return account.copyWith(
      fanRatingStars: resultStars is int ? resultStars : stars,
      isVip: resultVip is bool ? resultVip : stars >= 3,
    );
  }
}
