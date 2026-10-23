# Security audit — JSO Web

Data revisione: 23 ottobre 2026
Branch: `security/audit-vulnerabilities`
Commit di partenza: `da616b8c470a50c32fc4f30c907e6f7c5f82b985` (main)

## Stato e limiti
Revisione statica iniziale del sorgente GitHub. Non sono stati eseguiti build, test, scanner SCA/SAST o test dinamici in questa sessione. Non si può concludere che il progetto sia sicuro o dichiarare vulnerabilità sfruttabili senza evidenze riproducibili.

## Finding

### F-001 — URL base API runtime controllabile via localStorage
- **Priorità:** da approfondire; rischio concreto di configurazione, vulnerabilità remota non dimostrata.
- **Evidenza:** `frontend/src/lib/apiConfig.js` legge `jso_api_base_url` da localStorage e la usa per comporre la destinazione delle richieste. `frontend/src/lib/api.js` aggiunge `Authorization: Bearer` alle richieste protette indirizzate a `API_BASE_URL + path`.
- **Scenario:** se l'impostazione viene cambiata verso un host non attendibile (da configurazione manuale o codice già eseguito nello stesso origin), le successive chiamate autenticate possono spedire il token a quell'host. Non è stato dimostrato che un attaccante remoto possa modificare localStorage senza un'altra debolezza.
- **Correzione proposta:** in produzione consentire solo host API HTTPS allowlisted o disabilitare l'override runtime; non inviare token a origini non approvate.
- **Test richiesti:** override HTTP, host ostile non allowlisted, URL malformato e verifica che il token non venga spedito quando l'URL è rifiutato.

### F-002 — Rate limiting e proxy reale
File: `backend/src/JSO.Api/Program.cs`. I limiti `public-api` (120/min) e `auth-login` (5/5 min) si basano su `Connection.RemoteIpAddress`. Forwarded headers è configurato e loopback indicato come proxy noto. Verificare il comportamento del proxy reale, la normalizzazione dell'IP e la possibilità di falsificare header forwarding. Il sorgente non dimostra da solo che il rate limit sia aggirabile.

### F-003 — Upload media admin non ancora verificato
Il percorso fan in `backend/src/JSO.Api/Controllers/FanPhotosController.cs` include controlli positivi: max 10 MiB, allowlist JPEG/PNG/WebP, firma, decodifica/ricodifica, path generato e rate limit. Non dimostra che il distinto endpoint di upload amministrativo applichi le stesse misure. Individuare il controller admin e verificare autenticazione/autorizzazione, limiti di richiesta, contenuto decodificato, path, rate limit e possibilità di accesso pubblico non previsto.

### F-004 — Scansioni dipendenze e statiche non eseguite
Dependabot è configurato per GitHub Actions, npm e NuGet. Non è stato eseguito `npm audit`, `dotnet list package --vulnerable --include-transitive`, CodeQL o secret scanning; nessun esito sulle CVE può essere dichiarato.

## Controlli positivi osservati
- `Jwt:Key` è obbligatorio e deve essere lungo almeno 32 caratteri; nel file appsettings è vuoto anziché un segreto hardcoded.
- JWT verifica issuer, audience, scadenza e firma; la validazione controlla stato, ruolo e versione di sessione nel database.
- Login/registrazione fan hanno rate limiting; la registrazione impone password di almeno 12 caratteri.
- Le foto fan accettano JPEG/PNG/WebP, con verifica firma, decodifica/ricodifica, path generato, moderazione Pending e controllo ownership.
- Stripe webhook verifica la firma; Flouci verifica pagamento lato provider e confronta importo/valuta.
- CORS configura origini esplicite e non usa `AllowAnyOrigin`.

Questi sono segnali positivi nei file letti, non prova di assenza di bug in altri endpoint.

## Piano di verifica
1. Mappare i controller admin, `[Authorize]`, ruoli/policy e controlli di proprietà per ID (IDOR/BOLA).
2. Identificare ed esaminare l'endpoint admin per upload media.
3. Ispezionare rendering HTML/URL del CMS, XSS e protocolli non sicuri; verificare la CSP realmente servita sul sito.
4. Eseguire su runner pulita `npm ci`, `npm audit` e `dotnet list package --vulnerable --include-transitive`; verificare CodeQL e secret scanning.
5. Su staging autorizzato testare percorsi anonimi/fan/admin, upload innocui ma malformati, rate limit e firme webhook invalide. Niente pagamenti reali o azioni distruttive.
6. Per ogni problema confermato documentare severità, file/riga, scenario, evidenza riproducibile, impatto, fix e retest.

## Stato delle verifiche
- Lettura sorgenti GitHub: eseguita.
- Confronto iniziale con `main`: branch identico prima del rapporto.
- Rapporto documentale pubblicato nella branch.
- Build/test/SCA/SAST/DAST: non eseguiti in questa sessione.
- Codice di produzione modificato: no.

## Richiesta a B — Team Leader
Prioritizza F-001, la mappatura autorizzazioni IDOR/BOLA e l'upload admin; chiedi prove riproducibili e risultati effettivi degli scanner prima di classificare vulnerabilità confermate.
