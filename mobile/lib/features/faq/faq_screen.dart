import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/error_text.dart';
import '../../core/config/jso_theme.dart';
import '../../data/models/faq_entry.dart';
import '../../data/repositories/club_content_repository.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../documents/category_filter_bar.dart';

/// "Questions fréquentes": the published FAQ from `GET /api/faq` (ordered by
/// the admin's sort order), one expandable tile per question, with a
/// client-side category filter.
class FaqScreen extends StatefulWidget {
  const FaqScreen({super.key});

  @override
  State<FaqScreen> createState() => _FaqScreenState();
}

class _FaqScreenState extends State<FaqScreen> {
  late Future<List<FaqEntry>> _future;

  /// Selected category chip; null means "Tous".
  String? _category;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = context.read<ClubContentRepository>().getFaq();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Questions fréquentes')),
      body: FutureBuilder<List<FaqEntry>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Chargement des questions…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message:
                  'Impossible de charger les questions fréquentes.\n'
                  '${describeApiError(snapshot.error!)}',
              onRetry: () => setState(_load),
            );
          }

          final entries = snapshot.data ?? const <FaqEntry>[];
          if (entries.isEmpty) {
            return const EmptyView(
              message: 'Aucune question pour le moment.',
              icon: Icons.help_outline,
            );
          }

          final categories = CategoryFilterBar.categoriesOf(
            entries.map((e) => e.category),
          );
          // A category that vanished after a refresh falls back to "Tous".
          final selected = categories.contains(_category) ? _category : null;
          final visible = selected == null
              ? entries
              : entries.where((e) => e.category == selected).toList();

          return Column(
            children: [
              if (categories.isNotEmpty)
                CategoryFilterBar(
                  categories: categories,
                  selected: selected,
                  onSelected: (category) =>
                      setState(() => _category = category),
                ),
              Expanded(
                child: RefreshIndicator(
                  color: JsoColors.gold,
                  onRefresh: () async => setState(_load),
                  child: ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(
                      horizontal: JsoSpacing.md,
                      vertical: JsoSpacing.sm,
                    ),
                    itemCount: visible.length,
                    itemBuilder: (context, i) => _FaqTile(
                      entry: visible[i],
                      // The category is redundant once a chip filters by it.
                      showCategory: selected == null,
                    ),
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

class _FaqTile extends StatelessWidget {
  const _FaqTile({required this.entry, required this.showCategory});

  final FaqEntry entry;
  final bool showCategory;

  @override
  Widget build(BuildContext context) {
    final category = entry.category;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        // Keeps each tile's expanded state while the lazy list scrolls.
        key: PageStorageKey<String>('faq-${entry.id}'),
        shape: const Border(),
        collapsedShape: const Border(),
        iconColor: JsoColors.gold,
        collapsedIconColor: JsoColors.muted,
        textColor: JsoColors.gold,
        collapsedTextColor: JsoColors.white,
        tilePadding: const EdgeInsets.symmetric(
          horizontal: JsoSpacing.md,
          vertical: JsoSpacing.xs,
        ),
        childrenPadding: const EdgeInsets.fromLTRB(
          JsoSpacing.md,
          0,
          JsoSpacing.md,
          JsoSpacing.md,
        ),
        expandedAlignment: Alignment.centerLeft,
        expandedCrossAxisAlignment: CrossAxisAlignment.start,
        title: Text(
          entry.question,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: showCategory && category != null
            ? Text(
                category,
                style: const TextStyle(color: JsoColors.muted, fontSize: 12),
              )
            : null,
        children: [
          Text(
            entry.answer,
            style: const TextStyle(color: JsoColors.white, height: 1.5),
          ),
        ],
      ),
    );
  }
}
