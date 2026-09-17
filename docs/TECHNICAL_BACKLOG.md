# Jso-Web — Technical Backlog

## Phase 0 — Foundation

### FE-001 — Application shell
- Create `src/app` structure.
- Move global application composition out of `App.jsx`.
- Define Header, Sidebar and page container primitives.

### FE-002 — Routing
- Add client-side routing.
- Routes: `/`, `/login`, `/register`, `/dashboard`, `/interview/new`, `/interview/:id`, `/history`, `/settings`.
- Add protected route behavior for authenticated pages.

### FE-003 — Shared UI
- Buttons, inputs, textarea, modal, card, badge, progress indicator, spinner, toast.
- Consistent accessibility states.

### FE-004 — API client
- Central HTTP client.
- Base URL from environment variables.
- Request/response error normalization.
- Authentication token handling according to backend contract.

### FE-005 — Query/state strategy
- Introduce server-state management only where needed.
- Keep transient UI state local.
- Define session state model for interview flow.

## Phase 1 — Authentication

### BE-001 — Identity API
- Register.
- Login.
- Logout.
- Refresh/session validation.
- Password reset flow.

### FE-006 — Auth screens
- Login.
- Registration.
- Forgot password.
- Validation and error states.

## Phase 2 — Interview Core

### BE-002 — Interview aggregate
- Interview session.
- Questions.
- Candidate answers.
- Evaluation records.
- Session lifecycle: draft, active, completed, abandoned.

### BE-003 — AI orchestration
- Provider abstraction.
- Prompt templates/versioning.
- Context management.
- Retry/fallback strategy.
- Usage metering.

### FE-007 — Interview setup
- Job title.
- Seniority.
- Technologies/skills.
- Interview type.
- Job description.

### FE-008 — Interview room
- Current question.
- Text answer.
- Optional voice answer.
- Timer/session status.
- Submit/retry/error states.

### FE-009 — Evaluation view
- Per-answer feedback.
- Category scores.
- Strengths.
- Improvements.
- Suggested answer where enabled.

## Phase 3 — Dashboard

### BE-004 — History API
- Paginated interview history.
- Interview detail.
- Aggregated scores.

### FE-010 — Dashboard
- Recent interviews.
- Usage summary.
- Progress metrics.
- Weak skill areas.

### FE-011 — History
- Filters.
- Sorting.
- Detail view.

## Phase 4 — Subscription

### BE-005 — Billing boundary
- Plans.
- Entitlements.
- Usage counters.
- Payment provider integration boundary.

### FE-012 — Pricing/subscription
- Current plan.
- Usage.
- Upgrade CTA.
- Plan comparison.

## Phase 5 — Quality & Operations

### QA-001 — Frontend tests
- Unit tests for utilities/services.
- Component tests for critical flows.

### QA-002 — End-to-end tests
- Registration/login.
- Interview setup.
- Interview completion.
- History retrieval.

### DEVOPS-001 — CI
- `npm ci`.
- lint.
- build.
- test.

### DEVOPS-002 — Environment configuration
- `.env.example`.
- Development/staging/production conventions.
- Secret management outside source control.

## Architecture target

```text
React/Vite
  -> Pages / Features
  -> Shared UI
  -> API Client
  -> ASP.NET Core .NET 10 API
  -> Application Services
  -> Domain
  -> Infrastructure
      -> SQL Server
      -> AI Providers
      -> Payment Provider
```

## Immediate implementation order
1. FE-001 Application shell.
2. FE-002 Routing.
3. FE-003 Shared UI.
4. FE-004 API client.
5. FE-006 Authentication screens.
6. BE-001 Identity API.
7. BE-002 Interview aggregate.
8. BE-003 AI orchestration.
9. FE-007 Interview setup.
10. FE-008 Interview room.
