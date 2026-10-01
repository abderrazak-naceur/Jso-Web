# JSO — Render pre-production status

**Updated:** 1 October 2026

## Verified

- jso-api Render service is deployed from main.
- The explicit administrator password-recovery deploy completed successfully.
- The one-time recovery flag was disabled after the reset.
- The bootstrap password environment variable was cleared after recovery.
- PostgreSQL migrations completed with the production database reported as up to date during the recovery deployment.
- The public Render environment remains pre-production: it is not a substitute for the Oracle go-live environment.

## Remaining production proof

These items still require an environment with the real production domain/VM:

1. HTTPS and DNS on the production domain.
2. PostgreSQL backup and a real restore test.
3. Persistent media upload verification across container/VM restart.
4. Browser E2E on the production origin, including CORS and admin login.
5. Oracle VM deployment and operational monitoring.
6. Android/iOS physical-device testing and store release.

This file records only verified deployment facts; it does not mark the production go-live criteria as complete.
