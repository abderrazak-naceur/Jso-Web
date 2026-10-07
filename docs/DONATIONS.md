# JSO — Système de soutien mensuel

## Modèle proposé

Campagne principale : **1 000 supporters × 10 TND/mois × 12 mois = 120 000 TND/an**.

Ce modèle transforme une collecte ponctuelle en soutien prévisible pour le club. Il faut le présenter comme un engagement mensuel volontaire et ne débiter automatiquement un moyen de paiement que si le prestataire et le consentement du supporter le permettent.

## Parcours recommandé

1. QR code / lien affiché au stade, sur Facebook, WhatsApp, affiches et site.
2. Le supporter choisit 10 TND/mois ou un autre montant.
3. Il choisit un moyen de paiement.
4. Le paiement est traité par le prestataire ; JSO ne stocke pas les données de carte.
5. Le serveur attend la confirmation du prestataire avant de comptabiliser le don.
6. Le supporter voit l'avancement collectif.

## Moyens de paiement

La première version branche le paiement hébergé existant **Flouci** pour la Tunisie et **Stripe** pour l'international.

La page affiche aussi **Orange Money**, **Mobicash/Ooredoo** et **e-DINAR/D17** comme options prévues, mais elles restent désactivées tant qu'un compte marchand/contrat et un flux d'intégration adaptés ne sont pas obtenus.

Orange décrit Mobimoney comme un paiement électronique via mobile, avec USSD et Max It. Ooredoo indique que Mobicash permet le paiement d'un commerçant via téléphone/USSD et qu'un marchand doit s'enregistrer pour recevoir les paiements.

## Sécurité

Le site ne reçoit pas les numéros de carte. Les paiements sont ouverts sur la page hébergée par le prestataire. Les webhooks sont vérifiés côté serveur et l'état Paid est mis à jour de façon idempotente.

## Transparence

La page publique expose le total confirmé, le nombre de contributions et des contributions récentes avec nom/message optionnels. L'admin dispose d'un tableau de collecte.

## À faire avant le lancement

- Obtenir et valider le compte marchand du club pour chaque méthode mobile.
- Définir le montant mensuel et la durée de campagne.
- Vérifier les frais de chaque prestataire.
- Valider les aspects comptables et juridiques de la collecte avec l'association.
- Configurer les secrets webhook et tester le parcours en sandbox.
- Tester sur mobile et avec le QR imprimé.

## Règle produit

Ne pas afficher qu'un moyen de paiement est disponible tant que le contrat marchand et les identifiants API correspondants ne sont pas configurés.
