# Jso-Web — Delivery Roadmap

## Sprint 1 — Product foundation
- Finalize product language and navigation.
- Refactor frontend into feature-based structure.
- Add routing and shared UI primitives.
- Add environment configuration.
- Add CI: install, lint, build.

**Exit criteria:** application shell is production-oriented and no longer depends on the Vite starter composition.

## Sprint 2 — Authentication
- Backend .NET 10 identity endpoints.
- Frontend login/register/reset screens.
- Protected routes.
- Session handling and error states.

**Exit criteria:** a user can register, log in, log out and reach the dashboard.

## Sprint 3 — Interview setup
- Interview configuration form.
- Job description ingestion.
- Persist draft session.
- Validation.

**Exit criteria:** user can create and start an interview session.

## Sprint 4 — AI interview engine
- Provider abstraction.
- Prompt templates.
- Context handling.
- Question generation.
- Answer submission.
- Evaluation pipeline.

**Exit criteria:** one complete end-to-end interview can be executed and evaluated.

## Sprint 5 — Dashboard and history
- Dashboard metrics.
- Recent interviews.
- History filters.
- Session detail.
- Progress tracking.

**Exit criteria:** user can inspect and compare completed sessions.

## Sprint 6 — Subscription and limits
- Plans.
- Entitlements.
- Usage counters.
- Checkout boundary.
- Upgrade flow.

**Exit criteria:** product usage can be restricted and surfaced based on subscription entitlements.

## Sprint 7 — Hardening
- Unit/component/E2E tests.
- Accessibility checks.
- Performance checks.
- Error monitoring.
- Security review.
- Documentation.

**Exit criteria:** MVP is ready for controlled beta release.

## Release strategy

### Alpha
Core interview loop with internal users.

### Beta
Authentication + interview + evaluation + dashboard + basic usage limits.

### Public MVP
Stable production deployment, subscription flow, observability and support documentation.
