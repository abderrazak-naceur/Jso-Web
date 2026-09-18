# JSO — Implementation Gap Analysis

## Summary
The documentation describes a significantly larger platform than the current codebase. The repository is currently centered on the public visual frontend.

| Area | Planned | Verified implementation | Gap |
|---|---|---|---|
| Public Web | Yes | Partial/visual MVP | High |
| Backend API | Yes | Not present | Critical |
| SQL Server/EF Core | Yes | Not present | Critical |
| Admin | Yes | Documentation only | Critical |
| Authentication/RBAC | Yes | Not present | Critical |
| Match Center | Yes | Demo/preview | High |
| News CMS | Yes | Demo content | High |
| Media Library | Yes | Placeholder | High |
| Community | Yes | Not present | High |
| Mobile | Yes | Not present | High |
| Shop | Yes | Placeholder | Medium |
| Docker/CI/CD | Yes | Not present in verified snapshot | High |
| Cloud production | Yes | Not present | High |
| Audit/Analytics | Yes | Not present | Medium/High |

## Main gaps
### Critical
- Backend foundation.
- Database.
- Authentication/RBAC.
- Admin MVP.

### High
- Real API integration.
- Real match/news/media data.
- Deployment pipeline.
- Security CI.
- Mobile project.

### Later
- Community.
- Shop.
- Ticketing.
- Advanced analytics.

## Dependency order
```
Backend + DB
   ↓
Auth/RBAC
   ↓
Admin MVP
   ↓
Public API integration
   ↓
Mobile
   ↓
Community / Commercial
```

## Conclusion
The largest gap is implementation, not product definition. The planning and admin specification are substantially ahead of the executable application.
