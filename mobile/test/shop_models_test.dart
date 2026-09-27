import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/data/models/json_utils.dart';
import 'package:jso_mobile/data/models/product.dart';
import 'package:jso_mobile/data/models/shop_order.dart';

void main() {
  group('Product.fromJson', () {
    test('parses the catalogue list (GET /api/shop/products)', () {
      final json = jsonDecode('''
      [
        {
          "id": "0b7f3c2a-5d1e-4c8b-9a6f-000000000002",
          "name": "Écharpe JSO",
          "slug": "echarpe-jso",
          "description": "Écharpe tricotée aux couleurs du club.",
          "price": 25.50,
          "currency": "TND",
          "imageUrl": "/uploads/shop/2026/03/echarpe.jpg",
          "category": "Accessoires",
          "inStock": true
        },
        {
          "id": "0b7f3c2a-5d1e-4c8b-9a6f-000000000001",
          "name": "Maillot domicile 2026",
          "slug": "maillot-domicile-2026",
          "description": null,
          "price": 45,
          "currency": "TND",
          "imageUrl": null,
          "category": "Maillots",
          "inStock": false
        }
      ]
      ''');

      final products = asList(json, Product.fromJson);

      expect(products, hasLength(2));
      final scarf = products.first;
      expect(scarf.id, '0b7f3c2a-5d1e-4c8b-9a6f-000000000002');
      expect(scarf.name, 'Écharpe JSO');
      expect(scarf.slug, 'echarpe-jso');
      expect(scarf.description, 'Écharpe tricotée aux couleurs du club.');
      expect(scarf.price, 25.5);
      expect(scarf.currency, 'TND');
      expect(scarf.imageUrl, '/uploads/shop/2026/03/echarpe.jpg');
      expect(scarf.category, 'Accessoires');
      expect(scarf.inStock, isTrue);
      expect(scarf.isOutOfStock, isFalse);

      final shirt = products.last;
      expect(shirt.price, 45.0);
      expect(shirt.description, isNull);
      expect(shirt.imageUrl, isNull);
      expect(shirt.inStock, isFalse);
      expect(shirt.isOutOfStock, isTrue);
    });

    test('tolerates blank/missing optional fields (GET /products/{slug})', () {
      final json =
          jsonDecode('''
      {
        "id": "0b7f3c2a-5d1e-4c8b-9a6f-000000000004",
        "name": "Casquette",
        "slug": "casquette",
        "description": "   ",
        "price": "12.00",
        "imageUrl": "",
        "category": null
      }
      ''')
              as Map<String, dynamic>;

      final product = Product.fromJson(json);

      expect(product.description, isNull);
      expect(product.imageUrl, isNull);
      expect(product.category, isNull);
      expect(product.price, 12.0);
      expect(product.currency, 'TND');
      expect(product.inStock, isFalse);
    });
  });

  group('ShopOrder.fromJson', () {
    test('parses an order detail with items (GET /api/shop/orders/{id})', () {
      final json =
          jsonDecode('''
      {
        "id": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
        "status": "Paid",
        "currency": "TND",
        "total": 115.50,
        "createdAt": "2026-03-15T18:30:00+01:00",
        "paidAt": "2026-03-16T10:00:00+01:00",
        "items": [
          {
            "productId": "0b7f3c2a-5d1e-4c8b-9a6f-000000000001",
            "productName": "Maillot domicile 2026",
            "unitPrice": 45.00,
            "quantity": 2,
            "lineTotal": 90.00
          },
          {
            "productId": "0b7f3c2a-5d1e-4c8b-9a6f-000000000002",
            "productName": "Écharpe JSO",
            "unitPrice": 25.50,
            "quantity": 1,
            "lineTotal": 25.50
          }
        ]
      }
      ''')
              as Map<String, dynamic>;

      final order = ShopOrder.fromJson(json);

      expect(order.id, '3f2504e0-4f89-11d3-9a0c-0305e82c3301');
      expect(order.reference, '3F2504E0');
      expect(order.status, 'Paid');
      expect(order.statusLabel, 'Payée');
      expect(order.isPending, isFalse);
      expect(order.currency, 'TND');
      expect(order.total, 115.5);
      expect(order.createdAt!.toUtc(), DateTime.utc(2026, 3, 15, 17, 30));
      expect(order.paidAt!.toUtc(), DateTime.utc(2026, 3, 16, 9));
      expect(order.items, hasLength(2));
      expect(order.itemCount, 3);

      final first = order.items.first;
      expect(first.productId, '0b7f3c2a-5d1e-4c8b-9a6f-000000000001');
      expect(first.productName, 'Maillot domicile 2026');
      expect(first.unitPrice, 45.0);
      expect(first.quantity, 2);
      expect(first.lineTotal, 90.0);
    });

    test('parses the list projection: null paidAt and no items', () {
      final json =
          jsonDecode('''
      [
        {
          "id": "9c1d2e3f-0000-4000-8000-000000000001",
          "status": "Pending",
          "currency": "TND",
          "total": 45,
          "createdAt": "2026-03-20T09:15:00+01:00",
          "paidAt": null
        }
      ]
      ''')
              as List;

      final orders = asList(json, ShopOrder.fromJson);

      expect(orders, hasLength(1));
      final order = orders.single;
      expect(order.reference, '9C1D2E3F');
      expect(order.isPending, isTrue);
      expect(order.statusLabel, 'En attente');
      expect(order.total, 45.0);
      expect(order.paidAt, isNull);
      expect(order.items, isEmpty);
      expect(order.itemCount, 0);
    });

    test('parses the 201 create response (no paidAt key)', () {
      final json =
          jsonDecode('''
      {
        "id": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
        "status": "Pending",
        "currency": "TND",
        "total": 90,
        "createdAt": "2026-03-15T18:30:00+00:00",
        "items": [
          {
            "productId": "0b7f3c2a-5d1e-4c8b-9a6f-000000000001",
            "productName": "Maillot domicile 2026",
            "unitPrice": 45,
            "quantity": 2
          }
        ]
      }
      ''')
              as Map<String, dynamic>;

      final order = ShopOrder.fromJson(json);

      expect(order.paidAt, isNull);
      expect(order.items.single.quantity, 2);
      // A missing lineTotal falls back to unitPrice × quantity.
      expect(order.items.single.lineTotal, 90.0);
    });

    test('defaults a missing status/currency and keeps short ids', () {
      final order = ShopOrder.fromJson(const {'id': 'abc', 'total': 10});

      expect(order.status, ShopOrderStatus.pending);
      expect(order.currency, 'TND');
      expect(order.createdAt, isNull);
      expect(order.reference, 'ABC');
    });
  });

  group('ShopOrderStatus.label', () {
    test('translates every backend status to French', () {
      expect(ShopOrderStatus.label('Pending'), 'En attente');
      expect(ShopOrderStatus.label('Paid'), 'Payée');
      expect(ShopOrderStatus.label('Shipped'), 'Expédiée');
      expect(ShopOrderStatus.label('Delivered'), 'Livrée');
      expect(ShopOrderStatus.label('Cancelled'), 'Annulée');
      expect(ShopOrderStatus.label('Failed'), 'Échec du paiement');
    });

    test('returns an unknown status unchanged', () {
      expect(ShopOrderStatus.label('Refunded'), 'Refunded');
    });
  });

  group('CartLine', () {
    test('snapshots the product and posts only productId + quantity', () {
      final product = Product.fromJson(const {
        'id': 'p-1',
        'name': 'Écharpe JSO',
        'slug': 'echarpe-jso',
        'price': 25.5,
        'currency': 'TND',
        'imageUrl': '/uploads/shop/echarpe.jpg',
        'category': 'Accessoires',
        'inStock': true,
      });

      final line = CartLine.fromProduct(product, quantity: 3);

      expect(line.productId, 'p-1');
      expect(line.name, 'Écharpe JSO');
      expect(line.unitPrice, 25.5);
      expect(line.currency, 'TND');
      expect(line.imageUrl, '/uploads/shop/echarpe.jpg');
      expect(line.lineTotal, 76.5);
      expect(line.copyWith(quantity: 5).quantity, 5);
      expect(line.toOrderJson(), {'productId': 'p-1', 'quantity': 3});
    });
  });
}
