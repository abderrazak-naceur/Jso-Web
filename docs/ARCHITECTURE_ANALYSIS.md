# JSO — Architecture Analysis

## Target
Architettura prevista:
```
React Web ───────┐
React Admin ─────┼── ASP.NET Core .NET 10 API ── EF Core ── SQL Server
React Native ────┘
                         │
                    Media/Storage
                         │
                 Notifications/Jobs
```

## Frontend
React + Vite + Tailwind CSS. La struttura futura dovrebbe separare:
- public pages;
- admin pages;
- shared UI;
- API/data layer;
- auth/session;
- domain-oriented features.

## Backend
Separazione raccomandata:
- Domain: entities/rules.
- Application: use cases, DTO, validation.
- Infrastructure: EF Core, SQL Server, external providers, storage.
- API: controllers/endpoints, auth, middleware.

## Data domains
- Club/Season/Competition.
- Team/Player/Staff.
- Match/MatchEvent.
- Article/Category/Tag.
- MediaAsset/Gallery.
- User/Post/Comment/Reaction/Report/Notification.
- AdminUser/Role/Permission/AuditLog/FeatureFlag.

## Integration boundaries
- Sport provider adapter.
- Media/object storage.
- Push notification provider.
- Payment provider, only when shop/ticketing is activated.

## Deployment target
Docker first for reproducibility. Cloud provider can host the same containerized architecture. Production topology should separate application and database when traffic/reliability requirements justify it.

## Architectural risks
- Defining entities without clear API contracts.
- Coupling frontend directly to provider data.
- Mixing admin authorization into UI-only checks.
- Storing secrets in frontend or database in plaintext.
- Introducing shop/payment before core security and audit are stable.

## Decision sequence
1. API contracts.
2. Domain/data model.
3. Authentication/RBAC.
4. Admin MVP.
5. Public API integration.
6. Mobile API consumption.
7. External integrations.
8. Production scaling.
