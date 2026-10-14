# GitHub repository media storage

All new admin uploads are committed as files to `frontend/public/uploads/YYYY/MM/` in the existing `abderrazak-naceur/Jso-Web` repository. The API serves these images through a public proxy endpoint, keeping the GitHub token server-side.

## Render API environment variables

Set these on the **API** service, not the frontend:
- `GitHubMedia__Repository=abderrazak-naceur/Jso-Web`
- `GitHubMedia__Branch=main`
- `GitHubMedia__Directory=frontend/public/uploads`
- `GitHubMedia__Token=<fine-grained GitHub token>`

The token should be limited to this repository and granted **Contents: Read and write**. Never commit the actual token, and never expose it through a `VITE_*` frontend variable.

Legacy uploads under `/uploads` remain served by the current static-file middleware. New uploads retain the 10 MiB limit and image-signature checks.

## Important limits

Every image upload creates a GitHub commit, and image reads go through the API. This is intended for ordinary site imagery, not high-volume or large media. After deploy, test one upload in Admin → Media Library, confirm the file is committed in the configured directory, and verify its returned URL loads without authentication.
