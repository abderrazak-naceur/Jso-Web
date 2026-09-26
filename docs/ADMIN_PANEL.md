# JSO — Admin Panel Specification

## 1. Obiettivo

L'area **Admin / Back Office** è il centro operativo del sito ufficiale di **JSO — Jeunesse Sportive d'Oudhref**.

Deve permettere al club di gestire il contenuto e i dati del sito senza modificare il codice sorgente o intervenire sul database manualmente.

L'admin panel non è una semplice pagina CRUD: deve essere un **CMS sportivo + centro operativo del club**.

## 2. Accesso e ruoli

### Super Admin

Accesso completo alla piattaforma, agli utenti, alle impostazioni e alla gestione dei ruoli.

### Club Admin

Gestisce contenuti, squadra, partite, news, media, shop e dashboard del club.

### Editor

Gestisce news, articoli, immagini, video, pagine e contenuti editoriali.

### Match Manager

Gestisce calendario, risultati, eventi partita, formazioni e stato dei match quando i dati non arrivano automaticamente da provider esterni.

### Community Manager

Gestisce post, commenti, segnalazioni, contenuti community e moderazione.

### Shop Manager

Gestisce prodotti, categorie, prezzi, disponibilità e ordini quando la parte e-commerce sarà attivata.

## 3. Dashboard Admin

> La dashboard (`GET /api/admin/dashboard`) espone ora, sotto le KPI card, i blocchi **« Activité du jour »** (news pubblicate, match del giorno, media caricati, azioni di audit) e **« Activité récente »**. Il feed « Activité récente » è una proiezione sintetica e sicura degli eventi di audit (solo `id, action, entityType, entityId, userEmail, createdAt`, senza `IpAddress` né `Details`) visibile a tutti i ruoli della dashboard, mentre l'audit log completo resta riservato al SuperAdmin tramite `/api/admin/audit`.

La dashboard iniziale deve mostrare:

- Partite di oggi / prossime partite.
- Ultimi risultati.
- News pubblicate / in bozza.
- Contenuti media pubblicati.
- Utenti registrati e utenti attivi.
- Nuovi post e commenti.
- Segnalazioni da moderare.
- Prodotti e ordini quando lo shop è attivo.
- Stato delle integrazioni dati.
- Errori tecnici rilevanti.

### Widget principali

```text
┌─────────────────────────────────────────────────────────┐
│ JSO ADMIN                                    Admin User │
├───────────────┬─────────────────────────────────────────┤
│ Overview      │ KPI / HEALTH                            │
│ Match Center  │                                         │
│ Squad         │ Matches   Users   News   Reports       │
│ News          │                                         │
│ Media         │ Today's Activity                         │
│ Community     │                                         │
│ Shop          │ Provider Health   Storage   API          │
│ Users         │                                         │
│ Settings      │ Recent actions                           │
│ Audit Logs    │                                         │
└───────────────┴─────────────────────────────────────────┘
```

## 4. Gestione Squadra

L'admin deve poter:

- creare/modificare squadre;
- impostare nome, short name, logo, colori, descrizione;
- gestire staff;
- gestire giocatori;
- impostare numero di maglia;
- ruolo/posizione;
- foto profilo;
- bio e informazioni pubbliche;
- stato attivo/inattivo;
- ordinamento della rosa;
- associare una squadra a competizione e stagione.

### Player management

Supportare almeno:

`Name`, `Number`, `Position`, `Photo`, `Bio`, `Nationality`, `Status`, `DisplayOrder`.

## 5. Match Center Admin

L'admin deve poter vedere e gestire:

- calendario;
- competizione;
- stagione;
- data e ora;
- stadio;
- squadra casa;
- squadra ospite;
- stato match;
- risultato;
- eventi;
- marcatori;
- sostituzioni;
- cartellini;
- formazioni;
- note editoriali.

### Data source modes

Ogni match deve poter funzionare in:

1. **Provider mode** — dati sincronizzati automaticamente.
2. **Manual mode** — dati inseriti dal Match Manager.
3. **Hybrid mode** — dati automatici con possibilità di correzioni autorizzate.

## 6. News / CMS

CMS editoriale completo con:

- titolo;
- sottotitolo;
- contenuto rich text;
- immagine hero;
- gallery;
- categoria;
- tag;
- autore;
- data pubblicazione;
- SEO title;
- SEO description;
- slug;
- stato `Draft / Scheduled / Published / Archived`;
- featured flag;
- anteprima social.

### Workflow

```text
Draft → Review → Scheduled → Published → Archived
              ↓
           Rejected
```

## 7. Media House

Gestione di:

- immagini;
- video;
- highlights;
- interviste;
- gallery partita;
- contenuti academy;
- archivi storici.

Funzioni:

- upload;
- metadata;
- thumbnail;
- alt text;
- categorie;
- tagging;
- pubblicazione;
- ordinamento;
- eliminazione con conferma.

## 8. Homepage Builder

La homepage deve poter essere configurata dall'admin attraverso blocchi modulari.

### Blocchi iniziali

- Hero.
- Next Match.
- Last Result.
- News.
- Featured Video.
- Squad Highlights.
- Club Story.
- Community.
- Shop Highlights.
- Premium CTA.
- Sponsors.
- Stats.

L'admin deve poter cambiare l'ordine dei blocchi e attivarli/disattivarli.

## 9. Community Management

Funzioni:

- lista post;
- ricerca;
- filtri per stato;
- commenti;
- reports;
- hide/unhide;
- delete secondo policy;
- block/mute utente;
- gestione utenti problematici;
- moderazione massiva.

Ogni azione moderativa deve essere registrata nell'audit log.

## 10. User Management

L'admin autorizzato deve poter:

- cercare utenti;
- vedere profilo;
- vedere stato account;
- sospendere/riattivare account;
- verificare ruoli;
- assegnare ruoli;
- visualizzare attività rilevante;
- gestire consensi secondo policy;
- richiedere o eseguire cancellazione secondo processo autorizzato.

## 11. Shop Management

Quando l'e-commerce sarà attivo:

- prodotti;
- categorie;
- varianti;
- immagini;
- prezzo;
- stock;
- disponibilità;
- stato pubblicazione;
- ordini;
- stato pagamento;
- stato spedizione;
- codici promozionali.

## 12. Configurazione del Club

Impostazioni gestibili dal back office:

- nome ufficiale;
- logo;
- colori principali;
- slogan;
- descrizione;
- contatti;
- indirizzo;
- stadio;
- social links;
- lingua;
- timezone;
- footer;
- menu di navigazione;
- cookie/privacy links;
- sponsor;
- feature flags.

## 13. Provider e Data Integration

L'admin tecnico deve poter monitorare:

- provider sportivo attivo;
- ultimo sync;
- esito ultimo sync;
- numero record importati;
- errori;
- stato API;
- job schedulati.

La configurazione delle API key non deve essere salvata in chiaro nel database applicativo. I secret devono rimanere nel secret/configuration management del backend.

## 14. Analytics

Dashboard con almeno:

- page views;
- utenti attivi;
- nuovi iscritti;
- match views;
- news views;
- community engagement;
- video plays;
- click CTA;
- shop conversion quando disponibile.

## 15. Audit Log

Ogni azione amministrativa significativa deve produrre un record:

```text
Who
When
Role
Action
EntityType
EntityId
Before
After
IP / RequestId
Result
```

Esempi:

- User role changed.
- Match result updated.
- News published.
- Post hidden.
- Product price changed.
- Homepage block reordered.

## 16. Security Requirements

- Admin routes protette server-side.
- RBAC obbligatorio.
- MFA previsto per Super Admin.
- Session timeout configurabile.
- Protezione CSRF secondo il modello auth scelto.
- Rate limiting.
- Audit log non modificabile dal ruolo standard.
- Upload con validazione MIME, size e extension.
- Sanitizzazione HTML rich text.
- Nessun secret nel frontend.
- Nessuna autorizzazione basata esclusivamente su controlli UI.

## 17. Admin Routes — Frontend

```text
/admin
/admin/dashboard
/admin/matches
/admin/matches/:id
/admin/teams
/admin/teams/:id
/admin/players
/admin/news
/admin/news/new
/admin/news/:id
/admin/media
/admin/community
/admin/community/reports
/admin/users
/admin/shop
/admin/analytics
/admin/integrations
/admin/settings
/admin/audit-log
```

## 18. Admin API Boundary

```text
GET    /api/admin/dashboard
GET    /api/admin/health

GET    /api/admin/teams
POST   /api/admin/teams
PUT    /api/admin/teams/{id}
DELETE /api/admin/teams/{id}

GET    /api/admin/players
POST   /api/admin/players
PUT    /api/admin/players/{id}
DELETE /api/admin/players/{id}

GET    /api/admin/matches
POST   /api/admin/matches
PUT    /api/admin/matches/{id}
POST   /api/admin/matches/{id}/sync
POST   /api/admin/matches/{id}/events

GET    /api/admin/news
POST   /api/admin/news
PUT    /api/admin/news/{id}
POST   /api/admin/news/{id}/publish
POST   /api/admin/news/{id}/schedule

GET    /api/admin/media
POST   /api/admin/media
DELETE /api/admin/media/{id}

GET    /api/admin/community/reports
POST   /api/admin/community/reports/{id}/resolve
POST   /api/admin/community/posts/{id}/hide
POST   /api/admin/community/posts/{id}/restore

GET    /api/admin/users
POST   /api/admin/users/{id}/suspend
POST   /api/admin/users/{id}/restore
POST   /api/admin/users/{id}/roles

GET    /api/admin/shop/products
POST   /api/admin/shop/products
PUT    /api/admin/shop/products/{id}

GET    /api/admin/analytics
GET    /api/admin/integrations
GET    /api/admin/audit-log
GET    /api/admin/settings
PUT    /api/admin/settings
```

## 19. Database Areas

Admin functionality richiede almeno le seguenti aree dati:

- `Users`
- `Roles`
- `UserRoles`
- `Permissions`
- `Teams`
- `Players`
- `Competitions`
- `Matches`
- `MatchEvents`
- `News`
- `MediaAssets`
- `HomepageSections`
- `Posts`
- `Comments`
- `Reports`
- `Products`
- `Orders`
- `Notifications`
- `AuditLogs`
- `IntegrationJobs`
- `ClubSettings`

## 20. Delivery Plan

### Admin Phase A — Foundation

- RBAC.
- Admin shell.
- Dashboard.
- Audit log.
- Settings.

### Admin Phase B — Content

- News CMS.
- Media library.
- Homepage builder.
- Menu/footer configuration.

### Admin Phase C — Sport

- Teams.
- Players.
- Competitions.
- Matches.
- Match events.
- Provider sync.

### Admin Phase D — Community

- Moderation queue.
- Reports.
- Users.
- Suspensions.
- Community analytics.

### Admin Phase E — Commerce & Growth

- Shop.
- Orders.
- Sponsors.
- Premium.
- Analytics.

## 21. Definition of Done — Admin

Una funzione admin è considerata completa quando:

- UI disponibile con loading/empty/error states;
- endpoint backend protetto da RBAC;
- validazione server-side;
- audit log dove richiesto;
- test unit/component/API presenti per la logica critica;
- permission checks verificati;
- responsive almeno desktop/tablet;
- documentazione aggiornata.
