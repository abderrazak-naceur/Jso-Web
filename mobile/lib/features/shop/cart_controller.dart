import 'package:flutter/foundation.dart';

import '../../data/models/product.dart';
import '../../data/models/shop_order.dart';

/// Outcome of [CartController.add]; [message] is the French copy to show.
enum CartAddResult {
  /// The quantity was added (as a new line or merged into the existing one).
  added,

  /// The line hit the per-product cap ([CartController.maxQuantityPerLine]):
  /// the quantity was clamped, so less (or nothing) was added.
  limitReached,

  /// Rejected: the product is out of stock.
  outOfStock,

  /// Rejected: the cart already holds [CartController.maxLines] different
  /// products.
  cartFull;

  /// Whether the product is in the cart after the call.
  bool get isInCart => this == added || this == limitReached;

  /// French feedback for the fan.
  String get message => switch (this) {
    CartAddResult.added => 'Ajouté au panier',
    CartAddResult.limitReached =>
      'Quantité maximale atteinte '
          '(${CartController.maxQuantityPerLine}) pour ce produit.',
    CartAddResult.outOfStock => 'Ce produit est en rupture de stock.',
    CartAddResult.cartFull =>
      'Votre panier est plein : ${CartController.maxLines} produits '
          'différents maximum.',
  };
}

/// The fan's shopping cart, shared app-wide through a `ChangeNotifierProvider`.
///
/// Kept in memory only (it empties when the app restarts). It enforces the
/// limits of `POST /api/shop/orders` so an order is never rejected for them:
/// at most [maxLines] different products, and 1 to [maxQuantityPerLine]
/// units per line. Out-of-stock products are refused. Line prices are display
/// snapshots: the server recomputes the real total when the order is placed.
class CartController extends ChangeNotifier {
  /// Maximum units of a single product (server rule: quantity 1..99).
  static const int maxQuantityPerLine = 99;

  /// Maximum different products in one order (server rule: 1..50 lines).
  static const int maxLines = 50;

  final List<CartLine> _lines = [];

  /// The cart lines in insertion order (read-only view).
  List<CartLine> get lines => List.unmodifiable(_lines);

  bool get isEmpty => _lines.isEmpty;
  bool get isNotEmpty => _lines.isNotEmpty;

  /// Number of different products in the cart.
  int get lineCount => _lines.length;

  /// Number of articles in the cart (sum of the quantities).
  int get itemCount => _lines.fold(0, (sum, line) => sum + line.quantity);

  /// Display total of the cart (the server computes the charged amount).
  double get total => _lines.fold(0.0, (sum, line) => sum + line.lineTotal);

  /// Currency of the cart; JSO prices are all in TND.
  String get currency => _lines.isEmpty ? 'TND' : _lines.first.currency;

  /// Quantity of [productId] in the cart, 0 when absent.
  int quantityOf(String productId) {
    final index = _indexOf(productId);
    return index < 0 ? 0 : _lines[index].quantity;
  }

  /// Adds [quantity] units of [product] (at least 1).
  ///
  /// Re-adding a product merges into its existing line (refreshing the
  /// name/price/image snapshot) and clamps it to [maxQuantityPerLine]. Refuses
  /// out-of-stock products and new lines beyond [maxLines].
  CartAddResult add(Product product, {int quantity = 1}) {
    if (!product.inStock) return CartAddResult.outOfStock;

    final requested = quantity < 1 ? 1 : quantity;
    final index = _indexOf(product.id);
    if (index < 0 && _lines.length >= maxLines) return CartAddResult.cartFull;

    final wanted = (index < 0 ? 0 : _lines[index].quantity) + requested;
    final line = CartLine.fromProduct(product, quantity: _clamp(wanted));
    if (index < 0) {
      _lines.add(line);
    } else {
      _lines[index] = line;
    }
    notifyListeners();
    return wanted > maxQuantityPerLine
        ? CartAddResult.limitReached
        : CartAddResult.added;
  }

  /// Sets the quantity of [productId], clamped to [maxQuantityPerLine]; a
  /// quantity below 1 removes the line. Unknown products are ignored.
  void setQuantity(String productId, int quantity) {
    final index = _indexOf(productId);
    if (index < 0) return;
    if (quantity < 1) {
      _lines.removeAt(index);
      notifyListeners();
      return;
    }
    final next = _clamp(quantity);
    if (next == _lines[index].quantity) return;
    _lines[index] = _lines[index].copyWith(quantity: next);
    notifyListeners();
  }

  /// Adds one unit of [productId] (up to [maxQuantityPerLine]).
  void increment(String productId) =>
      setQuantity(productId, quantityOf(productId) + 1);

  /// Removes one unit of [productId]; going below 1 removes the line.
  void decrement(String productId) =>
      setQuantity(productId, quantityOf(productId) - 1);

  /// Removes the line of [productId].
  void remove(String productId) {
    final index = _indexOf(productId);
    if (index < 0) return;
    _lines.removeAt(index);
    notifyListeners();
  }

  /// Empties the cart (e.g. once an order has been placed).
  void clear() {
    if (_lines.isEmpty) return;
    _lines.clear();
    notifyListeners();
  }

  int _indexOf(String productId) =>
      _lines.indexWhere((line) => line.productId == productId);

  static int _clamp(int quantity) {
    if (quantity < 1) return 1;
    return quantity > maxQuantityPerLine ? maxQuantityPerLine : quantity;
  }
}
