import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_exception.dart';
import '../../core/config/jso_theme.dart';
import '../../data/models/shop_order.dart';
import '../../data/repositories/shop_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../auth/auth_controller.dart';
import 'my_orders_screen.dart';
import 'shop_widgets.dart';

/// Detail of one fan order from `GET /api/shop/orders/{id}`: reference,
/// status, dates, the snapshotted lines (name, quantity × unit price, line
/// total) and the server-computed total.
///
/// Reads the fan token defensively (ERROR state when the session is gone); a
/// 404 — unknown order or one belonging to another fan — shows "Commande
/// introuvable.".
class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  late Future<ShopOrder> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    final token = context.read<AuthController>().accessToken;
    final repo = context.read<ShopRepository>();
    _future = token == null
        ? Future.error(StateError('not-authenticated'))
        : repo.myOrder(token: token, id: widget.orderId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Détail de la commande')),
      body: FutureBuilder<ShopOrder>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Chargement de la commande…');
          }
          if (snapshot.error is NotFoundException) {
            return const ErrorView(
              message: 'Commande introuvable.',
              icon: Icons.search_off,
            );
          }
          if (snapshot.hasError || !snapshot.hasData) {
            return ErrorView(
              message: shopOrdersErrorText(
                snapshot.error,
                fallback: 'Impossible de charger la commande.',
              ),
              onRetry: () => setState(_load),
            );
          }

          final order = snapshot.data!;
          return RefreshIndicator(
            color: JsoColors.gold,
            onRefresh: () async => setState(_load),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(JsoSpacing.md),
              children: [
                _HeaderCard(order: order),
                if (order.isPending) ...[
                  const SizedBox(height: JsoSpacing.sm),
                  const ShopInfoNote(
                    message:
                        'En attente de confirmation par le club. Le paiement '
                        'et le retrait se font au club.',
                  ),
                ],
                const SizedBox(height: JsoSpacing.lg),
                const Text(
                  'Articles',
                  style: TextStyle(
                    color: JsoColors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: JsoSpacing.sm),
                if (order.items.isEmpty)
                  const Text(
                    'Aucun article dans cette commande.',
                    style: TextStyle(color: JsoColors.muted),
                  )
                else
                  Card(
                    child: Column(
                      children: [
                        for (var i = 0; i < order.items.length; i++) ...[
                          if (i > 0) const Divider(height: 1),
                          _ItemRow(
                            item: order.items[i],
                            currency: order.currency,
                          ),
                        ],
                      ],
                    ),
                  ),
                const SizedBox(height: JsoSpacing.sm),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(JsoSpacing.md),
                    child: Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Total',
                            style: TextStyle(
                              color: JsoColors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        Text(
                          JsoFormat.money(order.total, order.currency),
                          style: const TextStyle(
                            color: JsoColors.gold,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({required this.order});

  final ShopOrder order;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(JsoSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Commande n° ${order.reference}',
                    style: const TextStyle(
                      color: JsoColors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(width: JsoSpacing.sm),
                OrderStatusChip(status: order.status),
              ],
            ),
            if (order.createdAt != null) ...[
              const SizedBox(height: JsoSpacing.sm),
              Text(
                'Passée le ${JsoFormat.dateTime(order.createdAt!)}',
                style: const TextStyle(color: JsoColors.muted),
              ),
            ],
            if (order.paidAt != null) ...[
              const SizedBox(height: JsoSpacing.xs),
              Text(
                'Paiement confirmé le ${JsoFormat.date(order.paidAt!)}',
                style: const TextStyle(color: JsoColors.muted),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ItemRow extends StatelessWidget {
  const _ItemRow({required this.item, required this.currency});

  final ShopOrderItem item;
  final String currency;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(JsoSpacing.md),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  style: const TextStyle(
                    color: JsoColors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: JsoSpacing.xs),
                Text(
                  '${item.quantity} × '
                  '${JsoFormat.money(item.unitPrice, currency)}',
                  style: const TextStyle(color: JsoColors.muted, fontSize: 13),
                ),
              ],
            ),
          ),
          const SizedBox(width: JsoSpacing.md),
          Text(
            JsoFormat.money(item.lineTotal, currency),
            style: const TextStyle(
              color: JsoColors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
