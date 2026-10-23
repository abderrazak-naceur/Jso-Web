# Audit di sicurezza JSO-Web — 23 ottobre 2026

## Stato e metodo
Revisione statica sul branch dedicato `security/audit-jso-web-2026-10`, con verifica esterna preliminare degli advisory. I rilievi distinguono vulnerabilità note nelle dipendenze da rischi applicativi. Non sono stati eseguiti test intrusivi sul servizio pubblico.

## SEC-00 — Vite 6.4.3 richiede aggiornamento/verifica immediata
**Priorità: alta per la catena di build/dev; sfruttabilità in produzione da valutare.**

`frontend/package.json` e `frontend/package-lock.json` fissano Vite a `6.4.3`. Fonti pubbliche correnti elencano advisory per versioni fino a 6.4.3, incluse vulnerabilità con fix nelle patch successive e un advisory del 20 ottobre 2026 per CVE-2026-112942. Fonti: [Snyk — Vite 6.4.3](https://security.snyk.io/package/npm/vite/6.4.3), [Patchstack — CVE-2026-112942](https://patchstack.com/database/npm/npm/vite/vulnerability/npm-launch-editor-fs-existssync-existence-check-can-be-bypassed-on-windows-2). Il rischio specifico dipende dalla superficie esposta: alcuni difetti sono legati al server di sviluppo/editor. Il manifest da solo non prova che il sito pubblico sia sfruttabile.

**Azione:** eseguire `npm audit` sul lockfile, correlare gli advisory e aggiornare Vite a una versione corretta compatibile con il progetto; quindi rigenerare lockfile ed eseguire build, lint e test. Non sono state modificate dipendenze in questo passaggio.

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
