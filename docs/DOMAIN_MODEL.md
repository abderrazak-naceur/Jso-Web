# Jso-Web — Domain & Functional Model

## Core aggregates

### User
- `id`
- `email`
- `displayName`
- `role`
- `status`
- `createdAt`

### InterviewSession
- `id`
- `userId`
- `jobTitle`
- `seniority`
- `interviewType`
- `jobDescription`
- `status`
- `startedAt`
- `completedAt`
- `overallScore`

### InterviewQuestion
- `id`
- `sessionId`
- `sequence`
- `category`
- `text`
- `difficulty`
- `createdAt`

### CandidateAnswer
- `id`
- `questionId`
- `text`
- `transcript`
- `durationSeconds`
- `submittedAt`

### Evaluation
- `id`
- `answerId`
- `overallScore`
- `technicalScore`
- `communicationScore`
- `structureScore`
- `relevanceScore`
- `strengths`
- `improvements`
- `suggestedAnswer`
- `model`
- `promptVersion`

### UsageRecord
- `id`
- `userId`
- `sessionId`
- `provider`
- `model`
- `inputTokens`
- `outputTokens`
- `estimatedCost`
- `createdAt`

## Relationships

```text
User 1 --- N InterviewSession
InterviewSession 1 --- N InterviewQuestion
InterviewQuestion 1 --- N CandidateAnswer
CandidateAnswer 1 --- 1 Evaluation
User 1 --- N UsageRecord
InterviewSession 1 --- N UsageRecord
```

## Interview lifecycle

```text
Draft -> Active -> Completed
           |
           +-> Abandoned
```

Rules:
- A session can only receive answers while `Active`.
- A completed session is immutable from the candidate UI.
- Each submitted answer is linked to exactly one question.
- Evaluation may be asynchronous but must preserve answer/question/session correlation.
- Usage is recorded per AI operation for quota and observability.

## API boundary proposal

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh

POST   /api/interviews
GET    /api/interviews/{id}
POST   /api/interviews/{id}/start
POST   /api/interviews/{id}/answers
POST   /api/interviews/{id}/complete
GET    /api/interviews

GET    /api/dashboard
GET    /api/usage

GET    /api/plans
POST   /api/subscription/checkout
GET    /api/subscription
```

## Error contract

Recommended consistent API response:

```json
{
  "code": "INTERVIEW_NOT_ACTIVE",
  "message": "The interview session is not active.",
  "traceId": "...",
  "details": []
}
```

Client behavior should map known business error codes to actionable UI messages while avoiding exposure of internal exception details.
