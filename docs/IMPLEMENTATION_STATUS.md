# JSO Web — Implementation Status

**Data:** 30 settembre 2026  
**Branch di riferimento:** `main`  
**Fonte:** stato verificato del repository e roadmap operativa.

Questo documento è il punto sintetico di verità per lo stato implementativo. La presenza di una funzione nel codice non equivale a un collaudo in produzione.

## Stato globale

| Area | Stato codice | Verifica reale / produzione | Prossimo passo |
|---|---|---|---|
| Public Web | ✅ Implementato | 🟡 Browser/domain reale da verificare | E2E reale + Lighthouse/accessibilità |
| Admin | ✅ Implementato | 🟡 Browser/domain reale da verificare | E2E critici |
| Team / Players | ✅ Implementato | 🟡 Foto ufficiali e collaudo reale | Profilo giocatore + pipeline media avanzata |
| Match Center | ✅ Implementato | 🟡 E2E reale | Smoke test production |
| News / Media | ✅ Implementato | 🟡 E2E reale | Upload + persistence dopo restart |
| Ticketing / Payments | ✅ Implementato nel perimetro attuale | 🟡 E2E completo e provider reale | Verifica reserve → pay → webhook |
| QR / Check-in | ✅ Implementato | 🟡 TICKET-QR-007/008 | E2E + device testing |
| Mobile Flutter | ✅ Implementato nel perimetro attuale | 🟡 Device/signing/store | Android/iOS reali |
| PostgreSQL | ✅ Migration/flow CI verificati | 🟡 Oracle reale | Backup + restore reale |
| Security / Audit | ✅ Implementato | 🟡 Production hardening | Review finale |
| CI / Docker | ✅ Configurato | 🟡 Risultati per ogni HEAD da verificare | Release gate |
| Oracle / HTTPS | 🟡 Predisposto | ⛔ Non ancora go-live | VM → DNS → HTTPS → smoke test |

## Attività completate recentemente

### EPIC — Les visages de la JSO

- [x] Roster pubblico separato in `frontend/src/features/team/`.
- [x] Hero professionale e identità visiva JSO.
- [x] Filtri per ruolo.
- [x] Ricerca per nome/numero.
- [x] Stagione 2026/2027.
- [x] Card responsive con portrait uniforme.
- [x] Placeholder neutro per foto mancanti.
- [x] Admin upload/preview/removal dei portrait.
- [x] JPG/PNG/WebP, limite 10 MB.
- [x] `PhotoUrl` alimentato dal media upload.
- [x] PR #90 mergiata in `main`.

**Nota:** le foto ufficiali reali devono essere fornite dal club. Il sistema non usa immagini casuali come identità reali dei giocatori.

## Architettura enterprise

- [x] Team agenti definito in `docs/AGENT_ORGANIZATION.md`.
- [x] Governance in `docs/AGENT_EXECUTION_PLAN.md`.
- [x] Ownership A0–A11.
- [x] Pipeline Idea → Product → Architecture/UX → Development → QA/Security → CI → Release → Production.
- [x] README aggiornato con le attività completate.

## Prossimo backlog tecnico

### P0 — Production readiness

1. Oracle VM.
2. DNS + HTTPS.
3. CORS sul dominio reale.
4. Backup PostgreSQL/media.
5. Restore verificato.
6. Smoke test Admin → API → PostgreSQL → Web.
7. E2E browser reale.

### P1 — Frontend architecture

**Avanzamento 30 settembre:** [x] Homepage composition estratta da `App.jsx` in `features/home/HomePage.jsx`; [x] shell mantiene navigation/header/footer e modal state; [x] Media estratto in `features/media/MediaSection.jsx`; [x] Club estratto in `features/club/ClubSection.jsx`; [x] `HomeContentSections.jsx` alleggerito; [x] Admin API client centralizzato in `frontend/src/admin/api.js`; [x] Admin `ContentModule` estratto in `frontend/src/admin/content/ContentModule.jsx`; [x] Moduli Admin principali separati per `content`, `commerce`, `sport`, `club`, `system`; [x] `Field` e default dei moduli centralizzati; [x] `AdminApp.jsx` ridotto a shell/orchestrator. [x] Registry di navigazione Admin estratto in `frontend/src/admin/navigation.js`. [x] Security/Admin UI estesa con gestione `StaffAssignment` (utente, ruolo, scope, gate, device, validità, attivazione/disattivazione). [x] Permission registry Admin introdotto come base per RBAC (`Role → Permission`). [x] Backend permission policies introdotte per Admin Security e Ticket Administration, mantenendo i ruoli legacy compatibili. Endpoint `GET /api/admin/security/me/permissions` aggiunto per esporre il catalogo effettivo dell'utente autenticato; navigazione Admin allineata a `tickets:admin` e ai ruoli TicketSeller/TicketSupervisor/SeasonManager. Modello `StaffAssignment` e `StaffAuthorizationService` introdotti come base per RBAC scoped (Global/Club/Team/Match/Venue/Gate e vincoli Gate/Device). `JsoDbContext` ora espone la nuova entità con indici dedicati e `AdminStaffAssignmentsController` espone list/create/deactivate sotto `security:manage`. Migration PostgreSQL verificata a livello di codice; il QR check-in usa ora endpoint scoped dedicati che verificano `tickets:validate` / `tickets:checkin` sull'assignment del Match/Gate/Device prima della transizione atomica. [x] `AdminApp.jsx` utilizza il client centralizzato; [x] contratti API invariati.

Refactoring incrementale senza modificare i contratti API:

```text
frontend/src/
  app/
  components/
  features/
    home/
    team/
    matches/
    news/
    shop/
    tickets/
    memberships/
    community/
    media/
  admin/
    dashboard/
    content/
    commerce/
    sport/
    club/
    system/
  lib/
  styles/
```

Regole:
- componenti UI condivisi fuori dalle feature;
- API client centralizzato;
- feature autonome;
- niente regressioni di comportamento;
- mobile responsive;
- accessibilità mantenuta;
- ogni refactor deve essere verificabile.

### P1 — RBAC staff

Ruoli pianificati:
`TicketSeller`, `TicketValidator`, `TicketSupervisor`, `ShopStaff`, `MatchOperator`, `ContentEditor`, `Finance`, `SeasonManager`.

Modello previsto:
`Role` → `Permission` → `Scope` → `Gate/Device` → `StaffAssignment`.

### P1 — Season Pass

- `SeasonSubscription`
- `SubscriptionMatch`
- inventory venue/section/row/seat
- QR pass
- attendance per match
- renewal/transfer

## Definition of Done

Una modifica è considerata completata quando:

- codice implementato;
- scope e ownership chiari;
- acceptance criteria verificati;
- build/lint/test pertinenti eseguiti quando disponibili;
- sicurezza valutata;
- documentazione aggiornata;
- integrazione verificata.

Una funzione è **Production Ready** solo dopo verifica sull'ambiente reale.
