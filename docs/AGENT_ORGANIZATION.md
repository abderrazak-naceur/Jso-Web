# JSO — Team d'agents produit

**Objectif:** structurer le monorepo JSO comme un produit d'entreprise, avec un Lead/Architect qui orchestre des agents spécialisés, un backlog clair, des ownership boundaries et des gates de qualité.

## 1. Organisation cible

```text
                         JSO PRODUCT LEAD / ARCHITECT
                                    |
         +--------------------------+--------------------------+
         |                          |                          |
   Product / UX                Engineering                Quality / Ops
         |                          |                          |
   Product Manager            Backend Agent              QA / E2E Agent
   UX/UI Agent                Frontend Agent              Security Agent
   Content Agent              Mobile Agent                DevOps Agent
                              Data/DB Agent
                              Payments Agent
```

L'agent principal reste responsable de l'intégration, du découpage des tâches, de la cohérence globale et de la décision finale de merge.

## 2. Rôles des agents

### A0 — Product Lead / Architect
Responsabilités:
- lit ROADMAP, IMPLEMENTATION_STATUS et steering avant chaque lot;
- découpe une feature en tâches atomiques;
- assigne un seul owner par tâche;
- vérifie les contrats entre frontend, backend, mobile et data;
- bloque les changements hors scope;
- exige build/lint/tests pertinents avant intégration;
- met à jour la documentation d'état.

### A1 — Product Manager
Responsabilités:
- requirements, user stories, acceptance criteria;
- priorités business;
- définition MVP vs extensions;
- suivi du backlog.

### A2 — UX/UI & Design System
Responsabilités:
- design system JSO;
- responsive web;
- composants partagés;
- accessibilité visuelle;
- cohérence mobile/web;
- pages joueurs, news, shop, tickets et admin.

### A3 — Frontend Web
Stack:
- React + Vite + Tailwind.
Responsabilités:
- public site;
- admin UI;
- routing/navigation;
- API client;
- performance et accessibility.

### A4 — Backend/API
Stack:
- ASP.NET Core .NET 10;
- EF Core;
- PostgreSQL.
Responsabilità:
- domain;
- controllers/services;
- authorization;
- validation;
- audit;
- API contracts.

### A5 — Mobile
Stack:
- Flutter/Dart.
Responsabilità:
- iOS/Android;
- shared API contracts;
- ticket digitale;
- scanner staff;
- device UX.

### A6 — Data/Database
Responsabilità:
- schema;
- PostgreSQL migrations;
- indexes/constraints;
- seed;
- backup/restore;
- data integrity.

### A7 — Payments & Commerce
Responsabilità:
- Stripe/Flouci;
- shop/ticket/membership;
- webhook;
- reconciliation;
- idempotency;
- finance integration.

### A8 — QA / E2E
Responsabilità:
- unit/integration/E2E;
- regression;
- critical journeys;
- release acceptance;
- evidence of verification.

### A9 — Security
Responsabilità:
- auth/RBAC;
- secrets;
- rate limiting;
- upload security;
- webhook signatures;
- threat review;
- production hardening.

### A10 — DevOps / Release
Responsabilità:
- Docker;
- GitHub Actions;
- Oracle;
- HTTPS/domain;
- monitoring;
- release and rollback.

### A11 — Content / CRM
Responsabilità:
- news;
- media;
- homepage/editorial content;
- social;
- sponsors;
- club communications.

## 3. Ownership boundaries

| Area | Owner | Collaboratori |
|---|---|---|
| Homepage/public UX | A2/A3 | A1, A11 |
| Admin dashboard | A3 | A2, A4 |
| Match Center | A4/A3 | A5, A7 |
| Team / player profiles | A2/A3/A4 | A11 |
| Ticketing | A4/A3/A5 | A6, A7, A8, A9 |
| Season Pass | A4/A3/A5 | A6, A7, A8 |
| Finance | A4/A3/A6/A7 | A8, A9 |
| Mobile release | A5 | A8, A10 |
| Production | A10 | A4, A6, A9 |
| Documentation | A0 | all |

## 4. Regole di lavoro

1. Un task ha un owner unico.
2. Un agente non modifica file fuori dal proprio scope senza esplicita necessità.
3. Le modifiche a contratti API/domain richiedono sincronizzazione con A3/A5.
4. Ogni modifica backend che cambia schema richiede migration verificata.
5. Ogni feature utente critica richiede almeno un test del percorso principale.
6. Nessun merge basato su "dovrebbe funzionare": la verifica deve essere osservabile.
7. La documentazione deve indicare lo stato reale del codice.
8. Le feature visuali devono avere criteri responsive e accessibilità.
9. Production e deploy non vengono dichiarati completati finché non esiste evidenza sull'ambiente reale.

## 5. Pipeline per una feature

```text
Idea
  ↓
Product requirements
  ↓
Architecture / UX
  ↓
Task breakdown
  ↓
Backend / DB ─────┐
Frontend ─────────┼──> Integration
Mobile ───────────┘
  ↓
QA / Security
  ↓
CI
  ↓
Release
  ↓
Production verification
  ↓
Documentation update
```

## 6. Stato attuale e prossimi epics

### EPIC-01 — Player Experience
Obiettivo: trasformare **Les visages de la JSO** in una pagina professionale di roster.

Requisiti:
- fotografie reali o placeholder fotografici coerenti;
- stesso background/studio per tutti;
- luce frontale uniforme;
- inquadratura verticale uniforme;
- volto nitido e leggibile;
- jersey JSO coerente;
- crop/ratio identico;
- niente avatar SVG stilizzati come soluzione finale del roster;
- fallback neutro e professionale se manca la foto;
- dettaglio profilo con ruolo, numero, posizione, statistiques essenziali;
- gestione foto via admin;
- ottimizzazione WebP/AVIF e lazy loading;
- mobile responsive.

Acceptance:
- tutte le card del roster hanno trattamento fotografico omogeneo;
- nessuna immagine appare come una collezione casuale;
- le immagini demo sono chiaramente sostituibili con foto ufficiali.

### EPIC-02 — Web Frontend Architecture
Obiettivo: rendere il frontend più modulare e manutenibile.

Target:

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
- componenti UI condivisi separati dalle feature;
- API client centralizzato;
- hooks per data fetching;
- niente mega-file come punto principale di composizione quando può essere scomposto;
- route/page modules separati dai componenti;
- design tokens centralizzati.

### EPIC-03 — Enterprise Agent Platform
Obiettivo: fare lavorare Kiro/Codex/agent runners con ruoli separati.

Struttura:

```text
.kiro/
  agents/
    product-lead.md
    architect.md
    frontend.md
    backend.md
    mobile.md
    qa.md
    security.md
    devops.md
    ux.md
    data.md
    payments.md
    content.md
  skills/
  specs/

.agents/
  tasks/
    <task-id>/
      task.json
      context.json
      features/
      review.md
```

Ogni task deve contenere:
- obiettivo;
- scope;
- owner agent;
- input;
- file boundaries;
- acceptance criteria;
- verification commands;
- dependencies;
- rollback notes;
- final status.

## 7. Backlog immediato

### P0 — Documentation truth
- allineare ROADMAP con QR/check-in e finance attuali;
- creare IMPLEMENTATION_STATUS.md;
- collegare lo status alla governance agenti.

### P1 — Les visages de la JSO
- rifare pipeline immagini giocatori;
- introdurre un trattamento fotografico uniforme;
- verificare componenti roster desktop/mobile;
- sostituire i placeholder grafici come default finale del roster.

### P1 — Frontend refactor
- separare App shell, homepage composition e feature modules;
- introdurre cartelle di dominio;
- estrarre componenti comuni;
- mantenere API e comportamento invariati durante il refactor.

### P1 — Enterprise RBAC
- definire permission matrix;
- TicketSeller;
- TicketValidator;
- TicketSupervisor;
- SeasonManager;
- ShopStaff;
- MatchOperator;
- ContentEditor;
- Finance;
- gate/device scope.

### P1 — Season Pass
- SeasonSubscription;
- SubscriptionMatch;
- seat/venue inventory;
- pass QR;
- attendance per match;
- renewal/transfer.

### P0 — Production
- Oracle;
- domain/HTTPS;
- CORS;
- backup;
- restore;
- E2E reale;
- payments sandbox/production verification.

## 8. Definition of Done

Una feature è "Done" solo se:
- codice presente;
- ownership dichiarata;
- acceptance criteria verificati;
- test/build pertinenti eseguiti;
- sicurezza valutata;
- docs aggiornati;
- integrazione completata;
- nessun TODO critico nascosto.

Una feature "Production Ready" richiede inoltre:
- deploy reale;
- smoke test reale;
- observability;
- backup/rollback verificati.

