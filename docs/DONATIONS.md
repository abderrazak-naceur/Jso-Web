# JSO — Système de soutien mensuel

## Modèle proposé

Campagne principale : **1 000 supporters × 10 TND/mois × 12 mois = 120 000 TND/an**.

Objectif de collecte : **10 000 TND/mois**. Le montant de 10 TND est une contribution mensuelle volontaire proposée, pas un prélèvement automatique tant qu'un prestataire ne fournit pas un mandat/abonnement récurrent conforme.

## Parcours recommandé

1. QR code / lien affiché au stade, sur Facebook, WhatsApp, affiches et site.
2. Le supporter choisit le montant conseillé (10 TND par défaut) ou un autre montant. Le paiement est ponctuel ; il peut revenir chaque mois.
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
- Un numéro de reçu unique `JSO-CASH-YYYYMMDD-<ID>` est généré à partir de l'identifiant du don.
- Le reçu contient montant, date, donateur optionnel et point de collecte.
- L'opération est auditée avec le collecteur et le point de vente.
- Le reçu reste vérifiable publiquement via `/api/donations/{id}/receipt`.

Le téléphone du donateur est utilisé uniquement pour la saisie opérationnelle et n'est pas exposé dans le reçu public.
Le nom et la note saisis par le personnel restent absents de la liste publique des dons ; la note n'apparaît pas sur le reçu public.

## Moyens de paiement

La page peut proposer **Flouci**, **Konnect** et **Paymee** en Tunisie, et **Stripe** à l'international. Le donateur choisit le prestataire affiché ; la requête de paiement transmet ce choix à l'API pour éviter qu'un clic sur Flouci ouvre un autre prestataire. Paymee demande aussi une adresse e-mail. Aucun paiement n'est confirmé par le retour du navigateur : seul le webhook vérifié confirme le don.
La page interroge `GET /api/donations/payment-methods` et n'affiche dans le formulaire que les prestataires réellement disponibles. Si aucun prestataire n'est prêt, elle n'affiche pas de formulaire de paiement : elle explique le don en espèces et dirige le supporter vers le contact du club. Flouci exige ses identifiants et son secret webhook en production ; Stripe exige sa clé API et son secret webhook ; Konnect exige sa clé API, le receiver wallet ID et l'URL webhook ; Paymee exige sa clé API et l'URL webhook. Sans ces paramètres, le paiement en ligne reste désactivé.

Le QR affiché sur la page de soutien est scannable et encode l'URL du domaine courant ; le bouton de téléchargement permet de préparer les supports imprimés.

**Orange Money**, **Mobicash/Ooredoo** et **e-DINAR/D17** restent des pistes d'intégration et ne sont pas proposés comme boutons de paiement au supporter. Les moyens éventuellement proposés sur la page hébergée Konnect dépendent du compte marchand ; cela n'active pas les boutons D17/e-DINAR propres au site JSO.

## Sécurité

Le site ne reçoit pas les numéros de carte. Les paiements en ligne sont ouverts sur la page hébergée par le prestataire. Les webhooks sont vérifiés côté serveur et l'état Paid est mis à jour de façon idempotente.

Pour les espèces, seuls les comptes staff ayant une affectation active avec la permission `donations:cash` peuvent émettre un reçu.

## Transparence

La page publique expose le total confirmé, le nombre de contributions et des contributions récentes. L'admin dispose d'un tableau de collecte et les encaissements cash sont auditables.

## Configuration dans l'admin

Ouvrir **Finance → Dons & collecte → Paramètres de la campagne**. Les profils `SuperAdmin`, `ClubAdmin` et `FinanceManager` peuvent définir la contribution mensuelle **conseillée**, l'objectif de collecte mensuel et le nombre cible de donateurs. Ces valeurs sont enregistrées en base et affichées sur la page publique `/soutenir`. La valeur conseillée présélectionne le montant, mais chaque donateur reste libre de la modifier. Aucun prélèvement mensuel automatique n'est créé.

Le bloc **Moyens de paiement** indique l'état de Flouci, Stripe, Konnect et Paymee. Les erreurs des statistiques et des paramètres sont affichées séparément pour que l'une des API n'empêche pas d'utiliser l'autre. Les identifiants Flouci et Stripe se définissent dans les variables d'environnement du service **API** sur Render, puis nécessitent un redéploiement :

- Tunisie : `Payments__Flouci__AppToken`, `Payments__Flouci__AppSecret`, `Payments__Flouci__WebhookSecret`.
- International : `Payments__Stripe__SecretKey`, `Payments__Stripe__WebhookSecret`.
- URL du site pour les retours de paiement : `Payments__PublicBaseUrl` (ou origine CORS configurée).

Konnect et Paymee se configurent dans **Admin → Configuration → Paiements** avec un compte marchand du club, leurs identifiants et une URL webhook publique. Leur activation dans l'admin ne prouve pas qu'un paiement réel aboutit : tester un paiement en environnement de test du prestataire et sa confirmation par webhook avant le lancement.

**Faire un don aujourd'hui si tous les paiements en ligne sont désactivés :** le supporter ouvre `/soutenir`, contacte le club pour trouver un vendeur ou une boutique JSO autorisée, remet la somme choisie et reçoit un reçu numéroté. Le personnel se connecte à `/admin/cash-donations`, vérifie que l'argent a été reçu, saisit le montant puis confirme. L'API comptabilise immédiatement le don et produit le reçu. Le compte staff doit avoir une affectation active avec `donations:cash`; un SuperAdmin peut la créer dans `/admin/security`. Le formulaire public ne peut pas créer ou valider un don en espèces à distance.

Les webhooks doivent aussi être configurés chez les prestataires selon [PAYMENTS.md](PAYMENTS.md). Une configuration présente ne prouve pas à elle seule qu'un paiement réel aboutira : effectuer un paiement test et vérifier sa confirmation dans le tableau admin. Les espèces se saisissent séparément dans **Finance → Dons en espèces** avec une affectation staff autorisée. D17, e-DINAR, ClicToPay, virement, mandat et SMS n'ont pas encore de circuit de confirmation intégré ; leur activation nécessite une intégration spécifique.

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


## Reçu WhatsApp automatique

Après confirmation d'un paiement en ligne par le webhook Stripe/Flouci, si le donateur a renseigné son numéro et accepté WhatsApp, l'API tente d'envoyer automatiquement le reçu via **Meta WhatsApp Cloud API**. Le même mécanisme est utilisé pour les dons cash saisis par un vendeur ou une boutique.

Configuration de production (variables d'environnement Render) :

- `Social__WhatsApp__GraphApiVersion` — version Graph Meta, par défaut `v23.0`
- `Social__WhatsApp__PhoneNumberId` — Phone Number ID WhatsApp Business
- `Social__WhatsApp__AccessToken` — token Meta, jamais commité
- `Social__WhatsApp__TemplateName` — nom du template WhatsApp approuvé, par défaut `jso_donation_receipt`
- `Social__WhatsApp__LanguageCode` — langue du template, par défaut `fr`
- `Social__WhatsApp__ReceiptBaseUrl` — base publique de l'API, par exemple `https://jso-api.onrender.com`

Le template doit être approuvé par Meta et accepter quatre variables dans le body : **nom du donateur, montant, numéro du reçu, URL du reçu**. L'envoi WhatsApp ne bloque jamais l'enregistrement du don si Meta est indisponible ou non configuré.
