# JSO Mobile (Flutter)

Official mobile app for **Jeunesse Sportive de Oudhref (JSO)**, targeting
**Android and iOS** from a single Dart/Flutter codebase.

The app reuses the existing **.NET 10 public REST API** ("build once, use
everywhere") — there is no separate mobile backend. It renders the same public
content the web frontend consumes: club info, matches, news and media.

## What the app does

Four public tabs behind a bottom-navigation shell (JSO navy bar, gold active
state):

- **Home** — club header/crest, next match, recent matches and a latest-news
  preview, from `GET /api/home`.
- **Matches (Match Center)** — fixtures/results list from `GET /api/matches`;
  tapping a match opens a detail view (score, status, venue and an event
  timeline) from `GET /api/matches/{id}` and `GET /api/matches/{id}/events`.
- **News** — article list from `GET /api/news`; tapping opens the article from
  `GET /api/news/{slug}` (news detail is keyed by **slug**, not id).
- **Media** — a gallery grid from `GET /api/media`, using `thumbnailUrl` (with a
  fallback to `url`) and an Image/Video type badge.

Every screen renders three explicit states:

- **Loading** — a JSO-gold spinner (`LoadingView`).
- **Error** — a message with a **Retry** button (`ErrorView`) when the API call
  fails (network error, timeout, non-2xx, 404).
- **Empty** — a friendly placeholder (`EmptyView`) when the endpoint returns no
  items.

All remote images use `Image.network` with `loadingBuilder`/`errorBuilder`
(via the shared `RemoteImage` widget), so missing or broken media URLs degrade
gracefully to a placeholder instead of crashing the screen.

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
    config/   api_config.dart (base URL), jso_theme.dart (JSO design system)
    api/      api_client.dart (http wrapper, 15s timeout), api_exception.dart
  data/
    models/   club, match, match_event, article, media_asset,
              sponsor, team, player, home_data, json_utils
    repositories/  public_api_repository.dart  (methods -> real /api routes)
  features/
    home/     home_screen.dart
    matches/  matches_screen.dart, match_detail_screen.dart
    news/     news_screen.dart, news_detail_screen.dart
    media/    media_screen.dart
  shared/
    format.dart              date / score / fixture formatting (intl)
    widgets/  loading_view, empty_view, error_view,
              remote_image (resilient Image.network), jso_crest (bundled SVG)
  app.dart    root widget: theme + Provider + bottom-navigation shell
  main.dart   entry point
assets/
  jso-club-mark.svg          bundled copy of frontend/public/jso-club-mark.svg
test/
  models_parsing_test.dart   JSON parsing for the real DTO shapes
  *_screen_test.dart         screen LOADING / EMPTY / ERROR / populated states
  support/                   fake repository + pump harness (no network)
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

The app uses **Provider** to expose a single `PublicApiRepository` to the widget
tree. It was chosen over Riverpod/Bloc because the surface is small and mostly
read-only (fetch-and-render): each screen owns a `Future` and drives its own
loading/error/empty state with a `FutureBuilder`, so a lightweight dependency
injector is all that is needed. This keeps the codebase approachable and avoids
extra boilerplate, while still making the repository easy to swap for a fake in
tests (see `test/support/fake_repository.dart`).

## Endpoints consumed

All are public (no auth header). IDs are GUID strings; article detail is keyed
by slug; dates are ISO-8601 `DateTimeOffset`.

| Method call                     | Route                             |
| ------------------------------- | --------------------------------- |
| `getHome()`                     | `GET /api/home`                   |
| `getClub()`                     | `GET /api/club`                   |
| `getMatches()`                  | `GET /api/matches`                |
| `getMatch(id)`                  | `GET /api/matches/{id}`           |
| `getMatchEvents(id)`            | `GET /api/matches/{id}/events`    |
| `getNews()`                     | `GET /api/news`                   |
| `getNewsArticle(slug)`          | `GET /api/news/{slug}`            |
| `getMedia()`                    | `GET /api/media`                  |
| `getTeams()`                    | `GET /api/teams`                  |
| `getTeamPlayers(id)`            | `GET /api/teams/{id}/players`     |
| `getSponsors({placement})`      | `GET /api/sponsors[?placement=]`  |

The four screens use `getHome`, `getMatches`, `getMatch`, `getMatchEvents`,
`getNews`, `getNewsArticle` and `getMedia`; the remaining repository methods are
available for future screens.

## Brand assets

The JSO crest is bundled at `assets/jso-club-mark.svg` — a **copy** of
`frontend/public/jso-club-mark.svg` (the frontend original is left untouched) —
and rendered with `flutter_svg`. If the asset ever fails to load, `JsoCrest`
falls back to a gold "JSO" monogram badge. Typography (Manrope headings, Inter
body) is documented in `jso_theme.dart` but not yet bundled; the theme falls
back to the platform default sans-serif.

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
  Crashlytics or Firestore code is wired in. Planned for a later iteration (see
  `docs/ROADMAP.md`).
- **Fan/user login.** The backend only exposes admin-only auth; there is no
  public fan account system, so the app consumes public endpoints anonymously.
