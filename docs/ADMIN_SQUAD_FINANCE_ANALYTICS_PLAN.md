# Piano PRO — Admin: gestione squadra, finanze del club e analytics per giocatore

**Stato:** proposta (solo piano, nessuna implementazione). Da approvare prima di scrivere codice.

**Obiettivo:** aggiungere al pannello admin tre aree nuove:
1. **Gestione squadra** più completa (rosa, contratti, disponibilità) — estende l'attuale "Équipes & joueurs".
2. **Finanze del club** — entrate, uscite e "soldi persi" (perdite/deficit), con report per periodo.
3. **Analytics per giocatore** — statistiche e indicatori per ogni giocatore, derivati dai dati partita.

---

## 1. Contesto attuale (verificato nel codice)

- **Menu admin** (`src/admin/AdminApp.jsx`): array `items` con voci `[id, label, icona, ruoli]` e rendering a sezioni. Aggiungere aree è a basso attrito.
- **Dominio esistente** (`backend/src/JSO.Domain`): `Team`, `Player`, `Match`, `MatchEvent` (minuto, tipo, giocatore), `MatchLineup` (titolare/riserva, capitano), `MatchStat` (statistica squadra home/away), `Article`, `AdminUser`.
- **Dashboard** (`AdminDashboardController`): conteggi partite/news/squadre/giocatori.
- **Sicurezza:** ogni controller admin usa `[Authorize(Roles = "...")]`; i ruoli includono già `ClubAdmin`, `MatchManager`, `ShopManager`, ecc.

**Conseguenza progettuale:** le analytics per giocatore possono essere in gran parte **derivate** da `MatchEvent` + `MatchLineup` (presenze, gol, cartellini). Le finanze sono **completamente nuove** (nessuna entità finanziaria esiste). I "soldi persi" vanno modellati come parte di un registro entrate/uscite, non come un campo singolo, per avere numeri affidabili.

---

## 2. Ruoli e sicurezza

- Nuovo ruolo consigliato **`FinanceManager`** per l'area finanze (in alternativa riservarla a `SuperAdmin,ClubAdmin`). I dati finanziari sono sensibili: accesso ristretto.
- Gestione squadra estesa: `SuperAdmin,ClubAdmin` (come oggi).
- Analytics giocatore (lettura): `SuperAdmin,ClubAdmin,MatchManager`.
- Tutte le nuove rotte sotto `/api/admin/*` con `[Authorize(Roles = ...)]`; nessun accesso anonimo.
- Ogni operazione di scrittura registrata via `AuditService` (`CREATE/UPDATE/DELETE`), senza dati sensibili nei log.
- Validazione input rigorosa (importi non negativi dove previsto, date coerenti, valuta valida).

---

## 3. Area A — Gestione squadra (estensione)

### 3.1 Dominio (nuovi campi/entità)
- Estendere `Player` (opzionale, campi nullable per non rompere i dati esistenti): `DateOfBirth`, `Nationality`, `PreferredFoot`, `HeightCm`, `Status` (Active/Injured/Suspended/Loaned), `MarketValue` (nullable), `ContractStart`, `ContractEnd`.
- Nuova entità `PlayerContract` (storico contratti): `Id`, `PlayerId`, `StartDate`, `EndDate`, `Salary` (nullable), `Currency`, `Notes`. Consente lo storico invece di sovrascrivere.
- Nuova entità `PlayerAvailability` (facoltativa): infortuni/squalifiche con periodo e motivo, utile per rosa e analytics.

### 3.2 API
- Estendere `AdminTeamsController` (giocatori) per i nuovi campi.
- `GET/POST/PUT/DELETE /api/admin/players/{id}/contracts` per lo storico contratti.
- Validazioni: date contratto coerenti, un solo contratto attivo per periodo, importi ≥ 0.

### 3.3 Frontend
- Estendere `TeamsModule` con i nuovi campi giocatore e una sotto-scheda "Contrats" per giocatore.

---

## 4. Area B — Finanze del club ("soldi persi")

### 4.1 Modello (nuovo — registro entrate/uscite)
- Entità `FinanceCategory`: `Id`, `Name`, `Type` (`Income` | `Expense`). Es. uscite: stipendi, trasferte, attrezzatura, arbitraggio, sanzioni; entrate: biglietti, sponsor, merchandising.
- Entità `Transaction`: `Id`, `Date`, `CategoryId`, `Type` (`Income`/`Expense`), `Amount` (decimale ≥ 0), `Currency`, `Description`, `MatchId` (nullable, per costi/ricavi legati a una partita), `CreatedBy`, `CreatedAt`.
- **"Soldi persi"** = risultato netto negativo su un periodo: `Net = ΣIncome − ΣExpense`. Se `Net < 0` è una perdita. Non un campo, ma un calcolo su transazioni reali; così i numeri sono verificabili.

### 4.2 API (`AdminFinanceController`, ruolo `FinanceManager`/`ClubAdmin`)
- `GET/POST/PUT/DELETE /api/admin/finance/categories`
- `GET/POST/PUT/DELETE /api/admin/finance/transactions` (filtri per intervallo date, categoria, tipo, match).
- `GET /api/admin/finance/summary?from=&to=` → `{ totalIncome, totalExpense, net, byCategory[], byMonth[] }`. `net < 0` evidenzia la perdita.
- Vincoli: importi validi, valuta coerente (una valuta di club configurabile), niente cancellazioni a cascata silenziose.

### 4.3 Frontend (`FinanceModule`)
- Tabella transazioni con filtri per periodo e categoria; form di inserimento/modifica.
- Card di riepilogo: Entrate, Uscite, **Netto** (in rosso se perdita), per l'intervallo scelto.
- Grafico semplice entrate vs uscite per mese e ripartizione per categoria (SVG leggero o libreria già presente; nessuna nuova dipendenza pesante senza conferma).
- Export CSV del periodo (facoltativo, utile per contabilità).

### 4.4 Precisione monetaria
- Usare `decimal` lato backend e colonna numerica a precisione fissa (es. `numeric(14,2)` in PostgreSQL). Mai `double` per soldi.

---

## 5. Area C — Analytics per giocatore

### 5.1 Fonte dati
Due opzioni:
- **Derivata (consigliata all'MVP):** calcolare le metriche da `MatchLineup` (presenze/titolarità), `MatchEvent` (gol, assist se tracciati, cartellini) e `Match` (minutaggio se registrato). Nessuna nuova tabella dati grezzi.
- **Dedicata (più precisa):** nuova entità `PlayerMatchStat` (`PlayerId`, `MatchId`, `MinutesPlayed`, `Goals`, `Assists`, `YellowCards`, `RedCards`, `Rating` nullable). Dà controllo pieno ma richiede inserimento dati per partita.

Proposta: partire dalla **derivata** e prevedere `PlayerMatchStat` come estensione quando servono metriche non deducibili dagli eventi.

### 5.2 API (`AdminPlayerAnalyticsController`, ruoli lettura squadra)
- `GET /api/admin/players/{id}/analytics?seasonId=` → aggregati del giocatore: presenze, titolarità, minuti (se disponibili), gol, assist, cartellini gialli/rossi, media per partita, trend per periodo.
- `GET /api/admin/teams/{id}/analytics?seasonId=` → classifica interna della rosa (marcatori, presenze, disciplina).
- Calcoli lato server con EF Core (`GroupBy`/`Count`), niente logica pesante lato client.

### 5.3 Frontend (`AnalyticsModule` o scheda dentro `TeamsModule`)
- Selettore squadra + stagione; tabella giocatori con colonne metriche ordinabili.
- Scheda dettaglio giocatore: KPI (presenze, gol, cartellini) + mini-grafico trend.
- Stato vuoto chiaro quando non ci sono ancora dati partita.

---

## 6. Menu admin — nuove voci

Aggiungere all'array `items` in `AdminApp.jsx` (con gating ruoli):

```
['squad',     'Effectif & contrats', Users,     ['SuperAdmin','ClubAdmin']]
['finance',   'Finances',            Wallet,    ['SuperAdmin','ClubAdmin','FinanceManager']]
['analytics', 'Analytics joueurs',   BarChart3, ['SuperAdmin','ClubAdmin','MatchManager']]
```

(Icone `Wallet` e `BarChart3` da `lucide-react`, già usata nel progetto.) La gestione squadra estesa può stare dentro la voce esistente "Équipes & joueurs" o nella nuova "Effectif & contrats".

---

## 7. Migrazioni e dati

- Nuove entità e campi → **migration PostgreSQL** in `Migrations/Postgres` (provider di produzione). In sviluppo `EnsureCreatedAsync` crea lo schema locale.
- Tutti i nuovi campi su entità esistenti (es. `Player`) devono essere **nullable/con default** per non rompere i dati già presenti.
- Il seeder di sviluppo può aggiungere categorie finanziarie e qualche transazione demo per il collaudo UI.

---

## 8. Verifica (CI e locale)

- **Backend:** build Release; estendere lo smoke test CI con: creazione categoria + transazione, `summary` che riflette il netto (incluso caso di perdita `net < 0`), e analytics giocatore su un match con un evento gol. Verifica che le rotte finanze rifiutino ruoli non autorizzati.
- **Frontend:** `npm run build` e `npm run lint` verdi; verifica manuale dei tre moduli.
- **Sicurezza:** test che un ruolo senza permesso riceve `401/403` sulle rotte finanze/analytics.

---

## 9. Ordine di implementazione proposto

1. **Analytics giocatore (derivata)** — nessuna nuova tabella dati, alto valore, basso rischio: endpoint aggregati + modulo frontend + voce menu.
2. **Gestione squadra estesa** — campi `Player` nullable + `PlayerContract` + UI contratti.
3. **Finanze** — `FinanceCategory` + `Transaction` + `summary` + modulo frontend + ruolo `FinanceManager`.
4. **PlayerMatchStat dedicata** (solo se servono metriche non derivabili).
5. Migration PostgreSQL, test CI, aggiornamento README.

---

## 10. Decisioni aperte (servono conferme prima di codificare)

1. **Valuta del club:** unica (es. TND) o multivaluta? Consigliata una valuta unica configurabile per l'MVP.
2. **Ruolo finanze:** creare `FinanceManager` o limitare a `SuperAdmin,ClubAdmin`?
3. **Stipendi nei contratti:** vanno mostrati agli stessi ruoli delle finanze o nascosti ai `MatchManager`? (Dato sensibile.)
4. **Analytics MVP:** derivata dagli eventi va bene per iniziare, o serve subito l'inserimento manuale di minuti/assist/rating (`PlayerMatchStat`)?
5. **Grafici:** SVG leggero fatto in casa o una libreria di charting? (Impatto su bundle e dipendenze.)
6. **Export/contabilità:** serve export CSV/PDF per il commercialista fin dall'MVP?
7. **GDPR/dati personali** dei giocatori (data di nascita, stipendio): informativa e accesso ristretto — da confermare.
