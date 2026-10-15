# Password recovery configuration

Password recovery sends email through the Resend HTTPS API, which works on Render Free without SMTP egress.

Set these environment variables on the **primary Render API service**:

- `PasswordReset__FrontendUrl=https://jso-web.onrender.com`
- `Email__ResendApiKey=re_...` — create an API key in your Resend account and keep it secret.
- `Email__From=JSO <verified-sender@your-domain.example>` — use a sender/domain verified in Resend. A Resend testing sender can only deliver to permitted test recipients.

No SMTP host, port, username, password, or SSL settings are used.

Tokens are random, stored as SHA-256 hashes, expire in 30 minutes, and are single-use. New requests invalidate previous unused tokens. Passwords require 12–128 characters. The public endpoint intentionally returns the same acknowledgement whether or not an active account exists.

## Render setup and test

1. Create or sign in to Resend and verify the sending domain/sender according to its dashboard.
2. In Render, open the primary API service `jso-api` → **Environment** and add the three variables above. Do not put the API key in GitHub or source code.
3. Save changes and wait for the service to redeploy.
4. Request a password reset from the fan/admin login screen using an email address you control and permitted by the sender's Resend verification.
5. Confirm delivery, open the link within 30 minutes, set a password of 12–128 characters, and verify the new password can log in. Confirm an expired or reused link is rejected.

If Resend rejects delivery, the API logs the provider's HTTP status without logging the API key or reset token. Failed delivery removes the pending reset token.
