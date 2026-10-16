# JSO-Web — Visitor Analytics & Bot Protection Implementation Plan

Date: 2026-10-16
Target: `main`
Branch: `feat/visitor-analytics-bot-protection`

## 1. Current-state inspection

The current application has an aggregate API-usage collector and an administrator screen at `/admin/apiusage` backed by `GET /api/admin/api-usage`. It records daily counts by coarse route group and response class. It deliberately does not persist IP addresses, visitor identities, page-level browsing, referrers, or user agents.

The existing SEO/Analytics module stores the GA4 Measurement ID and Search Console metadata in site content. Its own UI states that the GA4 ID alone does not activate tracking and that cookie-consent integration is required before client-side tracking starts.

The current rate limiter uses `RemoteIpAddress`; forwarded headers are enabled, but the trusted-proxy configuration and Render's production request path must be verified before relying on IP-based enforcement. Existing rate limits are useful baseline protection, not a bot-management console.

## 2. Current implementation status (2026-10-16)

Implemented on the feature branch:
- Consent prompt with accept/refuse and a persistent privacy-preferences control.
- Public SPA page-view intake that only the browser calls after explicit opt-in.
- Sensitive routes excluded; query strings/fragments removed; opaque IDs normalized.
- No raw IP, raw visitor identifier, cookie, authorization header, or full user-agent is stored for analytics. Visitor identity is pseudonymized with HMAC.
- PostgreSQL migration, database-side aggregate queries, 13-month best-effort cleanup, and a SuperAdmin-only analytics endpoint.
- Admin dashboard for views, estimated unique visitors, daily trend, top pages, referrer hosts, and device class.
- CI smoke checks cover page-view intake, authorization, invalid/valid IP rule input, and the security event feed.
- SuperAdmin API and UI to create/disable IPv4/IPv6 IP/CIDR rules with reason, optional expiry, duplicate prevention, and audit-log entries.
- PostgreSQL entities/migration for block rules and security traffic events.
- Explicitly gated server-side CIDR enforcement; it requires both `Security:TrustedClientIpVerified=true` and `Security:IpBlockEnforcementEnabled=true` and remains off by default.
- Conservative user-agent automation signals, deduplicated in-process and marked low-confidence; these signals never block requests and never verify a crawler.
- Admin UI displays the actual enforcement state and recent signal events.

Still required before production activation:
- Verify the real Render proxy chain and forwarded client IP behavior; do not set the two enforcement flags before this is confirmed.
- Run the new CI, Docker, Security, and Android workflows and fix failures.
- Add targeted automated tests for CIDR matching (IPv4/IPv6 and prefix edges), consent withdrawal, retention, migration rollback, and authorization matrix.
- Review event retention/privacy notice and perform production smoke checks after merge.

Until the Render client-IP chain is verified, rules can be managed and audited but do not block traffic. User-Agent signals are clues only, not proof of bot identity.

## 3. Intended outcome

Add a separate, permission-protected **Visitors & Protection** area in the existing admin. Do not duplicate or replace the existing aggregate API Usage screen.

### Visitor analytics
- Capture public page views from the SPA only after the site's consent policy permits analytics where required.
- Record a normalized path (no query string, tokens, emails, or raw identifiers), timestamp, referrer host, coarse device class, and a privacy-minimized visitor/IP reference.
- Show page views, unique visitors for the selected retention window, top pages, referrer domains, device classes, and daily trend.
- Show country only when obtained from a trustworthy edge header or a configured geolocation provider. Never describe inferred country as nationality.
- Keep API-request counts separate from browser page views; neither metric should be presented as the other.

### Security and abuse controls
- List recent security events and suspicious traffic signals with reason and confidence.
- Allow SuperAdmin to create, expire, and remove an IP/network block, with confirmation, reason, audit trail, and expiry.
- Support temporary blocks by default; permanent blocks require explicit confirmation.
- Enforce blocks server-side before controller execution. Never trust a client-provided IP header.
- Keep allowlisting narrowly scoped and audited to reduce lockout risk.
- Detect common abusive patterns: repeated 401/403/404, high request rate, path scanning, and suspicious user-agent signatures.
- Do not automatically block legitimate crawlers solely by user-agent. Verified crawler status should be established using reverse DNS/forward DNS or a trusted edge/provider signal; otherwise label as suspected.
- Continue using rate limiting as the primary immediate control. Detection and block recommendations should be conservative and observable.

## 3. Data model and retention

Use persistent database entities and migrations, not in-memory state or Render's ephemeral filesystem:
- `VisitorPageView`: created UTC, normalized path, referrer host, device class, optional coarse country, pseudonymous visitor key, optional privacy-minimized IP fingerprint, and bot classification.
- `IpBlockRule`: normalized IPv4/IPv6 address or CIDR, created UTC, optional expiry, reason, active flag, created-by admin ID, and last-modified metadata.
- `SecurityTrafficEvent`: UTC timestamp, category, severity, IP fingerprint or restricted IP value only where justified, normalized path, status code, user-agent classification, and action taken.

Before enabling raw IP storage, define the purpose, access restrictions, retention period, deletion job, and privacy notice. Prefer a keyed HMAC fingerprint for analytics uniqueness; store raw IP only for security block rules/events when necessary. Never store query strings, authorization headers, cookies, request bodies, or full user-agent strings unless a documented security need requires them.

Initial recommended retention: analytics page-view records for 13 months; detailed security events for no more than 30 days by default. The API attempts a daily cleanup of old security events when it receives traffic; this is best-effort and is not a substitute for a durable scheduled retention job. Review retention settings and privacy notice before production. This is a technical default, not legal advice.

## 4. Proposed API surface

All administrative endpoints must require the existing server-side SuperAdmin security permission; hiding a menu item is not authorization.

- `POST /api/analytics/page-view`: minimal public event intake, strict payload validation, origin/rate controls, no arbitrary IP field.
- `GET /api/admin/visitor-analytics?days=7|30|90`: aggregates only.
- `GET /api/admin/security/traffic?take=...`: recent security signals, paginated and sanitized.
- `GET /api/admin/security/ip-blocks`: list active/expired rules.
- `POST /api/admin/security/ip-blocks`: create a validated address/CIDR block with reason and optional expiry.
- `DELETE /api/admin/security/ip-blocks/{id}`: deactivate a rule and write an audit event.

Endpoint names are proposals and should be reconciled with existing controller conventions before implementation.

## 5. Architecture and deployment requirements

1. Keep the existing `ApiUsageDaily` counters and screen unchanged.
2. Add database migrations for the actual production provider (Render PostgreSQL); ensure migration discovery and startup application are verified.
3. Register a block-enforcement middleware after trusted forwarded-header processing and before application endpoints. Use a short-lived cache with explicit invalidation on rule changes; fail open only for telemetry-storage errors, but fail closed for a confirmed active block.
4. Validate Render proxy headers before using them for IP identification. Never accept arbitrary forwarded headers from untrusted clients.
5. Add a public SPA page-view hook that respects consent and excludes admin, login, password-reset, payment callback, and other sensitive routes.
6. Keep geolocation optional and coarse. Do not call an external IP-lookup service for every request; cache results and document provider/retention if one is added.
7. Ensure a block does not block health checks or prevent SuperAdmin recovery. Define and test a safe recovery path before enabling enforcement in production.
8. Do not enable GA4 automatically as part of this feature. GA4 loading remains governed by the existing consent implementation.

## 6. Acceptance criteria

- No analytics event is sent before required consent.
- Page-view payload rejects malformed/oversized paths and strips query strings and fragments.
- Analytics endpoints expose aggregates, never raw IPs, tokens, emails, or raw query strings.
- Only SuperAdmin can read security traffic or manage IP blocks; API tests prove 403 for other roles.
- A confirmed block is enforced consistently across protected and public endpoints using the trusted client IP.
- IPv4, IPv6, CIDR, expiry, unblocking, and invalid-address cases have automated tests.
- Suspicious bots are labelled with evidence/confidence; verified legitimate search crawlers are not automatically blocked.
- Retention/deletion behavior is automated and tested.
- PostgreSQL migration succeeds from the currently deployed schema.
- CI passes backend build/tests, frontend build/tests, security checks, and migration validation.
- Render deployment and smoke tests are reported separately from code merge; no claim of production enforcement until live verification succeeds.

## 7. Implementation sequence

1. Verify consent banner/current consent storage, route tracking behavior, current migrations, and Render forwarded-header topology.
2. Implement database entities/migrations and unit tests.
3. Add the minimal consent-aware page-view collector and aggregate analytics API.
4. Add SuperAdmin UI for visitor statistics.
5. Add security event collection and IP/CIDR block management with audited, reversible actions.
6. Add conservative bot classification, rate/anomaly rules, and test fixtures.
7. Run CI, review migration, open PR, merge only after required checks, then verify Render deployment and production smoke tests.

## 8. Explicit limitations

This work does not claim that a visitor is a unique human, that geolocation is exact, or that user-agent strings prove a bot's identity. IP addresses may be shared, dynamic, proxied, or anonymized. IP-based blocking can affect multiple legitimate users and therefore needs expiry, auditability, and a recovery mechanism.
