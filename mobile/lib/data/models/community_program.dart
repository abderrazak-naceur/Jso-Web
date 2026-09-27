import 'json_utils.dart';

/// Community programme run with a local school, association or partner club
/// (open day, neighbourhood tournament...) — maps an item of
/// `GET /api/community-programs`: id, title, partnerName, description,
/// startDate, endDate.
///
/// The partner contact e-mail is intentionally not exposed by the API.
/// [endDate] is null for open-ended programmes. Both dates are
/// `DateTimeOffset` server-side; the admin enters them as calendar days.
class CommunityProgram {
  const CommunityProgram({
    required this.id,
    required this.title,
    required this.partnerName,
    required this.description,
    required this.startDate,
    this.endDate,
  });

  final String id;
  final String title;
  final String partnerName;
  final String description;
  final DateTime startDate;
  final DateTime? endDate;

  factory CommunityProgram.fromJson(Map<String, dynamic> json) =>
      CommunityProgram(
        id: asString(json['id']),
        title: asString(json['title']),
        partnerName: asString(json['partnerName']).trim(),
        description: asString(json['description']).trim(),
        startDate: asDateTime(json['startDate']),
        endDate: asDateTimeOrNull(json['endDate']),
      );
}
