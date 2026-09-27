import 'package:flutter/material.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/shop_order.dart';

/// Compact "− n +" quantity control shared by the product sheet and the cart.
///
/// Pass null for [onDecrement] / [onIncrement] to disable a side (e.g. at the
/// 1 and 99 bounds). [large] renders the bigger variant of the product sheet.
class QuantityStepper extends StatelessWidget {
  const QuantityStepper({
    super.key,
    required this.quantity,
    required this.onDecrement,
    required this.onIncrement,
    this.large = false,
  });

  final int quantity;
  final VoidCallback? onDecrement;
  final VoidCallback? onIncrement;
  final bool large;

  @override
  Widget build(BuildContext context) {
    final iconSize = large ? 28.0 : 22.0;
    return Container(
      decoration: BoxDecoration(
        color: JsoColors.navy2,
        borderRadius: BorderRadius.circular(JsoRadius.pill),
        border: Border.all(color: JsoColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            tooltip: 'Diminuer la quantité',
            onPressed: onDecrement,
            icon: const Icon(Icons.remove),
            color: JsoColors.gold,
            iconSize: iconSize,
          ),
          ConstrainedBox(
            constraints: BoxConstraints(minWidth: large ? 44 : 28),
            child: Text(
              '$quantity',
              textAlign: TextAlign.center,
              semanticsLabel: 'Quantité : $quantity',
              style: TextStyle(
                color: JsoColors.white,
                fontSize: large ? 22 : 16,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          IconButton(
            tooltip: 'Augmenter la quantité',
            onPressed: onIncrement,
            icon: const Icon(Icons.add),
            color: JsoColors.gold,
            iconSize: iconSize,
          ),
        ],
      ),
    );
  }
}

/// Status pill of a shop order with its French label: gold pending, cyan
/// paid, blue shipped, emerald delivered, muted cancelled and the error red
/// for a failed payment. Unknown statuses render their raw value, muted.
class OrderStatusChip extends StatelessWidget {
  const OrderStatusChip({super.key, required this.status});

  final String status;

  /// Tailwind emerald-400: the web's "success" green, legible on navy.
  static const Color _emerald = Color(0xFF34D399);

  /// [JsoColors.blue] lightened so the 12px label keeps an AA contrast
  /// ratio on the navy surfaces.
  static const Color _shippedBlue = Color(0xFF8AB4FF);

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      ShopOrderStatus.pending => JsoColors.gold,
      ShopOrderStatus.paid => JsoColors.cyan,
      ShopOrderStatus.shipped => _shippedBlue,
      ShopOrderStatus.delivered => _emerald,
      ShopOrderStatus.failed => Theme.of(context).colorScheme.error,
      _ => JsoColors.muted,
    };
    final label = ShopOrderStatus.label(status);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: JsoSpacing.md,
        vertical: JsoSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: JsoColors.navy2,
        borderRadius: BorderRadius.circular(JsoRadius.pill),
        border: Border.all(color: color),
      ),
      child: Text(
        label,
        semanticsLabel: 'Statut : $label',
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
      ),
    );
  }
}

/// "Rupture de stock" pill overlaid on the image of an unavailable product.
class OutOfStockBadge extends StatelessWidget {
  const OutOfStockBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: JsoSpacing.sm,
        vertical: JsoSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: JsoColors.ink.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(JsoRadius.pill),
        border: Border.all(color: Theme.of(context).colorScheme.error),
      ),
      child: Text(
        'Rupture de stock',
        style: TextStyle(
          color: Theme.of(context).colorScheme.error,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

/// Info banner used across the shop, e.g. to remind that payment is manual
/// (confirmed by the club, paid and collected at the club).
class ShopInfoNote extends StatelessWidget {
  const ShopInfoNote({
    super.key,
    required this.message,
    this.icon = Icons.info_outline,
  });

  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(JsoSpacing.md),
      decoration: BoxDecoration(
        color: JsoColors.navy2,
        borderRadius: BorderRadius.circular(JsoRadius.control),
        border: Border.all(color: JsoColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: JsoColors.gold, size: 20),
          const SizedBox(width: JsoSpacing.sm),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: JsoColors.muted,
                fontSize: 13,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
