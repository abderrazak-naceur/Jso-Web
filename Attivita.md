<div align="center">

<img src="./frontend/public/JSO-crest-regenerated.png" alt="Stemma Jeunesse Sportive de Oudhref" width="140" />

# JSO — Attività del progetto

### Stato del lavoro: cosa è stato fatto e cosa manca

Documento di riepilogo dello **stato reale del codice** nel repository, pensato come mappa unica di avanzamento. Affianca il [README](README.md) (sezione «Cosa manca da sviluppare»), la [ROADMAP](docs/ROADMAP.md), il [piano idee](docs/NEW_IDEAS_PLAN.md) e la [visione 2030](docs/PLATFORM_VISION_2030.md).

</div>

---

## 📌 In breve

- **Stack:** React + Vite (sito pubblico + admin), ASP.NET Core .NET 10 (API, Clean Architecture a 4 livelli), EF Core, PostgreSQL 17 (SQL Server in locale), app mobile Flutter, deploy target Oracle Cloud Always Free.
- **Cosa è pronto nel codice:** una piattaforma admin molto ampia, sito pubblico, Match Center, News/Media, account tifoso, app mobile, e ~20 idee del [piano idee](docs/NEW_IDEAS_PLAN.md).
- **Lo schema del database è stato validato su un PostgreSQL 17 reale** (tutte le migration applicano correttamente) — vedi [DB_SCHEMA_VALIDATION](docs/DB_SCHEMA_VALIDATION.md).
- **Il vero blocco NON sono le feature, ma il go-live:** deploy reale su Oracle, HTTPS/dominio, backup/restore provati, invio email e pagamenti reali, UI web tifoso, test automatici.

Legenda: ✅ fatto · 🟡 parziale · ⛔ da fare · 🔒 bloccato da dipendenza esterna (pagamenti/email/infra reale).

---

## ✅ Fatto — Base della piattaforma

### Sito pubblico
- ✅ Homepage responsive con contenuti dinamici e fallback pulito (stati vuoto/errore)
- ✅ Club, Squadra e giocatori, Match Center (calendario, dettaglio, eventi, formazioni, ufficiali di gara, statistiche)
- ✅ Newsroom + dettaglio articolo, galleria Media
- ✅ Integrazione API con degradazione controllata
- ✅ Modalità **accessibilità** (alto contrasto, dimensione testo, riduzione animazioni, skip-link) — idea G21

### Admin / back office
- ✅ Login JWT + RBAC (ruoli SuperAdmin, ClubAdmin, Editor, MatchManager, CommunityManager, ShopManager)
- ✅ Dashboard con KPI + **attività** (recent activity + today's activity)
- ✅ Club Settings, gestione squadre/giocatori, Match Center admin (eventi, formazioni, ufficiali, statistiche)
- ✅ News CMS + SEO, Media Library con upload, gestione contenuti
- ✅ Area Sicurezza / Audit log
- 🟡 Stagioni e competizioni: CRUD via API/CI presente, **manca un modulo UI admin dedicato**

### Backend / dati / sicurezza
- ✅ API .NET 10, EF Core, provider PostgreSQL/SQL Server configurabile
- ✅ Migration PostgreSQL versionate; **schema validato su PostgreSQL 17 reale** + assert in CI
- ✅ JWT, hashing password, rate limiting, security headers, audit log, health check, Swagger
- ✅ Nessun segreto nel repository

---

## ✅ Fatto — Account tifoso e app mobile

- 🟡 **Account tifosi** (registrazione / login / profilo `/api/account/*`): base fatta. Manca: sessione cookie HttpOnly, verifica email, reset password.
- ✅ **App mobile Flutter** (Android/iOS): progetto, design system, client API, schermate Home / Match Center / News / Media / Squadra / Sponsor, live blog, login/profilo tifoso.
  - ⛔ Non ancora buildata come APK/IPA (serve Android SDK / macOS+Xcode); notifiche push non implementate.

---

## ✅ Fatto — Idee del [piano idee](docs/NEW_IDEAS_PLAN.md)

20 idee su 24 sono implementate e integrate:

| # | Idea | Stato |
|---|------|-------|
| A1 | Live blog / second screen | ✅ |
| A3 | Compleanni / anniversari tifoso (opt-in) | ✅ |
| A4 | Newsletter digest (double opt-in) | ✅ (🔒 invio email = TODO) |
| B5 | Attivazione sponsor via QR allo stadio | ✅ |
| B6 | Marketplace piccoli annunci (moderato) | ✅ (🔒 fee a pagamento = TODO) |
| B7 | Muro dei sostenitori | ✅ (🔒 pagamento = TODO) |
| C8 | Registro infortuni / disponibilità | ✅ |
| C9 | Note di scouting | ✅ |
| C10 | Museo / archivio storico | ✅ |
| D11 | Volontari giornata partita | ✅ |
| D12 | Assegnazione arbitri / ufficiali | ✅ |
| D13 | Calendario editoriale / pubblicazione programmata | ✅ |
| D14 | Checklist giornata partita | ✅ |
| D15 | Prenotazione strutture + manutenzione | ✅ |
| E16 | Dashboard uso API / quote | ✅ |
| E17 | Centro export/cancellazione dati (GDPR) | ✅ (UI lato tifoso = TODO) |
| E18 | Feature flag / A-B | ✅ |
| G21 | Accessibilità sito pubblico | ✅ |
| G22 | Promemoria partita con meteo | ✅ (provider meteo gratuito, fallback) |
| G23 | Programma scuole / partner del territorio | ✅ |

### Fatto in aggiunta (oltre il piano idee)
- ✅ **Shop / Merchandising** (prodotti + ordini admin) — 🔒 pagamenti reali = TODO
- ✅ **Biglietteria / eventi** (tickets, club events)
- ✅ **FAQ** e **Documenti** admin
- ✅ **Analytics giocatore/squadra** derivate da eventi/formazioni

---

## Idee del piano — stato aggiornato

| # | Idea | Stato | Nota |
|---|------|-------|------|
| A2 | UGC foto tifosi con moderazione | ✅ | Fatto: upload Fan + moderazione admin + galleria pubblica approvate |
| E19 | Modalità stadio offline (PWA leggera) | ✅ | Fatto: manifest + service worker + banner offline (esclude admin/autenticato) |
| B24 | Streaming pay-per-view della partita | ✅ | Meccanismo fatto: accesso a pagamento, StreamUrl rivelato solo dopo pagamento verificato. Diritti di trasmissione = scelta del club |
| F20 | Trascrizioni / sottotitoli automatici | 🔒 | Richiede provider AI a pagamento |

Tutte le idee del piano fattibili in sandbox sono completate. Resta solo F20 (bloccata da provider AI a pagamento).

---

## Aree di prodotto — stato aggiornato

Dalla [visione 2030](docs/PLATFORM_VISION_2030.md) e dal README:

- ✅ **Homepage Builder + Menu/Footer editabili** — fatto (admin + navigazione dinamica + sezioni home dinamiche sul sito)
- ✅ **Community & moderazione** — fatto (commenti/reazioni/segnalazioni, code di moderazione admin, commenti sul sito pubblico)
- ✅ **Membership / abbonamenti tifosi** — fatto (piani admin + acquisto fan + attivazione via pagamento verificato)
- ✅ **Pagamenti reali** — integrati (Flouci per Tunisia / Stripe per estero, scelta per Paese) su shop, biglietti, muro sostenitori, membership, streaming. 🔒 Manca solo: creare account provider, mettere le chiavi nell'ambiente, puntare i webhook, collaudo end-to-end (post-deploy)
- ✅ **Finanze del club** (entrate/uscite con categorie, transazioni, riepilogo con netto/perdite) — Area B del [piano dedicato](docs/ADMIN_SQUAD_FINANCE_ANALYTICS_PLAN.md), modulo admin in francese, accesso ristretto (ruolo `FinanceManager` oltre a SuperAdmin/ClubAdmin), importi `numeric(14,2)`, audit su ogni scrittura
- 🔒 **Notifiche & messaging** (push FCM / email) — richiede provider esterno
- 🟡 **Frontend web lato tifoso**: molte UI ci sono (account, shop/carrello, commenti, abbonamenti, streaming); resta da completare qualche superficie (es. UI GDPR per il tifoso, pagine dedicate biglietti/muro).

---

## 🔒 Gap trasversali — Il vero lavoro che conta

Questi non sono singole feature ma prerequisiti che sbloccano il valore reale. In gran parte **richiedono l'ambiente reale** e non sono completabili in sandbox.

### 1. Go-live in produzione (Priorità 0 della [ROADMAP](docs/ROADMAP.md))
- ⛔ Provisioning **VM Oracle** Ampere A1, `.env.prod`, `deploy/oracle/deploy.sh`, `/health`
- ⛔ **DNS + HTTPS** sul dominio reale, poi `check-domain.sh`
- ⛔ **Backup reale** con copia off-VM + cron; **prova di restore** documentata
- ⛔ **Collaudo end-to-end nel browser reale** (login admin, upload, CORS)
- 🟡 Predisposto in repo: Docker Compose prod, Nginx, script Oracle, CI (build/lint/migration/smoke)

### 2. Servizi esterni (email + pagamenti)
- 🔒 **Invio email reale**: newsletter, compleanni, GDPR, conferme — oggi sono stub/TODO
- 🔒 **Attivazione pagamenti**: l'integrazione **Flouci (Tunisia) / Stripe (estero)** è **implementata** su shop, biglietti, muro sostenitori, membership e streaming (pagine hosted, conferma server-side via webhook, verifica importo). Manca solo, e resta a carico del club: creare gli account provider, inserire le **chiavi come variabili d'ambiente**, impostare il tasso TND→valuta Stripe, **puntare i webhook** agli endpoint, e il **collaudo end-to-end** con un pagamento vero (richiede il deploy pubblico). Vedi [docs/PAYMENTS.md](docs/PAYMENTS.md).

### 3. Qualità
- ⛔ **Test automatici backend** quasi assenti (verifica oggi = build + lint + smoke CI); l'app Flutter ha test widget
- ⛔ Build mobile **APK/IPA** mai prodotte

---

## 🧭 Prossimi passi consigliati (in ordine di valore)

1. **Andare in produzione** (Orizzonte 0): deploy Oracle, DNS/HTTPS, backup + prova restore, collaudo browser. Prerequisito di tutto.
2. **Completare account tifosi** (🟡→✅): cookie HttpOnly, verifica email, reset password.
3. **Frontend web tifoso** che consuma le API fan già pronte (profilo, GDPR, preferenze).
4. **Homepage Builder / Menu-Footer** editabili.
5. **Idee a costo zero rimaste**: A2 (UGC foto), E19 (PWA offline).
6. **Aree Orizzonte 2-3**: finanze club, membership, community, notifiche, shop a pagamento — dopo la scelta di email/gateway.
7. **Sbloccare i 🔒**: scelta provider email e gateway pagamenti TND → abilita newsletter reale, pagamenti, streaming (B24), trascrizioni (F20).

---

## 📚 Documenti di riferimento

- [README](README.md) — panoramica e sezione «Cosa manca da sviluppare»
- [ROADMAP](docs/ROADMAP.md) — priorità, dipendenze, criteri di uscita
- [NEW_IDEAS_PLAN](docs/NEW_IDEAS_PLAN.md) — catalogo idee (A1–G23, B24)
- [PLATFORM_VISION_2030](docs/PLATFORM_VISION_2030.md) — visione pluriennale e orizzonti O0–O6
- [FAN_ACCOUNTS_PLAN](docs/FAN_ACCOUNTS_PLAN.md) — account tifoso + streaming a pagamento
- [ADMIN_SQUAD_FINANCE_ANALYTICS_PLAN](docs/ADMIN_SQUAD_FINANCE_ANALYTICS_PLAN.md) — squadra / finanze / analytics
- [TECHNICAL_BACKLOG](docs/TECHNICAL_BACKLOG.md) — backlog tecnico per fasi
- [DB_SCHEMA_VALIDATION](docs/DB_SCHEMA_VALIDATION.md) — validazione schema su PostgreSQL reale
- [DEPLOY_ORACLE_CLOUD](docs/DEPLOY_ORACLE_CLOUD.md) · [deploy/oracle](deploy/oracle/README.md) — deploy

> **Nota:** questo file fotografa lo stato al momento della stesura. Molte feature sono verificate a livello di build/lint e schema DB, ma **non ancora collaudate end-to-end in produzione** né con email/pagamenti reali.

---

<div align="center">

### Toujours plus haut. Toujours JSO. 💙💛

</div>
