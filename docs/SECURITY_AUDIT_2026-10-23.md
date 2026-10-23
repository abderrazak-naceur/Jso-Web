# Security audit — JSO Web

Data revisione: 23 ottobre 2026
Branch: `security/audit-vulnerabilities`
Commit di partenza: `da616b8c470a50c32fc4f30c907e6f7c5f82b985` (main)

## Stato e limiti

Prima revisione statica del sorgente GitHub. Non è stato possibile eseguire build, test, scanner SCA/SAST o test dinamici contro un ambiente distribuito in questa sessione. Non è quindi corretto concludere che il progetto sia sicuro o classificare tutti i punti aperti come vulnerabilità confermate.

## Finding iniziale

### F-001 — L'URL base API può essere impostato dal localStorage
- **Severità iniziale:** media come rischio di configurazione; non è una vulnerabilità remota autonoma confermata.
- **Evidenza:** `frontend/src/lib/apiConfig.js` legge la chiave `jso_api_base_url` dal localStorage e la usa come `API_BASE_URL`. Le funzioni in `frontend/src/lib/api.js` inviano token `Authorization: Bearer` alle richieste protette verso `API_BASE_URL + path`.
- **Scenario:** se un utente o codice eseguito nello stesso origin salva un URL non attendibile (per esempio dopo un XSS o una configurazione manuale malevola), successive richieste autenticate possono inviare il bearer token a quell'host. L'host deve essere HTTPS per non esporre il token sulla rete in chiaro, ma può comunque riceverlo.
- **Limiti:** la possibilità pratica dipende da chi può accedere alla funzione UI che modifica l'API, dal tipo di token persistito e dal modello XSS; non è stato dimostrato un attaccante remoto che modifica il localStorage senza altra debolezza.
- **Fix raccomandato:** in produzione accettare solo URL HTTPS con host allowlist configurata oppure disabilitare l'override runtime, mantenere override libero solo in sviluppo; prima di ogni richiesta autenticata validare l'origine target e non inviare token a origin non approvati.
- **Test richiesti:** override HTTPS ostile, URL HTTP, origine non allowlisted, input con credenziali/URL malformati, token bearer non inviato in caso di blocco.

## Rischi da verificare — non ancora classificati come vulnerabilità confermate

### F-002 — Rate limiting basato sull'IP e proxy reale
File: `backend/src/JSO.Api/Program.cs`
Il limiter `public-api` (120/min) e `auth-login` (5/5 min) partiziona in base a `Connection.RemoteIpAddress`. L'app abilita `X-Forwarded-For`/proto e marca loopback come proxy noto. Verificare sul reverse proxy effettivo che l'IP sia normalizzato correttamente e che un client non possa alterare l'identità con header forwarding. Il codice letto non dimostra da solo che il limite sia aggirabile.

### F-003 — Tutti i percorsi di upload amministrativi da mappare
Il percorso foto tifosi in `backend/src/JSO.Api/Controllers/FanPhotosController.cs` ha controlli utili: limite di 10 MiB, allowlist MIME, firma del file, decodifica/ricodifica e rate limiting. Questo non prova che il percorso distinto di upload media per admin applichi difese equivalenti. Identificare il controller corretto e verificare autorizzazione, limite request e immagine decodificata, estensioni/percorso, rate limit e accesso pubblico ai file.

### F-004 — Dipendenze: scansione non eseguita
Il repository ha Dependabot configurato per GitHub Actions, npm e NuGet. In questa sessione non è stato eseguito `npm audit`, `dotnet list package --vulnerable --include-transitive`, CodeQL o secret scanning. Nessuna conclusione sulle CVE delle dipendenze è quindi giustificata.

## Controlli positivi osservati nel sorgente
- `Jwt:Key` è richiesto da configurazione e deve essere lungo almeno 32 caratteri; `appsettings.json` contiene il campo vuoto, non una chiave statica.
- JWT verifica issuer, audience, scadenza e firma; token di fan e admin sono confrontati con lo stato/ruolo/versione sessione salvati nel database.
- Login e registrazione fan hanno rate limiting; registrazione richiede password di almeno 12 caratteri.
- Upload foto fan: allowlist JPEG/PNG/WebP, validazione della firma, decodifica e ricodifica, path generato dal server, stato Pending e controllo di ownership per la preview privata.
- Stripe webhook verifica la firma; Flouci esegue verifica lato provider e confronta importo/valuta prima di completare il pagamento.
- CORS usa origini esplicite, senza `AllowAnyOrigin`.

Sono osservazioni sui file controllati, non una garanzia d'assenza di bug altrove.

## Piano di verifica successivo
1. Mappare tutti i controller admin, attributi `[Authorize]`, ruoli/policy e accessi per ID (IDOR/BOLA).
2. Trovare e verificare il vero endpoint di upload media admin.
3. Controllare rendering di HTML e URL nei contenuti CMS, `getAssetUrl`, XSS e protocolli non sicuri; verificare gli header CSP effettivamente serviti dal frontend.
4. Eseguire su runner pulita `npm ci`, `npm audit` e `dotnet list package --vulnerable --include-transitive`; abilitare/controllare CodeQL e secret scanning.
5. Testare su staging autorizzato accesso anonimo/fan/admin, upload innocui ma malformati, rate limiting e webhook con firma non valida. Nessuna transazione reale o prova distruttiva.
6. Registrare finding confermati con severità, file/riga, scenario, prova riproducibile, impatto, fix e retest.

## Risultati d'esecuzione
- Lettura sorgenti GitHub: eseguita.
- Confronto iniziale branch/main: uguali prima del report.
- Commit creato: documentazione del primo audit.
- Build/test/SCA/SAST/DAST: non eseguiti in questa sessione.
- Correzioni al codice di produzione: nessuna ancora; la prima modifica è solo documentazione, per evitare fix speculativi.

## Richiesta al Team Leader
Dopo il mapping di controller e autorizzazioni, prioritizzare F-001 e il percorso di upload admin; richiedere evidenze riproducibili e scanner eseguiti prima di classificare una finding come confermata.
