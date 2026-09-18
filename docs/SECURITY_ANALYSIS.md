# JSO — Security Analysis

## Current baseline
The repository is currently frontend-oriented, so backend/admin security controls cannot yet be fully audited.

## Findings
- Backend authentication/authorization: not yet implemented.
- RBAC enforcement: not yet implemented.
- API validation: not yet implemented.
- SQL access layer: not yet implemented.
- CORS/rate limiting: not yet implemented.
- Production secret management: not yet implemented.
- Docker hardening: not yet implemented.
- Automated security scanning: not yet visible in the verified snapshot.

## Required controls before production
1. Server-side authentication and authorization.
2. Least-privilege roles.
3. Strong password hashing.
4. Secure refresh/session handling and revocation.
5. Rate limiting/brute-force protection.
6. Strict CORS.
7. Input validation.
8. Parameterized EF Core/database access.
9. Security headers and HTTPS.
10. Secret scanning and dependency scanning in CI.
11. Audit logging for administrative actions.
12. Backup and restore testing.
13. Non-root production containers where supported.
14. No credentials in React/Vite client bundles.

## Important distinction
Client-side permission checks improve UX but do not provide security. Every protected operation must be authorized by the backend.

## Current risk assessment
The main risk is not a confirmed exploit in the current UI; it is that production functionality could be introduced before the planned security foundation exists.
