# Revisione tecnica JSO-Web — 14 ottobre 2026

**Repository:** https://github.com/abderrazak-naceur/Jso-Web  
**Branch analizzato:** `main`  
**HEAD analizzato:** `95a36ee5e67e021f190640f76c26afe7b7e9c016` (V1.39)  
**Frontend Render:** https://jso-web.onrender.com  
**API Render:** https://jso-api.onrender.com

## Sintesi esecutiva

La revisione ha incluso configurazione del repository, codice frontend e backend, configurazione Render, cronologia deploy, workflow CI e log disponibili. Non sono state apportate modifiche al codice applicativo, alle variabili d'ambiente o al database.

I deploy Render più recenti consultati risultano completati:
- **Frontend:** V1.39, commit `95a36ee5e67e021f190640f76c26afe7b7e9c016`, stato Render `live`.
- **API:** V1.37, commit `4f4e1e6a54b89a911c4b3542f9171cb2cf2d17aa`, stato Render `live`.

Il confronto tra il commit API pubblicato e `main` mostra cinque commit successivi, ma le differenze rilevate riguardano `HeroSection.jsx`, `frontend/src/version.json`, un test frontend e `version.md`: non è emersa una differenza di codice backend tra i due riferimenti. Il disallineamento delle etichette di versione non indica quindi, da solo, una mancata pubblicazione di funzionalità API.

**Conclusione:** i deploy risultano riusciti, ma non è possibile certificare che ogni flusso funzionale sia corretto solo in base allo stato Render. Sono emersi due rischi operativi da verificare prioritariamente, oltre ad alcune lacune di test e documentazione.

## Rilievi prioritari

### R1 — Persistenza dei file caricati: rischio alto

**Evidenza**
- In `backend/src/JSO.Api/Program.cs`, l'API crea la cartella `uploads` sotto la directory dell'applicazione e la espone tramite il percorso pubblico `/uploads`.
- La configurazione del servizio Render API consultata non mostra un disco persistente configurato.
- La documentazione del progetto include caricamenti di immagini e media, come loghi e foto profilo.

**Impatto potenziale**
I file scritti sul filesystem locale del container possono non sopravvivere a una nuova distribuzione, sostituzione del container o riavvio. Questo può causare immagini che inizialmente si vedono ma in seguito restituiscono 404, anche se i record nel database continuano a contenere il relativo URL.

**Azione raccomandata**
Spostare gli upload su storage persistente (object storage consigliato per media pubblici) oppure configurare un disco persistente e un percorso esplicito. Prima della migrazione, censire i record che puntano a `/uploads`, copiare i file esistenti e verificare URL, permessi, dimensioni e tipo MIME. Non cancellare la cartella attuale finché la migrazione non è stata verificata.

**Stato:** rischio confermato dalla configurazione osservata; perdita effettiva di file non misurata in questo controllo.

### R2 — IP client, proxy Render e rate limiting: rischio medio-alto da verificare

**Evidenza**
- `Program.cs` abilita `X-Forwarded-For` e `X-Forwarded-Proto`, ma configura esplicitamente come proxy noto soltanto `IPAddress.Loopback`.
- I rate limiter `public-api` e `auth-login` partizionano le richieste usando `HttpContext.Connection.RemoteIpAddress`.

**Impatto potenziale**
Se il proxy di Render non viene riconosciuto come trusted proxy da ASP.NET Core, l'indirizzo remoto potrebbe essere quello del proxy anziché quello del visitatore. In tal caso utenti diversi potrebbero condividere lo stesso limite di richieste, generando risposte 429 inattese o limitando l'accesso al login.

**Azione raccomandata**
Verificare l'IP remoto effettivamente visto dall'applicazione in produzione e confrontarlo con gli header inoltrati. Configurare esclusivamente i proxy/reti attendibili secondo la topologia Render; non fidarsi indiscriminatamente di qualunque header `X-Forwarded-For`. Aggiungere un test d'integrazione che dimostri che utenti con IP diversi hanno partizioni distinte.

**Stato:** rischio architetturale dedotto dal codice; comportamento reale del proxy non verificato direttamente.

### R3 — Health check Render non configurato: rischio medio

**Evidenza**
- L'API espone `/health` con controllo del contesto database.
- La configurazione del servizio Render consultata riporta `healthCheckPath` vuoto.

**Impatto potenziale**
Render non usa l'endpoint applicativo per il controllo di salute del servizio. Un deploy può risultare concluso senza una verifica esplicita e continua dell'endpoint di health configurato a livello di piattaforma.

**Azione raccomandata**
Configurare `/health` come health check del servizio API e verificare che un database non disponibile produca uno stato non sano. Valutare separatamente una health probe di sola liveness, se necessaria per evitare che un problema temporaneo del database provochi riavvii impropri.

### R4 — Errori EF Core storici: da diagnosticare, non confermati come attuali

**Evidenza**
Nei log API del 7 ottobre 2026 compaiono ripetute eccezioni `Microsoft.EntityFrameworkCore.DbUpdateException` durante il salvataggio. Gli estratti disponibili non includono l'intera eccezione interna e quindi non consentono di stabilire con certezza la causa.

Nella finestra consultata dal 13 al 14 ottobre non sono stati restituiti log applicativi di livello error/warn né richieste HTTP 5xx. Questa è una buona indicazione, ma non dimostra che il problema storico sia stato definitivamente risolto.

**Azione raccomandata**
Recuperare l'eccezione interna completa e correlare l'errore a endpoint, entità e vincolo database. Verificare in particolare le scritture concorrenti nelle tabelle di telemetria/contatori e gli eventuali vincoli univoci. Aggiungere un test di concorrenza se la causa è confermata.

### R5 — Stato CI del commit corrente non certificabile: rischio medio

**Evidenza**
- Il workflow `.github/workflows/ci.yml` definisce build frontend, test delle route, lint, build/test backend e validazione delle migrazioni PostgreSQL.
- La lettura dello stato combinato del commit `95a36ee` ha restituito una lista di status check vuota.
- I deploy Render esaminati risultano invece riusciti.

**Impatto**
Il successo del build Render non sostituisce l'esecuzione di lint, unit test, test delle route e validazione delle migrazioni. Con i dati disponibili non posso dichiarare superati tutti i controlli CI sul commit corrente.

**Azione raccomandata**
Verificare in GitHub Actions le esecuzioni associate al commit HEAD e rendere obbligatori i controlli essenziali prima del merge. Registrare esito e commit preciso per ogni rilascio.

## Rilievi frontend e qualità

### R6 — Prezzo/stagione abbonamenti parzialmente hard-coded: rischio medio-basso

**File:** `frontend/src/features/memberships/MembershipsSection.jsx`

La pagina carica i piani da API e visualizza prezzo e durata dai dati ricevuti, ma il testo introduttivo dichiara un prezzo unico di **30 TND** e la stagione **2026–2027** è ripetuta in più punti statici. Se l'amministratore cambia prezzo, durata o stagione, il testo può contraddire i dati effettivi mostrati nella card.

**Azione raccomandata:** rendere il testo dinamico a partire dai piani e dalla stagione configurata, oppure eliminare le affermazioni statiche che possono diventare incoerenti.

### R7 — Installazione dipendenze ridondante nella build frontend: rischio basso

**Evidenza**
- Il comando Render configurato per il frontend è `npm ci && npm run build`.
- Lo script root `build` esegue nuovamente `cd frontend && npm ci && npm run build`.
- Sono presenti un lockfile root e un lockfile frontend, con versioni lockfile differenti.

**Impatto:** installazione ripetuta e maggiore tempo di build; due lockfile possono rendere meno immediato capire quale insieme di dipendenze sia effettivamente determinante.

**Azione raccomandata:** semplificare la build in modo che l'installazione venga eseguita una sola volta e documentare chiaramente la directory di build. Non è stato osservato un fallimento del deploy dovuto a questo punto.

### R8 — Registro versione non aggiornato rispetto al frontend pubblicato: rischio basso

**Evidenza**
Il file `version.md` riporta V1.37 come versione rilevata, mentre il commit e il deploy frontend consultati riportano V1.39. L'API è ancora pubblicata sul commit V1.37; il confronto indica che i commit successivi contengono modifiche frontend/documentazione e non differenze backend.

**Azione raccomandata:** distinguere nel registro la versione frontend da quella API, indicare i rispettivi SHA e aggiornare il documento dopo ogni deploy.

## Controlli positivi

- Il deploy frontend V1.39 e il deploy API V1.37 consultati risultano entrambi `live`.
- Gli eventi Render più recenti mostrano build e deploy conclusi con successo per entrambi i servizi.
- Il confronto fra l'API pubblicata e `main` non ha mostrato differenze backend nei cinque commit successivi.
- `Program.cs` richiede una chiave JWT di almeno 32 caratteri e interrompe l'avvio se manca.
- La configurazione CORS aggiunge l'origine canonica `https://jso-web.onrender.com` e richiede una lista di origini non vuota in produzione.
- Sono presenti limitatori distinti per API pubblica, login, scansione biglietti e scritture della community.
- Le impostazioni di pagamento presenti in `appsettings.json` sono placeholder vuoti, non credenziali reali.
- Nei log consultati non sono emersi errori applicativi o HTTP 5xx nella finestra 13–14 ottobre; i log storici del 7 ottobre restano da diagnosticare.

## Limiti della verifica

- Non è stata completata una prova browser end-to-end delle pagine pubbliche e amministrative.
- Il tentativo di leggere direttamente gli URL pubblici con lo strumento web non ha fornito una risposta HTTP utilizzabile; perciò non dichiaro verificato il rendering reale di ogni pagina.
- Non sono stati eseguiti in questa sessione `npm audit`, build locale, test .NET o test automatizzati contro un database reale.
- Non sono stati effettuati pagamenti reali, upload di prova, modifiche amministrative o operazioni di scrittura sul database.
- I log disponibili non hanno restituito l'inner exception completa degli errori EF Core storici.

## Piano d'azione consigliato

1. **Prima priorità:** mettere in sicurezza la persistenza degli upload e verificare che immagini e media sopravvivano a un redeploy.
2. **Prima priorità:** verificare gli IP client dietro il proxy Render e la correttezza dei limiti per IP.
3. **Seconda priorità:** configurare l'health check Render su `/health`.
4. **Seconda priorità:** recuperare la causa precisa delle `DbUpdateException` del 7 ottobre e aggiungere test di regressione.
5. **Seconda priorità:** verificare tutti i workflow GitHub Actions sul commit HEAD e rendere i controlli necessari obbligatori.
6. **Terza priorità:** eliminare le incoerenze statiche della pagina abbonamenti e semplificare il comando di build.
7. **Terza priorità:** aggiornare `version.md` distinguendo frontend e API.

**Esito complessivo:** il sistema risulta pubblicato e i deploy osservati sono riusciti. Non va ancora dichiarato completamente verificato in produzione: la persistenza degli upload, il comportamento del rate limiting dietro proxy e la copertura dei controlli CI sono le verifiche più importanti da completare.
