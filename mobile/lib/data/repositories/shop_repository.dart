import '../../core/api/api_client.dart';
import '../models/json_utils.dart';
import '../models/product.dart';
import '../models/shop_order.dart';

/// Repository over the shop endpoints in
/// `backend/src/JSO.Api/Controllers/ShopController.cs` (public catalogue) and
/// `ShopOrdersController.cs` (fan orders).
///
/// [getProducts] and [getProduct] are anonymous; the order calls carry the fan
/// JWT as a Bearer token. Ordering follows the manual gateway, like the web
/// app: the server recomputes every price, creates a `Pending` order, and the
/// club confirms the payment later (payment and pick-up happen at the club).
/// [ApiException]s propagate unchanged so screens can turn them into French
/// copy with `describeApiError`.
class ShopRepository {
  ShopRepository(this._client);

  final ApiClient _client;

  /// `GET /api/shop/products[?category=]` — active products ordered by
  /// category then name. Public, no auth.
  Future<List<Product>> getProducts({String? category}) async {
    final filter = category?.trim() ?? '';
    final json = await _client.getJson(
      '/shop/products',
      queryParameters: filter.isEmpty ? null : {'category': filter},
    );
    return asList(json, Product.fromJson);
  }

  /// `GET /api/shop/products/{slug}` — a single active product. Throws
  /// `NotFoundException` when the slug is unknown or the product inactive.
  Future<Product> getProduct(String slug) async {
    final json = await _client.getJson(
      '/shop/products/${Uri.encodeComponent(slug.trim())}',
    );
    return Product.fromJson(_asMap(json));
  }

  /// `POST /api/shop/orders` — places an order for the cart [lines]
  /// (`{ items: [{ productId, quantity }], customerName?, customerEmail?,
  /// note? }`). Blank optional fields are omitted. Returns the `Pending` order
  /// with the server-computed total and lines. Requires a fan [token].
  Future<ShopOrder> createOrder({
    required String token,
    required List<CartLine> lines,
    String? customerName,
    String? customerEmail,
    String? note,
  }) async {
    final name = _clean(customerName);
    final email = _clean(customerEmail);
    final cleanNote = _clean(note);
    final json = await _client.postJson(
      '/shop/orders',
      body: {
        'items': [for (final line in lines) line.toOrderJson()],
        'customerName': ?name,
        'customerEmail': ?email,
        'note': ?cleanNote,
      },
      bearerToken: token,
    );
    return ShopOrder.fromJson(_asMap(json));
  }

  /// `GET /api/shop/orders` — the current fan's orders, newest first (without
  /// lines). Requires a fan [token].
  Future<List<ShopOrder>> myOrders(String token) async {
    final json = await _client.getJson('/shop/orders', bearerToken: token);
    return asList(json, ShopOrder.fromJson);
  }

  /// `GET /api/shop/orders/{id}` — one of the current fan's orders with its
  /// lines. Throws `NotFoundException` when it does not exist or belongs to
  /// another fan. Requires a fan [token].
  Future<ShopOrder> myOrder({required String token, required String id}) async {
    final json = await _client.getJson(
      '/shop/orders/${Uri.encodeComponent(id.trim())}',
      bearerToken: token,
    );
    return ShopOrder.fromJson(_asMap(json));
  }

  static String? _clean(String? value) {
    final text = value?.trim() ?? '';
    return text.isEmpty ? null : text;
  }

  Map<String, dynamic> _asMap(Object? json) =>
      json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{};
}
