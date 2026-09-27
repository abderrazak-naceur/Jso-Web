import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/error_text.dart';
import '../../core/config/jso_theme.dart';
import '../../data/models/archive_item.dart';
import '../../data/repositories/club_content_repository.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../../shared/widgets/remote_image.dart';
import '../documents/category_filter_bar.dart';

/// Groups [items] under their year for the museum timeline: undated items
/// first, then years from the most recent. Items keep the API order (display
/// order) inside a year.
List<({int? year, List<ArchiveItem> items})> groupArchiveByYear(
  Iterable<ArchiveItem> items,
) {
  final byYear = <int?, List<ArchiveItem>>{};
  for (final item in items) {
    byYear.putIfAbsent(item.year, () => <ArchiveItem>[]).add(item);
  }
  final years = byYear.keys.toList()
    ..sort((a, b) {
      if (a == b) return 0;
      if (a == null) return -1;
      if (b == null) return 1;
      return b.compareTo(a);
    });
  return [for (final year in years) (year: year, items: byYear[year]!)];
}

/// French label for the museum categories suggested by the admin
/// (`Season`, `Trophy`, `Photo`, `Milestone`); other values are shown as-is.
String _categoryLabel(String category) => switch (category) {
  'Season' => 'Saison',
  'Trophy' => 'Trophée',
  'Photo' => 'Photo',
  'Milestone' => 'Jalon',
  _ => category,
};

/// Timeline rail: [JsoColors.gold] at 40% opacity.
const Color _railColor = Color(0x66F4C542);

/// "Musée du club": the digital museum from `GET /api/archive` — past
/// seasons, trophies, period photos and milestones — as a timeline grouped
/// by year, with a client-side category filter.
class ArchiveScreen extends StatefulWidget {
  const ArchiveScreen({super.key});

  @override
  State<ArchiveScreen> createState() => _ArchiveScreenState();
}

class _ArchiveScreenState extends State<ArchiveScreen> {
  late Future<List<ArchiveItem>> _future;

  /// Selected category chip; null means "Tous".
  String? _category;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = context.read<ClubContentRepository>().getArchive();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Musée du club')),
      body: FutureBuilder<List<ArchiveItem>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Chargement des archives…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message:
                  'Impossible de charger les archives.\n'
                  '${describeApiError(snapshot.error!)}',
              onRetry: () => setState(_load),
            );
          }

          final items = snapshot.data ?? const <ArchiveItem>[];
          if (items.isEmpty) {
            return const EmptyView(
              message: 'Les archives arrivent bientôt.',
              icon: Icons.museum_outlined,
            );
          }

          final categories = CategoryFilterBar.categoriesOf(
            items.map((i) => i.category),
            labelOf: _categoryLabel,
          );
          // A category that vanished after a refresh falls back to "Tous".
          final selected = categories.contains(_category) ? _category : null;
          final visible = selected == null
              ? items
              : items.where((i) => i.category == selected);

          return Column(
            children: [
              if (categories.isNotEmpty)
                CategoryFilterBar(
                  categories: categories,
                  selected: selected,
                  labelOf: _categoryLabel,
                  onSelected: (category) =>
                      setState(() => _category = category),
                ),
              Expanded(
                child: RefreshIndicator(
                  color: JsoColors.gold,
                  onRefresh: () async => setState(_load),
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(
                      JsoSpacing.md,
                      0,
                      JsoSpacing.md,
                      JsoSpacing.lg,
                    ),
                    children: [
                      for (final group in groupArchiveByYear(visible)) ...[
                        _YearHeader(
                          label: group.year?.toString() ?? 'Sans date',
                        ),
                        for (final item in group.items)
                          _TimelineEntry(item: item),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _YearHeader extends StatelessWidget {
  const _YearHeader({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: JsoSpacing.md, bottom: JsoSpacing.xs),
      child: Row(
        children: [
          Container(
            width: 24,
            height: 24,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: JsoColors.gold, width: 2),
            ),
            child: Container(
              width: 10,
              height: 10,
              decoration: const BoxDecoration(
                color: JsoColors.gold,
                shape: BoxShape.circle,
              ),
            ),
          ),
          const SizedBox(width: JsoSpacing.sm),
          Semantics(
            header: true,
            child: Text(
              label,
              style: const TextStyle(
                color: JsoColors.gold,
                fontSize: 20,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: JsoSpacing.sm),
          const Expanded(child: Divider(color: JsoColors.border)),
        ],
      ),
    );
  }
}

/// An archive card hanging off the timeline rail, aligned under the year dot.
class _TimelineEntry extends StatelessWidget {
  const _TimelineEntry({required this.item});

  final ArchiveItem item;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(left: 11),
      padding: const EdgeInsets.only(left: JsoSpacing.md),
      decoration: const BoxDecoration(
        border: Border(left: BorderSide(color: _railColor, width: 2)),
      ),
      child: _ArchiveCard(item: item),
    );
  }
}

class _ArchiveCard extends StatelessWidget {
  const _ArchiveCard({required this.item});

  final ArchiveItem item;

  @override
  Widget build(BuildContext context) {
    final body = item.body.trim();
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (item.mediaUrl != null)
            AspectRatio(
              aspectRatio: 16 / 9,
              child: RemoteImage(
                url: item.mediaUrl,
                placeholderIcon: Icons.photo_outlined,
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(JsoSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (item.category.isNotEmpty) ...[
                  Text(
                    _categoryLabel(item.category).toUpperCase(),
                    style: const TextStyle(
                      color: JsoColors.gold,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: JsoSpacing.xs),
                ],
                Text(
                  item.title,
                  style: const TextStyle(
                    color: JsoColors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (body.isNotEmpty) ...[
                  const SizedBox(height: JsoSpacing.sm),
                  Text(
                    body,
                    style: const TextStyle(
                      color: JsoColors.muted,
                      height: 1.45,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
