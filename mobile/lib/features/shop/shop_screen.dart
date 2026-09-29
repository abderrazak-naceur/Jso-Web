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
                // Featured products carousel (Swiper-style): the first items
                // shown as horizontally scrollable cards with pagination.
                if (selected == null && products.isNotEmpty)
                  SliverToBoxAdapter(
                    child: _ProductsCarousel(
                      products: products.take(7).toList(),
                      onOpen: _open,
                    ),
                  ),
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

/// Swiper-style horizontal carousel of featured product cards: ~2.2 cards are
/// visible at once and swipe/scroll horizontally, with pagination bullets.
class _ProductsCarousel extends StatefulWidget {
  const _ProductsCarousel({required this.products, required this.onOpen});

  final List<Product> products;
  final ValueChanged<Product> onOpen;

  @override
  State<_ProductsCarousel> createState() => _ProductsCarouselState();
}

class _ProductsCarouselState extends State<_ProductsCarousel> {
  late final PageController _controller;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    _controller = PageController(viewportFraction: 0.62);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final products = widget.products;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(
            JsoSpacing.md,
            JsoSpacing.md,
            JsoSpacing.md,
            0,
          ),
          child: Text(
            'Nouveautés',
            style: TextStyle(
              color: JsoColors.white,
              fontSize: 20,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.3,
            ),
          ),
        ),
        SizedBox(
          height: 320,
          child: PageView.builder(
            controller: _controller,
            physics: const BouncingScrollPhysics(),
            padEnds: false,
            onPageChanged: (i) => setState(() => _page = i),
            itemCount: products.length,
            itemBuilder: (context, i) => Padding(
              padding: const EdgeInsets.fromLTRB(
                JsoSpacing.md,
                JsoSpacing.sm,
                0,
                JsoSpacing.sm,
              ),
              child: _ProductCarouselCard(
                product: products[i],
                onTap: () => widget.onOpen(products[i]),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 4, bottom: JsoSpacing.sm),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < products.length; i++)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: i == _page ? 20 : 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: i == _page ? JsoColors.gold : JsoColors.muted2,
                    borderRadius: BorderRadius.circular(JsoRadius.pill),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// A featured product slide: image on a light panel, name, price and a
/// "Découvrir" button — mirroring the reference product tile.
class _ProductCarouselCard extends StatelessWidget {
  const _ProductCarouselCard({required this.product, required this.onTap});

  final Product product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: JsoColors.surface,
      borderRadius: BorderRadius.circular(JsoRadius.largeCard),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              flex: 5,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: JsoColors.surfaceMuted,
                    padding: const EdgeInsets.all(JsoSpacing.md),
                    child: RemoteImage(
                      url: product.imageUrl,
                      fit: BoxFit.contain,
                      placeholderIcon: Icons.checkroom_outlined,
                    ),
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
            Expanded(
              flex: 4,
              child: Padding(
                padding: const EdgeInsets.all(JsoSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if ((product.category ?? '').isNotEmpty)
                      Text(
                        product.category!.toUpperCase(),
                        style: const TextStyle(
                          color: JsoColors.inkMuted,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                    const SizedBox(height: 2),
                    Text(
                      product.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: JsoColors.inkText,
                        fontSize: 15,
                        height: 1.15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      JsoFormat.money(product.price, product.currency),
                      style: const TextStyle(
                        color: JsoColors.navy,
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: JsoSpacing.sm),
                    SizedBox(
                      width: double.infinity,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: JsoColors.navy,
                          borderRadius: BorderRadius.circular(JsoRadius.pill),
                        ),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 10),
                          child: Text(
                            'Découvrir',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: JsoColors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
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
