# Jso-Web — Technical Backlog

## Phase 0 — Frontend Foundation

### FE-001 — Application shell
- Feature-based source structure.
- Header/navigation.
- Responsive page container.
- Shared UI primitives.

### FE-002 — Routing
- `/`
- `/teams`
- `/teams/:id`
- `/matches`
- `/matches/:id`
- `/community`
- `/profile/:id`
- `/notifications`
- Auth routes when enabled.

### FE-003 — API client
- Central HTTP client.
- Environment-based API URL.
- Error normalization.
- Authentication/session handling.

### FE-004 — Query and cache strategy
- Server-state cache for matches/feed.
- Pagination/infinite scroll.
- Cache invalidation after social actions.

## Phase 1 — Fan Identity

### BE-001 — Account API
- Register/login/logout.
- User profile.
- Followed teams.
- Notification preferences.

### FE-005 — Onboarding
- Welcome flow.
- Team search.
- Favorite team selection.
- Preferences.

### FE-006 — Fan profile
- Profile header.
- Favorite teams.
- Recent activity.
- Privacy settings.

## Phase 2 — Teams & Match Center

### BE-002 — Sports data boundary
- Provider abstraction.
- Team synchronization.
- Competition synchronization.
- Fixture synchronization.
- Match state/events.
- Provider error/fallback handling.

### FE-007 — Teams
- Search.
- Team detail.
- Follow/unfollow.
- Upcoming matches.

### FE-008 — Match Center
- Match list.
- Filters.
- Match detail.
- Timeline/events.
- Live state.

## Phase 3 — Community

### BE-003 — Social domain
- Posts.
- Comments.
- Reactions.
- Feed ranking/basic ordering.
- Pagination.

### FE-009 — Fan feed
- Personalized feed.
- Create post.
- Post detail.
- Comments.
- Reactions.

### BE-004 — Trust & Safety
- Reports.
- Block/mute.
- Moderation state.
- Audit trail.
- Rate limiting / anti-spam controls.

## Phase 4 — Notifications

### BE-005 — Notification service
- Match reminders.
- Match start notifications.
- Social interactions.
- Read/unread state.

### FE-010 — Notification center
- List.
- Mark as read.
- Preferences.

## Phase 5 — Quality & Operations

### QA-001 — Unit/component tests
- Shared utilities.
- Match components.
- Feed components.
- Critical interactions.

### QA-002 — E2E tests
- Onboarding.
- Team follow.
- Match detail.
- Create post.
- Reaction/comment.

### DEVOPS-001 — CI
- `npm ci`.
- lint.
- build.
- test.

### DEVOPS-002 — Environment management
- `.env.example`.
- Dev/staging/prod configuration.
- Secrets outside source control.

## Target Architecture

```text
React + Vite
   ├── Pages
   ├── Features
   ├── Shared UI
   ├── Services / API client
   └── State / Cache
           ↓
ASP.NET Core .NET 10 API
   ├── Application
   ├── Domain
   └── Infrastructure
           ↓
SQL Server
   ├── Users / Profiles
   ├── Teams / Competitions
   ├── Matches / Events
   └── Posts / Comments / Reactions
           ↓
External Sports Data Provider
```

## Immediate Implementation Order

1. Application shell and responsive layout.
2. Team discovery and selection.
3. Match Center UI.
4. Fan Feed UI.
5. .NET 10 API contract.
6. SQL Server domain schema.
7. Sports provider adapter.
8. Authentication.
9. Social write operations.
10. Notifications and moderation.
