# JSO Media Manager — MVP

Standalone media service. This folder does not modify the existing JSO Web, JSO API, or PostgreSQL schema.

## Target architecture
- Static frontend published at `https://jso-media.com/` using IONOS SFTP.
- Separate .NET 10 API deployed as its own Render web service.
- Existing Render PostgreSQL database reused; no migrations or schema changes in MVP.
- Image files stored on IONOS using server-side SFTP; public image URLs use HTTPS.
- JSO Web and Flutter consume the resulting HTTPS URLs.

## MVP scope
1. Authenticated media listing.
2. Upload JPEG, PNG, WebP, GIF with file signature validation and size limit.
3. Edit media title, caption, publication status.
4. Delete media record and its file only when storage path is owned by this service.
5. Health endpoint and configuration validation.
6. Deployment guide, backup and smoke-test checklist.

## Non-goals for MVP
- No changes to existing JSO projects.
- No database migrations, table creation, or destructive schema updates.
- No migration/deletion of legacy files or membership artwork.
- No automatic replacement of existing image URLs.
- No credentials committed to the repository.

## Important deployment prerequisites
- The API must run separately (for example as a Render Docker web service), not on IONOS shared Linux hosting.
- Configure the API with the same PostgreSQL connection string and database provider as JSO, plus a dedicated database role with only the required permissions where feasible.
- Confirm the Render database's network policy permits the new service. Prefer Render private networking; never expose PostgreSQL publicly just for this service.
- Configure the same JWT validation issuer, audience, and signing key as the current JSO API through Render environment variables. Never place JWT secrets in frontend code.
- Verify IONOS SFTP host-key fingerprint and document root before enabling writes.
- Verify the existing `MediaAssets` table mapping and current rows before the first production write. This service intentionally does not run EF migrations.

## Repository layout
- `Media/api/`: standalone .NET API project.
- `Media/frontend/`: static management UI.
- `Media/docs/PLAN.md`: implementation roadmap and acceptance criteria.

See [the MVP plan](docs/PLAN.md) and [deployment guide](docs/DEPLOYMENT.md).
