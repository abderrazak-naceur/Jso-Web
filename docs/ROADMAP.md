# JSO Web — Product Planning & Roadmap

## 1. Vision

Creare la piattaforma digitale ufficiale della **Jeunesse Sportive de Oudhref**: un sito moderno, veloce e responsive che riunisce identità del club, squadra, partite, notizie, media, community, boutique e un back office completo per la gestione autonoma dei contenuti.

Il progetto sarà sviluppato in modo incrementale: prima l’esperienza pubblica e il design system, poi il backend, il pannello amministrativo e infine le funzionalità avanzate.

## 2. Scope della piattaforma

### Area pubblica

- Homepage istituzionale e sportiva.
- Presentazione del club, storia, valori e infrastrutture.
- Prima squadra, staff, giocatori e profili individuali.
- Calendario partite e Match Center.
- Risultati, classifiche, statistiche e dettagli delle partite.
- Newsroom con articoli, categorie e tag.
- Media House con foto, video, highlights e gallerie.
- Community dei tifosi.
- Boutique del club.
- Sponsor e partner.
- Contatti, social links, privacy e cookie policy.

### Area amministrativa

- Login sicuro e gestione delle sessioni.
- Dashboard con riepilogo operativo.
- Gestione utenti amministrativi e ruoli.
- Gestione contenuti del sito senza nuovo deploy.
- Gestione squadra, giocatori e staff.
- Gestione partite, risultati, competizioni e calendario.
- Gestione news, categorie, tag e bozze.
- Gestione immagini, video e gallerie.
- Configurazione homepage, menu e footer.
- Gestione community e moderazione.
- Gestione sponsor, boutique e richieste commerciali.
- Analytics, audit log e stato delle integrazioni.

## 3. Fasi di sviluppo

## Phase 0 — Foundation & Architecture

- Definizione requisiti funzionali e non funzionali.
- Definizione architettura frontend/backend.
- Configurazione repository, ambienti e convenzioni.
- Design tokens JSO: navy, blue, gold, typography, spacing, radius, shadows.
- Definizione modello dati e contratti API.
- Configurazione CI, lint, test e build.

**Exit criteria:** architettura documentata, repository organizzato e pipeline di base funzionante.

## Phase 1 — Public Visual Experience

- Homepage moderna con hero, CTA e Match Center preview.
- Header desktop/mobile e navigazione responsive.
- Sezioni Club, Matchday, Newsroom, Team, Media House e Boutique.
- Componenti riutilizzabili: buttons, cards, badges, modals, sections.
- Stati responsive, loading, empty state ed error state.
- Supporto accessibilità di base e SEO tecnico.

**Stato attuale:** prima implementazione visuale presente nel frontend React.

**Exit criteria:** sito pubblico coerente con il concept JSO, responsive e navigabile.

## Phase 2 — Backend & Data Core

- API ASP.NET Core.
- SQL Server e migrations.
- Entity: Club, Season, Competition, Team, Player, StaffMember, Match, MatchEvent.
- Entity editoriali: Article, Category, Tag, MediaAsset, Gallery.
- Entity community: User, Post, Comment, Reaction, Report, Notification.
- Entity amministrative: AdminUser, Role, Permission, AuditLog, FeatureFlag.
- DTO, validation, pagination, filtering e sorting.
- Error handling standardizzato e logging.

**Exit criteria:** dati persistenti e API documentate disponibili per frontend e admin.

## Phase 3 — Match Center

- Lista partite con filtri per stagione, competizione e stato.
- Dettaglio partita.
- Calendario e risultati.
- Formazioni e convocati.
- Eventi: gol, ammonizioni, sostituzioni e note.
- Classifiche e contesto della competizione.
- Stato live e aggiornamenti periodici.
- Adapter per provider sportivi esterni.
- Modalità manuale/fallback per inserimento da admin.

**Exit criteria:** una partita può essere creata, modificata, pubblicata e consultata end-to-end.

## Phase 4 — News & Media House

- Elenco articoli e pagina dettaglio.
- Editor con stato bozza, revisione, pubblicazione e archiviazione.
- Categorie, tag, slug e SEO metadata.
- Upload e gestione immagini.
- Video, highlights e gallerie.
- Archivio storico.
- Contenuti correlati e contenuti in evidenza.

**Exit criteria:** il club può pubblicare autonomamente news e contenuti multimediali.

## Phase 5 — Admin Foundation

### 5.1 Autenticazione

- Login email/password.
- Password hashata e policy di sicurezza.
- Refresh token o sessione server-side.
- Logout e revoca sessioni.
- Recupero password.
- Protezione da brute force e rate limiting.
- 2FA come evoluzione successiva.

### 5.2 Ruoli e permessi

Ruoli iniziali:

- **Super Admin:** accesso completo e gestione ruoli.
- **Club Admin:** gestione generale del sito e delle operazioni del club.
- **Sport Editor:** squadra, giocatori, staff, partite e risultati.
- **Content Editor:** news, media, homepage e pagine informative.
- **Moderator:** community, segnalazioni e utenti.
- **Analyst:** sola lettura di analytics e report.

Permessi principali:

- `dashboard.read`
- `users.read`, `users.manage`
- `roles.read`, `roles.manage`
- `club.read`, `club.manage`
- `team.read`, `team.manage`
- `matches.read`, `matches.manage`
- `content.read`, `content.create`, `content.update`, `content.publish`, `content.delete`
- `media.read`, `media.manage`
- `community.read`, `community.moderate`
- `analytics.read`
- `settings.manage`
- `audit.read`

### 5.3 Admin shell

- Sidebar responsive.
- Header con profilo, notifiche e ambiente corrente.
- Breadcrumbs.
- Tabelle con ricerca, filtri, paginazione e ordinamento.
- Form riutilizzabili.
- Toast e conferme per operazioni distruttive.
- Empty, loading, error e permission states.
- Layout coerente con il design system JSO.

**Exit criteria:** ogni amministratore vede esclusivamente le sezioni autorizzate dal proprio ruolo.

## Phase 6 — Admin Modules

### Dashboard

- KPI: prossime partite, risultati recenti, articoli pubblicati, media, utenti e segnalazioni.
- Attività recenti.
- Contenuti in bozza.
- Stato integrazioni e notifiche operative.

### Club Settings

- Nome, logo, colori e informazioni ufficiali.
- Stadio e contatti.
- Social links.
- Sponsor e partner.
- Stagione attiva.

### Team & Player Management

- CRUD squadre e categorie.
- CRUD giocatori.
- Numero maglia, ruolo, foto e biografia.
- Staff tecnico e dirigenza.
- Stato attivo/inattivo.
- Import/export CSV in una fase successiva.

### Match Management

- Creazione e modifica partite.
- Avversario, data, ora, stadio e competizione.
- Risultato e stato partita.
- Convocati, formazione ed eventi.
- Pubblicazione manuale o sincronizzazione provider.
- Storico modifiche.

### News CMS

- Editor articolo.
- Bozza, revisione, pubblicazione e archiviazione.
- Immagine principale.
- Categorie, tag e SEO.
- Programmazione pubblicazione.
- Anteprima pubblica.

### Media Library

- Upload immagini e video.
- Cartelle e gallerie.
- Metadati, alt text e copyright.
- Ricerca e filtri.
- Eliminazione protetta e controllo utilizzi.

### Homepage Builder

- Gestione hero e CTA.
- Sezioni attive/disattive.
- News in evidenza.
- Match in evidenza.
- Banner sponsor.
- Ordinamento delle sezioni.

### Menu & Footer

- Menu principale.
- Link esterni e social.
- Footer columns.
- Link legali.
- Visibilità per ambiente.

### Community Moderation

- Coda segnalazioni.
- Approva, nascondi o elimina contenuti.
- Sospendi o riattiva utenti.
- Storico moderazione.
- Regole e motivazioni obbligatorie per azioni sensibili.

### Analytics & Audit

- Visite e pagine più consultate.
- Engagement su news e partite.
- Crescita community.
- Audit log immutabile per azioni amministrative.
- Filtri per utente, modulo, azione e intervallo temporale.

**Exit criteria:** il club può gestire contenuti, dati sportivi e community senza modificare il codice.

## Phase 7 — Community & Fan Experience

- Registrazione e login tifosi.
- Profilo pubblico.
- Feed, post, commenti e reazioni.
- Notifiche.
- Segnalazioni.
- Moderazione e blocco utenti.
- Preferenze privacy.

**Exit criteria:** community utilizzabile con strumenti di sicurezza e moderazione.

## Phase 8 — Commercial & Growth

- Boutique con catalogo prodotti.
- Carrello e checkout.
- Gestione ordini dal back office.
- Membership e contenuti premium.
- Ticketing.
- Sponsor placement e campagne.
- Newsletter.
- Advanced live match experience.

**Exit criteria:** piattaforma pronta per servizi commerciali e crescita del club.

## 4. Architettura prevista

### Frontend

- React + Vite.
- Tailwind CSS.
- React Router per le rotte pubbliche e amministrative.
- TanStack Query per cache, fetch e sincronizzazione dati.
- React Hook Form + Zod per form e validazione.
- Libreria componenti interna JSO.

### Backend

- ASP.NET Core Web API su .NET 10.
- Architettura modulare con separazione API, Application, Domain e Infrastructure.
- Entity Framework Core.
- SQL Server.
- ASP.NET Core Identity o soluzione equivalente per autenticazione e ruoli.
- OpenAPI/Swagger.
- Background jobs per sincronizzazioni e notifiche.

### Infrastructure

- Docker e Docker Compose per sviluppo locale.
- CI/CD.
- Logging centralizzato.
- Health checks.
- Gestione segreti tramite variabili d’ambiente e secret store.
- Backup database e policy di retention.

## 5. API principali previste

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/club`
- `PUT /api/admin/club`
- `GET /api/teams`
- `POST /api/admin/teams`
- `GET /api/players`
- `POST /api/admin/players`
- `GET /api/matches`
- `POST /api/admin/matches`
- `GET /api/news`
- `POST /api/admin/news`
- `POST /api/admin/media`
- `GET /api/admin/dashboard`
- `GET /api/admin/audit-logs`
- `GET /api/admin/analytics`

Gli endpoint sono indicativi e saranno raffinati durante la progettazione dei contratti API.

## 6. Milestone operative

### Milestone A — Visual MVP

- Homepage pubblica.
- Design system.
- Navigazione responsive.
- Sezioni principali con dati demo.

### Milestone B — Backend Core

- API .NET 10.
- SQL Server.
- Modello dati.
- Autenticazione di base.

### Milestone C — Admin MVP

- Login admin.
- RBAC.
- Dashboard.
- CRUD squadra, giocatori, partite e news.
- Media library iniziale.

### Milestone D — Public Data Integration

- Collegamento frontend alle API.
- Match Center reale.
- News CMS pubblico.
- Team e media dinamici.

### Milestone E — Community & Growth

- Community.
- Moderazione.
- Analytics.
- Boutique, sponsor e ticketing.

## 7. Definition of Done

Una funzionalità è considerata completata quando:

- È implementata frontend e/o backend secondo lo scope.
- Ha validazione e gestione degli errori.
- È responsive e accessibile.
- Ha loading, empty e error state.
- È protetta da autenticazione/autorizzazione quando necessario.
- Ha test adeguati.
- È documentata.
- È verificata tramite build e controllo manuale.
- Non espone segreti o dati sensibili.

## 8. Release strategy

### Alpha

Esperienza visuale JSO con dati statici o simulati.

### Beta

Backend reale, SQL Server, squadra, partite, newsroom e Admin MVP.

### Public MVP

Match Center integrato, CMS completo, media library, community iniziale, moderazione e hardening di produzione.

### Growth

Boutique, membership, ticketing, sponsor, analytics avanzati e funzionalità live.
