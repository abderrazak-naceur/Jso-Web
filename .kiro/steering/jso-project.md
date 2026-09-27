---
inclusion: always
---

# JSO Web — regole di progetto (per tutti gli agenti)

Monorepo del club **Jeunesse Sportive de Oudhref (JSO)**. Segui SEMPRE queste regole quando scrivi codice, così il lavoro è coerente e la CI resta verde.

## Struttura

- `frontend/` — SPA React 18 + Vite 6 + Tailwind CSS v4. Sito pubblico (`src/App.jsx`) + pannello admin (`src/admin/AdminApp.jsx`), instradati per path (`/admin`).
- `backend/` — ASP.NET Core .NET 10, Clean Architecture a 4 livelli: `JSO.Domain` (entità) → `JSO.Application` (contratti) → `JSO.Infrastructure` (EF Core, DB, sicurezza) → `JSO.Api` (controller REST).
- `mobile/` — app Flutter (Dart) che consuma la stessa API pubblica .NET.
- `deploy/` — infra (nginx, Oracle). `docs/` — piani e analisi.

## Stack e comandi

- Frontend: da `frontend/` → `npm run dev` (porta 5173), `npm run build`, `npm run lint` (oxlint).
- Backend: `dotnet build backend/src/JSO.Api/JSO.Api.csproj -c Release`. Locale in Development su `http://localhost:8080`.
- DB produzione: **PostgreSQL 17** (provider `postgres`). SQL Server solo per dev opzionale.
- Locale: PostgreSQL su `127.0.0.1:5433`, DB `JSO`, utente `jso` / `jso_local_password`. In Development lo schema è creato con `EnsureCreatedAsync` + seed demo.

## Convenzioni backend (OBBLIGATORIE)

- **Entità**: in `backend/src/JSO.Domain/Entities.cs`, stile one-liner `public sealed class X { public Guid Id { get; set; } = Guid.NewGuid(); ... }`. Stringhe obbligatorie `= null!;`, opzionali `string?`. Soldi in `decimal` con `HasPrecision(14,2)`.
- **DbContext** (`JsoDbContext.cs`): dichiara `public DbSet<X> Xs => Set<X>();` e gli indici in `OnModelCreating`.
- **Controller admin**: `[ApiController]`, `[Authorize(Roles = "...")]`, `[Route("api/admin/...")]`, `sealed`, primary constructor `(JsoDbContext db, AuditService audit)`. Metodi `async Task<IActionResult>` con `CancellationToken ct` ultimo parametro; read con `AsNoTracking()`.
- **Audit**: ogni scrittura admin chiama `audit.LogAsync("CREATE"/"UPDATE"/"DELETE", "<Entity>", id.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct)`. Con dettagli: `..., new { ... }, ct)`.
- **Ritorni**: `Created($"/api/admin/x/{id}", entity)`, `Ok(entity)`, `NotFound()`, `Conflict(new { message })`, `BadRequest(new { message })`, `NoContent()`.
- **Request records**: in fondo al file del controller, `public sealed record XRequest(...)`.
- **Controller pubblici**: `[Route("api/...")]`, niente `[Authorize]`, solo dati pubblicati/attivi, proietta con `.Select(...)` per non esporre campi interni. Il rate limiting `public-api` è globale (non serve attributo).
- **Ruoli**: `SuperAdmin`, `ClubAdmin`, `Editor`, `MatchManager`, `CommunityManager`, `ShopManager`. I token fan hanno solo ruolo `Fan` e NON devono mai passare una policy admin.
- **Identità fan**: leggi l'id da `User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value` (il "sub" viene rimappato).

## Migration EF (CRITICO per la CI)

Quando aggiungi/cambi un'entità: (1) aggiungi il `DbSet`; (2) genera la migration Postgres: `dotnet ef migrations add <Nome> --project src/JSO.Infrastructure --startup-project src/JSO.Infrastructure --output-dir Migrations/Postgres` (da `backend/`, con l'API ferma); (3) verifica che `JsoDbContextModelSnapshot.cs` includa la tabella. In produzione lo schema si applica con `MigrateAsync()`: senza migration la CI "PostgreSQL EF validation" fallisce. Colonne nuove su entità esistenti: sempre nullable o con default.

## Convenzioni frontend

- Design system JSO (colori in `frontend/src/index.css` `@theme`): `jso-navy` #071a3a, `jso-blue` #1769e0, `jso-gold` #ffd700, `jso-ink`, `jso-paper`. Utility `bg-jso-*`, `text-jso-*`.
- Pattern: card `rounded-[2rem] border border-slate-200 bg-white shadow-...`; bottoni CTA `rounded-full bg-jso-gold text-jso-navy`; submit `rounded-xl bg-jso-navy text-white hover:bg-jso-blue`; input `rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue`; modali overlay `fixed inset-0 z-[80] grid place-items-center bg-jso-navy/60 backdrop-blur-sm` con card `rounded-[2rem] bg-white p-8`.
- Moduli admin in `AdminApp.jsx`: registra nell'array `items` `[id, label, IconLucide, [ruoli]]`, render `{section === 'id' && <XModule onError={setError}/>}`, e usa l'helper `api('/admin/...')` (token in `localStorage['jso_admin_token']`).
- API client pubblica in `frontend/src/lib/api.js` (`publicApi`); account fan in `accountApi`. Testi UI in **francese**.
- Componenti account tifoso in `frontend/src/features/account/`.

## Verifiche prima di considerare finito (parità CI)

1. `dotnet build backend/src/JSO.Api/JSO.Api.csproj -c Release` → 0 errori.
2. Da `frontend/`: `npm run build` e `npm run lint` → verdi (niente warning nuovi).
3. Se toccate entità/DbContext: migration Postgres generata e snapshot allineato.
4. Non lasciare import/variabili inutilizzati (oxlint li segnala).

## Sicurezza

Nessun segreto nel repo. Password con `PasswordHasher` (PBKDF2). Ogni operazione sensibile passa da `[Authorize]` + audit. I dati personali (es. BirthDate) solo con consenso esplicito.
