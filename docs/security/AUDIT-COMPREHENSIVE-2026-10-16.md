# JSO-Web — Security Review 2026-10-16

## Executive summary

This is a broad source-code review of the current `main` branch, covering JWT/authentication, account recovery, public content, payment callbacks, payment configuration, fan uploads, media serving, permissions, and CI security controls. It is not a production penetration test or a formal certification. No production secrets, database rows, or Render environment values were accessed.

The earlier finding SEC-001 (internal `SiteContents` values exposed by `GET /api/content`) is already merged into `main` by PR #176. This review found one additional concrete authorization weakness and two further risks that need follow-up.

## Findings

### SEC-002 — Issued admin JWTs survive account disablement and role changes
- **Severity:** Medium
- **Status:** Fix proposed on this audit branch.
- **Location:** `backend/src/JSO.Api/Program.cs`, JWT `OnTokenValidated` event.
- **Evidence:** Before this branch, the event re-checked whether Fan accounts were active, then returned immediately for every non-Fan role. Admin JWTs contain the role and remain valid for up to eight hours; protected admin routes authorize using those token claims. The `/api/auth/me` endpoint checked the current admin row, but other protected endpoints did not.
- **Impact:** An admin account disabled by an administrator, or whose role is reduced, could keep using an already-issued token until it expired.
- **Change on this branch:** Validate the subject against the current database for both Fan and admin JWTs. Admin tokens are rejected when the account is inactive or its current role no longer matches the token role.
- **Validation still required:** CI and regression testing of an already-issued token before and after account disablement/role change.

### SEC-003 — Password reset does not revoke existing sessions
- **Severity:** Medium (session-management hardening)
- **Status:** Open / not fixed in this branch.
- **Location:** `backend/src/JSO.Api/Controllers/PasswordRecoveryController.cs` and JWT issuance/validation.
- **Evidence:** Password reset replaces the stored password hash and consumes reset tokens, but issued JWTs are self-contained and are not tied to a password/security version. Admin JWT validation added in SEC-002 checks active status and role, not whether the password changed after token issuance.
- **Impact:** If a password is reset after a token is stolen, that token can remain usable until expiry (currently up to eight hours for admin/fan tokens), unless the account is separately disabled or its role changes.
- **Recommended remediation:** Introduce a persisted security-stamp/token-version or password-changed timestamp for both account types, include a corresponding claim in JWTs, and reject tokens issued before the current version. Add tests for password-reset session revocation.

### SEC-004 — Pending fan-photo uploads are stored under the public static-files root
- **Severity:** Low to Medium (privacy / moderation-boundary gap)
- **Status:** Needs a targeted fix and product decision.
- **Location:** `backend/src/JSO.Api/Controllers/FanPhotosController.cs` and static file setup in `backend/src/JSO.Api/Program.cs`.
- **Evidence:** The upload handler stores unmoderated images under `uploads/fan-photos/...` and creates a `MediaAsset` with `IsPublished = false` and a `FanPhoto` with `Status = "Pending"`. However, the API serves the entire `uploads` directory as static files at `/uploads`, without checking moderation state.
- **Impact:** The public media listing hides unpublished assets, but anyone who obtains a pending image's URL can request the static file directly. This weakens the intended moderation/privacy boundary; the review did not establish that URLs are publicly discoverable or that this has been exploited.
- **Recommended remediation:** Keep pending files outside the public static directory, or serve them through an authorization-aware image endpoint. Only make an image publicly available after moderation approval, and test direct URL access for pending/rejected/deleted images.

### SEC-005 — Dependency and static-analysis coverage is incomplete
- **Severity:** Low (security-control gap; not itself an exploit)
- **Status:** Open.
- **Location:** `.github/workflows/security.yml`.
- **Evidence:** The inspected workflow checks for a few environment/key file names and uses a narrow regular expression for obvious hard-coded secrets. It does not itself run CodeQL/SAST, a general secret scanner such as Gitleaks, or a dependency vulnerability audit. CI builds and tests are useful but do not replace those scans.
- **Recommended remediation:** Add CodeQL (or equivalent SAST), secret scanning with history coverage, and dependency scanning (Dependabot alerts or an npm/.NET vulnerability audit) with a documented triage policy. Pin third-party GitHub Actions to immutable commit SHAs where practical.

### SEC-006 — Password-reset tokens are not a session-revocation mechanism
- **Severity:** Informational / related to SEC-003
- **Status:** Open.
- **Evidence:** Reset tokens are random, stored as SHA-256 hashes, expire after 30 minutes, and are one-use; these are positive controls. The separate outstanding gap is that using a reset token does not invalidate JWTs already issued before the reset (see SEC-003).

## Controls observed in inspected code

- Admin login and fan login require non-empty credentials, verify password hashes, and use a rate-limit policy.
- Password-reset tokens use a cryptographically random value, are stored hashed, expire after 30 minutes, and are consumed once. Responses avoid revealing whether an account exists.
- JWT validation checks issuer, audience, expiry, and signing key; this branch extends account-state checks to admins.
- Payment callbacks reviewed do not trust a success notification alone: Stripe verifies the signature, Konnect re-queries the provider, Flouci re-verifies payment server-side, and Paymee verifies a checksum and binds the token to the stored payable reference.
- Shop order creation recomputes catalog prices server-side; fan order queries are scoped to the authenticated fan.
- Payment provider secrets are encrypted at rest using AES-GCM; API responses expose only whether a secret exists, not the secret itself.
- Upload handlers use generated filenames, size limits, and content-type/signature checks. Those checks reduce risk but are not equivalent to image decoding/re-encoding in a hardened media pipeline.
- The previous public content API disclosure is fixed on `main` by PR #176.

## Additional hardening recommendations

1. Review and test all role/permission combinations for every admin endpoint, including staff assignments, ticket scanning, finance, and payment configuration.
2. Ensure public static files cannot bypass publication/moderation rules.
3. Add regression tests for admin disablement/role changes, reset-token single-use, payment callback replay/idempotency, and unauthorized access to another fan's orders/profile/photos.
4. Verify rate limiting uses the real client IP behind Render's reverse proxy; the configured forwarded-header trust list should match the actual trusted proxy topology. Otherwise rate limits keyed by `RemoteIpAddress` may group unrelated users behind a proxy.
5. Confirm production configuration has strong, unique `Jwt:Key`, payment provider credentials and webhook settings; rotate any secret found in Git history or logs. No production values were inspected in this review.
6. Add safe global response headers (e.g. CSP appropriate to the site, Referrer-Policy, and frame protections) after compatibility testing. The inspected startup explicitly sets `nosniff` for static uploads, but no global header policy was evident in the inspected section.

## Status and scope

- Branch: `audit/security-comprehensive-2026-10-16`
- No production deployment is part of this audit.
- CI/build checks must finish before the proposed fix is merged.
- This is a source review, not an external penetration test; findings are based on the inspected code paths and should be validated with regression/integration tests.
