# Deployment guide

## IONOS frontend and image storage
1. Connect with FileZilla using the IONOS SFTP credentials.
2. Confirm the remote directory is the document root for `jso-media.com`.
3. Confirm the host-key fingerprint using IONOS documentation/support; do not disable host-key validation.
4. Back up the empty/current directory listing and confirm it contains no files that must be preserved.
5. Configure `Sftp__HostKeyFingerprint` in the Render API environment using the verified SHA-256 host-key fingerprint. Production SFTP connections fail closed when this value is missing.
6. Upload only the built static frontend files to the verified domain root.
7. Keep uploaded images in a dedicated `media/` subdirectory; never overwrite unrelated website files.

## Render API
Create a new Docker web service from this repository:
- Branch: `feature/jso-media-mvp` during validation, then the approved release branch.
- Dockerfile path: `Media/api/Dockerfile`
- Docker context: repository root.
- Region: Frankfurt, matching existing JSO services/database where possible.
- Do not change the existing `jso-api` service.

Set the following environment variables in the new service only:
- `ASPNETCORE_ENVIRONMENT=Production`
- `ASPNETCORE_URLS=http://+:10000`
- `ConnectionStrings__DefaultConnection` = existing PostgreSQL connection string (secret)
- `Database__Provider=postgres`
- `Jwt__Key` = same signing key as JSO API (secret)
- `Jwt__Issuer` = same issuer as JSO API
- `Jwt__Audience` = same audience as JSO API
- `Sftp__Host`, `Sftp__Port`, `Sftp__Username`, `Sftp__Password`
- `Sftp__HostKeyFingerprint`, `Sftp__RootPath`, `Sftp__PublicBaseUrl=https://jso-media.com`
- `Cors__AllowedOrigins` = comma-separated exact approved origins

Use Render private networking for PostgreSQL whenever possible. Do not make the database public just to connect the new API. Do not put any secret in frontend variables, source files, screenshots, or chat.

## Database safety
The API must not run migrations or create tables. Before enabling write operations:
- verify the deployed `MediaAssets` table and column mapping;
- test with a read-only credential first;
- take a database backup;
- confirm the application uses the existing table without altering its schema.

## Smoke test
- `GET /health` returns healthy.
- Unauthenticated `GET /api/media` returns 401.
- Authenticated allowed admin can list media.
- Upload an allowed image and verify its public URL.
- Reject an oversized, corrupted, non-image, or disguised executable file.
- Verify uploads are decoded and re-encoded, limited to 40 megapixels / 12,000 pixels per side, and rate-limited to 10 requests per IP per 10 minutes.
- Verify production storage connections fail closed if `Sftp__HostKeyFingerprint` is missing or incorrect.
- Update metadata and verify it is visible in JSO.
- Verify a delete operation only affects the intended asset and owned file.
- Check existing JSO pages and Flutter image links remain unchanged.
