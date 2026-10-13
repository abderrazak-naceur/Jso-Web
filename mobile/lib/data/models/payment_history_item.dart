import 'json_utils.dart';

/// A private fan-facing purchase/payment row from
/// `GET /api/account/me/payments`.
class PaymentHistoryItem {
  const PaymentHistoryItem({
    required this.id,
    required this.type,
    required this.description,
    required this.status,
    required this.amount,
    required this.currency,
    this.provider,
    this.createdAt,
    this.paidAt,
  });

  final String id;
  final String type;
  final String description;
  final String status;
  final double amount;
  final String currency;
  final String? provider;
  final DateTime? createdAt;
  final DateTime? paidAt;

  String get statusLabel => switch (status) {
    'Paid' || 'Confirmed' || 'CheckedIn' || 'Active' => 'Payé',
    'Pending' => 'En attente',
    'Failed' => 'Échec du paiement',
    'Cancelled' => 'Annulé',
    'Expired' => 'Expiré',
    'Promo' => 'Accès promotionnel',
    _ => status,
  };

  DateTime? get activityDate => paidAt ?? createdAt;

  factory PaymentHistoryItem.fromJson(Map<String, dynamic> json) =>
      PaymentHistoryItem(
        id: asString(json['id']),
        type: asString(json['type']),
        description: asString(json['description'], fallback: 'Opération JSO'),
        status: asString(json['status'], fallback: 'Pending'),
        amount: asDouble(json['amount']),
        currency: asString(json['currency'], fallback: 'TND'),
        provider: asStringOrNull(json['provider']),
        createdAt: asDateTimeOrNull(json['createdAt']),
        paidAt: asDateTimeOrNull(json['paidAt']),
      );
}
