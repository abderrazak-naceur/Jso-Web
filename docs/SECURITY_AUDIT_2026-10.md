# Audit di sicurezza JSO-Web — 23 ottobre 2026

## Stato e metodo
Revisione statica iniziale del repository GitHub sul branch dedicato `security/audit-jso-web-2026-10`. I rilievi distinguono rischi di architettura da vulnerabilità sfruttabili. Non sono stati eseguiti penetration test sul servizio pubblico e l'audit non è completo.

## Rilievi preliminari

### SEC-01 — Token supporter accessibile da JavaScript
**Priorità: alta (rischio architetturale, non prova di XSS).**

Il README dichiara che la sessione fan usa `localStorage`; `frontend/src/lib/api.js` invia il token come Bearer e `backend/src/JSO.Api/Controllers/AccountController.cs` restituisce `accessToken`. Qualunque XSS eseguibile sull'origine frontend potrebbe leggere il token. Il solo uso di localStorage non dimostra che esista una XSS sfruttabile.

**Verificare:** render di HTML/CMS, sanitizzazione, URL dinamici, logout/cambio password/revoca e durata dei JWT.  
**Possibile rimedio:** cookie HttpOnly/Secure/SameSite e protezione CSRF oppure token in memoria con rinnovo sicuro; ogni modifica richiede test E2E.

### SEC-02 — Uploads serviti staticamente
**Priorità: media, dipende dal tipo di contenuto.**

In `backend/src/JSO.Api/Program.cs`, la directory `uploads` viene servita con `UseStaticFiles` su `/uploads`. È bloccato espressamente `/uploads/fan-photos`, ma altre sottocartelle sono pubbliche. Ciò può essere intenzionale per le immagini pubbliche, ma è rischioso per documenti privati o contenuti non moderati.

**Verificare:** tutte le route di upload e le directory di destinazione, distinguendo storage pubblico e privato, inclusi i flussi di moderazione. Non modificare la policy dei media prima di confermare l'intento del prodotto.

### SEC-03 — Decoder immagini: consumo risorse da verificare
**Priorità: media-bassa, superficie DoS da testare.**

`backend/src/JSO.Api/Security/ImageUploadSanitizer.cs` limita l'input a 10 MiB, la dimensione a 12.000 px per lato e 40 milioni di pixel, poi decodifica/ricodifica con SkiaSharp. I limiti riducono il rischio, ma le immagini massime possono consumare memoria significativa. Il metodo rilancia `OutOfMemoryException`.

**Verificare:** che tutti gli endpoint usino il sanitizer; che limiti multipart/request agiscano prima del buffering; che esistano limiti di concorrenza. Test di carico solo in ambiente isolato.

### SEC-04 — Proxy fidati e rate limiting per IP
**Priorità: media-bassa, configurazione da verificare.**

`Program.cs` abilita `X-Forwarded-For` e `X-Forwarded-Proto` e configura Loopback tra i proxy noti; le policy usano `RemoteIpAddress`. L'efficacia dipende dalla topologia effettiva.

**Verificare:** proxy/hop reali, header accettati solo da intermediari fidati, rate limiting attraverso il proxy di produzione.

### SEC-05 — CORS con origini statiche
**Priorità: bassa, hardening.**

`Program.cs` aggiunge domini statici alla lista `Cors:AllowedOrigins`. Nel codice esaminato non ci sono wildcard né `AllowCredentials`; questo frammento non dimostra un bypass CORS. Confermare che tutte le origini consentite siano controllate, necessarie e aggiornate.

### SEC-06 — Swagger abilitabile in produzione
**Priorità: informativa, dipendente dalla configurazione runtime.**

Swagger è abilitabile tramite `Swagger:Enabled`. L'esposizione della descrizione API agevola la ricognizione ma non equivale a un bypass di autorizzazione. Verificare il valore in produzione e mantenere Swagger disabilitato salvo finestra controllata.

## Segnali positivi osservati
- La chiave JWT viene rifiutata all'avvio se assente o inferiore a 32 caratteri.
- Login admin: messaggio generico per credenziali errate e rate limiting.
- La validazione JWT controlla lo stato, il ruolo e la versione sessione per gli account fan/admin.
- Il sanitizer immagini ricodifica i file invece di conservare i byte originali.
- README e codice distinguono le verifiche locali dalle configurazioni/deploy reali.

## Controlli ancora necessari
1. Audit SCA con advisory correnti npm/NuGet.
2. Revisione sistematica dei controller admin: autenticazione, permessi, IDOR/BOLA, ruoli e proprietà risorse.
3. Controllo di tutti gli endpoint di upload e directory di storage.
4. Ricerca di segreti nella cronologia Git, configurazioni, Docker e workflow senza riportare valori sensibili.
5. Revisione di pagamenti/webhook, URL di ritorno, ownership di ordini/ticket e check-in.
6. Test di accesso anonimo e permessi 401/403, escalation di ruolo e rate limit in locale/CI controllato.
7. Verifica dei domini, CORS, TLS e header sull'ambiente reale da una rete raggiungibile.

## Criteri di chiusura
Ogni vulnerabilità confermata deve includere file/endpoint, precondizioni, gravità motivata, prova non distruttiva, impatto e rimedio proposto. I controlli non eseguiti resteranno elencati come limitazioni. L'assenza di finding non prova l'assenza di vulnerabilità.

## Regole di branch
Tutte le aggiunte di questo audit devono rimanere su `security/audit-jso-web-2026-10`. Non aggiornare `main`, non fondere automaticamente una PR, non fare scansioni invasive né transazioni reali, e non usare o stampare segreti reali.
