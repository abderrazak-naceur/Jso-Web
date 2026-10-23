# Security audit — JSO Web

Data revisione: 23 ottobre 2026
Branch: `security/audit-vulnerabilities`
Commit di partenza: `da616b8c470a50c32fc4f30c907e6f7c5f82b985` (main)

## Stato e limiti
Prima revisione statica del sorgente GitHub. Non è stato possibile eseguire build, test, scanner SCA/SAST o test dinamici contro un ambiente distribuito in questa sessione. Non è quindi corretto concludere che il progetto sia sicuro né classificare tutti i punti aperti come vulnerabilità confermate.

## Finding iniziale

### F-001 — URL base API modificabile tramite localStorage
- **Priorità:** media come rischio di configurazione; non è una vulnerabilità remota autonoma confermata.
- **Evidenza:** `frontend/src/lib/apiConfig.js` legge `jso_api_base_url` dal localStorage e la usa come `API_BASE_URL`. Le funzioni in `frontend/src/lib/api.js` inviano `Authorization: Bearer` a `API_BASE_URL + path` per richieste protette.
- **Scenario:** se un utente o codice eseguito nello stesso origin salva un URL non attendibile, successive richieste autenticate possono inviare il bearer token a quell'host. Questo può succedere per configurazione manuale o in conseguenza di un'altra vulnerabilità come XSS; non è stato provato che un attaccante remoto possa modificare il localStorage autonomamente.
- **Fix raccomandato:** in produzione consentire solo HTTPS e host API allowlisted, oppure disabilitare l'override runtime; non inviare token a origini non approvate.
- **Retest:** URL HTTPS ostile, HTTP, host non allowlisted, URL malformati e prova che il token non venga inviato quando l'override è rifiutato.

### F-002 — Rate limiting: comportamento dipendente dal proxy
File: `backend/src/JSO.Api/Program.cs`
I limiti `public-api` (120/min) e `auth-login` (5/5 min) usano `Connection.RemoteIpAddress`. Forwarded headers sono abilitati e loopback è dichiarato proxy noto. Verificare configurazione e percorso effettivo del proxy in produzione; il sorgente da solo non dimostra che il limite sia aggirabile.

### F-003 — Upload media amministrativi da verificare
Il percorso foto tifosi in `backend/src/JSO.Api/Controllers/FanPhotosController.cs` applica limiti dimensione, allowlist MIME, firma, decodifica/ricodifica, nome generato e rate limit. Questo non dimostra che il percorso separato usato dall'admin abbia controlli equivalenti. Individuare il controller d'upload admin e verificare autorizzazione, limiti, validazione immagine decodificata, percorso, rate limit e accesso pubblico.

### F-004 — Dipendenze: scansione non eseguita
Dependabot risulta configurato per GitHub Actions, npm e NuGet. In questa sessione non sono stati eseguiti `npm audit`, `dotnet list package --vulnerable --include-transitive`, CodeQL o secret scanning; non si possono quindi affermare risultati sulle CVE delle dipendenze.

## Controlli positivi osservati
- `Jwt:Key` è richiesto e deve essere lungo almeno 32 caratteri; nel file di configurazione è vuoto anziché hardcoded.
- JWT verifica issuer, audience, scadenza e firma; le versioni di sessione e il ruolo/stato account sono confrontati con il database.
- Login/registrazione fan applicano rate limiting e la registrazione impone password di almeno 12 caratteri.
- Foto fan: JPEG/PNG/WebP, firma validata, immagine decodificata e ricodificata, path generato dal server, moderazione Pending e controllo ownership sulle immagini private.
- Stripe webhook verifica la firma; Flouci verifica il pagamento lato provider e controlla importo e valuta.
- CORS usa origini esplicite e non `AllowAnyOrigin`.

Queste osservazioni sono limitate ai file esaminati e non dimostrano assenza di bug in tutto il progetto.

## Piano di verifica
1. Mappare controller admin, attributi `[Authorize]`, ruoli/policy e accessi per ID (IDOR/BOLA).
2. Individuare e analizzare l'endpoint reale di upload media admin.
3. Controllare rendering di HTML/URL nel CMS, XSS e protocolli pericolosi; verificare la Content-Security-Policy servita in produzione.
4. Eseguire su runner pulita `npm ci`, `npm audit` e `dotnet list package --vulnerable --include-transitive`; verificare CodeQL e secret scanning.
5. Su staging autorizzato testare accessi anonimo/fan/admin, upload innocui malformati, rate limit e firme webhook invalide. Nessun pagamento reale o test distruttivo.
6. Registrare finding confermati con severità, file/riga, scenario, evidenza riproducibile, impatto, fix e risultato retest.

## Risultati esecuzione
- Lettura sorgenti GitHub: eseguita.
- Confronto iniziale branch/main: uguali prima della creazione del report.
- Commit documentale creato nella branch; nessun codice di produzione modificato.
- Build/test/SCA/SAST/DAST: non eseguiti in questa sessione.

## Richiesta al Team Leader
Dare priorità a F-001, al mapping delle autorizzazioni (IDOR/BOLA) e al percorso di upload admin. Richiedere prove riproducibili e risultati scanner prima di dichiarare una vulnerabilità confermata.
