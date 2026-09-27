import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:jso_mobile/core/api/api_client.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/data/models/product.dart';
import 'package:jso_mobile/data/models/shop_order.dart';
import 'package:jso_mobile/data/repositories/shop_repository.dart';
import 'package:jso_mobile/features/auth/auth_controller.dart';
import 'package:jso_mobile/features/shop/cart_controller.dart';

import 'fake_auth.dart';
import 'fake_repository.dart';
import 'test_harness.dart';

/// One recorded [ShopRepository.createOrder] call.
class CreateOrderCall {
  const CreateOrderCall({
    required this.token,
    required this.lines,
    this.customerName,
    this.customerEmail,
    this.note,
  });

  final String token;
  final List<CartLine> lines;
  final String? customerName;
  final String? customerEmail;
  final String? note;
}

/// A [ShopRepository] test double that never touches the network.
///
/// Reads resolve from the injected values (or throw [error]); [delay] keeps
/// them pending long enough to observe the LOADING state. [createOrder]
/// records every call in [createCalls], throws [createError] when set, and
/// waits for [createCompleter] when provided so a test can observe the
/// in-flight state before completing it.
class FakeShopRepository extends ShopRepository {
  FakeShopRepository({
    this.products,
    this.orders,
    this.order,
    this.placedOrder,
    this.error,
    this.createError,
    this.createCompleter,
    this.delay,
  }) : super(ApiClient());

  final List<Product>? products;
  final List<ShopOrder>? orders;
  final ShopOrder? order;

  /// The `POST /api/shop/orders` response; defaults to
  /// [SampleShop.placedOrder] built from the posted lines.
  final ShopOrder? placedOrder;

  /// When set, every read throws it. Mutable so a test can clear it before
  /// tapping "Réessayer".
  ApiException? error;

  /// When set, [createOrder] throws it.
  final Object? createError;

  /// When set, [createOrder] waits for it before answering.
  final Completer<ShopOrder>? createCompleter;

  /// Optional artificial latency for the reads (LOADING state).
  final Duration? delay;

  final List<CreateOrderCall> createCalls = [];

  /// Tokens received by the fan-only reads ([myOrders] / [myOrder]).
  final List<String> readTokens = [];

  int getProductsCalls = 0;

  Future<T> _resolve<T>(T Function() value) async {
    if (delay != null) {
      await Future<void>.delayed(delay!);
    }
    if (error != null) {
      throw error!;
    }
    return value();
  }

  @override
  Future<List<Product>> getProducts({String? category}) {
    getProductsCalls++;
    return _resolve(() => products ?? const []);
  }

  @override
  Future<Product> getProduct(String slug) => _resolve(
    () => (products ?? const <Product>[]).firstWhere(
      (p) => p.slug == slug,
      orElse: () => throw const NotFoundException(),
    ),
  );

  @override
  Future<ShopOrder> createOrder({
    required String token,
    required List<CartLine> lines,
    String? customerName,
    String? customerEmail,
    String? note,
  }) async {
    createCalls.add(
      CreateOrderCall(
        token: token,
        lines: lines,
        customerName: customerName,
        customerEmail: customerEmail,
        note: note,
      ),
    );
    if (createCompleter != null) {
      return createCompleter!.future;
    }
    if (createError != null) {
      throw createError!;
    }
    return placedOrder ?? SampleShop.placedOrder(lines);
  }

  @override
  Future<List<ShopOrder>> myOrders(String token) {
    readTokens.add(token);
    return _resolve(() => orders ?? const []);
  }

  @override
  Future<ShopOrder> myOrder({required String token, required String id}) {
    readTokens.add(token);
    return _resolve(() => order ?? (throw const NotFoundException()));
  }
}

/// Pumps a shop [child] with the providers the app root will register:
/// [ShopRepository], [CartController] and [AuthController] (anonymous by
/// default). Uses a phone-sized surface (360×800 logical px) unless
/// [phoneSurface] is false, so whole screens fit without scrolling.
Future<void> pumpShop(
  WidgetTester tester, {
  required Widget child,
  required FakeShopRepository repository,
  CartController? cart,
  AuthController? auth,
  bool phoneSurface = true,
}) {
  if (phoneSurface) {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.reset);
  }
  return pumpScreen(
    tester,
    repository: FakeRepository(),
    child: child,
    providers: [
      Provider<ShopRepository>.value(value: repository),
      ChangeNotifierProvider<CartController>.value(
        value: cart ?? CartController(),
      ),
      ChangeNotifierProvider<AuthController>.value(
        value: auth ?? fakeAuthController(),
      ),
    ],
  );
}

/// An authenticated [AuthController]: token `jwt-token`, fan "Sami Ultras"
/// (`supporter@jso.tn`), see [SampleFan].
Future<AuthController> signedInAuth() async {
  final auth = fakeAuthController(
    repository: FakeAuthRepository(loginResult: SampleFan.authResult()),
  );
  await auth.login('supporter@jso.tn', 'password12345');
  return auth;
}

/// An anonymous [AuthController] (restored session without a stored token).
Future<AuthController> anonymousAuth() async {
  final auth = fakeAuthController();
  await auth.restoreSession();
  return auth;
}

/// Sample shop payloads for the tests.
class SampleShop {
  const SampleShop._();

  static const String orderId = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

  static Product product({
    String id = '0b7f3c2a-5d1e-4c8b-9a6f-000000000001',
    String name = 'Maillot domicile 2026',
    String slug = 'maillot-domicile-2026',
    String? description = 'Le maillot officiel de la JSO pour la saison 2026.',
    double price = 45,
    String currency = 'TND',
    String? imageUrl,
    String? category = 'Maillots',
    bool inStock = true,
  }) {
    return Product(
      id: id,
      name: name,
      slug: slug,
      description: description,
      price: price,
      currency: currency,
      imageUrl: imageUrl,
      category: category,
      inStock: inStock,
    );
  }

  static Product scarf({bool inStock = true}) => product(
    id: '0b7f3c2a-5d1e-4c8b-9a6f-000000000002',
    name: 'Écharpe JSO',
    slug: 'echarpe-jso',
    description: 'Écharpe tricotée aux couleurs du club.',
    price: 25.5,
    category: 'Accessoires',
    inStock: inStock,
  );

  static Product awayShirt({bool inStock = true}) => product(
    id: '0b7f3c2a-5d1e-4c8b-9a6f-000000000003',
    name: 'Maillot extérieur 2026',
    slug: 'maillot-exterieur-2026',
    price: 45,
    category: 'Maillots',
    inStock: inStock,
  );

  static ShopOrderItem item({
    String productId = '0b7f3c2a-5d1e-4c8b-9a6f-000000000001',
    String productName = 'Maillot domicile 2026',
    double unitPrice = 45,
    int quantity = 2,
  }) {
    return ShopOrderItem(
      productId: productId,
      productName: productName,
      unitPrice: unitPrice,
      quantity: quantity,
      lineTotal: unitPrice * quantity,
    );
  }

  static ShopOrder order({
    String id = orderId,
    String status = 'Pending',
    double total = 90,
    DateTime? createdAt,
    DateTime? paidAt,
    List<ShopOrderItem> items = const [],
  }) {
    return ShopOrder(
      id: id,
      status: status,
      currency: 'TND',
      total: total,
      createdAt: createdAt ?? DateTime.utc(2026, 3, 15, 12),
      paidAt: paidAt,
      items: items,
    );
  }

  /// The `201` answer the server would give for [lines].
  static ShopOrder placedOrder(List<CartLine> lines) => order(
    total: lines.fold(0.0, (sum, line) => sum + line.lineTotal),
    items: [
      for (final line in lines)
        item(
          productId: line.productId,
          productName: line.name,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
        ),
    ],
  );
}
