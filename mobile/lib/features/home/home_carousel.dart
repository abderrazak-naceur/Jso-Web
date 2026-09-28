import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/config/jso_theme.dart';
import '../../shared/widgets/remote_image.dart';

/// One card in the "À la une" carousel. Purely presentational data: the Home
/// screen builds these from real club content (next match, latest news,
/// boutique, memberships) and supplies [onTap] for navigation.
class HomeHighlight {
  const HomeHighlight({
    required this.badge,
    required this.title,
    required this.subtitle,
    required this.cta,
    required this.icon,
    this.imageUrl,
    this.accent = JsoColors.navy,
    required this.onTap,
  });

  /// Small pill label (e.g. "PROCHAIN MATCH", "À LA UNE", "BOUTIQUE").
  final String badge;
  final String title;
  final String subtitle;

  /// Call-to-action label shown on the gold button.
  final String cta;

  /// Fallback glyph shown when [imageUrl] is null (news without a cover, etc.).
  final IconData icon;

  /// Optional cover image; when present it fills the card behind a scrim.
  final String? imageUrl;

  /// Card background colour used when there is no image.
  final Color accent;

  final VoidCallback onTap;
}

/// Premium horizontal carousel (PageView) for the Home "À la une" block.
///
/// The centre card is fully visible and slightly larger; the previous/next
/// cards peek in on both edges and are scaled down + faded, making the
/// horizontal swipe obvious. Pagination dots sit below. Matches the JSO design
/// system (rounded corners, soft shadow, navy/gold palette).
class HomeCarousel extends StatefulWidget {
  const HomeCarousel({super.key, required this.items, this.height = 232});

  final List<HomeHighlight> items;
  final double height;

  @override
  State<HomeCarousel> createState() => _HomeCarouselState();
}

class _HomeCarouselState extends State<HomeCarousel> {
  // viewportFraction < 1 leaves room for the neighbouring cards to peek.
  static const double _viewportFraction = 0.84;

  late final PageController _controller;
  double _page = 0;

  @override
  void initState() {
    super.initState();
    _controller = PageController(viewportFraction: _viewportFraction);
    _controller.addListener(_onScroll);
  }

  void _onScroll() {
    // `page` is null until the first layout; fall back to the initial page.
    final value = _controller.page ?? _controller.initialPage.toDouble();
    setState(() => _page = value);
  }

  @override
  void dispose() {
    _controller.removeListener(_onScroll);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.items;
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      children: [
        SizedBox(
          height: widget.height,
          child: PageView.builder(
            controller: _controller,
            padEnds: true,
            itemCount: items.length,
            itemBuilder: (context, index) {
              // Distance of this card from the current scroll position, used
              // to scale and fade side cards relative to the active one.
              final distance = (index - _page).abs().clamp(0.0, 1.0);
              final scale = 1 - (distance * 0.10);
              final opacity = 1 - (distance * 0.35);
              return Semantics(
                button: true,
                label: '${items[index].title}. ${items[index].subtitle}',
                child: Transform.scale(
                  scale: scale,
                  child: Opacity(
                    opacity: math.max(0.0, opacity),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: JsoSpacing.sm,
                        vertical: JsoSpacing.xs,
                      ),
                      child: _HighlightCard(item: items[index]),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: JsoSpacing.sm),
        _Dots(count: items.length, active: _page.round()),
      ],
    );
  }
}

class _HighlightCard extends StatelessWidget {
  const _HighlightCard({required this.item});

  final HomeHighlight item;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(JsoRadius.largeCard),
        boxShadow: const [
          BoxShadow(
            color: JsoColors.shadow,
            blurRadius: 22,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Material(
        color: item.accent,
        borderRadius: BorderRadius.circular(JsoRadius.largeCard),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: item.onTap,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (item.imageUrl != null)
                ExcludeSemantics(
                  child: RemoteImage(
                    url: item.imageUrl,
                    fit: BoxFit.cover,
                    placeholderIcon: item.icon,
                  ),
                ),
              // Scrim so the text stays legible over any image/accent colour.
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0x22071A3A), Color(0xF2071A3A)],
                    stops: [0.15, 1],
                  ),
                ),
              ),
              // Faint brand glyph in the corner for cards without an image.
              if (item.imageUrl == null)
                Positioned(
                  right: -12,
                  top: -12,
                  child: Icon(
                    item.icon,
                    size: 132,
                    color: Colors.white.withValues(alpha: 0.06),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.all(JsoSpacing.md),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: JsoColors.gold,
                        borderRadius: BorderRadius.circular(JsoRadius.pill),
                      ),
                      child: Text(
                        item.badge,
                        style: const TextStyle(
                          color: JsoColors.navy,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                    const SizedBox(height: JsoSpacing.sm),
                    Text(
                      item.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: JsoColors.white,
                        fontSize: 21,
                        height: 1.15,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.4,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: JsoColors.gold2,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: JsoSpacing.sm),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(
                          child: Text(
                            item.cta,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: JsoColors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.arrow_forward_rounded,
                          size: 16,
                          color: JsoColors.white,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Dots extends StatelessWidget {
  const _Dots({required this.count, required this.active});

  final int count;
  final int active;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = 0; i < count; i++)
          AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            margin: const EdgeInsets.symmetric(horizontal: 3),
            width: i == active ? 20 : 8,
            height: 8,
            decoration: BoxDecoration(
              color: i == active ? JsoColors.blue : JsoColors.borderLight,
              borderRadius: BorderRadius.circular(JsoRadius.pill),
            ),
          ),
      ],
    );
  }
}
