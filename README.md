<div align="center">

<img src="https://raw.githubusercontent.com/abderrazak-naceur/Jso-Web/main/public/jso-club-mark.svg" alt="JSO" width="120" />

# JSO — Jeunesse Sportive de Oudhref

### La maison digitale du club

Plateforme web moderne pour **Jeunesse Sportive de Oudhref**, conçue pour réunir supporters, joueurs, staff et administration autour d'une expérience digitale unique.

<p>
  <img src="https://img.shields.io/badge/Frontend-React%2018-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Backend-.NET%2010-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" alt=".NET 10" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL%20%2F%20SQL%20Server-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="Database" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

</div>

---

## ✨ Vision

JSO Web non è solo un sito vetrina: è una **digital platform del club**.

L'obiettivo è creare un ecosistema unico per:

- 🏟️ seguire partite, risultati e Match Center
- 📰 pubblicare notizie e contenuti editoriali
- 📸 gestire foto e media del club
- 👥 presentare squadre, giocatori e staff
- 🧑‍💻 amministrare il sito tramite back-office
- 📊 raccogliere analytics e audit
- 🤝 gestire sponsor e partnership
- 💬 costruire una community di tifosi
- 🛍️ preparare una futura area shop
- 📱 estendere successivamente l'esperienza a iOS e Android

## 🖼️ Platform Preview

<div align="center">

<img src="https://raw.githubusercontent.com/abderrazak-naceur/Jso-Web/main/public/jso-platform-overview.svg" alt="JSO Web, Mobile and Admin Platform" width="1100" />

</div>

---

## 🧩 Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                         JSO WEB                              │
├──────────────────────────────────────────────────────────────┤
│  React + Vite + Tailwind                                    │
│  Public Website + Admin Back Office                         │
└─────────────────────────────┬────────────────────────────────┘
                              │ REST / JSON
┌─────────────────────────────▼────────────────────────────────┐
│                     ASP.NET Core .NET 10                     │
│                                                              │
│  API · Auth · RBAC · Match Center · News · Media · Audit    │
└─────────────────────────────┬────────────────────────────────┘
                              │ EF Core
┌─────────────────────────────▼────────────────────────────────┐
│                    PostgreSQL / SQL Server                    │
└──────────────────────────────────────────────────────────────┘

Production target
      Oracle Cloud Always Free
              │
              ├── Docker API
              ├── PostgreSQL
              ├── Nginx
              └── Persistent media volume
```

---

## 🖼️ Visuals

<div align="center">

<img src="https://raw.githubusercontent.com/abderrazak-naceur/Jso-Web/main/public/jso-mobile-preview.svg" alt="JSO Flutter Mobile App Preview" width="850" />

<br />

**Website + Admin + Flutter Mobile App + API + Database**

</div>

> Le logo JSO utilisé dans le projet est le crest digital JSO. Le dossier `public/` contient les assets visuels utilisés par le site et la future application mobile.

---

## 🛠️ Technology Stack

### Frontend

- React 18
- Vite 6
- Tailwind CSS 4
- Lucide React
- Responsive mobile-first UI
- Public website + Admin SPA

### Backend

- ASP.NET Core .NET 10
- C#
- Entity Framework Core 10
- REST API
- JWT Authentication
- Role-Based Access Control
- Rate limiting
- Health checks
- Audit logging
- Swagger / OpenAPI

### Data

- PostgreSQL 17 for Oracle ARM64 production
- SQL Server supported for local development
- EF Core provider abstraction
- Production migrations planned through EF Core

### Infrastructure

- Docker
- Docker Compose
- Nginx
- Oracle Cloud Always Free target
- Persistent PostgreSQL volume
- Persistent media volume

---

## 🚀 Current Features

### Public Website

- [x] Responsive homepage
- [x] Club information
- [x] Match Center
- [x] Match details
- [x] Match events
- [x] Lineups
- [x] Officials
- [x] Match statistics
- [x] Newsroom
- [x] News article details
- [x] Media gallery
- [x] Team and players
- [x] Dynamic homepage content
- [x] API integration with graceful fallback

### Admin Back Office

- [x] JWT login
- [x] Role-based authorization
- [x] Dashboard
- [x] Club Settings
- [x] Team management
- [x] Player management
- [x] Match Center administration
- [x] Match events
- [x] Lineups
- [x] Officials
- [x] Statistics
- [x] News CMS
- [x] SEO metadata
- [x] Media Library
- [x] Image upload
- [x] Content management
- [x] Security / Audit area

### Security

- [x] JWT authentication
- [x] Password hashing
- [x] Generic invalid-login responses
- [x] Login rate limiting
- [x] Public API rate limiting
- [x] Security headers
- [x] Forwarded headers support
- [x] Audit logs
- [x] Production secret configuration
- [x] No secrets committed to repository

---

## 📁 Project Structure

```text
Jso-Web/
├── backend/
│   ├── src/
│   │   ├── JSO.Domain/
│   │   ├── JSO.Application/
│   │   ├── JSO.Infrastructure/
│   │   └── JSO.Api/
│   ├── Dockerfile
│   └── JSO.sln
│
├── src/
│   ├── admin/
│   │   └── AdminApp.jsx
│   ├── lib/
│   │   └── api.js
│   ├── App.jsx
│   └── index.css
│
├── public/
│   ├── jso-club-mark.svg
│   ├── fan-platform-hero.svg
│   ├── team-hero.svg
│   └── ...
│
├── deploy/
│   ├── nginx/
│   └── oracle/
│
├── docs/
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile.frontend
└── README.md
```

---

## 💻 Local Development

### Requirements

- Node.js 22+
- npm
- .NET SDK 10
- Docker Desktop
- SQL Server or PostgreSQL

### Frontend

```bash
npm install
npm run dev
```

The frontend runs by default on:

```text
http://localhost:5173
```

### Backend

```bash
cd backend
dotnet restore
dotnet build JSO.sln
dotnet run --project src/JSO.Api
```

API development URL:

```text
http://localhost:5080
```

Swagger is available in Development.

### Environment

Copy the example configuration:

```bash
cp .env.example .env
```

For production:

```bash
cp .env.prod.example .env.prod
```

Never commit real passwords, JWT secrets or production credentials.

---

## 🐳 Docker

Local services:

```bash
docker compose up --build
```

Production stack:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Production architecture keeps the API and PostgreSQL private behind the internal Docker network. Nginx exposes the public HTTP entry point.

---

## ☁️ Production Target

The current deployment strategy targets **Oracle Cloud Always Free**, with:

- ARM64-compatible containers
- PostgreSQL
- Docker Compose
- Nginx reverse proxy
- persistent database storage
- persistent media storage
- HTTPS / domain through a reverse proxy or Cloudflare

Detailed deployment documentation:

- `docs/DEPLOY_ORACLE_CLOUD.md`
- `docs/HOSTING_ORACLE_CLOUD_ANALYSIS.md`
- `docs/DATABASE_PRODUCTION_DECISION.md`
- `deploy/oracle/README.md`

> Production deployment is prepared in the repository but should be considered **not live until the Oracle environment, domain and HTTPS configuration have been verified**.

---

## 🗺️ Roadmap

### Phase 1 — Foundation

- [x] Public website
- [x] .NET 10 backend
- [x] Database abstraction
- [x] Authentication
- [x] RBAC
- [x] Audit
- [x] Docker

### Phase 2 — Content & Match Center

- [x] Match Center
- [x] Match events
- [x] Lineups
- [x] Officials
- [x] Statistics
- [x] News CMS
- [x] Media Library
- [x] Uploads

### Phase 3 — Experience

- [ ] Homepage Builder
- [ ] Sponsors
- [ ] Advanced analytics
- [ ] Community
- [ ] Moderation
- [ ] Shop

### Phase 4 — Production

- [ ] PostgreSQL production migration verification
- [ ] Oracle Cloud deployment
- [ ] HTTPS
- [ ] Domain
- [ ] Backup automation
- [ ] Monitoring
- [ ] E2E testing

## 📱 Mobile App — iOS & Android

La piattaforma JSO è progettata fin dall'inizio per poter diventare anche una **app mobile ufficiale del club**.

L'app mobile utilizzerà gli stessi servizi backend del sito web, evitando di duplicare la logica e mantenendo un'unica fonte dati.

### Cosa farà l'app

| Area | Funzionalità |
|---|---|
| 🏠 Home | Highlights, prossimo match e ultime notizie |
| ⚽ Match Center | Calendario, risultati, eventi, formazione e statistiche |
| 📰 News | Articoli e comunicazioni ufficiali |
| 📸 Media | Foto e video del club |
| 👥 Squadra | Giocatori, staff e profili |
| 🤝 Community | Interazioni e contenuti dei tifosi |
| 🛍️ Shop | Accesso alla futura boutique ufficiale |
| 🔔 Notifications | Notifiche per partite, risultati e news |
| 🌐 Account | Profilo e preferenze del tifoso |

### Come funzionerà

```text
             JSO MOBILE APP
             Flutter + Dart
                    │
                    │ HTTPS / JSON
                    ▼
             ASP.NET Core .NET 10
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       Matches     News      Media
          │         │         │
          └─────────┼─────────┘
                    ▼
              PostgreSQL
```

Il principio è **"build once, use everywhere"**: sito web, pannello admin e app mobile condividono API, autenticazione, dati e regole applicative.

### 📲 Roadmap Mobile

- [ ] Flutter
- [ ] Dart
- [ ] Design system mobile JSO
- [ ] Design system mobile JSO
- [ ] Login / profilo
- [ ] Home mobile
- [ ] Match Center mobile
- [ ] News & Media
- [ ] Push notifications
- [ ] Community
- [ ] Shop
- [ ] Build Android
- [ ] Build iOS
- [ ] Pubblicazione Google Play
- [ ] Pubblicazione App Store

> **Stato attuale:** l'app mobile è nella roadmap. Il backend è già strutturato per essere consumato da un client mobile tramite API REST; non viene presentata come app già pubblicata.

---

### Phase 5 — Mobile App

- [ ] Flutter + Dart
- [ ] Mobile design system
- [ ] Android app
- [ ] iOS app
- [ ] Push notifications
- [ ] Community mobile
- [ ] Shop mobile
- [ ] App Store / Google Play release

---

## 🔐 Roles

The administration layer is designed around role-based access:

| Role | Scope |
|---|---|
| `SuperAdmin` | Full administration |
| `ClubAdmin` | Club, teams and operational content |
| `Editor` | News, media and content |
| `MatchManager` | Matches and Match Center |
| `CommunityManager` | Community and moderation |
| `ShopManager` | Commercial / shop area |

---

## 🔌 Main API Areas

```text
/api/club
/api/home
/api/matches
/api/matches/{id}
/api/news
/api/news/{slug}
/api/media
/api/teams

/api/auth/login

/api/admin/dashboard
/api/admin/club
/api/admin/teams
/api/admin/matches
/api/admin/matches/{id}/lineup
/api/admin/matches/{id}/officials
/api/admin/matches/{id}/stats
/api/admin/news
/api/admin/media
/api/admin/content
/api/admin/audit
/api/admin/security/users

/health
```

---

## 📚 Documentation

| Document | Purpose |
|---|---|
| `docs/ROADMAP.md` | Product and development roadmap |
| `docs/NEXT_STEPS.md` | Development sequence |
| `docs/DEPLOY_ORACLE_CLOUD.md` | Oracle deployment plan |
| `docs/HOSTING_ORACLE_CLOUD_ANALYSIS.md` | Hosting analysis |
| `docs/DATABASE_PRODUCTION_DECISION.md` | PostgreSQL production decision |
| `deploy/oracle/README.md` | Oracle deployment procedure |

---

## 🤝 Development Principles

The project follows a few core principles:

1. **API-first architecture**
2. **Security by default**
3. **Mobile-first responsive UI**
4. **Portable infrastructure**
5. **No unnecessary paid services**
6. **Clear separation between Domain, Application, Infrastructure and API**
7. **Production-ready Docker configuration**
8. **Auditability for administrative actions**
9. **Persistent storage for user-generated media**
10. **Incremental delivery with documented commits**

---

## 📌 Project Status

**Active development**

The core platform, authentication, administration, Match Center, News CMS and Media Library are implemented. The next major product block is the **Homepage Builder**, followed by Sponsors, Analytics, Community and production deployment.

---

<div align="center">

### Toujours plus haut. Toujours JSO. 💙💛

<img src="https://raw.githubusercontent.com/abderrazak-naceur/Jso-Web/main/public/jso-club-mark.svg" alt="Jeunesse Sportive de Oudhref" width="70" />

</div>
