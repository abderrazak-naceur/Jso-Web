# JSO Media Manager — MVP Plan

## Goal
Provide a standalone media manager without changing the deployed JSO Web, JSO API, or existing PostgreSQL schema.

## Phase 0 — Safe preparation
- [x] Create a dedicated `Media/` project directory on a feature branch.
- [x] Document target architecture and deployment boundaries.
- [ ] Review existing `MediaAssets` mapping and rows.
- [ ] Verify IONOS document root and SFTP SHA-256 host fingerprint.
- [ ] Confirm PostgreSQL private-network connectivity and least-privilege access.
- [ ] Back up current media metadata and any files before production writes.

## Phase 1 — API MVP
- [ ] Health endpoint.
- [ ] JWT validation using existing JSO issuer/audience/key via environment variables.
- [ ] Role-protected list and upload endpoints.
- [ ] Validate file extension, MIME type, file signature and maximum size.
- [ ] Upload through SFTP to unique paths under `media/YYYY/MM/`.
- [ ] Store metadata in the existing `MediaAssets` table only; no migrations.
- [ ] Edit title/caption/published status.
- [ ] Safe deletion with ownership checks and storage-failure handling.
- [ ] CORS restricted to the production media domain and approved JSO origins.
- [ ] Rate limits and structured logging without secrets.

## Phase 2 — Frontend MVP
- [ ] Responsive dashboard and image grid.
- [ ] Authentication without embedding secrets.
- [ ] Search and pagination.
- [ ] Upload with progress/error feedback.
- [ ] Edit metadata and copy public URL.
- [ ] Delete confirmation and failure recovery.
- [ ] Accessible states for loading, empty results, and API errors.

## Phase 3 — Integration and deployment
- [ ] Publish frontend to the verified IONOS domain root via SFTP.
- [ ] Create a new Render web service using the dedicated Media Dockerfile.
- [ ] Configure secrets as Render environment variables only.
- [ ] Test health, login, list, upload, edit, URL retrieval, delete, and invalid-file rejection.
- [ ] Verify existing JSO pages and Flutter image references remain unchanged.
- [ ] Deploy only after acceptance checks pass.

## MVP acceptance criteria
1. Existing JSO services continue to work unchanged.
2. No database migration or schema mutation is performed by Media API.
3. An authorized admin can upload an allowed image; the file is available at its public HTTPS URL.
4. The corresponding metadata is stored in the existing catalog.
5. Unauthorized users cannot list, upload, edit, or delete assets.
6. A failed SFTP upload does not create a misleading database record.
7. Existing media URLs and records remain intact.
8. The production frontend is served from `https://jso-media.com/`.

## Rollback
- Disable the new Render service and remove its frontend files only if they belong to this deployment.
- Do not drop tables or bulk-delete records.
- Keep uploaded media files and database rows until an explicit cleanup review.
- Existing JSO services and the database remain the source of truth.
