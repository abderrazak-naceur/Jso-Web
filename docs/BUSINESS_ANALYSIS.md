# Jso-Web — Business & Functional Analysis

## 1. Executive Summary

Jso-Web è una piattaforma digitale **per tifosi**. L'obiettivo è offrire un punto unico in cui un supporter possa seguire le proprie squadre, consultare le partite, ricevere aggiornamenti e partecipare alla community.

Il prodotto non è una semplice pagina di risultati: il valore principale è la combinazione di **personalizzazione + match experience + community**.

## 2. Visione di Business

**Vision:** diventare la casa digitale del tifoso durante tutta la settimana e soprattutto nei giorni di partita.

### Obiettivi

1. Aumentare il tempo e la frequenza di permanenza dei tifosi.
2. Personalizzare l'esperienza in base alle squadre seguite.
3. Centralizzare le informazioni sulle partite.
4. Creare una community attiva attorno ai club.
5. Costruire una base per funzionalità premium e partnership future.

## 3. Target Users

### Persona A — Supporter abituale
Segue una o più squadre ogni settimana e vuole avere in un solo posto partite, aggiornamenti e community.

### Persona B — Super fan
Vuole maggiore personalizzazione, statistiche, notifiche e cronologia dell'attività.

### Persona C — Fan occasionale
Entra principalmente in occasione di partite importanti e vuole trovare subito stato della partita, contenuti e commenti.

### Persona D — Creator / Community contributor
Pubblica opinioni, post e contenuti per gli altri tifosi.

## 4. Value Proposition

Il flusso principale del prodotto è:

```text
Scegli le squadre
      ↓
Home personalizzata
      ↓
Partite + aggiornamenti
      ↓
Community e contenuti
      ↓
Reazioni / commenti / post
      ↓
Notifiche e ritorno sulla piattaforma
```

## 5. Core Product Areas

### 5.1 My Teams
L'utente seleziona le squadre preferite e riceve un'esperienza personalizzata.

### 5.2 Match Center
Pagina dedicata alle partite con stato, orario, squadre, eventi e aggiornamenti live quando disponibili.

### 5.3 Fan Feed
Feed di post e contenuti pubblicati dagli utenti e, in futuro, da fonti editoriali o partner.

### 5.4 Community
Commenti, reaction, discussioni e interazione tra tifosi.

### 5.5 Fan Profile
Profilo personale con squadre preferite, attività, badge e storico sociale.

### 5.6 Notifications
Alert su inizio partita, risultato, eventi e nuovi contenuti delle squadre seguite.

## 6. Business Model — Future Ready

Il primo MVP può essere gratuito. Sono possibili in seguito:

- Premium fan features.
- Sponsorizzazioni e advertising.
- Partnership con club e media.
- Affiliate / merchandise.
- Funzionalità B2B per club o community ufficiali.

Questi modelli sono opportunità future e non devono bloccare il rilascio del primo MVP.

## 7. Main Functional Flows

### Flow 1 — Onboarding

1. L'utente apre la piattaforma.
2. Crea account oppure entra come guest, se previsto.
3. Seleziona le squadre preferite.
4. Sceglie le notifiche.
5. Accede alla home personalizzata.

### Flow 2 — Follow a Team

1. L'utente apre la sezione Squadre.
2. Cerca una squadra.
3. Apre il profilo squadra.
4. Seleziona “Segui”.
5. La squadra entra in My Teams.
6. Match e aggiornamenti della squadra entrano nel feed personalizzato.

### Flow 3 — Match Experience

1. L'utente apre il Match Center.
2. Visualizza la partita.
3. Consulta stato e dettagli.
4. Legge gli aggiornamenti.
5. Interagisce con la community associata alla partita.

### Flow 4 — Community Post

1. L'utente apre il feed.
2. Scrive un post.
3. Pubblica.
4. Altri utenti possono reagire e commentare.
5. Il sistema registra l'attività nel profilo.

## 8. Functional Requirements

### FR-001 Account
Registrazione, login e logout quando l'account è abilitato.

### FR-002 Fan Profile
Gestione del profilo tifoso e delle squadre preferite.

### FR-003 Team Search
Ricerca e consultazione delle squadre disponibili.

### FR-004 Follow Team
Segui/non seguire una squadra.

### FR-005 Personalized Home
La home deve mostrare contenuti rilevanti per le squadre seguite.

### FR-006 Match List
Visualizzazione delle partite per giornata/data/stato.

### FR-007 Match Detail
Dettaglio della partita con squadre, orario, stato e dati disponibili.

### FR-008 Live Events
Visualizzazione di eventi live quando il provider sportivo li rende disponibili.

### FR-009 Fan Feed
Visualizzazione paginata dei post della community.

### FR-010 Create Post
L'utente autenticato può creare un post.

### FR-011 Reactions
L'utente può reagire a un post.

### FR-012 Comments
L'utente può commentare un post.

### FR-013 Notifications
L'utente può ricevere notifiche relative alle squadre seguite e alle interazioni.

### FR-014 Moderation
I contenuti devono poter essere segnalati e moderati.

## 9. Non Functional Requirements

### NFR-001 Performance
La home e il match center devono essere percepiti come rapidi anche con feed e dati dinamici.

### NFR-002 Mobile First
La principale esperienza deve funzionare bene su smartphone.

### NFR-003 Scalability
Il sistema deve permettere di aggiungere nuove competizioni, squadre e provider senza cambiare il frontend di dominio.

### NFR-004 Security
Autorizzazione server-side, validazione input, rate limiting per azioni sociali e protezione dei dati utente.

### NFR-005 Moderation
Spam, abuso, report e blocco contenuti devono essere gestibili lato backend.

## 10. MVP Scope

### Must Have

- Landing/home pubblica.
- Account base.
- Selezione squadre preferite.
- Home personalizzata.
- Match Center.
- Match Detail.
- Fan Feed.
- Creazione post.
- Reaction.
- Commenti.

### Should Have

- Notifiche.
- Ricerca squadre.
- Profilo tifoso.
- Segnalazione contenuti.

### Later

- Video/live media.
- Ticketing.
- Merchandise.
- Premium membership.
- Official club tools.
- Advanced statistics.

## 11. Business Rules

### BR-001
Una squadra seguita deve essere associata al profilo del tifoso.

### BR-002
La home personalizzata deve dare priorità ai contenuti delle squadre seguite.

### BR-003
Solo utenti autorizzati possono creare contenuti social.

### BR-004
Il backend deve validare ownership e permessi prima di modificare post, commenti o profilo.

### BR-005
Un contenuto segnalato deve entrare in un workflow di moderazione.

### BR-006
I dati delle partite devono arrivare da un provider/API e non essere hardcoded nel frontend.

## 12. KPI di Prodotto

- utenti attivi giornalieri e mensili
- squadre seguite per utente
- match detail views
- sessioni durante le partite
- post per utente
- commenti/reaction per sessione
- retention 7/30 giorni
- notifiche aperte
- percentuale utenti che seguono almeno una squadra

## 13. Acceptance Criteria — MVP

### AC-001 Team Selection
**Given** un nuovo utente
**When** seleziona una o più squadre
**Then** la home deve utilizzare queste squadre per personalizzare i contenuti.

### AC-002 Match Center
**Given** una squadra seguita
**When** l'utente apre il Match Center
**Then** deve poter vedere le partite rilevanti della squadra.

### AC-003 Community Post
**Given** un utente autenticato
**When** pubblica un post valido
**Then** il post deve apparire nel feed e risultare associato al suo profilo.

### AC-004 Reaction
**Given** un post esistente
**When** l'utente seleziona una reaction
**Then** il contatore deve aggiornarsi senza creare duplicazioni per la stessa reaction.

### AC-005 Moderation
**Given** un contenuto segnalato
**When** la segnalazione viene inviata
**Then** il contenuto deve risultare disponibile per il workflow di moderazione.

## 14. Target Architecture

```text
React + Vite
      ↓
Feature-based Frontend
      ↓
ASP.NET Core .NET 10 API
      ↓
Application / Domain
      ↓
SQL Server
      ↓
Sports Data Provider
Notifications / Media / Search
```

Il frontend non deve conoscere direttamente le credenziali dei provider esterni.
