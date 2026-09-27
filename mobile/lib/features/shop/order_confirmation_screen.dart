import 'package:flutter/material.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/shop_order.dart';
import '../../shared/format.dart';
import 'my_orders_screen.dart';
import 'shop_screen.dart';
import 'shop_widgets.dart';

/// "Commande enregistrée": shown once `POST /api/shop/orders` accepted the
/// cart, with the short order reference, the server-computed total and the
/// `Pending` status.
///
/// Payment is manual: the fan is reminded that the club confirms the order
/// and that payment and pick-up happen at the club. Offers "Voir mes
/// commandes" and "Continuer mes achats" (back to the catalogue).
class OrderConfirmationScreen extends StatelessWidget {
  const OrderConfirmationScreen({super.key, required this.order});

  final ShopOrder order;

  void _openMyOrders(BuildContext context) {
    final navigator = Navigator.of(context);
    ShopScreen.backTo(navigator);
    navigator.push(
      MaterialPageRoute<void>(builder: (_) => const MyOrdersScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Commande enregistrée')),
      body: ListView(
        padding: const EdgeInsets.all(JsoSpacing.lg),
        children: [
          const Center(
            child: CircleAvatar(
              radius: 36,
              backgroundColor: JsoColors.navy3,
              child: Icon(Icons.check_rounded, color: JsoColors.gold, size: 40),
            ),
          ),
          const SizedBox(height: JsoSpacing.lg),
          const Text(
            'Merci pour votre commande',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: JsoColors.white,
              fontSize: 22,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: JsoSpacing.sm),
          Text(
            'Référence ${order.reference}',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: JsoColors.gold,
              fontSize: 16,
              fontWeight: FontWeight.w800,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: JsoSpacing.lg),
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: JsoSpacing.md,
                vertical: JsoSpacing.sm,
              ),
              child: Column(
                children: [
                  _SummaryRow(
                    label: 'Total',
                    value: Text(
                      JsoFormat.money(order.total, order.currency),
                      style: const TextStyle(
                        color: JsoColors.gold,
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const Divider(height: 1),
                  _SummaryRow(
                    label: 'Statut',
                    value: OrderStatusChip(status: order.status),
                  ),
                  if (order.items.isNotEmpty) ...[
                    const Divider(height: 1),
                    _SummaryRow(
                      label: 'Articles',
                      value: Text(
                        '${order.itemCount}',
                        style: const TextStyle(
                          color: JsoColors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                  if (order.createdAt != null) ...[
                    const Divider(height: 1),
                    _SummaryRow(
                      label: 'Date',
                      value: Text(
                        JsoFormat.dateTime(order.createdAt!),
                        style: const TextStyle(color: JsoColors.white),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: JsoSpacing.md),
          const ShopInfoNote(
            icon: Icons.storefront_outlined,
            message:
                'Le club va confirmer votre commande. Le paiement et le '
                'retrait se font au club, après confirmation. Suivez son '
                'statut dans « Mes commandes ».',
          ),
          const SizedBox(height: JsoSpacing.lg),
          ElevatedButton.icon(
            onPressed: () => _openMyOrders(context),
            icon: const Icon(Icons.receipt_long_outlined),
            label: const Text('Voir mes commandes'),
          ),
          const SizedBox(height: JsoSpacing.md),
          OutlinedButton.icon(
            onPressed: () => ShopScreen.backTo(Navigator.of(context)),
            icon: const Icon(Icons.storefront_outlined),
            label: const Text('Continuer mes achats'),
            style: OutlinedButton.styleFrom(
              foregroundColor: JsoColors.gold,
              side: const BorderSide(color: JsoColors.gold),
              padding: const EdgeInsets.symmetric(
                horizontal: JsoSpacing.lg,
                vertical: JsoSpacing.md,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(JsoRadius.control),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value});

  final String label;
  final Widget value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: JsoSpacing.md),
      child: Row(
        children: [
          Expanded(
            child: Text(label, style: const TextStyle(color: JsoColors.muted)),
          ),
          value,
        ],
      ),
    );
  }
}
