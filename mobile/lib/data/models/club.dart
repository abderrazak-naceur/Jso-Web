import 'json_utils.dart';

/// Club entity — maps `JSO.Domain.Club`.
class Club {
  const Club({
    required this.id,
    required this.name,
    required this.shortName,
    required this.country,
    required this.city,
    this.description,
    this.logoUrl,
  });

  final String id;
  final String name;
  final String shortName;
  final String country;
  final String city;
  final String? description;
  final String? logoUrl;

  factory Club.fromJson(Map<String, dynamic> json) => Club(
    id: asString(json['id']),
    name: asString(json['name']),
    shortName: asString(json['shortName']),
    country: asString(json['country']),
    city: asString(json['city']),
    description: asStringOrNull(json['description']),
    logoUrl: asStringOrNull(json['logoUrl']),
  );
}
