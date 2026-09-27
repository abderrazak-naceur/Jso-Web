import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/product.dart';
import '../../shared/format.dart';
import '../../shared/snackbars.dart';
import '../../shared/widgets/remote_image.dart';
import 'cart_button.dart';
import 'cart_controller.dart';
import 'cart_screen.dart';
import 'shop_widgets.dart';

/// Product sheet: large image, category, price, description and a quantity
/// stepper with "Ajouter au panier" (disabled and labelled "Rupture de stock"
/// when the product is unavailable).
///
/// Renders the [product] passed from the catalogue — no extra request. Adding
/// goes through the app-wide [CartController], which enforces the cart rules;
/// its [CartAddResult.message] is shown as feedback, with a "Voir le panier"
/// shortcut once the product is in the cart.
class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key, required this.product});

  final Product product;

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _quantity = 1;

  void _addToCart() {
    final result = context.read<CartController>().add(
      widget.product,
      quantity: _quantity,
    );
    // Captured now: the snackbar can outlive this screen.
    final navigator = Navigator.of(context);
    showJsoMessage(
      context,
      result.message,
      action: result.isInCart
          ? SnackBarAction(
              label: 'Voir le panier',
              textColor: JsoColors.gold,
              onPressed: () => navigator.push(
                MaterialPageRoute<void>(builder: (_) => const CartScreen()),
              ),
            )
          : null,
    );
    if (result == CartAddResult.added) {
      setState(() => _quantity = 1);
    }
  }

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    final inStock = product.inStock;
    const max = CartController.maxQuantityPerLine;

    return Scaffold(
      appBar: AppBar(
        title: Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: const [CartButton()],
      ),
      body: ListView(
        padding: const EdgeInsets.all(JsoSpacing.md),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(JsoRadius.largeCard),
            child: Container(
              height: 320,
              color: JsoColors.navy2,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  RemoteImage(
                    url: product.imageUrl,
                    fit: BoxFit.contain,
                    placeholderIcon: Icons.checkroom_outlined,
                  ),
                  if (!inStock)
                    const Positioned(
                      top: JsoSpacing.md,
                      left: JsoSpacing.md,
                      child: OutOfStockBadge(),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: JsoSpacing.lg),
          if (product.category != null) ...[
            Text(
              product.category!.toUpperCase(),
              style: const TextStyle(
                color: JsoColors.gold,
                fontSize: 12,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: JsoSpacing.xs),
          ],
          Text(
            product.name,
            style: const TextStyle(
              color: JsoColors.white,
              fontSize: 24,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: JsoSpacing.sm),
          Text(
            JsoFormat.money(product.price, product.currency),
            style: const TextStyle(
              color: JsoColors.gold,
              fontSize: 22,
              fontWeight: FontWeight.w900,
            ),
          ),
          if (product.description != null) ...[
            const SizedBox(height: JsoSpacing.md),
            Text(
              product.description!,
              style: const TextStyle(
                color: JsoColors.muted,
                fontSize: 15,
                height: 1.5,
              ),
            ),
          ],
          const SizedBox(height: JsoSpacing.lg),
          if (inStock) ...[
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Quantité',
                    style: TextStyle(
                      color: JsoColors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                QuantityStepper(
                  quantity: _quantity,
                  large: true,
                  onDecrement: _quantity > 1
                      ? () => setState(() => _quantity--)
                      : null,
                  onIncrement: _quantity < max
                      ? () => setState(() => _quantity++)
                      : null,
                ),
              ],
            ),
            const SizedBox(height: JsoSpacing.lg),
          ],
          ElevatedButton.icon(
            onPressed: inStock ? _addToCart : null,
            icon: Icon(
              inStock
                  ? Icons.add_shopping_cart
                  : Icons.remove_shopping_cart_outlined,
            ),
            label: Text(inStock ? 'Ajouter au panier' : 'Rupture de stock'),
          ),
          const SizedBox(height: JsoSpacing.md),
          const ShopInfoNote(
            message:
                'Paiement et retrait au club, après confirmation de votre '
                'commande.',
          ),
        ],
      ),
    );
  }
}
