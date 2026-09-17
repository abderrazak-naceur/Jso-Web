# Jso-Web — User Stories & Acceptance Criteria

## Epic 1 — Account & Fan Onboarding

### US-001 — Registrazione
**As a** tifoso
**I want** creare un account
**So that** posso salvare squadre, preferenze e attività.

**Acceptance Criteria**
- Email obbligatoria e validata.
- Account duplicato gestito con messaggio chiaro.
- Dopo registrazione l'utente può completare il profilo.

### US-002 — Selezione squadre
**As a** tifoso
**I want** scegliere le mie squadre preferite
**So that** la piattaforma possa personalizzare la mia esperienza.

**Acceptance Criteria**
- Posso cercare una squadra.
- Posso aggiungere/rimuovere una squadra.
- Le squadre selezionate sono persistite.
- La home usa le preferenze salvate.

## Epic 2 — Match Center

### US-003 — Partite delle mie squadre
**As a** tifoso
**I want** vedere le partite delle squadre che seguo
**So that** posso sapere quando e contro chi giocano.

**Acceptance Criteria**
- Lista ordinata per data.
- Stato partita visibile.
- Filtri per squadra e periodo.

### US-004 — Dettaglio partita
**As a** tifoso
**I want** aprire il dettaglio di una partita
**So that** posso vedere tutte le informazioni disponibili.

**Acceptance Criteria**
- Squadre, data e orario visibili.
- Stato match visibile.
- Eventi disponibili mostrati in ordine temporale.
- Area community associata alla partita disponibile quando prevista.

### US-005 — Live match
**As a** tifoso
**I want** ricevere aggiornamenti live
**So that** posso seguire la partita anche quando non la sto guardando.

**Acceptance Criteria**
- Gli eventi arrivano dal provider sportivo.
- Gli eventi sono ordinati per timestamp.
- In caso di errore provider, la UI non perde lo stato precedente.

## Epic 3 — Fan Community

### US-006 — Feed personalizzato
**As a** tifoso
**I want** vedere post relativi alle mie squadre
**So that** posso entrare subito nelle conversazioni che mi interessano.

**Acceptance Criteria**
- Feed paginato.
- Priorità ai contenuti delle squadre seguite.
- Loading, empty state ed error state presenti.

### US-007 — Creazione post
**As a** tifoso autenticato
**I want** pubblicare un post
**So that** posso condividere opinioni e contenuti.

**Acceptance Criteria**
- Testo obbligatorio.
- Limite caratteri configurabile.
- Conferma pubblicazione.
- Gestione errori e retry.

### US-008 — Reaction
**As a** tifoso
**I want** reagire a un post
**So that** posso esprimere rapidamente il mio punto di vista.

**Acceptance Criteria**
- Reaction aggiunta/rimossa.
- Conteggio aggiornato.
- Nessun doppio conteggio per la stessa reaction.

### US-009 — Commenti
**As a** tifoso
**I want** commentare un post
**So that** posso partecipare alla discussione.

**Acceptance Criteria**
- Commento validato.
- Commento visibile dopo pubblicazione.
- L'autore può gestire il proprio commento secondo i permessi.

## Epic 4 — Profilo & Personalizzazione

### US-010 — Fan profile
**As a** tifoso
**I want** avere un profilo
**So that** gli altri utenti possano riconoscere la mia identità nella community.

**Acceptance Criteria**
- Nome/avatar configurabili.
- Squadre preferite visibili secondo privacy settings.
- Conteggio attività disponibile.

### US-011 — Notifications
**As a** tifoso
**I want** ricevere notifiche
**So that** non perdo partite o interazioni importanti.

**Acceptance Criteria**
- Preferenze notifiche configurabili.
- Notifica per eventi rilevanti delle squadre seguite.
- Notifica per interazioni sui propri contenuti.

## Epic 5 — Trust & Safety

### US-012 — Segnalazione contenuto
**As a** utente
**I want** segnalare un contenuto
**So that** la community possa essere moderata.

**Acceptance Criteria**
- Motivo segnalazione richiesto.
- Segnalazione persistita.
- Conferma invio.

### US-013 — Moderazione admin
**As a** moderatore
**I want** vedere e gestire le segnalazioni
**So that** posso applicare le policy della community.

**Acceptance Criteria**
- Coda segnalazioni.
- Stato della segnalazione.
- Azioni di moderazione auditabili.

## Epic 6 — Discovery

### US-014 — Ricerca
**As a** tifoso
**I want** cercare squadre e contenuti
**So that** posso scoprire rapidamente ciò che mi interessa.

**Acceptance Criteria**
- Ricerca squadre.
- Ricerca contenuti indicizzati.
- Risultati ordinati e paginati.

## MVP Scope

### Must Have
US-001, US-002, US-003, US-004, US-006, US-007, US-008, US-009.

### Should Have
US-005, US-010, US-011, US-012.

### Later
US-013, US-014 e funzionalità premium/partner.

## Definition of Done

- Acceptance Criteria verificati.
- Lint e build completati.
- Test per la logica critica.
- Loading/error/empty states gestiti.
- Nessun secret hardcoded.
- Documentazione aggiornata.
