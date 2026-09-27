import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import 'cart_controller.dart';
import 'cart_screen.dart';

/// AppBar action opening the [CartScreen], with a gold badge counting the
/// articles in the cart (hidden while the cart is empty).
///
/// Reads the app-wide [CartController]; it only rebuilds when the article
/// count changes.
class CartButton extends StatelessWidget {
  const CartButton({super.key});

  @override
  Widget build(BuildContext context) {
    final count = context.select<CartController, int>(
      (cart) => cart.itemCount,
    );
    return IconButton(
      tooltip: 'Panier',
      onPressed: () => Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const CartScreen()),
      ),
      icon: Badge(
        isLabelVisible: count > 0,
        backgroundColor: JsoColors.gold,
        textColor: JsoColors.ink,
        label: Text(
          count > 99 ? '99+' : '$count',
          semanticsLabel: count == 1
              ? '1 article dans le panier'
              : '$count articles dans le panier',
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        child: const Icon(Icons.shopping_bag_outlined),
      ),
    );
  }
}
