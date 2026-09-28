import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/product.dart';
import '../../data/repositories/shop_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../../shared/widgets/remote_image.dart';
import 'cart_button.dart';
import 'product_detail_screen.dart';
import 'shop_widgets.dart';

/// Boutique: the club catalogue from `GET /api/shop/products` as a grid, with
/// category chips ("Tous" + the categories present in the data, filtered
/// client-side) and the [CartButton] in the AppBar. Tapping a product opens
/// its [ProductDetailScreen].
///
/// Browsing is anonymous; only placing an order (from the cart) needs a fan
/// account. Push it with [ShopScreen.route] so the other shop screens can
/// bring the catalogue back ([ShopScreen.backTo]).
class ShopScreen extends StatefulWidget {
  const ShopScreen({super.key});

  /// Route name set by [route]; lets [backTo] find the catalogue in the stack.
  static const String routeName = '/boutique';

  /// The route opening the catalogue (named [routeName]).
  static Route<void> route() => MaterialPageRoute<void>(
    settings: const RouteSettings(name: routeName),
    builder: (_) => const ShopScreen(),
  );

  /// Brings the catalogue back to the front ("Retour à la boutique",
  /// "Continuer mes achats"): pops back to the [routeName] route when it is in
  /// the stack, otherwise pops to the first route and pushes a new catalogue.
  static void backTo(NavigatorState navigator) {
    var found = false;
    navigator.popUntil((route) {
      found = route.settings.name == routeName;
      return found || route.isFirst;
    });
    if (!found) navigator.push(route());
  }

  @override
  State<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends State<ShopScreen> {
  late Future<List<Product>> _future;

  /// Selected category chip; null means "Tous".
  String? _category;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = context.read<ShopRepository>().getProducts();
  }

  void _open(Product product) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ProductDetailScreen(product: product),
      ),
    );
  }

  /// Distinct categories in catalogue order (the API sorts by category).
  static List<String> _categoriesOf(List<Product> products) => products
      .map((p) => p.category)
      .whereType<String>()
      .toSet()
      .toList(growable: false);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Boutique'),
        actions: const [CartButton()],
      ),
      body: FutureBuilder<List<Product>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Chargement de la boutique…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Impossible de charger la boutique.',
              onRetry: () => setState(_load),
            );
          }

          final products = snapshot.data ?? const <Product>[];
          if (products.isEmpty) {
            return const EmptyView(
              message: 'Aucun produit disponible pour le moment.',
              icon: Icons.storefront_outlined,
            );
          }

          final categories = _categoriesOf(products);
          // A category can vanish after a refresh: fall back to "Tous".
          final selected = categories.contains(_category) ? _category : null;
          final visible = selected == null
              ? products
              : products.where((p) => p.category == selected).toList();

          return RefreshIndicator(
            color: JsoColors.gold,
            onRefresh: () async => setState(_load),
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                if (categories.isNotEmpty)
                  SliverToBoxAdapter(
                    child: _CategoryFilter(
                      categories: categories,
                      selected: selected,
                      onSelected: (c) => setState(() => _category = c),
                    ),
                  ),
                SliverPadding(
                  padding: const EdgeInsets.all(JsoSpacing.md),
                  sliver: SliverGrid.builder(
                    gridDelegate:
                        const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 220,
                          mainAxisSpacing: JsoSpacing.md,
                          crossAxisSpacing: JsoSpacing.md,
                          childAspectRatio: 0.68,
                        ),
                    itemCount: visible.length,
                    itemBuilder: (context, i) => _ProductTile(
                      product: visible[i],
                      onTap: () => _open(visible[i]),
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

/// Horizontally scrolling "Tous" + category choice chips.
class _CategoryFilter extends StatelessWidget {
  const _CategoryFilter({
    required this.categories,
    required this.selected,
    required this.onSelected,
  });

  final List<String> categories;
  final String? selected;
  final ValueChanged<String?> onSelected;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(
        JsoSpacing.md,
        JsoSpacing.md,
        JsoSpacing.md,
        0,
      ),
      child: Row(
        children: [
          _chip('Tous', selected == null, () => onSelected(null)),
          for (final category in categories)
            _chip(category, selected == category, () => onSelected(category)),
        ],
      ),
    );
  }

  Widget _chip(String label, bool isSelected, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(right: JsoSpacing.sm),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => onTap(),
        showCheckmark: false,
        selectedColor: JsoColors.gold,
        backgroundColor: JsoColors.navy2,
        side: BorderSide(color: isSelected ? JsoColors.gold : JsoColors.border),
        labelStyle: TextStyle(
          color: isSelected ? JsoColors.ink : JsoColors.white,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _ProductTile extends StatelessWidget {
  const _ProductTile({required this.product, required this.onTap});

  final Product product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  RemoteImage(
                    url: product.imageUrl,
                    placeholderIcon: Icons.checkroom_outlined,
                  ),
                  if (product.isOutOfStock)
                    const Positioned(
                      top: JsoSpacing.sm,
                      left: JsoSpacing.sm,
                      child: OutOfStockBadge(),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(JsoSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: JsoColors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: JsoSpacing.xs),
                  Text(
                    JsoFormat.money(product.price, product.currency),
                    style: const TextStyle(
                      color: JsoColors.gold,
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
