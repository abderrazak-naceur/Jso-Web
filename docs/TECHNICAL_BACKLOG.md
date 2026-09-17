# Jso-Web — Technical Backlog

## Phase 0 — Visual / Frontend Foundation

### FE-001 — JSO Design System
- Design tokens for navy, blue, cyan, gold and white.
- Typography: Manrope + Inter.
- Glassmorphism surfaces.
- Card, button, pill, badge and modal primitives.
- Responsive spacing/grid system.
- Motion and hover conventions.

### FE-002 — Application shell
- Header/navigation.
- Responsive page container.
- Footer.
- Route-level layouts.
- Shared UI primitives.

### FE-003 — Routing
- `/`
- `/club`
- `/team`
- `/team/:id`
- `/matches`
- `/matches/:id`
- `/news`
- `/news/:slug`
- `/media`
- `/community`
- `/shop`
- `/membership`
- Admin routes under `/admin/*`.

### FE-004 — API client
- Central HTTP client.
- Environment-based API URL.
- Error normalization.
- Auth/session handling.

## Phase 1 — Public Club Experience

### FE-005 — Home
- Hero.
- Next match.
- Last result.
- News cards.
- Team highlights.
- Media block.
- Community block.
- Shop block.
- Membership CTA.

### FE-006 — Club
- History.
- Values.
- Stadium.
- Contacts.
- Sponsors.

### FE-007 — Team
- Squad listing.
- Player detail.
- Staff.
- Season filtering.

## Phase 2 — Sports / Match Center

### BE-001 — Sports data boundary
- Provider abstraction.
- Team synchronization.
- Competition synchronization.
- Fixture synchronization.
- Match state/events.
- Provider health and fallback handling.

### FE-008 — Match Center
- Calendar.
- Filters.
- Match detail.
- Results.
- Timeline.
- Live state.
- Statistics.

## Phase 3 — News & Media

### BE-002 — Content domain
- News.
- Categories.
- Tags.
- Media assets.
- Publishing states.
- Homepage content blocks.

### FE-009 — Newsroom
- Listing.
- Category filters.
- Article detail.

### FE-010 — Media House
- Gallery.
- Video library.
- Highlights.
- Archive.

## Phase 4 — Admin / Back Office Foundation

### BE-003 — Admin identity
- Admin authentication.
- RBAC.
- Permissions.
- MFA-ready design.
- Session policy.

### FE-011 — Admin shell
- Sidebar.
- Topbar.
- Breadcrumbs.
- Search.
- Command-style navigation where useful.
- Responsive admin layout.

### FE-012 — Admin dashboard
- KPIs.
- Recent activity.
- Match alerts.
- Pending moderation.
- Content status.
- Integration health.

### BE-004 — Audit
- AuditLog model.
- Actor/action/entity metadata.
- Request/trace ID.
- Immutable append-only behavior.

## Phase 5 — Admin CMS

### BE-005 — News CMS
- Draft/review/scheduled/published/archive.
- Rich text sanitization.
- SEO metadata.
- Publish scheduling.

### FE-013 — News CMS UI
- List.
- Editor.
- Preview.
- Publish/schedule workflows.

### FE-014 — Media library
- Upload.
- Search/filter.
- Metadata.
- Gallery selection.
- Alt text.

### BE-006 — Homepage builder
- Section model.
- Ordering.
- Enable/disable.
- Versioning/publish state.

### FE-015 — Homepage builder UI
- Drag/reorder.
- Section configuration.
- Preview.
- Publish.

## Phase 6 — Admin Sports Operations

### BE-007 — Team/player management
- Teams.
- Players.
- Staff.
- Season assignment.

### FE-016 — Team manager
- Roster CRUD.
- Player editor.
- Media assignment.
- Publish state.

### BE-008 — Match management
- Match CRUD.
- Manual score updates.
- Match events.
- Lineups.
- Provider/manual/hybrid mode.

### FE-017 — Match manager
- Calendar table.
- Match editor.
- Event timeline editor.
- Sync action.
- Manual override workflow.

## Phase 7 — Community / Moderation

### BE-009 — Social domain
- Posts.
- Comments.
- Reactions.
- Feed.
- Pagination.

### BE-010 — Trust & Safety
- Reports.
- Moderation state.
- User block/suspension.
- Rate limiting.
- Audit actions.

### FE-018 — Community moderation
- Moderation queue.
- Content detail.
- User detail.
- Bulk actions.

## Phase 8 — Commerce / Growth

### BE-011 — Shop
- Products.
- Categories.
- Variants.
- Stock.
- Orders.

### FE-019 — Shop admin
- Product CRUD.
- Stock management.
- Orders.

### BE-012 — Membership
- Plans.
- Entitlements.
- Member status.

### FE-020 — Membership admin
- Plan management.
- Benefits.
- Member overview.

## Phase 9 — Quality / Operations

### QA-001 — Unit/component tests
- Shared UI.
- Match components.
- News CMS.
- Admin permissions.
- Moderation logic.

### QA-002 — E2E tests
- Public home.
- Match Center.
- Admin login.
- News publish.
- Match update.
- Team/player update.
- Moderation flow.

### DEVOPS-001 — CI
- `npm ci`.
- lint.
- build.
- tests.

### DEVOPS-002 — Environments
- `.env.example`.
- dev/staging/prod configuration.
- secret management.

### DEVOPS-003 — Observability
- structured logs;
- error monitoring;
- API health checks;
- integration health;
- admin operational metrics.

## Target Architecture

```text
Public Web                         Admin Web
React + Vite                      React + Vite
     │                                  │
     └──────────────┬───────────────────┘
                    ▼
             ASP.NET Core .NET 10
          Auth · RBAC · API · CMS
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
   Domain        Admin/CMS    Integrations
      │             │             │
      └─────────────┼─────────────┘
                    ▼
                 SQL Server
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
 Sports Provider  Media      Analytics
```

## Immediate Implementation Order

1. JSO visual system.
2. Public homepage and shared UI.
3. Club/team model.
4. Match Center.
5. Backend .NET 10 + SQL Server.
6. Admin authentication + RBAC.
7. Admin dashboard.
8. Team/player management.
9. Match management + sports provider adapter.
10. News CMS + media library.
11. Homepage builder.
12. Community + moderation.
13. Analytics.
14. Shop/membership/ticketing.
