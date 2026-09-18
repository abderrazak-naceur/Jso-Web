# JSO — Mobile Analysis

## Target
Android + iPhone using React Native + Expo, consuming the same ASP.NET Core API used by Web and Admin.

## Planned screens
- Home.
- Match Center.
- Match detail.
- News list/detail.
- Team.
- Player profile.
- Media.
- Club.
- Notifications.
- Shop when activated.
- User/community when activated.

## Shared backend
No separate backend is required for mobile.

```
Android ─┐
iPhone ──┼── JSO API ── SQL Server
Web ─────┤
Admin ───┘
```

## Notifications
Push notifications can cover:
- match reminders;
- results;
- important club news;
- announcements.

## Technical prerequisites
Before implementation:
1. Stable API contracts.
2. Authentication model.
3. Image/media URLs.
4. Pagination/filtering.
5. Error contract.
6. Notification strategy.
7. Environment configuration.

## Current gap
No React Native/Expo mobile project is present in the verified repository snapshot.

## Recommended sequence
Build API → stabilize contracts → build shared mobile design system → implement Android/iPhone → test on physical devices → prepare store releases.
