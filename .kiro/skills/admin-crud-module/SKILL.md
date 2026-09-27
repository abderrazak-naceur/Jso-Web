---
name: admin-crud-module
description: Aggiungere una nuova area amministrativa CRUD completa al progetto JSO (entità dominio + DbSet + migration Postgres + controller admin con audit + eventuale controller pubblico + modulo frontend admin + voce di menu). Usa questa skill quando devi creare una nuova sezione gestibile dall'admin (es. prodotti, eventi, categorie).
---

# Skill: modulo admin CRUD JSO

Procedura passo-passo per aggiungere un'area CRUD completa, coerente con lo steering `jso-project`.

## 1. Dominio
In `backend/src/JSO.Domain/Entities.cs` aggiungi l'entità one-liner:
`public sealed class Xxx { public Guid Id { get; set; } = Guid.NewGuid(); public string Name { get; set; } = null!; ... public bool IsActive { get; set; } = true; public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow; }`
Soldi in `decimal`. Campi opzionali `string?`.

## 2. DbContext
In `backend/src/JSO.Infrastructure/JsoDbContext.cs`:
- `public DbSet<Xxx> Xxxs => Set<Xxx>();`
- in `OnModelCreating`: indici utili (`HasIndex`), unicità con `.IsUnique()`, e `Property(x=>x.Price).HasPrecision(14,2)` per i decimali.

## 3. Migration Postgres (CRITICO)
Ferma il backend, poi da `backend/`:
`dotnet ef migrations add AddXxx --project src/JSO.Infrastructure --startup-project src/JSO.Infrastructure --output-dir Migrations/Postgres`
Verifica che `JsoDbContextModelSnapshot.cs` contenga `ToTable("Xxxs")`. Senza migration la CI fallisce.

## 4. Controller admin
`backend/src/JSO.Api/Controllers/AdminXxxController.cs`:
- `[ApiController]`, `[Authorize(Roles = "SuperAdmin,ClubAdmin,<ruolo>")]`, `[Route("api/admin/xxx")]`, `sealed`, ctor `(JsoDbContext db, AuditService audit)`.
- GET lista (`AsNoTracking`, `OrderBy...`), GET by id, POST (valida → crea → `SaveChangesAsync` → `audit.LogAsync("CREATE", "Xxx", ...)` → `Created(...)`), PUT (`FindAsync([id], ct)` → valida → aggiorna → audit "UPDATE" → `Ok`), DELETE (`FindAsync` → `Remove` → audit "DELETE" → `NoContent`).
- Validazione in un metodo privato `static string? Validate(XxxRequest r)` che ritorna il messaggio d'errore o null.
- In fondo: `public sealed record XxxRequest(...)`.

## 5. Controller pubblico (se serve vetrina)
`backend/src/JSO.Api/Controllers/XxxController.cs`: `[Route("api/xxx")]`, niente auth, filtra `IsActive`/pubblicati, `.Select(...)` per esporre solo campi pubblici.

## 6. Frontend admin
In `frontend/src/admin/AdminApp.jsx`:
- costante `const emptyXxx = { ... }` vicino alle altre.
- componente `function XxxModule({ onError }) {...}` (imita `SponsorsModule`/`ShopModule`): `useState`, `load()` con `api('/admin/xxx')`, `useEffect(()=>{load()},[])`, `save` (POST/PUT), `remove` (DELETE), form con `<Field .../>`.
- registra in `items`: `['xxx', 'Label FR', IconLucide, ['SuperAdmin','ClubAdmin']]` (importa l'icona da lucide-react).
- render: `{section === 'xxx' && <XxxModule onError={setError}/>}`.

## 7. API client pubblica (se serve)
In `frontend/src/lib/api.js` aggiungi a `publicApi`: `getXxx: (signal) => request('/xxx', signal)`.

## 8. Verifica (parità CI)
- `dotnet build backend/src/JSO.Api/JSO.Api.csproj -c Release` → 0 errori.
- da `frontend/`: `npm run build` e `npm run lint` → verdi.
- migration applicabile: `dotnet ef database update` su DB pulito.
- smoke test: login admin → POST crea → GET lista → (pubblico se presente) → rotta admin anonima = 401.

Testi UI in francese. Nessun import inutilizzato.
