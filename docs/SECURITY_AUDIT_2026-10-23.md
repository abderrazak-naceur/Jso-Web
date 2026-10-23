# Security audit — JSO Web

Data revisione: 23 ottobre 2026
Branch: `security/audit-vulnerabilities`
Commit di partenza: `da616b8c470a50c32fc4f30c907e6f7c5f82b985` (main)

## Stato e limiti

Questa è una prima revisione statica del codice su GitHub. Non è stato possibile eseguire build, test, scanner SCA/SAST o test dinamici contro un ambiente deployato in questa sessione. Non dichiarare quindi l'applicazione “sicura” né trattare i punti da verificare come vulnerabilità confermate. Il branch è stato creato da main ed è inizialmente identico a main; nessun file di produzione è stato ancora modificato.

## Riepilogo iniziale

### Rischio da approfondire — override URL API controllabile via localStorage (frontend)
File: `frontend/src/lib/apiConfig.js`

Il client legge `jso_api_base_url` dal localStorage e lo antepone alle richieste API. Se un utente incolla o imposta accidentalmente un URL non attendibile, il browser invierà lì richieste e token Bearer per chiamate autenticante. Un XSS nello stesso origin potrebbe anche modificarlo. Questo non è, da solo, un bypass remoto: va controllato chi può cambiare l'impostazione nell'interfaccia e quali controlli esistono. Raccomandazione: in produzione restringere protocollo/host consentiti o consentire override solo in sviluppo/admin esplicito; evitare di inviare credenziali verso origini arbitrarie.

### Rischio da approfondire — header di rate limiting e proxy
File: `backend/src/JSO.Api/Program.cs`

Il limiter pubblico/login usa `Connection.RemoteIpAddress`, e forwarded headers è configurato per fidarsi di loopback. Verificare che il reverse proxy reale normalizzi correttamente IP e X-Forwarded-For e che i limiti siano efficaci in produzione. L'app ha limiti globali pubblici e per login; altre policy specifiche sono definite ma va verificato ogni endpoint. Non è ancora provata un'esposizione sfruttabile.

### Controllo prioritario — upload media admin
File: `backend/src/JSO.Api/Controllers/FanPhotosController.cs` contiene validazione per immagini fan: limite 10 MiB, allowlist MIME, firma, decodifica e ricodifica, path generato dal server e rate limit dedicato. È una buona protezione nel percorso fan, ma non dimostra che il diverso endpoint di upload admin abbia controlli equivalenti. Individuare e verificare l'endpoint admin, i limiti della richiesta, i controlli sul contenuto decodificato, path traversal, autorizzazioni e policy `media-upload`.

### Dipendenze e CI — scansione non ancora dimostrata
Il repository contiene Dependabot per GitHub Actions, npm e NuGet e una CI per build/test. In questa revisione non è stato eseguito `npm audit`, `dotnet list package --vulnerable`, CodeQL o uno scanner di segreti. I numeri di versione nel manifest, da soli, non provano né escludono vulnerabilità.

## Controlli positivi osservati nel sorgente
- La chiave JWT è richiesta da configurazione e deve essere lunga almeno 32 caratteri; il valore in `appsettings.json` è vuoto, non un segreto hardcoded.
- JWT verifica issuer, audience, lifetime e firma; le richieste controllano anche stato/ruolo/versione sessione corrente in database.
- La registrazione fan richiede password di almeno 12 caratteri; login e registrazione applicano una policy di rate limit per IP.
- Le foto dei fan sono limitate a JPEG/PNG/WebP, validate per firma e decodificate/ricodificate; in attesa di moderazione sono private e le route verificano ownership.
- Il webhook Stripe verifica la firma e il webhook Flouci esegue verifica lato provider, seguita da confronto importo/valuta.
- Il CORS usa origini esplicite e non usa `AllowAnyOrigin`; i controller vengono autenticati/ autorizzati tramite middleware.

Questi sono segnali positivi nel codice letto, non la prova di assenza di bug in altri percorsi.

## Piano tecnico immediato
1. Mappare tutti i controller admin, attributi `[Authorize]`, policy/ruoli e accessi per-ID (IDOR/BOLA).
2. Ispezionare ogni upload admin (MIME/signature/decoder/size/path/rate limit e accesso pubblico ai file).
3. Controllare `getAssetUrl` e il rendering di HTML/URL nei contenuti admin per XSS e protocolli non sicuri; controllare CORS, cookie/token storage e CSP effettivamente servita.
4. Eseguire nella CI su una runner pulita: `npm ci`, `npm audit --omit=dev` e audit completo per triage; `dotnet restore`, `dotnet list ... package --vulnerable --include-transitive`; CodeQL e secret scanning; build/test dopo ogni correzione.
5. Testare staging autorizzato: accesso anonimo/fan/admin ai percorsi sensibili, upload file ostili innocui, abuso rate limit e webhook con firme invalide. Non fare prove distruttive o pagamenti reali.
6. Registrare ogni finding con severità, file/riga, scenario d'attacco, evidenza riproducibile, impatto, fix e risultato di retest.

## Risultati esecuzione
- Lettura sorgenti GitHub: eseguita.
- Confronto branch con main: `identical`, 0 commit avanti, 0 indietro al momento della prima verifica.
- Build/test/SCA/SAST/DAST: non eseguiti in questa sessione.
- Correzioni codice: nessuna ancora; prima completare la mappatura e riprodurre i finding.
