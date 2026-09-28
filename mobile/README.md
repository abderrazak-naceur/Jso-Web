# JSO Mobile (Flutter)

Official mobile app for **Jeunesse Sportive de Oudhref (JSO)**, targeting
**Android and iOS** from a single Dart/Flutter codebase.

The app reuses the existing **.NET 10 public REST API** ("build once, use
everywhere") — there is no separate mobile backend. It renders the same public
content the web frontend consumes: club info, matches, news and media.

## What the app does

The UI follows the JSO brand reference: **paper/light content surfaces**, a
**navy gradient home header** with the official crest, gold accents, and a
fixed **light bottom-navigation bar** with five French destinations —
**Accueil, Matchs, Équipe, Actualités, Plus**. All copy is in **French**.

- **Accueil (Home)** — navy header with the JSO crest, a greeting
  (`Bonjour, supporters`) and a tagline; a prominent gold **Prochain match**
  card (JSO vs opponent, date/time/venue), an image-led **Actualités** list
  with a *Voir tout* shortcut, and recent results — all from `GET /api/home`.
- **Matchs (Match Center)** — fixtures/results from `GET /api/matches`; tapping
  a match opens a detail view with four French tabs:
  - **Résumé** — score, status, venue and the event timeline from
    `GET /api/matches/{id}` and `GET /api/matches/{id}/events`, an optional
    **Météo du match** card (`GET /api/matches/{id}/reminder`, hidden when
    unavailable), and a **Billetterie** button (see [Ticketing](#ticketing-billetterie)).
  - **Direct** — the match **live blog** feed from
    `GET /api/matches/{id}/liveblog`, polled lightly while the tab is open
    (see [Live blog polling](#live-blog-polling)).
  - **Compos** — lineup and officials from `GET /api/matches/{id}/lineup` and
    `.../officials`.
  - **Stats** — match statistics from `GET /api/matches/{id}/stats`.
- **Équipe (Teams & Roster)** — the squads list from `GET /api/teams`; tapping a
  team opens its roster (players with shirt number, position and photo) from
  `GET /api/teams/{id}/players`.
- **Actualités (News)** — article list from `GET /api/news`; tapping opens the
  article from `GET /api/news/{slug}` (news detail is keyed by **slug**, not id).
- **Plus** — a hub linking every secondary area: **Mon compte**, **Boutique**,
  **Agenda du club**, **Médias**, **Sponsors**, **Documents**, **Questions
  fréquentes**, **Musée du club** and **Écoles & partenaires**. Each opens its
  own screen backed by the matching public endpoint.

Authenticated fans additionally get the **Boutique** checkout with **Mes
commandes**, the **Billetterie** with **Mes billets**, and full account
management (see [Fan accounts](#fan-accounts-login-registration-profile)).

Every screen renders three explicit states:

- **Loading** — a JSO-gold spinner (`LoadingView`).
- **Error** — a message with a **Réessayer** button (`ErrorView`) when the API
  call fails (network error, timeout, non-2xx, 404).
- **Empty** — a friendly placeholder (`EmptyView`) when the endpoint returns no
  items.

All remote images use `Image.network` with `loadingBuilder`/`errorBuilder`
(via the shared `RemoteImage` widget, which also resolves root-relative
`/uploads/...` URLs against the API host), so missing or broken media URLs
degrade gracefully to a placeholder instead of crashing the screen.

## Installing Flutter

1. Install the Flutter SDK: <https://docs.flutter.dev/get-started/install>.
   This project was built with **Flutter 3.47.5 / Dart 3.13.4** (stable
   channel).
2. Verify the toolchain:

   ```sh
   flutter --version
   flutter doctor
   ```

3. Fetch dependencies from this directory:

   ```sh
   cd mobile
   flutter pub get
   ```

## Project structure

```
lib/
  core/
    config/   api_config.dart (base URL + resolveUrl), jso_theme.dart (dark + paper)
    api/      api_client.dart (http wrapper, 15s timeout, GET/POST/PUT),
              api_exception.dart, error_text.dart (French error copy)
  data/
    models/   club, match, match_event, live_blog_entry, article, media_asset,
              sponsor, team, player, home_data, fan_user, ticket_type,
              ticket_order, product, shop_order, club_event, club_document,
              faq_entry, archive_item, community_program, match_lineup_entry,
              match_official, match_stat, match_reminder, json_utils
    repositories/  public_api_repository, tickets_repository, shop_repository,
                   club_content_repository, match_center_repository, auth_repository
    auth/     token_store.dart (secure JWT storage interface + impl)
  features/
    home/     home_screen.dart (brand-reference redesign)
    matches/  matches_screen, match_detail_screen (Résumé/Direct/Compos/Stats),
              match_lineup_tab, match_stats_tab, match_weather_card
    news/     news_screen, news_detail_screen
    media/    media_screen
    teams/    teams_screen, team_roster_screen
    sponsors/ sponsors_screen
    tickets/  tickets_screen (reserve), my_tickets_screen
    shop/     shop_screen, product_detail_screen, cart_controller, cart_screen,
              order_confirmation_screen, my_orders_screen, order_detail_screen
    events/ documents/ faq/ archive/ community/   (Plus hub screens)
    club/     club_screen.dart (the "Plus" hub)
    auth/     auth_controller, login_screen, register_screen, profile_screen,
              edit_profile_screen, change_password_screen, privacy_screen,
              login_prompt
  shared/
    format.dart              French date / score / fixture / money formatting
    snackbars.dart           shared JSO snackbar helper
    widgets/  loading_view, empty_view, error_view,
              remote_image (resilient Image.network), jso_crest (bundled PNG)
  app.dart    root widget: providers + paper/dark theme + 5-tab shell
  main.dart   entry point
assets/
  jso-crest.png              official crest, copied from frontend/public
  jso-club-mark.svg          legacy abstract mark (kept for reference)
test/
  models_parsing_test.dart   JSON parsing for the real DTO shapes
  account_profile_test.dart  profile edit / password / RGPD flows
  plus_screen_test.dart      the Plus hub entries and routing
  match_center_test.dart     lineup / stats / weather tabs
  *_screen_test.dart         screen LOADING / EMPTY / ERROR / populated states
  support/                   fakes + pump harness (no network)
```

## Configuring the API base URL

The base URL mirrors the web frontend pattern (`frontend/src/lib/apiConfig.js`):
configurable at build time, with any trailing slash stripped. It is read from a
Dart compile-time environment variable:

```sh
flutter run   --dart-define=JSO_API_BASE_URL=<base-url>
flutter build --dart-define=JSO_API_BASE_URL=<base-url>
```

Examples:

| Target                 | Base URL                          | Why                                              |
| ---------------------- | --------------------------------- | ------------------------------------------------ |
| Android emulator (dev) | `http://10.0.2.2:5000/api`        | `10.0.2.2` is the emulator alias for the host    |
| iOS simulator (dev)    | `http://localhost:5000/api`       | the simulator shares the host network            |
| Production             | `/api` (behind Nginx) or a full HTTPS host, e.g. `https://jso.example.tn/api` | same-origin API behind the reverse proxy |

If `--dart-define=JSO_API_BASE_URL` is omitted, the app falls back to the dev
default `http://10.0.2.2:5000/api` (Android emulator).

## Running the app

Start the .NET API locally (see `backend/README.md`), then:

- **Android** (emulator or device):

  ```sh
  flutter run --dart-define=JSO_API_BASE_URL=http://10.0.2.2:5000/api
  ```

- **iOS** (simulator — requires **macOS + Xcode**):

  ```sh
  flutter run --dart-define=JSO_API_BASE_URL=http://localhost:5000/api
  ```

Release builds:

```sh
flutter build apk  --dart-define=JSO_API_BASE_URL=https://jso.example.tn/api   # Android
flutter build ios  --dart-define=JSO_API_BASE_URL=https://jso.example.tn/api   # iOS (macOS only)
```

## State management: Provider

The app uses **Provider** to expose its dependencies to the widget tree via a
`MultiProvider` in `app.dart`. Plain `Provider`s hold the stateless repositories
(`PublicApiRepository`, `TicketsRepository`, `ShopRepository`,
`ClubContentRepository`, `MatchCenterRepository`), while `ChangeNotifierProvider`s
hold the stateful pieces (`AuthController` for the session and `CartController`
for the shop cart). Provider was chosen over Riverpod/Bloc because the surface
is small and mostly read-only (fetch-and-render): each screen owns a `Future`
and drives its own loading/error/empty state with a `FutureBuilder`, while the
account/cart widgets `watch` their controller. This keeps the codebase
approachable and avoids extra boilerplate, while still making the repository and
auth layer easy to swap for fakes in tests (see `test/support/`).

## Fan accounts (login, registration, profile)

Supporters can create an account, sign in and view their profile. This is the
one authenticated area of the app; every other screen stays anonymous.

- **Endpoints** (`backend/src/JSO.Api/Controllers/AccountController.cs`,
  `FanPrivacyController.cs`):

  | Method call (AuthRepository) | Route                            | Auth               |
  | ---------------------------- | -------------------------------- | ------------------ |
  | `register(...)`              | `POST /api/account/register`     | none (returns JWT) |
  | `login(...)`                 | `POST /api/account/login`        | none (returns JWT) |
  | `getMe(token)`               | `GET /api/account/me`            | `Bearer <jwt>`     |
  | `updateProfile(token, ...)`  | `PUT /api/account/me`            | `Bearer <jwt>`     |
  | `changePassword(token, ...)` | `POST /api/account/change-password` | `Bearer <jwt>`  |
  | `exportMyData(token)`        | `GET /api/fan/data-export`       | `Bearer <jwt>`     |
  | `deleteMyAccount(token)`     | `POST /api/fan/account-deletion` | `Bearer <jwt>`     |

- **Response shape.** `register` (201) and `login` (200) return
  `{accessToken: <jwt>, user: {id, email, displayName}}`. `GET`/`PUT
  /account/me` return `{id, email, displayName, emailVerified, birthDate?,
  anniversaryOptIn, memberSince?}`. The token field is **`accessToken`**.

- **Profile management.** From **Mon compte**, an authenticated fan can:
  - **Modifier le profil** — update the display name and an optional birthday.
    The birthday is personal data kept only while the *anniversary* opt-in is
    on; turning it off clears the stored date server-side (data minimisation).
    `birthDate` is sent as `yyyy-MM-dd` (the API's `DateOnly`).
  - **Changer le mot de passe** — the form mirrors the backend rule (new
    password ≥ 12 characters) and surfaces server messages (e.g. a wrong
    current password) in French.
  - **Confidentialité (RGPD)** — export a summary of the personal data the club
    holds (`GET /fan/data-export`) and request account deletion
    (`POST /fan/account-deletion`), which anonymises the account and signs out.
    Deletion is guarded by an explicit confirmation dialog.

- **Bearer only on fan endpoints.** The `Authorization: Bearer <jwt>` header is
  attached **only** to the fan-only calls (`/account/me`, profile update,
  password change, RGPD, tickets, shop orders). All public calls (home, matches,
  news, media, teams, sponsors, events, documents, FAQ, archive, community, shop
  catalogue) keep going out anonymously, so the public areas work with or
  without an account.

- **Token storage — `flutter_secure_storage`.** The JWT is persisted through the
  `TokenStore` interface (`lib/data/auth/token_store.dart`). The production
  implementation, `SecureTokenStore`, uses
  [`flutter_secure_storage`](https://pub.dev/packages/flutter_secure_storage),
  which keeps the token in the **Android Keystore / iOS Keychain** rather than
  plain `SharedPreferences`/`NSUserDefaults`. Rationale: a JWT is a bearer
  credential, so it must not sit in clear text on disk. The token is **never
  logged** and is **cleared on logout** (and whenever a stored token is rejected
  by `/me`). Tests never touch the platform channel: they inject an in-memory
  `TokenStore` fake (`test/support/fake_auth.dart`).

- **Session restore.** At startup `main.dart` calls
  `AuthController.restoreSession()`: if a token is stored it is validated via
  `GET /account/me` and the user is signed in; on any failure (or no token) the
  token is cleared and the app falls back to the **anonymous** state. The
  controller exposes an `AuthStatus.unknown` state while this resolves so the
  profile shows a spinner instead of flashing the login form.

- **Navigation entry point.** The account lives under the **Plus** tab as
  **Mon compte**, which `Navigator.push`es the `ProfileScreen`. The profile
  branches on the auth state — authenticated fans see their profile plus
  **Mes billets**, **Mes commandes**, **Modifier le profil**, **Changer le mot
  de passe**, **Confidentialité (RGPD)** and **Se déconnecter**; anonymous
  visitors see a **Se connecter / Créer un compte** call to action.

- **UI copy is in French**, consistent with the JSO design system
  (`jso_theme.dart`). Forms validate locally (email format, required fields,
  password ≥ 12 characters to mirror the backend rule) and surface server errors
  as French text — e.g. a 401 shows *« Identifiants invalides. »* and a 409 shows
  *« Un compte existe déjà avec cet email. »*. A shared `describeApiError` helper
  maps every API failure (and known backend messages) to French copy.

## Ticketing (Billetterie)

Signed-in fans can reserve tickets for a match, following the same **manual
gateway** as the web app: reserving creates a `Pending` order that a club admin
later confirms (payment is settled at the club), so there is no payment provider
wired into the app.

- **Endpoints** (`backend/src/JSO.Api/Controllers/TicketsController.cs`):

  | Method call (TicketsRepository) | Route                              | Auth           |
  | ------------------------------- | ---------------------------------- | -------------- |
  | `getForMatch(matchId)`          | `GET /api/tickets/match/{matchId}` | none           |
  | `myTickets(token)`              | `GET /api/tickets/mine`            | `Bearer <jwt>` |
  | `reserve(...)`                  | `POST /api/tickets/reserve`        | `Bearer <jwt>` |

- **Ticket types are public.** `getForMatch` returns the active ticket types for
  a **published** match — `{ id, name, price, currency, available }`, where
  `available` is `Capacity − SoldCount` computed server-side — so anyone can
  browse prices and remaining places. The list is reachable from the match
  detail **Timeline** tab via a **Billetterie** button (`TicketsScreen`).

- **Reserving needs an account.** Tapping **Réserver** opens a bottom sheet with
  a quantity picker bounded **1…min(available, 10)** (mirroring the backend
  cap), the running total, and a confirm action. `reserve` sends
  `{ ticketTypeId, quantity }`; the server recomputes the price and returns a
  `Pending` order. Anonymous visitors instead get a **Se connecter** prompt —
  the JWT from the *Fan accounts* flow is attached as a `Bearer` token, and
  `AuthController.accessToken` exposes it in memory (never logged) only while
  authenticated.

- **"Mes billets".** The authenticated profile links to `MyTicketsScreen`, which
  lists the fan's reservations from `myTickets` (most recent first) with a status
  chip — **En attente** (gold), **Confirmé** (cyan) or **Annulé** (muted) —
  matching the web admin's Pending / Confirmed / Cancelled states.

- **UI copy is in French** and follows the JSO design system (gold CTAs on dark
  navy). Every screen renders the same Loading / Error / Empty states as the
  rest of the app, with pull-to-refresh.

## Endpoints consumed

Public endpoints require no auth header. IDs are GUID strings; article detail is
keyed by slug; dates are ISO-8601 `DateTimeOffset`. The `/api/account/*`
endpoints above are the exception (register/login return a JWT; `/me` needs it).

| Method call                     | Route                             |
| ------------------------------- | --------------------------------- |
| `getHome()`                     | `GET /api/home`                   |
| `getClub()`                     | `GET /api/club`                   |
| `getMatches()`                  | `GET /api/matches`                |
| `getMatch(id)`                  | `GET /api/matches/{id}`           |
| `getMatchEvents(id)`            | `GET /api/matches/{id}/events`    |
| `getMatchLiveBlog(id)`          | `GET /api/matches/{id}/liveblog`  |
| `getNews()`                     | `GET /api/news`                   |
| `getNewsArticle(slug)`          | `GET /api/news/{slug}`            |
| `getMedia()`                    | `GET /api/media`                  |
| `getTeams()`                    | `GET /api/teams`                  |
| `getTeamPlayers(id)`            | `GET /api/teams/{id}/players`     |
| `getSponsors({placement})`      | `GET /api/sponsors[?placement=]`  |

The match-detail tabs additionally consume the Match Center endpoints
(`MatchCenterRepository`):

| Method call            | Route                              |
| ---------------------- | ---------------------------------- |
| `getLineup(id)`        | `GET /api/matches/{id}/lineup`     |
| `getOfficials(id)`     | `GET /api/matches/{id}/officials`  |
| `getStats(id)`         | `GET /api/matches/{id}/stats`      |
| `getReminder(id)`      | `GET /api/matches/{id}/reminder`   |

The **Plus** hub consumes the "club life" endpoints
(`ClubContentRepository`): `GET /api/events`, `/api/events/{slug}`,
`/api/documents`, `/api/faq`, `/api/archive`, `/api/community-programs`.

The **Boutique** consumes the shop endpoints (`ShopRepository`):
`GET /api/shop/products[?category=]`, `GET /api/shop/products/{slug}` (public),
plus fan-only `POST /api/shop/orders`, `GET /api/shop/orders` and
`GET /api/shop/orders/{id}`.

Ticketing adds one public and two fan-only calls (see [Ticketing](#ticketing-billetterie)):

| Method call (TicketsRepository) | Route                              | Auth           |
| ------------------------------- | ---------------------------------- | -------------- |
| `getForMatch(matchId)`          | `GET /api/tickets/match/{matchId}` | none           |
| `myTickets(token)`              | `GET /api/tickets/mine`            | `Bearer <jwt>` |
| `reserve(...)`                  | `POST /api/tickets/reserve`        | `Bearer <jwt>` |

## Live blog polling

The match detail **Live** tab renders the public, read-only live blog for a
match: `GET /api/matches/{id}/liveblog`. The endpoint returns a JSON array
already ordered server-side (**pinned entries first**, then most recent by
`createdAt`) of `{ id, matchId, minute?, kind, body, createdAt, isPinned }`
items, where `kind` is one of `Text` / `Goal` / `Card` / `Substitution`. The
match must be published, otherwise the API returns `404`.

The `LiveBlogEntry` model parses this defensively: `minute` is nullable and an
unknown `kind` is tolerated (it falls back to a neutral "Update" style) so new
server kinds never break the feed. Each entry shows a kind icon/badge, the
minute (when present) and the body; **pinned** entries are highlighted with a
gold-bordered card and a pin icon, keeping the server ordering.

Because the endpoint is designed for lightweight polling, the tab refreshes the
feed on a timer while it is mounted:

- A `Timer.periodic` is created in `initState` with a **25-second** interval and
  is **cancelled in `dispose`** (the timer field is nulled), so there is no
  leak when the user leaves the screen.
- An `_isFetching` guard prevents **overlapping** calls: a poll is skipped if a
  request (initial load, manual refresh or a previous poll) is still in flight.
- The **initial load** drives the `LoadingView` / `EmptyView` / `ErrorView`
  states. Background polls update the list silently and keep the last good data
  on a transient failure, so a brief network blip does not blank the feed.
- Users can also refresh manually via **pull-to-refresh** (`RefreshIndicator`)
  or the **Actualiser** button; both reuse the same initial-load path and
  surface errors.

## Navigation: the "Plus" hub

The fixed `BottomNavigationBar` keeps five destinations — **Accueil, Matchs,
Équipe, Actualités, Plus** — because Flutter recommends 3–5 items for a fixed
bar. Everything that isn't a primary destination lives behind the fifth **Plus**
tab (`lib/features/club/club_screen.dart`): a **Mon compte** header card plus a
responsive grid of entries (Boutique, Agenda du club, Médias, Sponsors,
Documents, Questions fréquentes, Musée du club, Écoles & partenaires). This keeps
the bar readable on narrow phones while still surfacing every area one tap away.

The primary tabs use a light **paper** theme (`JsoTheme.paper()`), while pushed
detail/secondary screens keep the darker `JsoTheme.dark()` surface; both are
defined in `lib/core/config/jso_theme.dart`.

## External links: url_launcher

The **Sponsors** screen uses the [`url_launcher`](https://pub.dev/packages/url_launcher)
package to open a sponsor's `websiteUrl` in the device's external browser
(`launchUrl(uri, mode: LaunchMode.externalApplication)`). The URL is parsed
defensively with `Uri.tryParse` and, if it is missing/unparseable or the launch
fails, the screen surfaces a "Could not open link." `SnackBar` instead of
crashing. The **Visit website** affordance is shown only for sponsors that have
a non-empty `websiteUrl`.

## Brand assets

The official JSO crest is bundled at `assets/jso-crest.png` — a **copy** of
`frontend/public/JSO-crest-regenerated-ok.png` (the frontend original is left
untouched) — and rendered with `Image.asset` via the shared `JsoCrest` widget.
If the asset ever fails to load, `JsoCrest` falls back to a gold "JSO" monogram
badge. Typography (Manrope headings, Inter body) is documented in
`jso_theme.dart` but not yet bundled; the theme falls back to the platform
default sans-serif.

## Verifying in this repository

From `mobile/`:

```sh
export PATH="$PATH:/opt/flutter/bin"
flutter pub get
flutter analyze                                   # expect: No issues found
flutter test                                      # expect: All tests passed
dart format --output=none --set-exit-if-changed lib test
```

## Not verifiable in this sandbox

- **`flutter build apk`** cannot run here: there is **no Android SDK** installed.
  Building an APK/AAB requires the Android SDK (and, for signing, a keystore).
- **`flutter build ios`** cannot run here: iOS builds require **macOS + Xcode**,
  which are not available in this Linux sandbox.

These are environment limitations, not code defects. The Dart/Flutter code is
validated via `flutter analyze`, `flutter test` and `dart format`.

## Out of scope (documented TODOs)

Intentionally **not** included in this iteration:

- **Push notifications (Firebase Cloud Messaging / FCM).** No Firebase,
  Crashlytics or Firestore code is wired in. The home bell is a non-interactive
  placeholder (tooltip *« Notifications bientôt disponibles »*). Planned for a
  later iteration (see `docs/ROADMAP.md`).
- **Real payments.** Both the shop and ticketing use the **manual gateway**
  (a club admin confirms; no card payment in the app), matching the web app.
- **Store publishing & on-device QA.** Building signed APK/AAB and iOS archives
  and testing on real Android/iOS devices needs the platform SDKs and developer
  accounts, which are outside this repository.

Now implemented (previously listed as future work): fan accounts with full
profile management and RGPD self-service, the Boutique with orders, the
Billetterie, the Match Center (lineup/stats/weather), the "club life" section,
and the brand-reference redesign.
