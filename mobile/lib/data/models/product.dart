import 'json_utils.dart';

/// Product — maps the public projection of `JSO.Domain.Product` returned by
/// `GET /api/shop/products` and `GET /api/shop/products/{slug}`
/// (id, name, slug, description, price, currency, imageUrl, category,
/// inStock).
///
/// Only active products are published, and the stock level itself stays
/// server-side: the client just sees [inStock] (`Stock > 0`). [imageUrl] may
/// be a root-relative upload path (`/uploads/...`), which `RemoteImage`
/// resolves against the API host. The backend `Category` column is nullable,
/// so a blank category maps to null.
class Product {
  const Product({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    required this.price,
    required this.currency,
    this.imageUrl,
    this.category,
    required this.inStock,
  });

  final String id;
  final String name;
  final String slug;
  final String? description;
  final double price;
  final String currency;
  final String? imageUrl;
  final String? category;
  final bool inStock;

  bool get isOutOfStock => !inStock;

  factory Product.fromJson(Map<String, dynamic> json) => Product(
    id: asString(json['id']),
    name: asString(json['name']),
    slug: asString(json['slug']),
    description: _blankToNull(json['description']),
    price: asDouble(json['price']),
    currency: _blankToNull(json['currency']) ?? 'TND',
    imageUrl: _blankToNull(json['imageUrl']),
    category: _blankToNull(json['category']),
    inStock: asBool(json['inStock']),
  );

  static String? _blankToNull(Object? value) {
    final text = asStringOrNull(value)?.trim();
    return (text == null || text.isEmpty) ? null : text;
  }
}
