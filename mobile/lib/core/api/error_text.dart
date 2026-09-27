import 'api_exception.dart';

/// Turns any error thrown by the API layer into French UI copy.
///
/// The JSO backend answers validation failures with `{ "message": ... }`,
/// mostly in English; [ApiClient] keeps that text on
/// [ApiHttpException.serverMessage]. Known backend messages are translated
/// here so every screen shows French text; unknown server messages are shown
/// as-is (the newer endpoints already answer in French), and everything else
/// falls back to a generic French message per failure kind / status code.
String describeApiError(Object error) {
  return switch (error) {
    NetworkException() => 'Connexion impossible. Vérifiez votre réseau.',
    ApiTimeoutException() => 'Le serveur met trop de temps à répondre.',
    ApiParseException() => 'Réponse inattendue du serveur.',
    NotFoundException() => 'Contenu introuvable.',
    InvalidCredentialsException() => 'Identifiants invalides.',
    EmailAlreadyExistsException() => 'Un compte existe déjà avec cet email.',
    ApiHttpException(:final statusCode, :final serverMessage) =>
      _fromServer(serverMessage) ?? _fromStatus(statusCode),
    ValidationException(:final message) =>
      _fromServer(message) ?? 'Les informations saisies sont invalides.',
    _ => 'Une erreur est survenue. Veuillez réessayer.',
  };
}

String? _fromServer(String? message) {
  final text = message?.trim() ?? '';
  if (text.isEmpty || text == 'Validation failed.') return null;
  final known = _translations[text];
  if (known != null) return known;
  final stock = RegExp(r"^Not enough stock for '(.+)'\.$").firstMatch(text);
  if (stock != null) return 'Stock insuffisant pour « ${stock.group(1)} ».';
  return text;
}

String _fromStatus(int status) {
  if (status == 400) return 'Les informations saisies sont invalides.';
  if (status == 401) return 'Votre session a expiré. Reconnectez-vous.';
  if (status == 403) return 'Accès refusé.';
  if (status == 409) return 'Cette action n\'est pas possible pour le moment.';
  if (status == 429) return 'Trop de tentatives. Réessayez dans un instant.';
  if (status >= 500) {
    return 'Le serveur rencontre un problème. Réessayez plus tard.';
  }
  return 'Une erreur est survenue. Veuillez réessayer.';
}

/// English `{message}` strings returned by the backend controllers the app
/// calls (tickets, shop orders, account, supporters wall, classifieds).
const Map<String, String> _translations = {
  // TicketsController
  'Quantity must be between 1 and 10.':
      'La quantité doit être comprise entre 1 et 10.',
  'Ticket type not available.': 'Ce type de billet n\'est plus disponible.',
  'Not enough tickets available.': 'Plus assez de places disponibles.',
  // ShopOrdersController
  'The cart is empty.': 'Le panier est vide.',
  'Too many items in a single order.':
      'Trop d\'articles dans une seule commande.',
  'Each quantity must be between 1 and 99.':
      'Chaque quantité doit être comprise entre 1 et 99.',
  'A product in the cart is no longer available.':
      'Un produit du panier n\'est plus disponible.',
  // AccountController
  'Display name cannot be empty.': 'Le nom affiché ne peut pas être vide.',
  'A valid birth date is required.':
      'Une date de naissance valide est requise.',
  'Current and new passwords are required.':
      'Le mot de passe actuel et le nouveau sont requis.',
  'New password must contain at least 12 characters.':
      'Le nouveau mot de passe doit contenir au moins 12 caractères.',
  'The current password is incorrect.': 'Le mot de passe actuel est incorrect.',
  // SupportersController
  'Display name is required.': 'Le nom est requis.',
  'Display name must be 80 characters or fewer.':
      'Le nom ne doit pas dépasser 80 caractères.',
  'Message must be 280 characters or fewer.':
      'Le message ne doit pas dépasser 280 caractères.',
  'Amount cannot be negative.': 'Le montant ne peut pas être négatif.',
  'Amount is out of range.': 'Le montant est hors limites.',
  // ClassifiedsController
  'Title is required.': 'Le titre est requis.',
  'Title must be 120 characters or fewer.':
      'Le titre ne doit pas dépasser 120 caractères.',
  'Body is required.': 'La description est requise.',
  'Body must be 4000 characters or fewer.':
      'La description ne doit pas dépasser 4000 caractères.',
  'Category is required.': 'La catégorie est requise.',
  'Category must be 60 characters or fewer.':
      'La catégorie ne doit pas dépasser 60 caractères.',
  'Contact info must be 200 characters or fewer.':
      'Le contact ne doit pas dépasser 200 caractères.',
  'Price cannot be negative.': 'Le prix ne peut pas être négatif.',
  'Price is out of range.': 'Le prix est hors limites.',
};
