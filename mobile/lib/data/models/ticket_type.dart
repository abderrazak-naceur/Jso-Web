import 'json_utils.dart';

/// TicketType — maps the public projection of `JSO.Domain.TicketType`
/// (`GET /api/tickets/match/{matchId}`: id, name, price, currency, available).
///
/// `available` is computed server-side as `Capacity - SoldCount`, so the client
/// only ever sees remaining places for an active ticket type.
class TicketType {
  const TicketType({
    required this.id,
    required this.name,
    required this.price,
    required this.currency,
    required this.available,
  });

  final String id;
  final String name;
  final double price;
  final String currency;
  final int available;

  bool get isSoldOut => available <= 0;

  factory TicketType.fromJson(Map<String, dynamic> json) => TicketType(
    id: asString(json['id']),
    name: asString(json['name']),
    price: asDouble(json['price']),
    currency: asString(json['currency'], fallback: 'TND'),
    available: asInt(json['available']),
  );
}
