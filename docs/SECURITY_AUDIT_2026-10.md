# Audit di sicurezza JSO-Web — 23 ottobre 2026

## Stato e metodo
Revisione statica sul branch dedicato `security/audit-jso-web-2026-10`, con verifica esterna preliminare degli advisory. I rilievi distinguono vulnerabilità note nelle dipendenze da rischi applicativi. Non sono stati eseguiti test intrusivi sul servizio pubblico.

## SEC-00 — Vite 6.4.3 richiede aggiornamento/verifica immediata
**Priorità: alta per la catena di build/dev; sfruttabilità in produzione da valutare.**

`frontend/package.json` e `frontend/package-lock.json` fissano Vite a `6.4.3`. L'esecuzione effettiva di `npm audit` ha segnalato Vite con range vulnerabile `<=6.4.3` e correzione disponibile `6.4.5`. Tra gli advisory segnalati: [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm) (bypass del controllo `fs.existsSync()` su Windows, high), oltre ad altri advisory di gravità inferiore relativi a `launch-editor` e al server Vite. Il rischio specifico dipende dalla superficie esposta: alcuni difetti sono legati al server di sviluppo/editor; il risultato non dimostra automaticamente che il sito pubblico sia sfruttabile.

**Azione:** aggiornare Vite almeno alla patch correttiva indicata dall'audit (`6.4.5` o una versione supportata più recente compatibile), rigenerare il lockfile ed eseguire build, lint, test e una nuova scansione. Nessuna dipendenza è stata aggiornata in questo passaggio.

## SEC-01 — Token supporter accessibile da JavaScript
**Priorità: alta come rischio architetturale; XSS non dimostrata.**

Il README dichiara che la sessione fan usa `localStorage`; `frontend/src/lib/api.js` invia il token come Bearer e `AccountController.cs` restituisce `accessToken`. Una XSS eseguibile nell'origine potrebbe leggere il token, ma questa ispezione non ha provato una XSS sfruttabile.

**Verificare:** rendering HTML/CMS, sanitizzazione, URL dinamici, logout, cambio password, revoca e durata JWT. Valutare cookie HttpOnly/Secure/SameSite con difesa CSRF o token in memoria; ogni modifica richiede test E2E.

## SEC-02 — Upload serviti staticamente
**Priorità: media, dipende dalle categorie dei file.**

In `backend/src/JSO.Api/Program.cs`, `uploads` è esposta tramite `UseStaticFiles` su `/uploads`; `/uploads/fan-photos` viene esclusa esplicitamente. La galleria fan usa endpoint autenticati/moderati per le foto, ma va verificato che tutte le altre categorie rispettino la distinzione pubblico/privato.

**Verificare:** destinazioni di upload, documenti privati, contenuti non moderati e dati personali. Separare storage pubblico e privato solo dopo aver confermato i requisiti applicativi.

## SEC-03 — Decoder immagini: consumo di memoria da verificare
**Priorità: media-bassa, superficie DoS da testare.**

`ImageUploadSanitizer.cs` limita l'input a 10 MiB, 12.000 px per lato e 40 milioni di pixel, quindi decodifica/ricodifica con SkiaSharp. Le immagini al limite possono consumare memoria significativa e il metodo rilancia `OutOfMemoryException`.

**Verificare:** che tutti gli endpoint usino il sanitizer; che i limiti multipart/request agiscano prima del buffering e che vi siano limiti di concorrenza. Test di carico soltanto in ambiente isolato.

## SEC-04 — Proxy fidati e rate limiting per IP
**Priorità: media-bassa, configurazione da verificare.**

`Program.cs` abilita `X-Forwarded-For` e `X-Forwarded-Proto`, configura Loopback tra i proxy noti e usa `RemoteIpAddress` nelle policy. L'efficacia dipende dal proxy e dagli hop reali. Verificare topologia, header accettati solo da proxy fidati e rate limit dietro l'edge.

## SEC-05 — CORS con origini statiche
**Priorità: bassa, hardening.**

`Program.cs` aggiunge domini statici a `Cors:AllowedOrigins`. Non sono emersi wildcard o `AllowCredentials` nel frammento. Confermare proprietà e necessità di ogni origin e verificare gli header effettivi dell'ambiente pubblicato.

## SEC-06 — Swagger abilitabile in produzione
**Priorità: informativa, dipendente dalla configurazione runtime.**

Swagger è attivabile tramite `Swagger:Enabled`. La ricognizione API è facilitata ma non implica un bypass di autorizzazione. Verificare la configurazione prod e disabilitare salvo finestra controllata.

## SEC-07 — Webhook Paymee non richiede esplicitamente sempre l'importo
**Priorità: da valutare; frode non dimostrata.**

`PaymeeWebhookController.cs` espone `[HttpGet]` e `[HttpPost]`. Il checksum viene verificato con la API key e il codice lega il token firmato al riferimento provider del payable. Il codice riconosce che il checksum non firma `order_id` o `amount`; il controllo dell'importo si esegue soltanto se `amount.HasValue`, quindi un callback positivo privo di amount non è esplicitamente rifiutato.

**Verificare:** specifica Paymee, attendibilità dell'importo recuperabile server-to-server e test esistenti. Se la callback può omettere l'importo, recuperare stato/importo da fonte provider autenticata prima di completare. Valutare necessità di GET, rischio di token in log/proxy e replay. Nessuna transazione reale è stata eseguita.

## SEC-08 — Newsletter: token di conferma non consegnato via email e controllo di accesso da rivedere
**Priorità: media (funzionalità/riservatezza); esposizione diretta non dimostrata.**

In `backend/src/JSO.Api/Controllers/NewsletterController.cs`, il codice commenta che l'email transazionale è ancora TODO. Il token viene generato e memorizzato, mentre `LogPendingConfirmation` attualmente registra soltanto l'ID della subscription e non il token (il commento non è coerente con l'implementazione corrente). Questo significa che il doppio opt-in non è operativo per un utente normale finché l'email non è integrata. Inoltre gli endpoint `confirm` e `unsubscribe` accettano token via query string anche su GET/POST: qualunque token reale passato in URL può essere copiato nei log del proxy/browser o nella cronologia; il rischio dipende dai log e dalla distribuzione dei token.

**Verificare:** flusso completo di consegna token, generazione, scadenza, rotazione e invalidazione; evitare token nei query string ove possibile e applicare rate limiting dedicato a conferma/disiscrizione. Trattare il finding come requisito di sicurezza/funzionalità, non come prova di accesso non autorizzato ai dati.

## Segnali positivi osservati
- La chiave JWT viene rifiutata all'avvio se assente o inferiore a 32 caratteri.
- Il login admin usa risposta generica per credenziali errate e rate limiting.
- La validazione JWT controlla stato, ruolo e versione sessione di utenti fan/admin.
- Stripe verifica la firma webhook; Paymee verifica checksum e provider reference.
- Il sanitizer immagini ricodifica i file invece di conservarne i byte originali.

## Controlli ancora necessari
1. Audit SCA completo di dipendenze npm/NuGet con advisory correnti.
2. Revisione sistematica dei controller admin e dei controlli di ownership (IDOR/BOLA, ruoli e scope).
3. Mappatura completa delle route di upload e directory di storage.
4. Ricerca di segreti nella cronologia Git, configurazioni, Docker e workflow, senza riportare valori sensibili.
5. Test webhook in staging con firma errata, importo mancante/errato e replay.
6. Test di accesso anonimo, 401/403, rate limiting e permessi in locale/CI controllato.
7. Verifica di domini, CORS, TLS e header sull'ambiente reale da una rete raggiungibile.

## Criteri di chiusura
Ogni vulnerabilità confermata deve includere file/endpoint, precondizioni, gravità motivata, prova non distruttiva, impatto e rimedio. I controlli non eseguiti restano limitazioni; assenza di finding non prova assenza di vulnerabilità.

## Regole di branch
Tutte le modifiche devono rimanere su `security/audit-jso-web-2026-10`. Non aggiornare `main`, non fondere PR automaticamente, non eseguire scansioni invasive o transazioni reali e non usare/stampare segreti reali.


## SEC-09 — Token storage and XSS review (static review, 23 ottobre 2026)

### Token locations verified

- **Fan token storage/read/delete:** `frontend/src/features/account/useFanSession.js:3-18, 37-51`. Uses key `jso_fan_token`; login writes `result.accessToken`, session restore reads it, logout removes it. The hook revalidates a stored token through `accountApi.me(token)` at lines 55-73.
- **Fan token use:** `frontend/src/lib/api.js:68-91` defines `requestJson`, which adds `Authorization: Bearer` only when a caller supplies a token. Account and other authenticated API methods pass that token explicitly.
- **Admin token storage/logout:** `frontend/src/admin/AdminApp.jsx:12-20, 139-143`. Uses `jso_admin_token` and `jso_admin_user`, stores them after successful login and removes them on logout.
- **Admin token read/use:** `frontend/src/admin/api.js:3-13` reads `jso_admin_token` and adds it as a Bearer header. On a 401 it clears the admin token/user at lines 21-24.
- `frontend/src/lib/apiConfig.js` also stores an API base URL override and language preference in localStorage; these are not authentication tokens.

### XSS conclusion

**No reproducible XSS was confirmed in this pass.** A targeted static scan of 10 high-risk content/account modules (including `NewsModule.jsx`, `ContentModule.jsx`, `MediaModule.jsx`, `ArticleModal.jsx`, `NewsCard.jsx`, `CommentsSection.jsx`, `ClubSection.jsx`, `SupporterProfilePage.jsx`, `HomeContentSections.jsx`, and `FundraisingProjectView.jsx`) found no executable sinks such as `dangerouslySetInnerHTML`, assignments to `innerHTML`/`outerHTML`, `document.write`, `eval`, or `new Function`. React text interpolation is escaped by default. This is a scoped static check, not proof that every frontend file is free of XSS; all render paths for CMS content, rich text, URL attributes and dependencies still need a full repository scan and browser-based reproduction tests.

The risk identified here is **primarily token exposure by design**, not a demonstrated XSS. If any same-origin XSS is later confirmed, both fan and admin bearer tokens could be read by injected JavaScript while stored in localStorage. The admin area shares the frontend origin, so this risk also affects the administrative token.

**Recommended changes:** do not change auth storage without a migration/test plan. Prefer a backend-managed session using Secure, HttpOnly, SameSite cookies and CSRF protections where the architecture permits; otherwise keep short-lived access tokens in memory and use a carefully designed refresh mechanism. Add CSP and Trusted Types where compatible, ensure CMS/user content is rendered as text or sanitized through a maintained allow-list sanitizer, and validate URL protocols before placing untrusted values into `href` or `src`.

### JWT signature, expiry, role and revocation checks

- `backend/src/JSO.Api/Program.cs:92-105` requires issuer, audience, lifetime and signing-key validation and allows a one-minute clock skew.
- `backend/src/JSO.Infrastructure/AdminSecurity.cs:30-50, 52-75` signs admin and fan JWTs with HMAC-SHA256, includes subject/email/role/session-version claims and sets an eight-hour expiry. Fan tokens contain only the `Fan` role.
- `backend/src/JSO.Api/Program.cs:106-153` rejects missing role/invalid subject, checks active fan accounts and compares `fan_session_version`; admin validation compares the token's role/session version with the current active database record. This provides per-request revocation when the account is disabled, role changes, or the session version changes.
- `backend/src/JSO.Api/Controllers/AccountController.cs` requires `[Authorize(Roles = "Fan")]` on fan profile endpoints; password change increments `SessionVersion`, invalidating previous fan tokens.

**Static conclusion:** core JWT controls appear correctly configured in the reviewed code. Runtime behavior, role-change pathways and revocation tests have not been executed; the conclusion is not a penetration-test result.

## Dependency audit automation

Added `.github/workflows/security-audit.yml` on this branch only. It runs `npm audit --json` against `frontend/package-lock.json` and `dotnet list backend/JSO.sln package --vulnerable --include-transitive` on pushes to this audit branch or manual dispatch. The workflow is running as GitHub Actions run [40030823003](https://github.com/abderrazak-naceur/Jso-Web/actions/runs/40030823003); the npm step has completed, while the NuGet step was still running at the time of this update. Dependency findings and versions will be added once the run completes. No dependencies or application behavior have been changed.

## Scope/limitations update

- No reproducible XSS confirmed in the targeted static scan; full-project XSS scanning and browser reproduction remain pending.
- JWT validation controls reviewed statically; no live authentication test was executed.
- npm/NuGet automated results are pending from the branch-only workflow.
- No changes to `main`, no merge, no real payments and no intrusive production testing.


## SEC-10 — Esito effettivo SCA (GitHub Actions, 23 ottobre 2026)

Esecuzione completata della workflow [Security dependency audit](https://github.com/abderrazak-naceur/Jso-Web/actions/runs/40030898300):

- `npm audit --json` sul lockfile frontend: **2 high, 0 critical, 0 moderate, 0 low**. I pacchetti riportati dal primo output sono `vite` e `source-map-js`. La workflow è stata ampliata per mostrare advisory, range, percorsi e disponibilità della correzione; il nuovo run è in corso, quindi le versioni/fix precisi sono ancora da confermare nel log aggiornato.
- `dotnet list backend/JSO.sln package --vulnerable --include-transitive`: **nessun pacchetto vulnerabile rilevato** per i progetti JSO.Api, JSO.Application, JSO.Domain e JSO.Infrastructure sulle fonti NuGet configurate al momento dell'esecuzione.
- Il workflow è volutamente informativo e non aggiorna dipendenze automaticamente; non sono stati cambiati manifest o lockfile. Il log dettagliato è disponibile nella [run GitHub Actions](https://github.com/abderrazak-naceur/Jso-Web/actions/runs/40030898300).

**Priorità immediata:** aggiornare la catena frontend interessata dopo aver confermato l'advisory e la versione corretta; rigenerare il lockfile e ripetere `npm audit`, build, lint e test. Non considerare la workflow "success" come assenza di vulnerabilità: gli step registrano i risultati e terminano con exit 0 per non interrompere la raccolta.
