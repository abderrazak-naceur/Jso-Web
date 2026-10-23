# Audit di sicurezza JSO-Web — 23 ottobre 2026

## Stato

Audit preliminare basato su revisione statica dei file del branch `main`, con branch di lavoro dedicato `security/audit-jso-web-2026-10`. Questo documento non dichiara completato un penetration test: i risultati vanno confermati tramite revisione degli endpoint, test automatizzati e verifica dell'ambiente configurato.

## Perimetro iniziale

- Frontend React/Vite e dipendenze npm.
- API ASP.NET Core .NET 10, autenticazione JWT e autorizzazione.
- Upload/media e directory pubbliche statiche.
- CORS, forwarded headers, security headers, Swagger e configurazione runtime.
- Flussi di pagamento/webhook e gestione di segreti/configurazioni.
- CI, Docker e dipendenze backend/frontend.

## Risultati preliminari — da confermare

### S1 — Sessione supporter memorizzata in localStorage
**Priorità: alta (design risk, impatto dipendente dal modello di minaccia).**

Il README dichiara che la sessione dei fan usa `localStorage` e che il passaggio a cookie HttpOnly è ancora da completare. Gli access token accessibili da JavaScript sono esposti in caso di XSS. Il solo README non dimostra una vulnerabilità XSS sfruttabile, ma conferma un rischio di architettura da valutare insieme a rendering HTML, sanitizzazione e durata dei token.

**Verifica richiesta:** seguire login/logout/refresh, controllare tutti i punti che renderizzano HTML fornito dall'utente o dal CMS; verificare durata, scope e revoca dei token. Non registrare token reali nel report.

**Direzione correttiva:** valutare cookie HttpOnly, Secure e SameSite con protezione CSRF adeguata, oppure mantenere token solo in memoria; non introdurre una modifica di autenticazione senza test E2E e revisione delle implicazioni CSRF.

### S2 — File caricati esposti tramite URL statici pubblici
**Priorità: media, dipendente dal contenuto e dalla policy di accesso.**

In `backend/src/JSO.Api/Program.cs`, il contenuto della directory `uploads` è servito tramite `UseStaticFiles` su `/uploads`. Il codice blocca esplicitamente `/uploads/fan-photos`, ma il resto della directory viene servito pubblicamente. Potrebbe essere corretto per le immagini pubbliche della media library; non è invece adatto a file privati o in attesa di moderazione.

**Verifica richiesta:** mappare gli upload su sottocartelle e categorie, accertare che nessun documento privato o upload pendente possa finire in una directory pubblica; verificare nomi, estensioni, MIME, contenuto effettivo e limiti.

**Direzione correttiva:** separare in modo esplicito media pubblici e privati; servire i privati tramite controller autorizzato. Evitare modifiche finché la policy attesa di ciascuna categoria non è documentata.

### S3 — Forwarded headers e identificazione IP per rate limiting
**Priorità: media/bassa, configurazione da verificare.**

Il codice configura `X-Forwarded-For` e `X-Forwarded-Proto` e aggiunge `IPAddress.Loopback` tra i proxy noti. Le policy rate-limit usano `RemoteIpAddress`. In produzione dietro un reverse proxy, una configurazione incompleta o non allineata alla topologia effettiva potrebbe far ricadere molte richieste sulla stessa chiave o permettere un'identificazione IP errata. Non è dimostrabile dal solo codice che l'installazione attuale sia sfruttabile.

**Verifica richiesta:** documentare il proxy realmente usato, i proxy fidati e la quantità di hop; verificare che header inoltrati da client non fidati non vengano accettati e testare i rate limit dietro il proxy di produzione.

### S4 — CORS con origini statiche ammesse
**Priorità: bassa, revisione di configurazione.**

La policy aggiunge una lista statica di domini frontend oltre a `Cors:AllowedOrigins`. Non usa wildcard né `AllowCredentials` nel frammento esaminato, quindi non costituisce da sola una vulnerabilità. È però necessario confermare che ogni dominio elencato sia controllato e ancora necessario.

**Verifica richiesta:** validare proprietà e uso dei domini consentiti e rimuovere origin obsolete; controllare anche CORS effettivo sul servizio pubblicato.

### S5 — Swagger abilitabile in produzione via configurazione
**Priorità: bassa/informativa, dipendente dalla configurazione.**

Swagger è attivabile in produzione attraverso `Swagger:Enabled`. L'esposizione della descrizione API può agevolare la ricognizione, ma non è di per sé un bypass di autorizzazione. Il codice commenta che l'abilitazione deve essere temporanea e controllata.

**Verifica richiesta:** controllare la configurazione effettiva di produzione e confermare che Swagger sia disabilitato quando non serve. Verificare separatamente l'autorizzazione di ciascun endpoint.

## Controlli non ancora eseguiti

- Audit automatico SCA di npm e NuGet con advisory correnti.
- Test dei controller sensibili (401/403, escalation tra ruoli, IDOR/BOLA).
- Verifica dei segreti nella cronologia Git e nei file di deployment.
- Analisi dei workflow GitHub Actions, immagini Docker e configurazione Nginx.
- Test del sito e dell'API in produzione, inclusi cookie, CORS, TLS, webhook e rate limiting.

## Regole di lavoro

- Tutte le modifiche di questo audit devono rimanere in questo branch.
- Non fare push su `main`, non aprire o fondere automaticamente una PR e non svolgere test distruttivi.
- Non usare credenziali reali, non effettuare pagamenti reali e non eseguire scansioni invasive su servizi pubblici.
- Ogni risultato definitivo dovrà contenere file/riga o endpoint, precondizioni, impatto, prova riproducibile non distruttiva e rimedio.
- L'assenza di finding nei controlli eseguiti non equivale a prova di assenza di vulnerabilità.
