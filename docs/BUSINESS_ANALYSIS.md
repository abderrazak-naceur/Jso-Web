# Jso-Web — Business Analysis

## 1. Executive Summary

Jso-Web è attualmente un frontend starter React/Vite. L'obiettivo di prodotto definito in questa fase è evolvere il repository in una piattaforma **Interview AI** web-first per supportare candidati e professionisti nella preparazione e simulazione di colloqui di lavoro.

La piattaforma deve combinare simulazione del colloquio, analisi delle risposte, feedback AI, storico delle sessioni e percorsi personalizzati di miglioramento.

Il repository attuale non contiene ancora funzionalità di dominio: la codebase è una base tecnica da trasformare in un prodotto applicativo. fileciteturn9file0L2-L2

## 2. Visione di Business

**Vision:** diventare un assistente digitale per la preparazione ai colloqui, capace di simulare intervistatori, analizzare le risposte e trasformare ogni sessione in un piano di miglioramento misurabile.

### Obiettivi business

1. Aumentare la qualità della preparazione ai colloqui.
2. Ridurre il tempo necessario per esercitarsi.
3. Fornire feedback strutturato e comprensibile.
4. Creare uno storico dei progressi.
5. Supportare diversi profili professionali, seniority e tipologie di colloquio.
6. Preparare un modello SaaS con funzionalità Free e Premium.

## 3. Target Users

### Persona A — Job Seeker

Candidato che deve prepararsi a un colloquio imminente e vuole esercitarsi rapidamente.

**Bisogni:**
- simulazione realistica
- domande pertinenti al ruolo
- feedback immediato
- suggerimenti pratici

### Persona B — Experienced Professional

Professionista con esperienza che vuole migliorare comunicazione, struttura delle risposte e preparazione tecnica.

**Bisogni:**
- scenari avanzati
- personalizzazione per ruolo
- analisi comparativa tra sessioni
- storico dei risultati

### Persona C — Student / Junior

Utente con poca esperienza di colloqui.

**Bisogni:**
- onboarding guidato
- domande semplici e progressive
- spiegazione degli errori
- percorso formativo

## 4. Value Proposition

La piattaforma deve offrire in un unico flusso:

**Profile → Job/CV Context → Interview Simulation → AI Analysis → Feedback → Improvement Plan**

Il valore non è solo generare domande, ma chiudere il ciclo di apprendimento dopo il colloquio.

## 5. Business Model

### Free

- account base
- numero limitato di simulazioni
- feedback sintetico
- accesso a un numero limitato di scenari

### Premium

- simulazioni estese
- analisi completa delle risposte
- personalizzazione tramite CV e job description
- storico completo
- report dettagliati
- coaching e suggerimenti avanzati

### Possibile futuro B2B

- licenze per career center
- università
- bootcamp
- HR / recruiting
- programmi di outplacement

## 6. Core Business Flows

### Flow 1 — Onboarding

1. Utente apre la piattaforma.
2. Creazione account/login.
3. Selezione ruolo professionale.
4. Inserimento seniority.
5. Upload/import CV opzionale.
6. Inserimento job description opzionale.
7. Configurazione preferenze colloquio.
8. Accesso dashboard.

### Flow 2 — Start Interview

1. Utente sceglie il tipo di colloquio.
2. Seleziona ruolo e seniority.
3. Seleziona difficoltà.
4. Avvia sessione.
5. AI pone una domanda.
6. Utente risponde tramite testo o voce.
7. Sistema salva la risposta.
8. AI analizza la risposta.
9. Sistema presenta feedback.
10. Passaggio alla domanda successiva.
11. Conclusione sessione.
12. Generazione report finale.

### Flow 3 — Review

1. Utente apre una sessione precedente.
2. Visualizza domande e risposte.
3. Visualizza feedback AI.
4. Visualizza aree di miglioramento.
5. Visualizza score e trend.
6. Avvia nuova simulazione mirata.

## 7. Functional Requirements

### FR-001 Authentication

Il sistema deve permettere registrazione, login, logout e gestione sessione utente.

### FR-002 User Profile

L'utente deve poter gestire ruolo, seniority, competenze e preferenze.

### FR-003 CV Management

L'utente deve poter caricare un CV e associarlo alle sessioni di colloquio.

### FR-004 Job Description

L'utente deve poter inserire una job description per generare simulazioni contestualizzate.

### FR-005 Interview Configuration

La piattaforma deve permettere di configurare:
- tipo di colloquio
- ruolo
- seniority
- difficoltà
- numero domande
- lingua
- modalità risposta

### FR-006 Interview Session

Il sistema deve creare e gestire una sessione con stato, timestamp, domande e risposte.

### FR-007 AI Question Generation

Il sistema deve generare domande coerenti con il profilo e il contesto del colloquio.

### FR-008 Answer Capture

Il sistema deve supportare almeno risposta testuale. La risposta vocale può essere introdotta come estensione del MVP.

### FR-009 AI Answer Analysis

Il sistema deve analizzare ogni risposta secondo criteri configurabili.

Criteri iniziali:
- relevance
- structure
- clarity
- technical accuracy
- completeness
- communication

### FR-010 Feedback

Il sistema deve restituire feedback leggibile, punti di forza, criticità e suggerimenti di miglioramento.

### FR-011 Final Report

Alla fine della sessione il sistema deve produrre un report riepilogativo.

### FR-012 History

L'utente deve poter visualizzare lo storico delle sessioni.

### FR-013 Progress Tracking

Il sistema deve mostrare l'evoluzione dei risultati nel tempo.

### FR-014 Subscription

Il sistema deve distinguere le funzionalità disponibili in base al piano utente.

## 8. Non Functional Requirements

### NFR-001 Performance

La UI deve mantenere una navigazione fluida e ridurre al minimo i tempi percepiti durante l'interazione con l'AI.

### NFR-002 Security

- autenticazione sicura
- autorizzazione server-side
- protezione dei dati utente
- secret esclusivamente tramite environment/configuration
- nessuna API key AI nel frontend

### NFR-003 Scalability

Il design applicativo deve consentire l'aggiunta di nuovi provider AI senza modificare le feature UI.

### NFR-004 Observability

Errori, eventi tecnici e metriche principali devono essere osservabili lato backend.

## 9. Domain Model — Logical

Entità principali previste:

- User
- Subscription
- UserProfile
- Resume
- JobDescription
- InterviewTemplate
- InterviewSession
- InterviewQuestion
- InterviewAnswer
- AnswerAnalysis
- Feedback
- SessionReport
- UsageRecord

Relazioni principali:

`User → UserProfile`

`User → Subscription`

`User → Resume`

`User → InterviewSession`

`InterviewSession → InterviewQuestion[]`

`InterviewQuestion → InterviewAnswer`

`InterviewAnswer → AnswerAnalysis`

`InterviewSession → SessionReport`

## 10. Business Rules

### BR-001
Una sessione deve appartenere a un utente autenticato.

### BR-002
Una risposta deve appartenere a una domanda della sessione corrente.

### BR-003
Una sessione completata non deve perdere le risposte già registrate.

### BR-004
Le funzionalità Premium devono essere validate dal backend e non solo dalla UI.

### BR-005
Il sistema deve registrare l'utilizzo delle funzionalità soggette a quota.

### BR-006
Una job description può essere associata a più sessioni.

### BR-007
Un CV può essere riutilizzato in più sessioni, mantenendo la versione utilizzata nella sessione.

## 11. MVP Scope

### In scope

- Landing page
- Authentication
- Dashboard
- Profilo utente
- Creazione interview
- Configurazione colloquio
- Sessione domanda/risposta
- Analisi AI testuale
- Feedback
- Report finale
- Storico sessioni

### Out of scope iniziale

- video interview completa
- live avatar AI
- integrazione con recruiter
- marketplace coach
- B2B administration
- mobile native app

## 12. KPI di Prodotto

Metriche iniziali da monitorare:

- signup conversion
- interview started
- interview completion rate
- average sessions per user
- repeat usage
- free-to-paid conversion
- average session duration
- average analysis latency
- AI cost per session

## 13. Prioritized Business Backlog

### P0

- Definizione dominio
- UX principale
- Authentication
- Dashboard
- Interview setup
- Interview session
- AI question generation
- Answer analysis
- Final report

### P1

- Resume parsing
- Job description matching
- Session history
- Progress dashboard
- Subscription management

### P2

- Voice interview
- Advanced coaching
- Team/B2B features
- Integrations

## 14. Functional Acceptance Criteria — MVP

### AC-001 Interview Creation

**Given** un utente autenticato
**When** configura ruolo, seniority e tipo colloquio
**Then** il sistema deve creare una nuova sessione e mostrare la prima domanda.

### AC-002 Answer Submission

**Given** una domanda attiva
**When** l'utente invia una risposta
**Then** la risposta deve essere persistita e associata alla domanda corretta.

### AC-003 AI Feedback

**Given** una risposta valida
**When** l'analisi AI termina
**Then** il sistema deve mostrare valutazione, punti di forza, criticità e suggerimento.

### AC-004 Final Report

**Given** tutte le domande completate
**When** la sessione termina
**Then** il sistema deve creare un report finale consultabile.

### AC-005 History

**Given** un utente con sessioni concluse
**When** apre la cronologia
**Then** deve vedere le sessioni e poter aprire il relativo report.

## 15. Target Architecture

Il frontend attuale è React + Vite e contiene ancora una struttura starter senza routing, API layer, autenticazione o persistenza applicativa. fileciteturn9file0L2-L2

Target:

```text
React/Vite Frontend
        |
        v
ASP.NET Core .NET 10 API
        |
  Application Layer
        |
 Domain / Infrastructure
        |
 SQL Server
        |
 AI Provider Abstraction
   /        |        \
 OpenAI   Claude    Gemini
```

Il frontend deve comunicare esclusivamente con API applicative. Le credenziali dei provider AI devono rimanere lato backend.

## 16. Recommended Delivery Sequence

1. Business/domain baseline.
2. Frontend application shell.
3. Backend .NET 10 foundation.
4. Authentication and user profile.
5. Interview setup.
6. Interview session engine.
7. AI orchestration layer.
8. Feedback/reporting.
9. History/progress.
10. Subscription and quotas.
11. CI/CD, security and observability.

## 17. Current Repository Assessment

La base tecnica esistente è adatta per iniziare, ma il progetto è ancora allo stadio iniziale: il repository presenta una struttura minima Vite/React e l'`App.jsx` originale era ancora composto principalmente da contenuti demo dello starter. fileciteturn9file0L2-L2

La prossima fase deve quindi concentrarsi sulla trasformazione da starter frontend a **prodotto applicativo guidato dal dominio**.