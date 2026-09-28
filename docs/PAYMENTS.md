# Paiements en ligne (Flouci + Stripe)

Les paiements en ligne s'appuient sur **deux prestataires**, choisis
automatiquement selon le **pays** indiqué par l'acheteur au moment du paiement :

| Pays de l'acheteur | Prestataire | Devise | Page de paiement |
| ------------------ | ----------- | ------ | ---------------- |
| Tunisie (`TN`)     | **Flouci**  | TND    | Lien/QR hébergé Flouci |
| Tout autre pays    | **Stripe**  | EUR *(par défaut)* | Stripe Checkout hébergé |

La même abstraction encaisse aujourd'hui **trois types de « payable »** (voir
« Abstraction générique » plus bas) : la **boutique** (`ShopOrder`), la
**billetterie** (`TicketOrder`) et le **mur des supporters** (`SupporterBrick`).

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

## Abstraction générique (boutique, billetterie, mur des supporters)

Les paiements ne sont plus liés à la seule commande boutique : l'abstraction est
**générique sur le « payable »** afin de réutiliser les **mêmes** prestataires, la
**même** conversion de devise et la **même** vérification de montant sans dupliquer
la moindre logique sensible.

- **Contrat générique `PaymentRequest`** (`JSO.Infrastructure.Payments`) :
  `{ PayableType, PayableId, FanUserId, AmountTnd, Description }`.
  `PayableType` est un discriminant stable (`ShopOrder` | `TicketOrder` |
  `SupporterBrick`, voir `PayableTypes`) ; `AmountTnd` est le montant à débiter
  exprimé en **TND** (converti pour Stripe). `IPaymentProvider.InitiatePaymentAsync`
  prend désormais ce contrat : Flouci calcule les millimes sur `AmountTnd`, Stripe
  applique le taux `TndToStripeRate` sur `AmountTnd` (comportement inchangé pour la
  boutique).
- **Routage du complètement par type** : chaque type de payable fournit un
  `IPayableCompletion` (`OrderPaymentService` = boutique, `TicketOrderCompletion`,
  `SupporterBrickCompletion`) et le `PayableCompletionRouter` aiguille par
  `PayableType`. Chaque complètement est **idempotent** et **transactionnel** :
  - `ShopOrder` : `Pending → Paid` + décrément du stock (logique existante,
    inchangée, partagée avec le passage manuel admin).
  - `TicketOrder` : `Pending → Confirmed` + **incrément de `SoldCount`** sur le
    `TicketType` (capacité), exactement comme la confirmation manuelle admin ; refus
    (laisse `Pending`) s'il n'y a plus de capacité (pas de survente).
  - `SupporterBrick` : passe `PaymentStatus → Paid` + `PaidAt`, **sans jamais
    toucher la modération** (`Status`).
- **Comment le webhook aiguille et vérifie le montant** :
  - **Stripe** : le `PayableType`/`PayableId` voyagent dans les *metadata* de la
    session (`payableType` / `payableId` ; l'ancienne clé `orderId` reste reconnue
    pour compatibilité). Le webhook recroise `amount_total`/`currency` avec le
    montant attendu du payable (`AmountTnd × TndToStripeRate`, en centimes) via le
    routeur avant de compléter.
  - **Flouci** : la notification ne porte pas de metadata ; le `payment_id`
    (persisté en `ProviderRef` sur le payable, index unique par table) est **résolu**
    sur les tables `Orders` / `TicketOrders` / `SupporterBricks` pour dériver le
    `PayableType`. Après `verify_payment` (SUCCESS), le montant vérifié (millimes) est
    recroisé avec `AmountTnd × 1000` en TND avant complètement.
  - En cas d'écart, le payable **reste en attente** ; l'incident est audité
    (`PAYMENT_MISMATCH`). Les complètements réussis sont audités
    (`PAYMENT_COMPLETED_WEBHOOK`).

### Champs additifs persistés (migration Postgres additive)

`TicketOrder` et `SupporterBrick` reçoivent les mêmes champs *nullable* que la
commande boutique : `ProviderRef` (index unique partiel), `PaymentProvider`,
`Country`, `ChargedAmount`, `ChargedCurrency`. `TicketOrder` reçoit aussi `PaidAt`.

**Mur des supporters — paiement vs modération (orthogonaux).** Le champ `Status`
d'un `SupporterBrick` reste **exclusivement** l'état de **modération**
(`Pending` / `Approved` / `Rejected`) : un mattone n'apparaît sur le **mur public**
que s'il est **`Approved`** par un CommunityManager. Un **nouveau champ
`PaymentStatus`** (`Pending` / `Paid`) suit **indépendamment** le paiement. Payer un
mattone ne l'approuve **jamais** et l'approuver ne le marque **jamais** payé. Choix
documenté : la visibilité publique reste pilotée **uniquement** par `Status ==
Approved` (le paiement n'est **pas** une condition de publication).

### Endpoints fan `/pay`

- **Boutique** : `POST /api/shop/orders/{id}/pay { country }` (inchangé).
- **Billetterie** : `POST /api/tickets/{id}/pay { country }` `[Authorize(Fan)]` sur
  **sa propre** réservation `Pending` → `{ redirectUrl }`.
- **Mur des supporters** : `POST /api/supporters/mine { displayName, message, amount }`
  `[Authorize(Fan)]` crée un mattone rattaché au fan et **renvoie son id**, puis
  `POST /api/supporters/{id}/pay { country }` `[Authorize(Fan)]` sur **son propre**
  mattone → `{ redirectUrl }`. Seul **le fan créateur** peut payer son mattone.
  (L'endpoint public anonyme `POST /api/supporters/wall` reste inchangé et sans
  paiement.)

Chaque `/pay` ne concerne que le **propre** payable **en attente** du fan, dégrade en
`503` propre si le prestataire n'est pas configuré, et n'écrit **jamais** l'état payé
(seul le webhook vérifié le fait).

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

Les deux handlers sont **idempotents** (délégués au `PayableCompletionRouter`, qui
ne refait rien sur un payable déjà réglé), **recroisent le montant/devise** (voir
« Vérification du montant ») et sont **audités**. Ils gèrent **tous les
`PayableType`** (boutique, billetterie, mur) via le routage de complètement décrit
dans « Abstraction générique ».

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

Pour la **billetterie** et le **mur des supporters**, le flux est identique (le fan
choisit un pays puis lance `POST /api/tickets/{id}/pay` ou `POST
/api/supporters/{id}/pay`) ; la page de retour `/payment/success` lit l'état du
payable via `payableType` + `payableId`. À la confirmation du webhook, une
réservation passe `Confirmed` (+ `SoldCount`) et un mattone passe
`PaymentStatus = Paid` (la modération reste indépendante).

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
