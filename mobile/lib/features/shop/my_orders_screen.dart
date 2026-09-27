import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/error_text.dart';
import '../../core/config/jso_theme.dart';
import '../../data/models/shop_order.dart';
import '../../data/repositories/shop_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../auth/auth_controller.dart';
import 'order_detail_screen.dart';
import 'shop_widgets.dart';

/// "Mes commandes": the current fan's shop orders from
/// `GET /api/shop/orders`, newest first, each with its status chip, total and
/// date. Tapping an order opens its [OrderDetailScreen].
///
/// Meant to be reached from the authenticated profile, but it reads the token
/// defensively and shows the ERROR state if the session is gone.
class MyOrdersScreen extends StatefulWidget {
  const MyOrdersScreen({super.key});

  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen> {
  late Future<List<ShopOrder>> _future;

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
        : repo.myOrders(token);
  }

  void _open(ShopOrder order) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => OrderDetailScreen(orderId: order.id),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes commandes')),
      body: FutureBuilder<List<ShopOrder>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Chargement de vos commandes…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: shopOrdersErrorText(
                snapshot.error,
                fallback: 'Impossible de charger vos commandes.',
              ),
              onRetry: () => setState(_load),
            );
          }

          final orders = snapshot.data ?? const <ShopOrder>[];
          if (orders.isEmpty) {
            return const EmptyView(
              message: 'Vous n\'avez pas encore passé de commande.',
              icon: Icons.receipt_long_outlined,
            );
          }

          return RefreshIndicator(
            color: JsoColors.gold,
            onRefresh: () async => setState(_load),
            child: ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(JsoSpacing.md),
              itemCount: orders.length,
              itemBuilder: (context, i) =>
                  _OrderCard(order: orders[i], onTap: () => _open(orders[i])),
            ),
          );
        },
      ),
    );
  }
}

/// French error copy for the fan order screens: a missing session (the
/// `StateError` raised when there is no token) or an expired one (401) asks
/// to sign in again; anything else shows [fallback].
String shopOrdersErrorText(Object? error, {required String fallback}) {
  if (error is StateError) {
    return 'Connectez-vous pour consulter vos commandes.';
  }
  if (error is ApiHttpException && error.statusCode == 401) {
    return describeApiError(error);
  }
  return fallback;
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order, required this.onTap});

  final ShopOrder order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(JsoRadius.card),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(JsoSpacing.md),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Commande n° ${order.reference}',
                      style: const TextStyle(
                        color: JsoColors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: JsoSpacing.xs),
                    Text(
                      JsoFormat.money(order.total, order.currency),
                      style: const TextStyle(
                        color: JsoColors.gold,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (order.createdAt != null) ...[
                      const SizedBox(height: JsoSpacing.xs),
                      Text(
                        JsoFormat.date(order.createdAt!),
                        style: const TextStyle(
                          color: JsoColors.muted2,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: JsoSpacing.md),
              OrderStatusChip(status: order.status),
              const SizedBox(width: JsoSpacing.xs),
              const Icon(Icons.chevron_right, color: JsoColors.muted2),
            ],
          ),
        ),
      ),
    );
  }
}
