# Paiements en ligne de la boutique (Flouci + Stripe)

La boutique fan encaisse les commandes en ligne via **deux prestataires**, choisis
automatiquement selon le **pays** indiqué par l'acheteur au moment du paiement :

| Pays de l'acheteur | Prestataire | Devise | Page de paiement |
| ------------------ | ----------- | ------ | ---------------- |
| Tunisie (`TN`)     | **Flouci**  | TND    | Lien/QR hébergé Flouci |
| Tout autre pays    | **Stripe**  | EUR *(par défaut)* | Stripe Checkout hébergé |

Les prix étant stockés en **TND**, le montant Stripe est **converti** en devise
internationale avant l'encaissement (voir « Devise et conversion » ci-dessous). Le
montant et la devise réellement débités sont **persistés sur la commande**
(`ChargedAmount` / `ChargedCurrency`) et **recroisés** avec la notification du
prestataire avant tout passage en « payé » (voir « Vérification du montant »).

## Principes de sécurité (non négociables)

1. **Aucune donnée de carte ne transite par nos serveurs.** On utilise toujours la
   page **hébergée** du prestataire (lien/QR Flouci, Stripe Checkout). Il n'existe
   aucun champ carte dans notre frontend ni notre backend.
2. **La confirmation du paiement est exclusivement côté serveur**, via le **webhook**
   du prestataire, doublé d'une **vérification serveur** :
   - Stripe : vérification de l'en-tête `Stripe-Signature` avec le *webhook signing
     secret* (bibliothèque officielle `Stripe.net`, `EventUtility.ConstructEvent`),
     puis traitement de l'évènement `checkout.session.completed`.
   - Flouci : on ne fait jamais confiance au corps de la notification. On en extrait
     l'`payment_id` et on appelle l'endpoint `verify_payment` de Flouci avec notre
     secret pour confirmer l'état `SUCCESS` **avant** de marquer la commande payée.
   Le redirect du navigateur affiche uniquement « en cours de vérification » : il
   n'est **jamais** la source de vérité de l'état payé.
3. **Aucun secret réel dans le dépôt.** Les clés sont lues depuis `IConfiguration`
   (variables d'environnement). Le dépôt ne contient que des **placeholders vides**
   dans `appsettings.json` (section `Payments`) et dans `.env.example` /
   `.env.prod.example`. Les secrets ne sont jamais journalisés.

## Devise et conversion

Les prix de la boutique sont exprimés en **TND**. Pour Flouci (Tunisie), la commande
est réglée en **TND** (montant converti en millimes, `TND × 1000`) : aucune
conversion de devise.

Pour Stripe (international), Stripe ne prend pas le TND en charge de façon
universelle : on règle donc dans une devise internationale largement supportée
(**EUR par défaut**, configurable via `Payments:Stripe:Currency`) et **on convertit
le montant** avant l'encaissement. Le montant débité est :

```
montant_stripe = round(order.Total (TND) × Payments:Stripe:TndToStripeRate, 2)
```

puis exprimé en plus petite unité (centimes) pour Stripe. Sans conversion, une
commande de 100 TND serait facturée 100 EUR (~3,4×) : la conversion corrige ce bug.

- **`Payments:Stripe:TndToStripeRate`** (décimal) : taux de conversion TND → devise
  Stripe. C'est **une responsabilité du club** : il doit renseigner et **tenir à
  jour** ce taux en fonction du taux de change réel TND → devise. La valeur par
  défaut (`0.30`, approx. TND → EUR) est un **placeholder explicite et documenté**,
  **pas** un flux de change temps réel. Aucun service de change payant n'est intégré
  volontairement (pas de dépendance externe).
- **`Payments:Stripe:Currency`** : devise de règlement Stripe (`eur` par défaut).

Le montant et la devise réellement débités sont enregistrés sur la commande
(`ChargedAmount`, `ChargedCurrency`) au moment de l'initiation du paiement, de sorte
que l'enregistrement reflète ce que l'acheteur a payé.

## Vérification du montant (anti-manipulation)

Confirmer l'état « payé » ne suffit pas : les deux webhooks **recroisent le montant
et la devise réellement payés** avec ce qui est attendu pour la commande, **avant**
de la passer en `Paid`.

- **Stripe** : `amount_total` / `currency` de la session sont comparés au montant
  attendu (`order.Total × TndToStripeRate`, en centimes) et à la devise configurée.
- **Flouci** : le montant retourné par `verify_payment` (en millimes) et la devise
  sont comparés à `order.Total × 1000` en TND.

En cas d'écart (session manipulée, périmée ou incohérente), la commande **reste
`Pending`** : l'incident est journalisé (sans secret) et audité (`ORDER_PAY_MISMATCH`)
plutôt que marqué payé.

## Configuration (environnement, jamais dans le dépôt)

Renseignez ces variables d'environnement (voir `.env.example` / `.env.prod.example`).
Elles alimentent la section `Payments` de la configuration (`Payments__*` avec le
double underscore standard .NET) :

```
Payments__Flouci__AppToken=<APP_TOKEN Flouci>
Payments__Flouci__AppSecret=<APP_SECRET Flouci>
Payments__Flouci__WebhookSecret=<optionnel: secret partagé du webhook Flouci>
Payments__Stripe__SecretKey=sk_live_xxx        # ou sk_test_xxx en test
Payments__Stripe__WebhookSecret=whsec_xxx      # secret de signature du webhook
Payments__Stripe__TndToStripeRate=0.30         # taux TND -> devise Stripe (à tenir à jour)
Payments__PublicBaseUrl=https://votre-domaine  # base des liens retour/annulation (REQUIS en prod)
# Optionnel : Payments__Stripe__Currency=eur, Payments__Flouci__BaseUrl=...
```

- **`Payments__PublicBaseUrl`** : **obligatoire en production**. Les liens de retour /
  annulation transmis au prestataire sont dérivés de cette base. En production, si ni
  `Payments:PublicBaseUrl` ni une origine CORS ne sont configurés, le backend
  **refuse** de se rabattre sur l'en-tête `Host` (usurpable) : `POST /pay` répond
  `503`. En développement, le repli sur le `Host` de la requête reste toléré.
- **`Payments__Stripe__TndToStripeRate`** : taux de conversion TND → devise Stripe
  (voir « Devise et conversion »). Responsabilité du club, à tenir à jour.
- **Flouci** : créez une application sur votre espace développeur Flouci pour obtenir
  l'*app token* (public) et l'*app secret*. Base API par défaut :
  `https://developers.flouci.com/`.
- **Stripe** : récupérez la *secret key* dans le dashboard Stripe et créez un endpoint
  webhook pour obtenir le *signing secret* (`whsec_...`).

## Webhooks à configurer chez les prestataires

Pointez les webhooks des prestataires vers ces routes **publiques** (aucune
authentification applicative ; l'authenticité est garantie par la signature/vérif) :

- Stripe : `POST https://votre-domaine/api/payments/stripe/webhook`
  - Évènement à activer : `checkout.session.completed`.
  - Authenticité garantie par la signature `Stripe-Signature` (`whsec_...`).
- Flouci : `POST https://votre-domaine/api/payments/flouci/webhook`
  - Flouci n'émet pas de signature vérifiable : l'authenticité repose sur l'appel
    serveur `verify_payment`. En complément, un **secret partagé optionnel**
    (`Payments:Flouci:WebhookSecret`) peut être exigé : s'il est renseigné, le webhook
    n'agit que si l'en-tête `X-Flouci-Webhook-Secret` (ou le paramètre de requête
    `webhookSecret`) correspond ; sinon il renvoie `401`. Laissé vide, l'endpoint
    conserve son comportement actuel (protégé par la vérification serveur).

Les deux handlers sont **idempotents** (délégués à `OrderPaymentService`, qui ne
refait rien sur une commande déjà payée), **recroisent le montant/devise** (voir
« Vérification du montant ») et sont **audités**.

## Flux fonctionnel

1. Le fan crée sa commande (`POST /api/shop/orders`) — prix recalculés côté serveur,
   statut `Pending`.
2. Le fan choisit son **pays** puis lance le paiement
   (`POST /api/shop/orders/{id}/pay { country }`). Le backend route vers Flouci ou
   Stripe, crée la session hébergée, enregistre `PaymentProvider`, `Country` et
   `ProviderRef`, et renvoie `{ redirectUrl }`.
3. Le fan paie sur la page hébergée du prestataire, puis revient sur
   `/payment/success` (ou `/payment/cancel`). Cette page **lit seulement** l'état de
   la commande (via `GET /api/shop/orders/{id}`) : « en cours de vérification »,
   « payé » ou « annulé ».
4. Le prestataire appelle notre webhook ; après vérification serveur, la commande
   passe `Paid` et le stock est décrémenté (logique partagée avec le passage manuel
   admin, idempotente).

## Dégradation sans clés (sandbox)

Sans clés configurées (cas de la sandbox), `POST /pay` répond avec un `503` et un
message clair (« paiement en ligne non disponible ») que le frontend affiche sans
planter. Les webhooks répondent `503` tant que le prestataire n'est pas configuré.

## Collaudo end-to-end

Le test de bout en bout du paiement (vraie session hébergée + webhook réel) est un
**pas post-déploiement** : il nécessite des clés valides et des webhooks publiquement
joignables. Il ne peut pas être exécuté dans la sandbox sans réseau public ni secrets.
Utilisez les clés **test** des prestataires (Stripe `sk_test_...`, environnement de
test Flouci) et les cartes de test Stripe pour valider en préproduction.
