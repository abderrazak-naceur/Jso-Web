# Piano — Registrazione tifosi e partita online a pagamento

**Stato:** proposta (solo piano, nessuna implementazione). Da approvare prima di scrivere codice.

**Obiettivo:** permettere a un tifoso di **registrarsi**, **accedere** e **pagare** per **guardare la partita online**. Il video è erogato via **YouTube (link non in elenco / "unlisted")** dietro **paywall**: il link di visione viene rilasciato solo a chi ha pagato per quella partita. L'account tifoso è separato dagli account admin e non concede alcun privilegio amministrativo.

## Decisioni confermate (dall'utente)

1. **Streaming a pagamento con YouTube.** Le partite si guardano online pagando. Provider video: YouTube unlisted (nessun ingest video sui nostri server). Il backend gestisce **accesso condizionato al pagamento**, non l'hosting del video.
2. **Sessione frontend: cookie HttpOnly.** Scelta per sicurezza — con pagamenti e contenuti a pagamento, il token non deve essere leggibile da JavaScript (mitiga XSS/furto token). Vedi sezione 4 e 8.

> Nota legale importante: trasmettere una partita richiede di **detenere i diritti di trasmissione**. Questo piano copre account, pagamenti e accesso condizionato; la titolarità dei diritti resta responsabilità del club e va verificata prima del go-live.

---

## 1. Principio guida

L'autenticazione attuale è **solo admin**: `AdminUser` + `JwtTokenService.Create(AdminUser)` + `[Authorize(Roles = "SuperAdmin,ClubAdmin,...")]`. I tifosi sono un dominio diverso e vanno tenuti **separati** dagli admin per evitare rischi di escalation dei privilegi.

**Decisione proposta:** introdurre un'identità distinta `FanUser` con un proprio flusso di registrazione/login e un ruolo `Fan` che **non** compare in nessuna policy admin. Un token tifoso non deve mai poter accedere a `/api/admin/*`.

---

## 2. Ambito

### Incluso (MVP)
- Registrazione tifoso (email + password) con validazione e hashing password (riuso di `PasswordHasher`).
- Login tifoso separato; sessione via **cookie HttpOnly** con ruolo `Fan`.
- Profilo minimo del tifoso (email, nome visualizzato).
- **Paywall partita:** acquisto dell'accesso a una singola partita tramite provider di pagamento esterno; alla conferma pagamento il tifoso ottiene il diritto di visione.
- Endpoint protetto che rilascia il **link YouTube unlisted** della partita **solo** a chi è autenticato **e** ha un accesso pagato valido per quella partita.
- UI frontend: pulsante "S'inscrire / Se connecter", pagine registrazione/login, stato "connesso", logout, area "Regarder le match" con flusso di acquisto e player YouTube embedded dopo il pagamento.

### Escluso (fasi successive)
- Verifica email, reset password, login social/OAuth (struttura `EmailVerified` predisposta).
- Abbonamenti ricorrenti/stagionali (l'MVP vende l'accesso alla singola partita; la membership è nell'Orizzonte 2 della visione 2030).
- Hosting/ingest del segnale video (si usa YouTube; il club deve gestire la diretta lato YouTube).
- Notifiche push e community.

> **Attenzione YouTube:** un video "unlisted" è accessibile a chiunque conosca il link. Il paywall protegge la *distribuzione* del link (rilasciato solo dopo pagamento), ma non impedisce la ri-condivisione del link tra utenti. Per un paywall robusto valutare in futuro un provider con controllo accessi per-utente (signed URL/token, DRM). Per l'MVP con YouTube si accetta questo limite e si mitiga (link rilasciato tardi, poco prima del kickoff; possibilità di cambiare link; termini d'uso).

---

## 3. Backend — modello e API

### 3.1 Dominio
- Nuova entità `FanUser` (separata da `AdminUser`):
  - `Id`, `Email` (univoca, normalizzata lowercase), `DisplayName`, `PasswordHash`, `IsActive`, `EmailVerified` (default `false`, per futuro), `CreatedAt`, `LastLoginAt`.
- Ruolo fisso `Fan` nel token; nessun ruolo admin assegnabile via registrazione.
- Nuova entità `MatchAccessProduct` (prezzo di visione per partita): `Id`, `MatchId`, `Price` (`decimal`, ≥ 0), `Currency`, `IsOnSale`, `SaleStart`, `SaleEnd`. Gestita dall'admin.
- Nuova entità `MatchAccessPurchase` (diritto di visione acquistato): `Id`, `FanUserId`, `MatchId`, `Status` (`Pending`/`Paid`/`Refunded`/`Failed`), `Amount`, `Currency`, `ProviderRef` (id transazione del provider), `CreatedAt`, `PaidAt`. Indice univoco su (`FanUserId`, `MatchId`) per l'accesso attivo.

### 3.2 Persistenza
- `DbSet<FanUser>` in `JsoDbContext` con indice univoco su `Email`.
- Nuova migration PostgreSQL in `Migrations/Postgres` (provider di produzione). In sviluppo il bootstrap usa `EnsureCreatedAsync`, quindi lo schema locale si crea da solo.

### 3.3 Token e sessione (cookie HttpOnly)
- Estendere il servizio JWT con un metodo dedicato ai tifosi (`CreateForFan(FanUser)`), che emette `sub`, `email`, `name` e `role = "Fan"`. Separato dal `Create(AdminUser)`.
- Il token **non** viene restituito nel body al frontend: viene impostato in un **cookie HttpOnly + Secure + SameSite** (`jso_fan_session`). Il browser lo invia automaticamente; JavaScript non può leggerlo.
- Il logout cancella il cookie lato server. Prevedere **protezione CSRF** (SameSite=Strict/Lax + token anti-CSRF sulle richieste di modifica/acquisto), necessaria perché con i cookie il browser invia le credenziali in automatico.

### 3.4 Endpoint (nuovi, pubblici tranne dove indicato)
- `POST /api/account/register` — crea un `FanUser`. Validazioni: email valida, password robusta (min 12 caratteri), email non già usata (`409`). Rate limiting dedicato.
- `POST /api/account/login` — verifica credenziali, aggiorna `LastLoginAt`, **imposta il cookie HttpOnly** e restituisce il profilo minimo. Errori generici. Rate limiter `auth-login`/`account-login`.
- `POST /api/account/logout` — cancella il cookie di sessione.
- `GET /api/account/me` — `[Authorize(Roles = "Fan")]`, profilo del tifoso corrente (usato dal frontend per sapere se è loggato).
- `GET /api/matches/{id}/access` — `[Authorize(Roles = "Fan")]`, stato di accesso del tifoso alla partita: `{ price, currency, onSale, hasPaid }`. Non rilascia il link video.
- `POST /api/matches/{id}/purchase` — `[Authorize(Roles = "Fan")]`, avvia il pagamento: crea un `MatchAccessPurchase` `Pending` e restituisce i dati per il checkout del provider. Idempotente per (fan, match).
- `POST /api/payments/webhook` — endpoint del **provider di pagamento** (pubblico ma con **verifica firma**): conferma il pagamento, imposta `MatchAccessPurchase` a `Paid`. L'accesso si concede **solo** qui, non lato client.
- `GET /api/matches/{id}/watch` — `[Authorize(Roles = "Fan")]`, rilascia il **link YouTube unlisted** **solo** se: partita pubblicata, in vendita/finestra valida, e il tifoso ha un `MatchAccessPurchase` `Paid`. Altrimenti `402 Payment Required`/`403`/`404`. Nessun link senza pagamento verificato.

### 3.5 Campi partita per la visione a pagamento
- Aggiungere a `Match` (o tabella collegata): `WatchProvider` (default `YouTube`), `WatchUrl` (link unlisted, **mai** esposto senza accesso pagato), `IsStreamable` (bool). Il prezzo/finestra di vendita vive in `MatchAccessProduct`.

### 3.6 Pagamenti
- **Provider esterno certificato** (es. Stripe/PayPal o gateway locale che supporti la Tunisia). **Mai** gestire dati carta sui nostri server.
- Flusso: `purchase` (Pending) → checkout provider → **webhook firmato** → `Paid` → accesso concesso.
- Valuta di club configurabile (coerente con il piano finanze). Importi in `decimal`.
- Registrare le transazioni anche nell'area **Finanze** (entrata categoria "Biglietti/Streaming") per coerenza contabile — collegamento al piano `ADMIN_SQUAD_FINANCE_ANALYTICS_PLAN`.
- Idempotenza sui webhook (il provider può reinviare); gestire `Refunded`/`Failed`.

### 3.7 Sicurezza (requisiti obbligatori)
- I token `Fan` **non** devono superare nessuna `[Authorize(Roles = "SuperAdmin,...")]`; verifica esplicita nei test.
- Registrazione, login e acquisto con rate limiting per IP; **protezione CSRF** sulle richieste con cookie.
- Cookie di sessione **HttpOnly + Secure + SameSite**; scadenza ragionevole; rotazione al login.
- Password con hashing esistente; nessun segreto/password/PAN in chiaro nei log o nell'audit.
- Webhook pagamenti con **verifica della firma** del provider; ignorare richieste non firmate.
- Il link YouTube è un dato protetto: rilasciato solo da `watch` dopo pagamento verificato, mai nelle liste pubbliche o nel body di `access`.
- Audit: `REGISTER`, `LOGIN`, `PURCHASE_INIT`, `PURCHASE_PAID`, `WATCH_GRANTED` (soggetto `FanUser`), senza dati sensibili.

---

## 4. Frontend

- **Header pubblico** (`src/App.jsx`): accanto al pulsante "Admin", aggiungere "S'inscrire / Se connecter" per i tifosi. Quando il tifoso è autenticato, mostrare nome + "Se déconnecter".
- **Pagine/nuove viste tifoso:**
  - Registrazione (email, nome, password + conferma) con validazione lato client.
  - Login tifoso.
  - Sessione via **cookie HttpOnly**: il frontend non salva il token; per sapere se l'utente è loggato chiama `GET /api/account/me`. Le richieste usano `credentials: 'include'` e inviano il token anti-CSRF.
- **Pagina partita — "Regarder le match":**
  - non autenticato → invito a registrarsi/accedere;
  - autenticato senza acquisto → mostra **prezzo** e pulsante "Acheter l'accès" (`purchase` → checkout provider);
  - dopo pagamento confermato → chiama `GET /api/matches/{id}/watch` e mostra il **player YouTube embedded**;
  - fuori finestra / non in vendita → messaggio di stato chiaro.
- **Client API** (`src/lib/api.js`): aggiungere `account/*`, `access`, `purchase`, `watch` con `credentials: 'include'`; nessun token tifoso in `localStorage`.

---

## 5. Verifica (CI e locale)

- Estendere lo smoke test CI PostgreSQL con il percorso tifoso:
  1. `register` → `login` (cookie impostato) → `GET /api/account/me` ok;
  2. un tifoso `Fan` riceve **401/403** su una rotta `/api/admin/*` (nessuna escalation);
  3. `GET /api/matches/{id}/watch` senza sessione → `401`; con sessione ma **senza pagamento** → `402/403` (nessun link YouTube nel body);
  4. simulare il **webhook firmato** → acquisto `Paid` → `watch` restituisce il link → `200`;
  5. webhook con firma non valida → rifiutato, accesso **non** concesso.
- Frontend: `npm run build` e `npm run lint` verdi; verifica manuale dei flussi nel browser (incluso checkout in sandbox del provider).
- Migration PostgreSQL applicata in CI.

---

## 6. Passi di implementazione (ordine proposto)

1. Dominio `FanUser` + `DbSet` + indice univoco + migration PostgreSQL.
2. Token `Fan` + **sessione cookie HttpOnly** (login/logout, protezione CSRF).
3. Endpoint `register` / `login` / `logout` / `me` con validazione, rate limiting e audit.
4. Dominio `MatchAccessProduct` + `MatchAccessPurchase`; campi `WatchProvider`/`WatchUrl`/`IsStreamable` su `Match`; gestione admin (prezzo, link, finestra).
5. **Pagamenti:** `access` / `purchase` + **webhook firmato** del provider; concessione accesso solo su pagamento verificato; registrazione entrata in Finanze.
6. Endpoint `watch` (rilascio link YouTube solo se `Paid`).
7. Frontend: header, registrazione/login (cookie), area "Regarder le match" con acquisto e player YouTube.
8. Test CI (percorso tifoso + anti-escalation + paywall + webhook firma) e verifica build/lint.
9. Aggiornare README e questo piano con i risultati osservati.

---

## 7. Decisioni

**Confermate:** streaming a pagamento con **YouTube unlisted** dietro paywall (decisione 1 in cima); **sessione cookie HttpOnly** (decisione 2 in cima).

**Ancora da confermare prima di codificare:**
1. **Provider di pagamento:** quale gateway? (Stripe/PayPal richiedono account e supporto paese; valutare un gateway che operi in Tunisia.) Serve prima di implementare i pagamenti.
2. **Prezzo e modello:** solo acquisto per singola partita all'MVP, o anche pass multi-partita? (La membership stagionale resta Orizzonte 2.)
3. **Verifica email** all'MVP o rimandata? (Struttura `EmailVerified` predisposta comunque.)
4. **GDPR/dati personali e pagamenti:** informativa privacy, consenso, conservazione dati di pagamento (solo riferimenti del provider, mai i dati carta), fatturazione/ricevute.
5. **Limite YouTube unlisted:** accettiamo per l'MVP il rischio di ri-condivisione del link, con mitigazioni (rilascio tardivo, cambio link), oppure serve fin da subito un provider con accesso per-utente?
