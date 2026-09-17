# Jso-Web — Domain Model

## Core Aggregates

### User
- `id`
- `email`
- `displayName`
- `avatarUrl`
- `status`
- `createdAt`

### Team
- `id`
- `externalId`
- `name`
- `shortName`
- `logoUrl`
- `country`
- `competitionId`
- `status`

### Competition
- `id`
- `externalId`
- `name`
- `country`
- `season`

### UserTeam
- `userId`
- `teamId`
- `createdAt`
- `notificationEnabled`

### Match
- `id`
- `externalId`
- `competitionId`
- `homeTeamId`
- `awayTeamId`
- `startAt`
- `status`
- `homeScore`
- `awayScore`
- `venue`

### MatchEvent
- `id`
- `matchId`
- `type`
- `minute`
- `teamId`
- `playerName`
- `description`
- `createdAt`

### Post
- `id`
- `authorId`
- `teamId`
- `matchId`
- `content`
- `status`
- `createdAt`
- `updatedAt`

### Comment
- `id`
- `postId`
- `authorId`
- `content`
- `status`
- `createdAt`

### Reaction
- `id`
- `postId`
- `userId`
- `type`
- `createdAt`

### Notification
- `id`
- `userId`
- `type`
- `title`
- `message`
- `entityType`
- `entityId`
- `readAt`
- `createdAt`

### Report
- `id`
- `reporterId`
- `targetType`
- `targetId`
- `reason`
- `status`
- `createdAt`
- `resolvedAt`

## Relationships

```text
User 1 --- N UserTeam N --- 1 Team
Competition 1 --- N Team
Competition 1 --- N Match
Team 1 --- N Match (home)
Team 1 --- N Match (away)
Match 1 --- N MatchEvent
User 1 --- N Post
Team 1 --- N Post
Match 1 --- N Post
Post 1 --- N Comment
Post 1 --- N Reaction
User 1 --- N Comment
User 1 --- N Reaction
User 1 --- N Notification
User 1 --- N Report
```

## Match Lifecycle

```text
Scheduled → Live → Finished
              |
              +→ Postponed
              +→ Cancelled
```

## Post Lifecycle

```text
Draft → Published → Hidden
              |
              +→ Reported → Moderation → Published / Hidden
```

## API Boundary Proposal

```text
GET    /api/teams
GET    /api/teams/{id}
POST   /api/teams/{id}/follow
DELETE /api/teams/{id}/follow
GET    /api/me/teams

GET    /api/matches
GET    /api/matches/{id}
GET    /api/matches/{id}/events

GET    /api/feed
POST   /api/posts
GET    /api/posts/{id}
POST   /api/posts/{id}/comments
POST   /api/posts/{id}/reactions
DELETE /api/posts/{id}/reactions/me

GET    /api/notifications
POST   /api/notifications/{id}/read

GET    /api/users/{id}
GET    /api/reports
POST   /api/reports
```

## Key Domain Rules

- A user can follow a team only once.
- A reaction is unique per user/post/type according to the configured reaction model.
- Match data is owned by the sports-data integration boundary; the frontend never hardcodes live data.
- Social content belongs to a user and can optionally be associated with a team or match.
- Reported content can be hidden without deleting the original record.
- Notification delivery must be idempotent.
