# InterviewAI — Jso-Web

<p align="center">
  <img src="./src/assets/hero.png" alt="InterviewAI" width="720" />
</p>

<p align="center">
  <strong>AI-powered interview preparation platform</strong><br />
  Practice realistic interviews, capture answers, and receive structured feedback.
</p>

<p align="center">
  <a href="https://github.com/abderrazak-naceur/Jso-Web">Repository</a> ·
  <a href="./docs/BUSINESS_ANALYSIS.md">Business Analysis</a> ·
  <a href="./docs/USER_STORIES.md">User Stories</a> ·
  <a href="./docs/TECHNICAL_BACKLOG.md">Technical Backlog</a> ·
  <a href="./docs/ROADMAP.md">Roadmap</a>
</p>

## Overview

InterviewAI is being built as a web-first SaaS application for candidates who want to prepare for technical and behavioral interviews in a realistic way.

The product direction includes:

- AI mock interviews
- Technical and behavioral interview modes
- Answer capture and structured evaluation
- Personalized feedback and improvement areas
- Interview history and progress tracking
- Usage limits and subscription plans
- Future B2B capabilities for recruiters and training teams

## Current Status

The repository started as a minimal React + Vite application and is being progressively transformed into the InterviewAI product foundation.

Current frontend stack:

| Technology | Version / Role |
|---|---|
| React | 18.3.1 |
| Vite | 6.4.1 |
| React DOM | 18.3.1 |
| @vitejs/plugin-react | 4.3.4 |
| Oxlint | 1.81.0 |

Available scripts:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run preview
```

## Frontend MVP

The current UI provides the first visual direction for the product, including a modern landing page, product positioning, feature presentation, interview workflow sections, and an interview demo interaction.

The next frontend evolution is planned around a production-oriented structure with routing, reusable UI components, feature-based modules, API integration, authentication, loading/error states, and automated tests.

## Planned Architecture

```text
Jso-Web/
├── src/
│   ├── app/
│   │   ├── App.jsx
│   │   ├── router.jsx
│   │   └── providers/
│   ├── components/
│   │   └── ui/
│   ├── features/
│   │   ├── auth/
│   │   ├── interview/
│   │   ├── evaluation/
│   │   ├── dashboard/
│   │   └── billing/
│   ├── pages/
│   ├── services/
│   │   └── api/
│   ├── hooks/
│   ├── utils/
│   └── assets/
├── docs/
│   ├── ANALYSIS.md
│   ├── BUSINESS_ANALYSIS.md
│   ├── USER_STORIES.md
│   ├── TECHNICAL_BACKLOG.md
│   ├── DOMAIN_MODEL.md
│   └── ROADMAP.md
└── package.json
```

## Product Flow

```text
Landing Page
    ↓
Sign Up / Login
    ↓
Interview Setup
    ↓
AI Interview Session
    ↓
Answer Capture
    ↓
AI Evaluation
    ↓
Score + Feedback
    ↓
Progress Dashboard
```

## Documentation

The project documentation is maintained alongside the code:

- [Technical Analysis](./docs/ANALYSIS.md)
- [Business & Functional Analysis](./docs/BUSINESS_ANALYSIS.md)
- [User Stories & Acceptance Criteria](./docs/USER_STORIES.md)
- [Technical Backlog](./docs/TECHNICAL_BACKLOG.md)
- [Domain Model](./docs/DOMAIN_MODEL.md)
- [Product Roadmap](./docs/ROADMAP.md)

## Development Roadmap

The planned delivery sequence is:

1. Frontend/application foundation
2. ASP.NET Core .NET 10 backend foundation
3. Authentication and user management
4. Interview session engine
5. AI provider orchestration
6. Evaluation and dashboard
7. Usage metering and billing
8. Testing, security, CI/CD and beta readiness

## Local Development

Requirements:

- Node.js 22+
- npm 10+

Run the project:

```bash
git clone https://github.com/abderrazak-naceur/Jso-Web.git
cd Jso-Web
npm install
npm run dev
```

Then open the local URL shown by Vite, normally:

```text
http://localhost:5173
```

## Quality Checks

Before committing frontend changes:

```bash
npm run lint
npm run build
```

## Product Principles

- Realistic interview experience
- Useful, actionable feedback
- Clear separation between UI, domain logic and infrastructure
- Privacy and security by design
- Provider-agnostic AI integration
- Incremental delivery with testable features

## License

License to be defined.
