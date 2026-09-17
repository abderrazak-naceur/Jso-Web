# Jso-Web — User Stories & Acceptance Criteria

## Epic 1 — Account & Onboarding

### US-001 — Registrazione
**As a** candidato
**I want** creare un account con email e password
**So that** posso salvare colloqui, progressi e risultati.

**Acceptance Criteria**
- Email obbligatoria e validata.
- Password con policy configurabile.
- Email già registrata gestita con messaggio chiaro.
- Dopo registrazione l'utente viene autenticato.

### US-002 — Login
**As a** utente registrato
**I want** effettuare il login
**So that** posso accedere alla mia area personale.

**Acceptance Criteria**
- Credenziali corrette consentono l'accesso.
- Credenziali errate mostrano un errore non sensibile.
- Sessione persistente secondo la policy di sicurezza.
- Logout invalida la sessione.

## Epic 2 — Interview Setup

### US-003 — Creazione colloquio
**As a** candidato
**I want** configurare un colloquio
**So that** posso allenarmi rispetto a un ruolo specifico.

**Acceptance Criteria**
- Posso indicare job title.
- Posso indicare seniority.
- Posso scegliere tecnologia/skill.
- Posso scegliere tipologia: technical, behavioral, mixed.
- Posso avviare una sessione salvata.

### US-004 — Import job description
**As a** candidato
**I want** inserire o incollare la job description
**So that** l'AI personalizza le domande.

**Acceptance Criteria**
- Supporto testo incollato.
- Validazione lunghezza minima/massima.
- Estrazione di skill e keyword principali.
- Le keyword possono essere mostrate all'utente prima dell'avvio.

## Epic 3 — AI Interview

### US-005 — Domande adattive
**As a** candidato
**I want** ricevere domande generate in base al profilo e alle risposte
**So that** la simulazione sia pertinente.

**Acceptance Criteria**
- Il sistema genera una domanda iniziale coerente con il setup.
- Ogni risposta può influenzare la domanda successiva.
- Il sistema mantiene il contesto della sessione.
- Errori del provider AI sono gestiti senza perdere la sessione.

### US-006 — Risposta vocale
**As a** candidato
**I want** rispondere tramite microfono
**So that** posso allenare anche la comunicazione orale.

**Acceptance Criteria**
- Richiesta esplicita del permesso microfono.
- Start/stop registrazione.
- Stato recording visibile.
- Trascrizione disponibile prima dell'invio quando tecnicamente possibile.

### US-007 — Risposta testuale
**As a** candidato
**I want** rispondere anche tramite testo
**So that** posso usare il prodotto senza microfono.

**Acceptance Criteria**
- Campo testo con limite configurabile.
- Invio con pulsante e scorciatoia tastiera.
- Possibilità di correggere la risposta prima dell'invio.

## Epic 4 — Evaluation

### US-008 — Feedback immediato
**As a** candidato
**I want** ricevere feedback sulla mia risposta
**So that** posso capire cosa migliorare.

**Acceptance Criteria**
- Valutazione per criteri configurabili.
- Evidenza di punti forti.
- Evidenza di aree di miglioramento.
- Suggerimento di una risposta più efficace, quando previsto dal piano.
- Il feedback è collegato alla domanda e alla risposta.

### US-009 — Score sessione
**As a** candidato
**I want** vedere un riepilogo finale
**So that** posso misurare la mia performance.

**Acceptance Criteria**
- Score aggregato.
- Breakdown per categoria.
- Elenco delle domande affrontate.
- Feedback finale sintetico.
- Sessione salvata nello storico.

## Epic 5 — Dashboard & Progress

### US-010 — Storico colloqui
**As a** candidato
**I want** vedere lo storico delle sessioni
**So that** posso confrontare le mie performance.

**Acceptance Criteria**
- Lista sessioni ordinata per data.
- Stato sessione.
- Ruolo/skill principali.
- Accesso al dettaglio.

### US-011 — Progress tracking
**As a** candidato
**I want** monitorare i miei progressi
**So that** posso individuare trend e aree deboli.

**Acceptance Criteria**
- Evoluzione dello score nel tempo.
- Breakdown per skill.
- Indicazione delle aree deboli ricorrenti.

## Epic 6 — Subscription

### US-012 — Piano utente
**As a** candidato
**I want** vedere il mio piano e il consumo
**So that** posso capire cosa posso ancora utilizzare.

**Acceptance Criteria**
- Piano corrente visibile.
- Utilizzo mensile visibile.
- Limiti mostrati prima di avviare feature soggette a quota.
- Upgrade disponibile dal prodotto.

## Epic 7 — Administration

### US-013 — Gestione configurazioni
**As a** admin
**I want** configurare provider, limiti e prompt versionati
**So that** posso governare il comportamento della piattaforma.

**Acceptance Criteria**
- Provider attivo configurabile senza deploy quando previsto.
- Limiti e feature flags configurabili.
- Prompt versionati e tracciabili.
- Azioni amministrative auditabili.

## Epic 8 — Reliability & Security

### US-014 — Privacy sessione
**As a** utente
**I want** sapere come vengono gestiti audio, trascrizioni e risposte
**So that** posso usare il servizio consapevolmente.

**Acceptance Criteria**
- Informativa privacy accessibile.
- Consenso esplicito dove richiesto.
- Retention configurabile.
- Eliminazione sessione secondo policy.

## MVP Scope

### Must Have
US-001, US-002, US-003, US-004, US-005, US-007, US-008, US-009, US-010.

### Should Have
US-006, US-011, US-012.

### Later
US-013, US-014 e funzionalità enterprise avanzate.

## Definition of Done
- Acceptance Criteria verificati.
- Lint/build completati.
- Test automatici presenti per la logica critica.
- Gestione loading/error/empty states.
- Documentazione aggiornata.
- Nessun secret hardcoded.
