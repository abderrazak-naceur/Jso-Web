# Password recovery configuration

Set on Render API: `PasswordReset__FrontendUrl=https://jso-web.onrender.com`, `Email__SmtpHost`, `Email__SmtpPort=587`, `Email__From`, optional `Email__Username` and `Email__Password`, and `Email__EnableSsl=true`. Tokens are random, stored as SHA-256 hashes, expire in 30 minutes, and are single-use. New requests invalidate previous unused tokens. Passwords require 12–128 characters. Configure SMTP before testing delivery.
