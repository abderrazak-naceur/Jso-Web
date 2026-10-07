# JSO — Système de soutien mensuel

## Modèle proposé

Campagne principale : **1 000 supporters × 10 TND/mois × 12 mois = 120 000 TND/an**.

Objectif de collecte : **10 000 TND/mois**. Le montant de 10 TND est une contribution mensuelle volontaire proposée, pas un prélèvement automatique tant qu'un prestataire ne fournit pas un mandat/abonnement récurrent conforme.

## Parcours recommandé

1. QR code / lien affiché au stade, sur Facebook, WhatsApp, affiches et site.
2. Le supporter choisit 10 TND/mois ou un autre montant.
3. Il choisit un moyen de paiement.
4. Le paiement est traité par le prestataire ; JSO ne stocke pas les données de carte.
5. Le serveur attend la confirmation du prestataire avant de comptabiliser le don.
6. Le supporter voit l'avancement collectif.
7. Pour les dons physiques, un vendeur ou une boutique autorisée peut encaisser l'espèce et **imprimer un reçu numéroté immédiatement**.

## Collecte en espèces — vendeurs et boutiques

Le back-office contient maintenant un écran **Dons en espèces** accessible aux profils autorisés via leurs affectations staff :

- `TicketSeller` : collecte auprès des vendeurs.
- `ShopManager` : collecte auprès des boutiques.
- `TicketSupervisor`, `ClubAdmin`, `SuperAdmin` : peuvent utiliser les deux circuits.
- Chaque encaissement crée immédiatement un `SupporterBrick` payé avec le provider `Cash`.
- Un numéro de reçu unique `JSO-CASH-YYYYMMDD-XXXXXX` est généré.
- Le reçu contient montant, date, donateur optionnel et point de collecte.
- L'opération est auditée avec le collecteur et le point de vente.
- Le reçu reste vérifiable publiquement via `/api/donations/{id}/receipt`.

Le téléphone du donateur est utilisé uniquement pour la saisie opérationnelle et n'est pas exposé dans le reçu public.

## Moyens de paiement

La première version branche le paiement hébergé existant **Flouci** pour la Tunisie et **Stripe** pour l'international.

La page affiche aussi **Orange Money**, **Mobicash/Ooredoo** et **e-DINAR/D17** comme options prévues, mais elles restent désactivées tant qu'un compte marchand/contrat et un flux d'intégration adaptés ne sont pas obtenus.

## Sécurité

Le site ne reçoit pas les numéros de carte. Les paiements en ligne sont ouverts sur la page hébergée par le prestataire. Les webhooks sont vérifiés côté serveur et l'état Paid est mis à jour de façon idempotente.

Pour les espèces, seuls les comptes staff ayant une affectation active avec la permission `donations:cash` peuvent émettre un reçu.

## Transparence

La page publique expose le total confirmé, le nombre de contributions et des contributions récentes. L'admin dispose d'un tableau de collecte et les encaissements cash sont auditables.

## À faire avant le lancement

- Obtenir et valider le compte marchand du club pour chaque méthode mobile.
- Définir le montant mensuel et la durée de campagne.
- Vérifier les frais de chaque prestataire.
- Valider les aspects comptables et juridiques de la collecte avec l'association.
- Configurer les secrets webhook et tester le parcours en sandbox.
- Tester sur mobile et avec le QR imprimé.
- Tester le circuit cash vendeur → reçu → reporting financier.

## Règle produit

Ne pas afficher qu'un moyen de paiement est disponible tant que le contrat marchand et les identifiants API correspondants ne sont pas configurés.
