import '../../core/api/api_client.dart';
import '../models/json_utils.dart';
import '../models/payment_history_item.dart';

/// Retrieves all of a fan's recorded purchases/payments from the API.
class PaymentHistoryRepository {
  PaymentHistoryRepository(this._client);

  final ApiClient _client;

  /// `GET /api/account/me/payments`. Requires the fan's bearer token.
  Future<List<PaymentHistoryItem>> mine(String token) async {
    final json = await _client.getJson(
      '/account/me/payments',
      bearerToken: token,
    );
    return asList(json, PaymentHistoryItem.fromJson);
  }
}
