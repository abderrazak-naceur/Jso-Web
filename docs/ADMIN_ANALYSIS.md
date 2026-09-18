# JSO — Admin Technical & Functional Analysis

## Current status
`docs/ADMIN_PANEL.md` defines the back office in detail, but the verified repository snapshot does not contain the actual Admin UI/backend implementation.

## Modules
1. Dashboard.
2. Club Settings.
3. Team & Player Management.
4. Match Management.
5. News CMS.
6. Media Library.
7. Homepage Builder.
8. Menu & Footer.
9. Community Moderation.
10. User Management.
11. Shop Management.
12. Analytics.
13. Audit Log.
14. Provider/Data Integration monitoring.

## RBAC
Target roles include:
- Super Admin.
- Club Admin.
- Sport Editor.
- Content Editor.
- Moderator.
- Analyst.

Authorization must be enforced server-side; hiding menu items in React is not a security control.

## Admin UX requirements
- Responsive sidebar.
- Header/profile/notifications.
- Breadcrumbs.
- Search/filter/sort/pagination.
- Reusable forms.
- Toasts and confirmations.
- Permission states.
- Loading/empty/error states.

## Security requirements
- Secure authentication.
- Password hashing.
- Session/refresh-token strategy.
- Logout/revocation.
- Password recovery.
- Rate limiting.
- Least privilege.
- Audit log.
- Secrets outside frontend.

## MVP scope
Implement first:
- Login.
- RBAC.
- Dashboard.
- Teams.
- Players.
- Matches.
- News.
- Initial media library.

Defer:
- Shop.
- Advanced analytics.
- Complex homepage builder.
- Advanced community tooling.
- Ticketing.

## Admin conclusion
Admin is a major functional milestone and should be implemented immediately after the backend/data foundation, rather than treated as a late optional feature.
