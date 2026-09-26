import 'json_utils.dart';

/// Sponsor — maps the public projection of `JSO.Domain.Sponsor`
/// (`GET /api/sponsors`: id, name, logoUrl, websiteUrl, tier, placement).
class Sponsor {
  const Sponsor({
    required this.id,
    required this.name,
    this.logoUrl,
    this.websiteUrl,
    required this.tier,
    required this.placement,
  });

  final String id;
  final String name;
  final String? logoUrl;
  final String? websiteUrl;
  final String tier;
  final String placement;

  factory Sponsor.fromJson(Map<String, dynamic> json) => Sponsor(
    id: asString(json['id']),
    name: asString(json['name']),
    logoUrl: asStringOrNull(json['logoUrl']),
    websiteUrl: asStringOrNull(json['websiteUrl']),
    tier: asString(json['tier'], fallback: 'Partner'),
    placement: asString(json['placement'], fallback: 'Footer'),
  );
}
