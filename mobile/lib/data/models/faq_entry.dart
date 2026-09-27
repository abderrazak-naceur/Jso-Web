import 'json_utils.dart';

/// Public FAQ entry — maps an item of `GET /api/faq`: id, question, answer,
/// category, sortOrder.
///
/// The feed is ordered server-side by `sortOrder` then creation date.
/// [category] is optional server-side; blank values are normalised to null.
class FaqEntry {
  const FaqEntry({
    required this.id,
    required this.question,
    required this.answer,
    this.category,
    this.sortOrder = 0,
  });

  final String id;
  final String question;
  final String answer;
  final String? category;
  final int sortOrder;

  factory FaqEntry.fromJson(Map<String, dynamic> json) {
    final category = asString(json['category']).trim();
    return FaqEntry(
      id: asString(json['id']),
      question: asString(json['question']),
      answer: asString(json['answer']),
      category: category.isEmpty ? null : category,
      sortOrder: asInt(json['sortOrder']),
    );
  }
}
