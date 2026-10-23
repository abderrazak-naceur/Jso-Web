# Audit di sicurezza JSO-Web — 23 ottobre 2026

## Stato e metodo
Revisione statica sul branch dedicato `security/audit-jso-web-2026-10`, con verifica esterna preliminare degli advisory. I rilievi distinguono vulnerabilità note nelle dipendenze da rischi applicativi non ancora dimostrati. Non sono stati eseguiti test intrusivi sul servizio pubblico.

## SEC-00 — Vite 6.4.3 è precedente a una versione correttiva per advisory recenti
**Priorità: alta per la catena di build/dev; sfruttabilità in produzione da valutare.**

Verifica del manifest e del lockfile: `frontend/package.json` e `frontend/package-lock.json` fissano Vite a `6.4.3`. Una ricerca corrente mostra advisory riportati per la linea Vite fino alla versione 6.4.3, con versione correttiva indicata almeno 6.4.4 per uno dei problemi; un ulteriore advisory datato 20 ottobre 2026 indica `<= 6.4.3` vulnerabile e `8.3.3` correttiva per CVE-2026-112942. La fonte indipendente Snyk elenca anche problemi XSS e argument injection nella linea 6.4.3. Questo dato giustifica una verifica SCA immediata, ma non dimostra da solo che il sito pubblicato sia sfruttabile: alcuni problemi riguardano il server di sviluppo/editor e il rischio effettivo dipende dalla superficie esposta.

Fonti consultate: [Snyk — Vite 6.4.3](https://security.snyk.io/package/npm/vite/6.4.3) e [Patchstack — CVE-2026-112942, pubblicata 20 ottobre 2026](https://patchstack.com/database/npm/npm/vite/vulnerability/npm-launch-editor-fs-existssync-existence-check-can-be-bypassed-on-windows-2).

**Azione consigliata:** eseguire `npm audit` contro il lockfile; identificare tutte le advisory correlate e aggiornare Vite a una versione supportata/corretta compatibile con il progetto (preferibilmente ultima patch compatibile della linea scelta). Poi rigenerare il lockfile, eseguire build/lint/test e verificare l'eventuale compatibilità Vite plugin. Nessun pacchetto è stato aggiornato in questo passaggio.

## SEC-01 — Token supporter accessibile da JavaScript
**Priorità: alta come rischio architetturale; XSS non dimostrata.**

Il README dichiara che la sessione fan usa `localStorage`; `frontend/src/lib/api.js` invia il token come Bearer e `AccountController.cs` restituisce `accessToken`. Una XSS eseguibile nell'origine potrebbe leggere il token, ma questa ispezione non ha provato una XSS sfruttabile.

**Verificare:** rendering HTML/CMS, sanitizzazione, URL dinamici, logout, cambio password, revoca e durata JWT. Valutare cookie HttpOnly/Secure/SameSite con difesa CSRF o token in memoria; qualsiasi modifica richiede test E2E.

## SEC-02 — Upload serviti staticamente
**Priorità: media, dipende dalle categorie dei file.**

In `backend/src/JSO.Api/Program.cs`, `uploads` è esposta tramite `UseStaticFiles` su `/uploads`; `/uploads/fan-photos` viene esclusa esplicitamente. La galleria fan legge i file attraverso endpoint autorizzati/moderati, ma va verificato che tutte le altre categorie rispettino la distinzione pubblico/privato.

**Verificare:** tutte le destinazioni di upload, documenti privati, contenuti non moderati e dati personali. Separare storage pubblico e privato solo dopo aver verificato i requisiti applicativi.

## SEC-03 — Decoder immagini: consumo di memoria da verificare
**Priorità: media-bassa, superficie DoS da testare.**

`ImageUploadSanitizer.cs` limita l'input a 10 MiB, 12.000 px per lato e 40 milioni di pixel, quindi decodifica/ricodifica con SkiaSharp. Le immagini al limite possono consumare memoria significativa e il metodo rilancia `OutOfMemoryException`.

**Verificare:** che tutti gli endpoint di upload usino sempre il sanitizer, che il limite multipart/request agisca prima del buffering e che vi siano limiti di concorrenza. Test di carico solo in ambiente isolato.

## SEC-04 — Proxy fidati e rate limiting per IP
**Priorità: media-bassa, configurazione da verificare.**

`Program.cs` abilita `X-Forwarded-For` e `X-Forwarded-Proto`, configura Loopback tra i proxy noti e usa `RemoteIpAddress` nelle policy. L'efficacia dipende dal proxy e dagli hop reali.

**Verificare:** topologia, header accettati solo da proxy fidati e rate limit dietro l'edge in un ambiente controllato.

## SEC-05 — CORS con origini statiche
**Priorità: bassa, hardening.**

`Program.cs` aggiunge domini statici a `Cors:AllowedOrigins`. Non sono emersi wildcard o `AllowCredentials` nel frammento. Confermare proprietà e necessità di ogni origin ammessa; verificare gli header effettivi dell'ambiente pubblicato.

## SEC-06 — Swagger abilitabile in produzione
**Priorità: informativa, dipendente dalla configurazione runtime.**

Swagger è attivabile tramite `Swagger:Enabled`. La ricognizione API è facilitata ma non implica un bypass di autorizzazione. Verificare la configurazione prod e disabilitare salvo finestra controllata.

## SEC-07 — Webhook Paymee accetta GET e POST e non richiede sempre l'importo
**Priorità: da valutare, possibile hardening; frode non dimostrata.**

`PaymeeWebhookController.cs` espone `[HttpGet]` e `[HttpPost]`. Il checksum viene verificato con l'API key e il codice lega il token firmato al riferimento provider del payable, quindi non si basa soltanto su `order_id`. Il codice riconosce che il checksum non firma `order_id` o `amount`; il controllo dell'importo si esegue solo se `amount.HasValue`, per cui un callback positivo privo di amount non viene rifiutato esplicitamente.

**Verificare prima di modificare:** la specifica Paymee, l'attendibilità dell'importo ottenibile via API server-to-server e i test esistenti. Se la callback può omettere l'importo, recuperare stato/importo da una fonte autenticata provider-side e confrontare l'importo atteso prima del completamento. Limitare GET a quanto richiesto dal provider e valutare esposizione di token nei log/proxy e replay. Non effettuare transazioni reali.

## Segnali positivi osservati
- La chiave JWT viene rifiutata all'avvio se assente o inferiore a 32 caratteri.
- Il login admin usa risposta generica per credenziali errate e rate limiting.
- La validazione JWT controlla stato, ruolo e versione sessione di utenti fan/admin.
- I pagamenti Stripe verificano la firma webhook; Paymee verifica checksum e provider reference.
- Il sanitizer immagini ricodifica i file invece di conservare i byte originali.

## Controlli ancora necessari
1. Audit SCA completo di tutte le dipendenze npm e NuGet con advisory correnti.
2. Revisione sistematica di tutti i controller admin e dei controlli di ownership (IDOR/BOLA, ruoli e scope).
3. Mappatura completa delle route di upload e directory di storage.
4. Ricerca di segreti nella cronologia Git, config, Docker e workflow senza riportarli nel rapporto.
5. Test dei webhook in staging con firma errata, importo mancante/errato e replay.
6. Test anonimi, 401/403, rate limiting e permessi in locale/CI controllato.
7. Verifica di domini, CORS, TLS e header sull'ambiente reale da una rete raggiungibile.

## Criteri di chiusura
Ogni vulnerabilità confermata deve includere file/endpoint, precondizioni, gravità motivata, prova non distruttiva, impatto e rimedio. Le verifiche non eseguite resteranno indicate come limitazioni; assenza di finding non prova assenza di vulnerabilità.

## Regole di branch
Tutte le aggiunte dell'audit devono rimanere su `security/audit-jso-web-2026-10`. Non aggiornare `main`, non fondere una PR automaticamente, non eseguire scansioni invasive o transazioni reali e non usare/stampare segreti reali.
