# JSO — Piano Sprint (dettagliato, con Sprint Review)

**Stato:** piano operativo. Traduce gli orizzonti O0–O1 di [PLATFORM_VISION_2030](PLATFORM_VISION_2030.md) in **sprint concreti**. Ogni sprint ha un obiettivo unico, task verificabili, una **Definition of Done (DoD)** e una **Sprint Review** con criteri di uscita oggettivi. Nessuno sprint si chiude finché la sua review non passa.

**Assunzioni di cadenza** `[DA CONFERMARE]`:
- Durata sprint: **2 settimane**.
- Team: sviluppatore principale (tu) + agenti di supporto; capacità limitata → uno sprint = un obiettivo dominante.
- Ambiente: **niente Docker per ora** (decisione utente) → deploy con servizi nativi; Docker resta opzione futura.

**Regole di processo (valide per ogni sprint):**
1. **Sprint Planning** — si sceglie l'obiettivo e si spacchetta in task; nulla entra senza criterio di verifica.
2. **Daily lavoro** — commit piccoli su branch feature, mai su `main` diretto; PR con CI verde.
3. **Sprint Review** — dimostrazione del risultato contro la DoD; ciò che non passa torna nel backlog, non si "considera fatto".
4. **Retrospettiva breve** — 3 righe: cosa ha funzionato, cosa no, un miglioramento.
5. **Definition of Done globale:** build+lint frontend verdi, build backend in CI verde, test/smoke pertinenti verdi, nessun segreto nel repo, README/plan aggiornati con risultati **osservati** (non promessi).

---

## Panoramica sprint

| Sprint | Obiettivo | Orizzonte | Esito atteso |
|---|---|---|---|
| S1 | Sbloccare il build locale + igiene repo | O0 | Backend compila/gira in locale; working tree pulito |
| S2 | Go-live infrastruttura (VM + servizi nativi) | O0 | Stack raggiungibile via HTTP sulla VM |
| S3 | DNS, HTTPS e collaudo dominio reale | O0 | Sito+admin live su HTTPS sul dominio |
| S4 | Backup reale + prova di restore | O0 | Backup automatico e restore documentato → **MVP in produzione** |
| S5 | Contenuti pubblici sui dati reali | O1 | Home/match/news/team senza dati demo, con stati vuoto/errore |
| S6 | Editor admin completi | O1 | Il club aggiorna i contenuti senza toccare il codice |
| S7 | Sponsor (primo ricavo) | O1 | CRUD sponsor admin + vetrina pubblica |
| S8 | Account tifosi (base) | O1 | Registrazione/login `Fan`, anti-escalation testato |

Gli sprint dopo S8 (paywall, mobile, shop…) si dettagliano solo dopo che O0–O1 sono chiusi.

---

## Sprint 1 — Sblocco build locale + igiene repo (O0)
**Obiettivo:** poter compilare ed eseguire tutto in locale senza Docker, e ripulire il working tree.

**Task**
- Installare **SDK .NET 10** (oggi la macchina ha .NET 5 → il backend `net10.0` non compila localmente).
- Installare **PostgreSQL 17** come servizio nativo; creare DB `JSO` e utente.
- Configurare `appsettings`/`.env` locale: provider `postgres`, connection string nativa (niente host `database` di Compose).
- Chiarire e gestire le **modifiche non committate** in `Program.cs` e `App.jsx` (capire cosa sono, committare o scartare).
- `npm install` + `npm run dev` verificato; `dotnet run` del backend verificato in locale.

**DoD**
- `dotnet build` e `dotnet run` funzionano in locale; migration applicata su Postgres locale; frontend parla con l'API locale.
- Working tree pulito o con solo modifiche intenzionali committate su branch.

**Sprint Review — criteri di uscita**
- [ ] Login admin funziona in locale contro PostgreSQL nativo.
- [ ] Una notizia creata da admin appare sul sito locale.
- [ ] `git status` non mostra modifiche non spiegate.

---

## Sprint 2 — Go-live infrastruttura: VM + servizi nativi (O0)
**Obiettivo:** stack raggiungibile via HTTP su una VM reale, senza Docker.

**Task**
- Provisioning **VM Oracle Ampere A1** (verificare disponibilità Always Free nella regione).
- Proteggere SSH; aprire solo 80/443; **PostgreSQL non esposto**.
- Installare .NET 10 runtime + PostgreSQL 17 sulla VM.
- API come **servizio systemd** (`dotnet JSO.dll`); frontend `npm run build` servito da **Nginx nativo**; Nginx come reverse proxy `/api` → API.
- Compilare `.env.prod` fuori dal repo (JWT, origin, credenziali admin bootstrap).
- Applicare migration sulla VM; verificare log di avvio e `/health`.

**DoD**
- `deploy/oracle/check-local.sh` verde sulla VM (frontend, `/health`, route API).

**Sprint Review — criteri di uscita**
- [ ] `/health` risponde 200 sulla VM.
- [ ] Login admin e lettura notizie funzionano via HTTP sulla VM.
- [ ] PostgreSQL non raggiungibile dall'esterno.

---

## Sprint 3 — DNS, HTTPS e collaudo dominio (O0)
**Obiettivo:** sito e admin live su HTTPS sul dominio reale.

**Task**
- Record DNS del dominio JSO → IP VM.
- TLS: Let's Encrypt (certbot) o Cloudflare davanti al reverse proxy.
- Verificare che la build frontend usi l'URL API pubblico e che **CORS** consenta l'origine reale.
- `deploy/oracle/check-domain.sh https://dominio-reale` (validazione TLS reale).

**DoD**
- `check-domain.sh` verde; certificato valido; redirect HTTP→HTTPS attivo.

**Sprint Review — criteri di uscita**
- [ ] Il sito apre in HTTPS sul dominio senza avvisi certificato.
- [ ] Login admin, upload media e chiamate pubbliche funzionano dal browser sul dominio.
- [ ] CORS non blocca l'origine reale.

---

## Sprint 4 — Backup reale + prova di restore (O0) → **MVP in produzione**
**Obiettivo:** dati protetti e recuperabili; chiude l'Orizzonte 0.

**Task**
- Primo `deploy/oracle/backup.sh` reale (DB + media) con **copia off-VM**.
- Cron: backup giornaliero + verifica settimanale (`verify-backups.sh`).
- **Restore di prova** su stack separato; documentare il tempo; scrivere il marker `RESTORE_TESTED` (abilita `prune-backups.sh`).
- Monitoraggio base (uptime/health).

**DoD**
- Backup automatico attivo, copia esterna presente, un restore riuscito e documentato.

**Sprint Review — criteri di uscita (= criteri di go-live O0)**
- [ ] Esiste un backup off-VM recente e verificato.
- [ ] Un restore è stato eseguito con successo e cronometrato.
- [ ] Monitoraggio attivo; README aggiornato con lo stato "in produzione" osservato.

> ✅ Superata questa review, l'MVP è **live e protetto**. Solo ora partono le feature di O1.

---

## Sprint 5 — Contenuti pubblici sui dati reali (O1)
**Obiettivo:** ogni pagina pubblica riflette dati reali dall'API, con stati chiari.

**Task**
- Collegare home, match center, notizie, squadra e media alle API reali.
- Gestire loading / vuoto / errore su ogni sezione; **niente dati demo** quando l'API risponde.
- Verifica accessibilità/SEO base sulle pagine pubbliche.

**DoD** + **Review**
- [ ] Ogni pagina pubblica mostra dati reali o uno stato vuoto/errore pulito.
- [ ] Nessun contenuto dimostrativo residuo.
- [ ] Build+lint verdi; verifica manuale nel browser sul dominio.

---

## Sprint 6 — Editor admin completi (O1)
**Obiettivo:** il club aggiorna i contenuti senza toccare il codice.

**Task**
- Completare editor: config homepage, menu/footer, partite con eventi e formazioni, articoli, libreria media.
- Rivedere sessioni/permessi admin, audit, gestione errori su flussi reali.

**DoD** + **Review**
- [ ] Un admin non tecnico crea/modifica contenuti in ogni area e il sito li riflette.
- [ ] Ogni scrittura è validata e auditata; le rotte admin rifiutano gli anonimi (401/403).

---

## Sprint 7 — Sponsor: primo flusso di ricavo (O1)
**Obiettivo:** gestire e mostrare sponsor (ricavo B2B, zero costo per il tifoso).

**Task**
- Backend: entità `Sponsor` (tier, placement, periodo, priorità), migration Postgres, CRUD admin `/api/admin/sponsors`, endpoint pubblico `GET /api/sponsors?placement=` (solo attivi e in periodo).
- Frontend: modulo admin (upload logo via media), vetrina pubblica su home/footer/matchday ordinata per tier/priorità; link con `rel="noopener noreferrer"`.

**DoD** + **Review**
- [ ] Admin crea uno sponsor con periodo di validità; appare nel placement giusto, sparisce fuori periodo.
- [ ] CI: smoke test sponsor verde; rotte admin protette.

---

## Sprint 8 — Account tifosi, base (O1)
**Obiettivo:** un tifoso si registra e accede, **separato dagli admin** (nessuna escalation). Riferimento: [FAN_ACCOUNTS_PLAN](FAN_ACCOUNTS_PLAN.md).

**Task**
- Dominio `FanUser` (email univoca, hash password) + migration; token con ruolo `Fan` (metodo JWT dedicato).
- Endpoint `POST /api/account/register`, `POST /api/account/login`, `GET /api/account/me` con validazione, rate limiting, audit.
- Frontend: "S'inscrire / Se connecter", pagine registrazione/login, stato sessione, logout.

**DoD** + **Review**
- [ ] register → login → `/api/account/me` funziona.
- [ ] **Un token `Fan` riceve 401/403 su `/api/admin/*`** (test anti-escalation in CI).
- [ ] Build+lint verdi; flussi verificati nel browser.

> Il **paywall + pagamento** (YouTube unlisted, `MatchAccessProduct`) è uno sprint successivo, condizionato alla scelta del **gateway di pagamento tunisino** (vedi [BUSINESS_PLAN](BUSINESS_PLAN.md)).

---

## Backlog oltre O1 (da dettagliare a valle)
- Paywall partita + pagamento (dopo gateway TND deciso).
- App Flutter (Home, Match, News, Media, account, notifiche).
- Shop, biglietteria, membership.
- Community/moderazione, gamification, analytics avanzate.
- Idee del business plan (bundle streaming, sponsor self-service, donazioni…).

---

## Come tracciare gli sprint
- Una board (GitHub Projects o issue con label `sprint-N`) con le checkbox di questa DoD.
- Ogni PR referenzia lo sprint e chiude i suoi criteri.
- La **Sprint Review** aggiorna README/plan con i risultati **osservati**; ciò che non passa torna in backlog.
