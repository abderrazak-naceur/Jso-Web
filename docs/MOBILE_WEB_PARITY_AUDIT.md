# JSO Mobile ↔ Web parity audit

**Baseline:** repository `main` at the start of this audit (13 October 2026).  
**Scope:** Flutter app under `mobile/`, React back office under `frontend/src/admin/`, and .NET API under `backend/src/JSO.Api/Controllers/`.

## Executive summary

The mobile app is a real Flutter application with public club content, supporter accounts, ticket reservation and ticket QR flows, shop/order flows, match centre screens, and a staff ticket scanner. It is **not yet feature-equivalent to the web back office**.

The admin login screen already exists at `mobile/lib/features/auth/admin_login_screen.dart`, but its main entry point was a long-press on the crest in the Plus/club area. After sign-in, the app shows an administrator identity/role, a staff ticket scanner, and logout; it explicitly directs administrators to the web back office for full management. The first remediation makes the admin entry visible from **Il mio account** as well.

## Current mobile coverage

| Area | Mobile status | Next action |
| --- | --- | --- |
| Supporter registration/login/profile/password/privacy | Implemented screens and repositories | Run regression tests against the current API |
| Home, news, media, teams, sponsors, events, documents, FAQ, archive, community programmes | Public/read-only screens exist | Verify parity of fields, links, languages, and error states |
| Matches and match centre | Public fixtures/details, live blog, lineup, officials, stats, weather | Verify all statuses and missing-team/media fallbacks |
| Ticketing | Supporter reservation/my tickets; staff scanner repository and screen | Test role restrictions, scanner configuration, check-in idempotency |
| Shop | Catalogue, product details, cart, orders | Verify checkout/order status parity and admin-side CRUD |
| Admin authentication | Login and separate admin token store exist; entry was hidden | Entry now visible from account screen; add/verify admin session validation endpoint |
| Admin dashboard | Not implemented as a mobile dashboard | Implement role-aware mobile admin home and navigation |
| Fan account management | No complete admin users list/detail/actions in mobile | Integrate the existing admin fan-account API; test search, details, block/reactivate, VIP tier only where supported |
| Sport administration | No complete mobile admin CRUD | Map web screens to API endpoints and implement mobile workflows |
| Content/CMS | Mobile public content only | Map news, media, documents, FAQ, events, archive CRUD and publish states |
| Commerce administration | No complete mobile admin management | Map shop, orders, memberships, donations, finance, sponsors and ticket admin workflows |
| Community moderation | Public community screens exist; admin moderation missing | Map API permissions and moderation endpoints |
| System/security/RGPD/configuration | No equivalent mobile admin area | Add only operations that are safe and useful on mobile; enforce API role/permission checks |
| Push notifications | FCM is not wired in | Separate follow-up: notification requirements, consent, and delivery tests |

## Web admin module inventory

The React navigation registry in `frontend/src/admin/navigation.js` exposes these areas (role visibility is defined there; API authorization remains authoritative):

- **Dashboard and people:** Dashboard, Profils supporters.
- **Ticketing and finance:** Billetterie, Abonnements, Finances, Dons & collecte, Dons en espèces.
- **Commerce and partners:** Boutique, Commandes, Sponsors, QR Sponsors.
- **Sport:** Match Center, Événements de match, Feuille de match, Formations, Équipes & joueurs, Saisons & compétitions, Diffusion en direct, Analytics joueurs, Infirmerie, Scouting, Check-list match.
- **Content and site:** News CMS, Calendrier éditorial, Médias, Contenus, Agenda du club, Documents, FAQ, Musée/Archives.
- **Community:** Modération, Photos supporters, Mur des supporters, Petites annonces, Anniversaires, Newsletter, Bénévoles, Écoles & partenaires, Installations.
- **System:** Club Settings, Sécurité, Feature flags, Utilisation API, RGPD, Configuration.

## Backend controller inventory to map

The API repository includes dedicated controllers in these families. Presence of a controller does not, by itself, prove that a mobile-safe endpoint or all CRUD operations exist; inspect each route, DTO, authorization attribute, and validation before implementing a client.

- **Sport:** `AdminMatchesController`, `AdminMatchDetailsController`, `AdminTeamsController`, `AdminSeasonCompetitionController`, `AdminStaffAssignmentsController`, `AdminLiveBlogController`, `AdminMatchStreamController`, `AdminPlayerAnalyticsController`, `AdminPlayerInjuriesController`, `AdminScoutingNotesController`, `AdminMatchdayChecklistController`.
- **Content:** `AdminNewsController`, `AdminMediaController`, `AdminContentController`, `AdminClubEventsController`, `AdminDocumentsController`, `AdminFaqController`, `AdminArchiveController`, `AdminEditorialCalendarController`, `AdminTranslationsController`.
- **Commerce:** `AdminTicketsController`, `AdminTicketScanController`, `AdminMembershipPlansController`, `AdminShopController`, `AdminShopOrdersController`, `AdminSponsorsController`, `AdminDonationsController`, `AdminFinanceController`, `AdminPaymentConfigController`.
- **Community:** `AdminFanAccountsController`, `AdminFanPhotosController`, `AdminSupportersController`, `AdminClassifiedsController`, `AdminAnniversariesController`, `AdminNewsletterController`, `AdminVolunteersController`, `AdminCommunityController`, `AdminCommunityProgramsController`.
- **Operations/system:** `AdminDashboardController`, `AdminClubController`, `AdminFacilitiesController`, `AdminApiUsageController`, `AdminFeatureFlagsController`, `AdminGdprController`, `AdminSecurityController`, `AdminSecurityResourcesController`.

## Security and session findings

1. Admin and supporter auth are separate in Flutter, including separate token storage keys. Keep that separation.
2. `POST /api/auth/login` authenticates active admin users and returns an access token plus admin profile.
3. `AdminAuthController.restoreSession()` currently clears any stored admin token because there is no admin `/me` endpoint to validate it and rebuild the profile. Add a server-side session/profile endpoint with the same JWT validation and role rules before persisting admin sessions across launches.
4. Do not infer authorization from hidden buttons or client-side role labels. Every admin API must enforce role/permission on the server and return appropriate 401/403 responses.
5. Block/reactivate and VIP/star actions must be implemented only after confirming the actual DTOs, backend rules, audit requirements, and role permissions. Do not add client-only flags that disagree with the web/API state.

## Implementation sequence

### P0 — access and security
- [x] Make admin login discoverable from the mobile account screen.
- [ ] Add/verify admin `/me` endpoint and secure session restoration.
- [ ] Add automated tests for admin login errors, roles, logout, and token isolation.

### P1 — mobile admin foundation
- [ ] Add role-aware mobile admin dashboard, loading/error/retry states, and a navigation index.
- [ ] Reuse existing API contracts; do not duplicate business logic in Flutter.
- [ ] Add integration tests for protected route 401/403 behavior.

### P1 — user management
- [ ] Fan list, search/filter, details and account state.
- [ ] Block/reactivate only if backend supports it and permission checks are verified.
- [ ] VIP 1/3/5 stars only if the canonical web/API model supports it; verify persistence and display parity.

### P2 — operations and content
- [ ] Add mobile workflows for sport, content, ticketing, shop/orders, memberships, finance/donations, sponsors, community and selected system tasks.
- [ ] Prioritize frequently used phone workflows; keep complex/system-wide configuration on web if a mobile UI would be unsafe or unusable.
- [ ] Validate every workflow against API contracts and authorization.

### Quality gates
- [ ] `flutter analyze` and `flutter test` pass.
- [ ] Format check passes.
- [ ] CI passes for relevant frontend/backend/mobile workflows.
- [ ] Test on a real Android device or emulator and verify production API configuration.
- [ ] Build and test iOS separately on macOS/Xcode; an Android APK is not an iOS IPA.
- [ ] Open a PR to `main`; merge only after code review/CI success.
- [ ] If web/backend changes are included, verify the Render service is `live` and smoke-test the deployed app/API.
