import 'package:flutter/material.dart';

import '../../core/config/jso_theme.dart';

/// Horizontal row of category [ChoiceChip]s: an "all" chip ([allLabel])
/// followed by one chip per category, styled for the dark JSO theme (gold
/// when selected, white label on navy otherwise).
///
/// Shared by the "Vie du club" screens that filter a list client-side
/// (documents, FAQ, museum). [selected] is null while the "all" chip is
/// active; [onSelected] reports the tapped category, or null for "all".
/// [labelOf] maps a raw category to its display label (defaults to the raw
/// value).
class CategoryFilterBar extends StatelessWidget {
  const CategoryFilterBar({
    super.key,
    required this.categories,
    required this.selected,
    required this.onSelected,
    this.allLabel = 'Tous',
    this.labelOf,
  });

  final List<String> categories;
  final String? selected;
  final ValueChanged<String?> onSelected;
  final String allLabel;
  final String Function(String category)? labelOf;

  /// Distinct, trimmed, non-blank categories from [values], sorted by their
  /// display label (case-insensitive) so the chip order stays stable when the
  /// feed order changes.
  static List<String> categoriesOf(
    Iterable<String?> values, {
    String Function(String category)? labelOf,
  }) {
    final unique = <String>{
      for (final value in values)
        if (value != null && value.trim().isNotEmpty) value.trim(),
    };
    String key(String category) =>
        (labelOf?.call(category) ?? category).toLowerCase();
    return unique.toList()..sort((a, b) => key(a).compareTo(key(b)));
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(
        JsoSpacing.md,
        JsoSpacing.sm,
        JsoSpacing.md,
        JsoSpacing.xs,
      ),
      child: Row(
        children: [
          _chip(
            label: allLabel,
            isSelected: selected == null,
            onTap: () => onSelected(null),
          ),
          for (final category in categories) ...[
            const SizedBox(width: JsoSpacing.sm),
            _chip(
              label: labelOf?.call(category) ?? category,
              isSelected: selected == category,
              onTap: () => onSelected(category),
            ),
          ],
        ],
      ),
    );
  }

  Widget _chip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return ChoiceChip(
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
    );
  }
}
