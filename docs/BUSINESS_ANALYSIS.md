# Jso-Web — Business & Functional Analysis

## 1. Executive Summary

Jso-Web è la piattaforma digitale ufficiale di **JSO — Jeunesse Sportive d'Oudhref**.

L'obiettivo è costruire una destinazione digitale moderna per il club che riunisca in un'unica esperienza:

- identità e storia del club;
- prima squadra, staff e academy;
- calendario, risultati e Match Center;
- news, articoli, foto e video;
- community e interazione con i tifosi;
- boutique e membership;
- strumenti operativi per amministratori, editor e staff del club.

Il prodotto deve avere due superfici principali:

1. **Public / Fan Experience** — esperienza moderna e immersiva per tifosi e visitatori.
2. **Club Admin / Back Office** — CMS e centro operativo per permettere al club di gestire il sito senza modificare il codice.

## 2. Visione di Business

**Vision:** fare del sito ufficiale JSO la casa digitale del club: informazione, matchday, identità, media, community e servizi in un'esperienza coerente.

### Obiettivi

1. Rafforzare la presenza digitale del club.
2. Rendere immediatamente disponibili informazioni su squadra e partite.
3. Aumentare engagement e ritorno dei tifosi.
4. Creare un ecosistema editoriale e media gestibile direttamente dal club.
5. Ridurre la dipendenza tecnica del club per le attività quotidiane di contenuto.
6. Costruire una base scalabile per shop, membership, sponsor e servizi futuri.

## 3. Target Users

### Persona A — Supporter abituale
Segue JSO ogni settimana e vuole avere in un solo posto partite, news, risultati, media e community.

### Persona B — Super fan
Vuole notifiche, dati, contenuti esclusivi e interazione più profonda con il club.

### Persona C — Fan occasionale
Arriva soprattutto durante una partita o dopo un risultato e deve trovare rapidamente informazioni e contenuti.

### Persona D — Player / Staff
Consulta informazioni pubbliche o, dove autorizzato, contenuti interni e profili del club.

### Persona E — Club Admin
Gestisce operativamente sito, squadra, calendario, contenuti, utenti e configurazioni.

### Persona F — Editor / Media Manager
Pubblica news, foto, video, interviste e homepage content.

### Persona G — Match Manager
Gestisce calendario, risultati, eventi, formazioni e sincronizzazione dati sportivi.

### Persona H — Community Manager
Modera post, commenti, segnalazioni e community activity.

## 4. Value Proposition

```text
Club identity
      ↓
Team + Match Center
      ↓
News + Media
      ↓
Community
      ↓
Fans return / engage
      ↓
Club manages everything from Admin
```

Il punto distintivo è che il prodotto deve funzionare contemporaneamente come **sito ufficiale del club, media house, match center e piattaforma community**, mantenendo un back office centrale per governare il contenuto.

## 5. Core Product Areas

### 5.1 Club
Storia, valori, infrastrutture, staff, contatti e identità visiva.

### 5.2 Team
Rosa, giocatori, staff, posizioni, numeri di maglia, profili e stagione.

### 5.3 Match Center
Partite, stato, risultati, eventi, timeline, statistiche e area live quando i dati sono disponibili.

### 5.4 Newsroom
News editoriali, comunicati, interviste, annunci e articoli.

### 5.5 Media House
Foto, video, highlights, gallery e archivi storici.

### 5.6 Fans & Community
Post, commenti, reaction, profili e conversazioni.

### 5.7 Club Shop
Prodotti ufficiali, merchandising e ordini quando l'e-commerce viene attivato.

### 5.8 Membership
Vantaggi supporter, contenuti esclusivi, accesso prioritario e future iniziative premium.

### 5.9 Admin / Back Office
CMS e strumenti operativi per gestire tutte le aree del sito.

## 6. Business Model — Future Ready

Il primo rilascio può concentrarsi sul sito ufficiale e sull'esperienza fan. In seguito il prodotto può supportare:

- membership/premium;
- sponsorship;
- advertising selettivo;
- shop e merchandising;
- ticketing;
- partnership locali;
- servizi digitali per il club.

## 7. Main Functional Flows

### Flow 1 — Fan

1. Visita il sito.
2. Scopre il club e la prossima partita.
3. Consulta risultati e news.
4. Guarda media e contenuti.
5. Accede alla community.
6. Si registra per personalizzare l'esperienza.

### Flow 2 — Matchday

1. Admin/Provider aggiorna il match.
2. Match passa a upcoming/live/finished.
3. I tifosi aprono il Match Center.
4. Gli eventi vengono visualizzati in tempo quasi reale.
5. La community si concentra sulla partita.
6. Il risultato finale alimenta storico e contenuti.

### Flow 3 — Editorial

1. Editor crea draft.
2. Inserisce testo e media.
3. Aggiunge categoria, tag, SEO e immagini.
4. Invia a review oppure programma la pubblicazione.
5. Pubblica.
6. News appare in homepage/newsroom.

### Flow 4 — Admin Operations

1. Admin accede al back office.
2. Dashboard mostra KPI, attività e alert.
3. Admin gestisce squadra, partite, news e media.
4. Community Manager gestisce report e moderazione.
5. Le azioni amministrative vengono registrate nell'audit log.

## 8. Functional Requirements — Public

### FR-001 Account
Registrazione, login, logout e gestione sessione quando abilitati.

### FR-002 Fan Profile
Gestione del profilo e preferenze.

### FR-003 Team
Consultazione squadra, giocatori e staff.

### FR-004 Match Center
Consultazione calendario, match detail, risultati e stato live.

### FR-005 News
Consultazione di news e articoli.

### FR-006 Media
Consultazione di foto, video e gallery.

### FR-007 Community
Post, commenti, reaction e profili.

### FR-008 Notifications
Notifiche per partite, news e interazioni.

### FR-009 Shop
Visualizzazione catalogo e acquisto quando attivato.

### FR-010 Membership
Visualizzazione e gestione membership quando attivata.

## 9. Functional Requirements — Admin

### FR-A01 Admin Authentication
L'area admin deve richiedere autenticazione forte e autorizzazione server-side.

### FR-A02 RBAC
Il sistema deve supportare ruoli e permessi granulari.

### FR-A03 Admin Dashboard
Mostrare KPI, attività, match, contenuti, segnalazioni e health status.

### FR-A04 Club Settings
Gestire informazioni e configurazioni del club.

### FR-A05 Team Management
Gestire squadre, staff e giocatori.

### FR-A06 Match Management
Gestire calendario, risultati, eventi, formazioni e sincronizzazione.

### FR-A07 News CMS
Creare, modificare, revisionare, programmare e pubblicare news.

### FR-A08 Media Library
Caricare, classificare, cercare e pubblicare media.

### FR-A09 Homepage Builder
Gestire i blocchi della homepage e il relativo ordine.

### FR-A10 Community Moderation
Gestire report, post, commenti e sospensioni secondo policy.

### FR-A11 User Management
Ricercare utenti, stato account e ruoli.

### FR-A12 Shop Management
Gestire prodotti, stock e ordini quando attivati.

### FR-A13 Analytics
Visualizzare traffico, engagement, contenuti e KPI principali.

### FR-A14 Integrations
Monitorare provider sportivi, job di sincronizzazione e integrazioni.

### FR-A15 Audit Log
Registrare le operazioni amministrative significative.

### FR-A16 Feature Flags
Attivare/disattivare funzionalità e componenti senza modificare codice dove previsto.

## 10. Non Functional Requirements

### NFR-001 Performance
Home, Match Center e Admin devono mantenere tempi di risposta percepiti rapidi anche con contenuti dinamici.

### NFR-002 Mobile First
La superficie pubblica deve essere responsive e ottimizzata per smartphone.

### NFR-003 Admin Usability
L'admin deve essere ottimizzato almeno per desktop e tablet.

### NFR-004 Scalability
L'architettura deve permettere di aggiungere competizioni, provider, media e nuove aree del club senza riprogettare il frontend di dominio.

### NFR-005 Security
RBAC server-side, validazione input, rate limiting, gestione sicura dei secret e protezione delle operazioni amministrative.

### NFR-006 Auditability
Le modifiche amministrative critiche devono essere tracciabili.

### NFR-007 Media Safety
Upload con controllo MIME, dimensioni, estensioni, sanitizzazione e policy di storage.

## 11. MVP Scope

### Must Have

- Home ufficiale JSO.
- Club identity.
- Team / players.
- Match Center.
- Newsroom base.
- Media base.
- Admin authentication + RBAC.
- Admin dashboard.
- Team management.
- Match management.
- News CMS.
- Media library.
- Homepage content management.

### Should Have

- Community.
- Moderation.
- Notifications.
- Analytics dashboard.
- Audit log completo.

### Later

- Shop.
- Ticketing.
- Membership/Premium.
- Advanced live statistics.
- Sponsor management.
- B2B features.

## 12. Business Rules

### BR-001
Solo utenti con permessi validi possono accedere alle funzioni admin.

### BR-002
La UI non deve essere l'unico livello di autorizzazione: il backend deve verificare sempre i permessi.

### BR-003
Una news pubblicata deve avere contenuto minimo, slug e stato validi.

### BR-004
Un match può essere aggiornato manualmente solo da un ruolo autorizzato oppure tramite provider.

### BR-005
Le modifiche manuali ai dati sportivi devono essere auditabili.

### BR-006
I dati provider non devono essere hardcoded nel frontend.

### BR-007
Un contenuto segnalato deve entrare nel workflow di moderazione.

### BR-008
Le credenziali e le API key non devono essere salvate nel frontend.

### BR-009
Un admin non può modificare contenuti fuori dal proprio scope di autorizzazione.

### BR-010
Ogni azione critica di amministrazione deve avere actor, timestamp, target e risultato.

## 13. KPI di Prodotto

### Fan KPI

- utenti attivi giornalieri e mensili;
- match views;
- news views;
- video plays;
- community engagement;
- retention;
- notifications opened.

### Club KPI

- news pubblicate per mese;
- tempo medio di pubblicazione;
- utilizzo del Match Center;
- numero di contenuti media pubblicati;
- report moderati;
- utenti gestiti;
- health delle integrazioni;
- conversione futura di membership/shop.

## 14. Acceptance Criteria — Admin MVP

### AC-A01 Admin Login
**Given** un amministratore autorizzato
**When** effettua il login
**Then** accede solo alle aree consentite dal proprio ruolo.

### AC-A02 Team Management
**Given** un Club Admin
**When** modifica un giocatore
**Then** la modifica viene validata, salvata e auditata.

### AC-A03 Match Management
**Given** un Match Manager
**When** aggiorna un risultato
**Then** il Match Center pubblico riflette il dato dopo la sincronizzazione applicativa.

### AC-A04 News Publishing
**Given** un Editor
**When** pubblica una news valida
**Then** la news passa a `Published` ed è visibile nel sito pubblico.

### AC-A05 Homepage Builder
**Given** un Club Admin
**When** riordina i blocchi homepage
**Then** il nuovo ordine viene persistito e usato dal frontend.

### AC-A06 Moderation
**Given** un Community Manager
**When** nasconde un contenuto segnalato
**Then** il contenuto non appare più nel feed pubblico e l'azione viene auditata.

### AC-A07 Role Protection
**Given** un Editor
**When** tenta di modificare una configurazione riservata al Super Admin
**Then** il backend nega l'operazione.

## 15. Target Architecture

```text
                           ┌──────────────────────┐
                           │   Public Web / Fans  │
                           │  React + Vite        │
                           └──────────┬───────────┘
                                      │
                           ┌──────────▼───────────┐
                           │ ASP.NET Core .NET 10  │
                           │ API / Auth / RBAC     │
                           └───────┬───────┬──────┘
                                   │       │
                    ┌──────────────▼─┐   ┌▼─────────────────┐
                    │ Club Domain    │   │ Admin / CMS      │
                    │ Matches/Teams  │   │ Content/RBAC     │
                    └───────┬────────┘   └────────┬─────────┘
                            │                     │
                            └──────────┬──────────┘
                                       ▼
                                  SQL Server
                                       │
             ┌─────────────────────────┼─────────────────────────┐
             ▼                         ▼                         ▼
       Sports Provider             Media Storage             Analytics
```

Il frontend pubblico e il back office possono condividere componenti e contratti API, ma devono avere confini applicativi chiari.

## 16. Delivery Sequence

1. Brand/UI system JSO.
2. Public home e routing.
3. Club/team foundation.
4. Match Center.
5. News/media foundation.
6. Backend .NET 10 + SQL Server.
7. Admin authentication + RBAC.
8. Admin dashboard.
9. Team/player management.
10. Match administration + provider sync.
11. News CMS + media library.
12. Homepage builder.
13. Community + moderation.
14. Analytics + audit.
15. Shop/membership/ticketing future phases.
