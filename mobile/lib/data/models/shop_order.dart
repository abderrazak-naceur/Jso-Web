import 'json_utils.dart';
import 'product.dart';

/// Shop order statuses and their French labels.
///
/// Mirrors the transitions enforced by `AdminShopOrdersController`:
/// Pending → Paid → Shipped → Delivered; Pending → Cancelled | Failed;
/// Paid → Cancelled; Failed → Pending. Payment is manual: the club confirms
/// it, which is what moves an order out of [pending].
class ShopOrderStatus {
  const ShopOrderStatus._();

  static const String pending = 'Pending';
  static const String paid = 'Paid';
  static const String shipped = 'Shipped';
  static const String delivered = 'Delivered';
  static const String cancelled = 'Cancelled';
  static const String failed = 'Failed';

  /// French label for a backend order [status]. Unknown values are returned
  /// unchanged so a new server status still renders.
  static String label(String status) {
    return switch (status) {
      'Pending' => 'En attente',
      'Paid' => 'Payée',
      'Shipped' => 'Expédiée',
      'Delivered' => 'Livrée',
      'Cancelled' => 'Annulée',
      'Failed' => 'Échec du paiement',
      _ => status,
    };
  }
}

/// ShopOrderItem — a line of a fan order (`items[]` of
/// `GET /api/shop/orders/{id}` and of the `POST /api/shop/orders` response:
/// productId, productName, unitPrice, quantity, lineTotal).
///
/// Name and unit price are snapshotted server-side at order time, so a
/// historical order stays correct even if the product changes later.
class ShopOrderItem {
  const ShopOrderItem({
    required this.productId,
    required this.productName,
    required this.unitPrice,
    required this.quantity,
    required this.lineTotal,
  });

  final String productId;
  final String productName;
  final double unitPrice;
  final int quantity;
  final double lineTotal;

  factory ShopOrderItem.fromJson(Map<String, dynamic> json) {
    final unitPrice = asDouble(json['unitPrice']);
    final quantity = asInt(json['quantity'], fallback: 1);
    return ShopOrderItem(
      productId: asString(json['productId']),
      productName: asString(json['productName']),
      unitPrice: unitPrice,
      quantity: quantity,
      lineTotal: asDoubleOrNull(json['lineTotal']) ?? unitPrice * quantity,
    );
  }
}

/// ShopOrder — maps the fan projections of `JSO.Domain.Order`:
/// - `GET /api/shop/orders` (list): id, status, currency, total, createdAt,
///   paidAt — no items;
/// - `GET /api/shop/orders/{id}` (detail): the same plus `items`;
/// - `POST /api/shop/orders` (201): no `paidAt`, with `items`.
///
/// Totals are always computed by the server from its catalogue. [paidAt] is
/// set once the club has confirmed the (manual) payment.
class ShopOrder {
  const ShopOrder({
    required this.id,
    required this.status,
    required this.currency,
    required this.total,
    this.createdAt,
    this.paidAt,
    this.items = const [],
  });

  final String id;
  final String status;
  final String currency;
  final double total;
  final DateTime? createdAt;
  final DateTime? paidAt;

  /// Order lines; empty for the list projection, which omits them.
  final List<ShopOrderItem> items;

  /// Short reference shown to the fan (and quoted at the club): the first 8
  /// characters of the id, uppercased — e.g. `3F2504E0`.
  String get reference {
    final value = id.trim();
    return (value.length > 8 ? value.substring(0, 8) : value).toUpperCase();
  }

  /// French label of [status] (see [ShopOrderStatus.label]).
  String get statusLabel => ShopOrderStatus.label(status);

  bool get isPending => status == ShopOrderStatus.pending;

  /// Total number of articles across [items] (sum of quantities).
  int get itemCount => items.fold(0, (sum, item) => sum + item.quantity);

  factory ShopOrder.fromJson(Map<String, dynamic> json) => ShopOrder(
    id: asString(json['id']),
    status: asStringOrNull(json['status']) ?? ShopOrderStatus.pending,
    currency: asStringOrNull(json['currency']) ?? 'TND',
    total: asDouble(json['total']),
    createdAt: asDateTimeOrNull(json['createdAt']),
    paidAt: asDateTimeOrNull(json['paidAt']),
    items: asList(json['items'], ShopOrderItem.fromJson),
  );
}

/// A line of the fan's in-memory cart — and the unit a
/// `POST /api/shop/orders` request is built from.
///
/// [name], [unitPrice], [currency] and [imageUrl] are a display snapshot of
/// the [Product] taken when it was added. The server never trusts them: it
/// recomputes names and prices from its catalogue, so only [productId] and
/// [quantity] are sent (see [toOrderJson]).
class CartLine {
  const CartLine({
    required this.productId,
    required this.name,
    required this.unitPrice,
    required this.currency,
    this.imageUrl,
    required this.quantity,
  });

  factory CartLine.fromProduct(Product product, {required int quantity}) =>
      CartLine(
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        currency: product.currency,
        imageUrl: product.imageUrl,
        quantity: quantity,
      );

  final String productId;
  final String name;
  final double unitPrice;
  final String currency;
  final String? imageUrl;
  final int quantity;

  /// Display total of the line (the server computes the real one).
  double get lineTotal => unitPrice * quantity;

  CartLine copyWith({int? quantity}) => CartLine(
    productId: productId,
    name: name,
    unitPrice: unitPrice,
    currency: currency,
    imageUrl: imageUrl,
    quantity: quantity ?? this.quantity,
  );

  /// The `{ productId, quantity }` entry of the order request `items`.
  Map<String, dynamic> toOrderJson() => {
    'productId': productId,
    'quantity': quantity,
  };
}
