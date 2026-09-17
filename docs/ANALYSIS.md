# Jso-Web — Technical Analysis

## 1. Repository Snapshot

- Repository: `abderrazak-naceur/Jso-Web`
- Branch: `main`
- Type: React + Vite web application
- Product domain: **fan platform / supporter community**
- Current stage: frontend MVP with mock data, being evolved toward a full application.

## 2. Current Frontend Stack

- React 18
- React DOM 18
- Vite 6
- `@vitejs/plugin-react`
- Oxlint
- JavaScript / JSX

Available scripts:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

## 3. Current Product Experience

The frontend now presents a fan-oriented dashboard containing:

- personalized “My Teams” area
- featured Match Center
- upcoming matches
- fan feed
- create-post interaction
- reactions
- responsive navigation
- fan profile placeholder
- notification placeholder

## 4. Proposed Product Modules

```text
Public Home
   ├── Team discovery
   ├── Match discovery
   └── Community preview

Authenticated Fan Area
   ├── My Teams
   ├── Match Center
   ├── Fan Feed
   ├── Notifications
   └── Profile

Trust & Safety
   ├── Reports
   ├── Moderation
   └── Anti-spam
```

## 5. Architecture Gaps

1. The frontend still needs a feature-based folder structure.
2. Routing is not yet implemented.
3. Match and team data are currently mock/demo data.
4. There is no API client or backend integration yet.
5. Authentication and authorization are not connected.
6. Social data is not persisted.
7. There is no automated test suite yet.

## 6. Target Frontend Structure

```text
src/
  app/
    App.jsx
    router.jsx
    providers/
  components/
    ui/
    layout/
  features/
    teams/
    matches/
    feed/
    profile/
    notifications/
    auth/
  services/
    api/
  hooks/
  utils/
  pages/
  assets/
```

## 7. Target Backend

```text
React + Vite
      ↓
ASP.NET Core .NET 10
      ↓
Application Layer
      ↓
Domain Layer
      ↓
Infrastructure
      ├── SQL Server
      ├── Sports Data Provider
      ├── Notifications
      └── Search / Media
```

## 8. Quality & Security

- Keep external provider credentials server-side.
- Validate all user-generated content server-side.
- Add authorization checks for social operations.
- Add anti-spam and rate limiting.
- Add moderation and report workflows.
- Add automated build/lint/test pipeline.
- Add observability for provider failures and user-facing API errors.

## 9. Priority Backlog

### P0

- Frontend routing.
- Team search and selection.
- Match Center pages.
- Fan feed pages.
- API contract.
- .NET 10 backend foundation.

### P1

- Authentication.
- SQL Server persistence.
- Sports provider integration.
- Posts/comments/reactions.
- Notifications.

### P2

- Advanced statistics.
- Search improvements.
- Media.
- Premium features.
- Club and partner features.

## 10. Implementation Direction

The repository should be developed as a **fan-first product**, with the frontend organized around teams, matches, community and personalization. AI or unrelated interview features are outside this product scope unless a future business requirement explicitly adds them.
