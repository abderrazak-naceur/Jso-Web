# JSO Mobile — Piano Biglietteria Digitale QR

**Aggiornato:** 28 settembre 2026  
**Stato:** analisi completata; implementazione QR/check-in **non ancora eseguita**.

## Obiettivo

Trasformare la biglietteria mobile esistente da semplice prenotazione/pagamento a un vero **biglietto digitale verificabile all'ingresso dello stadio**.

Flusso target:

```text
Match
  -> Ticket type
  -> Reservation
  -> Payment (Flouci / Stripe)
  -> Payment webhook verificato
  -> Ticket Confirmed
  -> Digital Ticket + QR
  -> Scanner staff
  -> Server validation
  -> Check-in
```

La base esistente è già presente: `TicketOrder`, `TicketType`, prenotazione fan, `MyTicketsScreen`, pagamento online e completamento server-side. Il QR/check-in è il pezzo mancante.

## Cosa è già implementato

### Mobile Flutter

- `TicketsScreen`: mostra partita, tipi di biglietto, prezzo e disponibilità.
- Prenotazione autenticata con quantità 1..10.
- `MyTicketsScreen`: lista delle prenotazioni dell'utente.
- Stati fan-facing: En attente, Confirmé, Annulé.
- Repository `TicketsRepository` con:
  - `GET /api/tickets/match/{matchId}`
  - `GET /api/tickets/mine`
  - `POST /api/tickets/reserve`

### Backend

- `TicketType` con capacità e `SoldCount`.
- `TicketOrder` con match, tipo, quantità, importo e stato.
- Pagamento ticket tramite `POST /api/tickets/{id}/pay`.
- Flouci/Stripe con webhook verificato.
- Conferma server-side e incremento della capacità venduta.
- Admin per gestione tipi di biglietto e ordini.

## Cosa manca

Non risultano nel codice attuale:

- token pubblico/opaque del biglietto;
- QR generato dal mobile;
- schermata dettaglio biglietto digitale;
- endpoint dedicato alla validazione/check-in;
- scanner QR per lo staff;
- stato `CheckedIn` / evento di check-in;
- protezione contro il riutilizzo dello stesso biglietto;
- audit completo dell'ingresso.

## Identificatori consigliati

### Non mettere nel QR

Evitare di usare come codice di accesso direttamente:

- email del tifoso;
- nome del tifoso;
- JWT;
- dati personali;
- `FanUserId` come unico segreto;
- `TicketOrderId` come unico segreto.

Un GUID del database può essere un riferimento interno, ma **non deve essere considerato una credenziale**.

### Identificatore principale

Aggiungere al ticket un identificatore casuale e non prevedibile, per esempio:

- `PublicTicketToken`: 32 byte random, codificati Base64URL/hex;
- oppure un `TicketCode` corto per assistenza manuale, separato dal token QR.

Il server deve essere l'autorità: il QR presenta il token, l'API risolve il ticket e controlla stato, partita, scadenza e check-in.

### Metadati utili

Il record del biglietto può avere anche:

- `TicketOrderId` — riferimento interno all'ordine;
- `MatchId` — partita;
- `TicketTypeId` — categoria;
- `FanUserId` — proprietario interno;
- `PublicTicketToken` — segreto/identificatore per il QR;
- `Status` — Pending/Confirmed/Cancelled/CheckedIn;
- `IssuedAt`;
- `ExpiresAt` opzionale;
- `CheckedInAt`;
- `CheckedInBy`;
- `CheckInDeviceId` opzionale;
- `CheckInId` / evento di audit.

Questi ultimi identificatori **non devono necessariamente essere tutti dentro il QR**.

## Formato QR raccomandato

Per la prima versione consiglio un QR minimale:

```text
https://tickets.jso.tn/t/<opaque-ticket-token>
```

oppure un payload compatto:

```text
JSO1.<opaque-token>
```

Il token deve essere casuale, lungo abbastanza e non derivabile da `TicketOrderId`.

Il vantaggio è che il QR non espone dati personali e il server può revocare un ticket senza dover cambiare il QR.

### Variante per una futura modalità offline

Se in futuro lo scanner dovrà funzionare anche senza connessione, valutare un payload firmato:

```text
JSO1.<ticketId>.<matchId>.<expiresAt>.<nonce>.<signature>
```

La firma deve essere verificabile senza esporre segreti privati. Anche in questa modalità, il ritorno online deve sincronizzare il check-in per impedire il doppio ingresso.

**Non usare un JWT fan o un token di autenticazione come QR.**

## Stato del ticket

Stato consigliato:

```text
Pending
   |
   +--> Cancelled
   |
   +--> Confirmed
           |
           +--> CheckedIn
```

Regole:

- solo `Confirmed` può essere presentato all'ingresso;
- `Pending` non è valido;
- `Cancelled` non è valido;
- `CheckedIn` non può essere riutilizzato;
- il check-in deve essere atomico lato server.

## API target

### Fan

```http
GET /api/tickets/mine
GET /api/tickets/{id}
GET /api/tickets/{id}/digital
```

`digital` restituisce solo ciò che serve al ticket UI e al QR.

### Scanner/staff

```http
POST /api/admin/tickets/validate
POST /api/admin/tickets/{id}/check-in
GET  /api/admin/tickets/check-ins
```

La validazione deve verificare almeno:

1. token valido;
2. ticket esistente;
3. partita corretta;
4. ticket Confirmed;
5. eventuale finestra temporale;
6. non già utilizzato;
7. atomicità del check-in.

Per evitare race condition, il server deve fare la transizione `Confirmed -> CheckedIn` dentro una transazione/operazione condizionata.

## Audit

Ogni tentativo importante deve essere tracciabile:

- ticket;
- match;
- esito;
- timestamp;
- staff/operator ID;
- device/check-in station opzionale;
- motivo di rifiuto.

Esempi di eventi:

- `TICKET_ISSUED`
- `TICKET_VALIDATED`
- `TICKET_CHECKED_IN`
- `TICKET_ALREADY_USED`
- `TICKET_CANCELLED`
- `TICKET_INVALID`

## UX mobile target

```text
Mon compte
  -> Mes billets
      -> Ticket confirmé
          -> Voir le billet
              -> QR grande taille
              -> Match
              -> Date / heure
              -> Tribune
              -> Quantité
              -> Statut
              -> "Présentez ce QR à l'entrée"
```

Il deve essere possibile aumentare il QR a schermo intero e mantenere alta luminosità/contrasto.

## Scanner staff

La prima versione può essere una funzione separata dell'app Flutter riservata agli utenti staff/admin, oppure una pagina web admin se lo scanner web mobile risulta sufficiente.

Funzioni:

- scansione QR;
- feedback immediato Valid / Already used / Invalid / Cancelled / Wrong match;
- vibrazione/suono;
- dati minimi del ticket;
- storico degli ultimi check-in;
- fallback con codice manuale.

## Piano di implementazione

### TICKET-QR-001 — Contratto e modello dati

- aggiungere token pubblico casuale;
- definire stato `CheckedIn`;
- definire eventuale entità `TicketCheckIn` per audit;
- migration PostgreSQL;
- vincoli/indici unici sul token.

**Done quando:** schema e migration sono verificabili e non espongono PII nel QR.

### TICKET-QR-002 — Emissione ticket

- emettere il token solo quando il ticket diventa `Confirmed`;
- endpoint dettaglio ticket;
- impedire emissione per Pending/Cancelled;
- mantenere idempotenza.

**Done quando:** un ticket confermato possiede un identificatore QR stabile e non prevedibile.

### TICKET-QR-003 — Digital Ticket Flutter

- nuovo `TicketDetailScreen`;
- QR ad alta leggibilità;
- informazioni partita/biglietto;
- stato;
- gestione loading/error/empty;
- collegamento da `MyTicketsScreen`.

**Done quando:** un fan vede il proprio QR solo per ticket validi.

### TICKET-QR-004 — Validazione/check-in backend

- endpoint staff;
- lookup token;
- controlli stato/match;
- transizione atomica `Confirmed -> CheckedIn`;
- risposta strutturata per lo scanner;
- audit.

**Done quando:** lo stesso QR non può entrare due volte.

### TICKET-QR-005 — Scanner staff

- integrazione scanner QR;
- permesso camera;
- schermate esito;
- fallback codice manuale;
- storico locale/server degli ultimi check-in.

**Done quando:** lo staff può verificare un ticket in pochi secondi.

### TICKET-QR-006 — Sicurezza e anti-abuso

- token ad alta entropia;
- rate limiting;
- autorizzazione staff separata dai Fan;
- nessun JWT/PII nel QR;
- logging senza token completo;
- protezione replay/doppio check-in;
- audit.

**Done quando:** il QR non può essere usato come credenziale per accedere ad altri dati.

### TICKET-QR-007 — Test E2E

Scenario minimo:

```text
create ticket
 -> reserve
 -> pay
 -> webhook
 -> Confirmed
 -> QR generated
 -> scan
 -> CheckedIn
 -> second scan => AlreadyUsed
```

Aggiungere anche:

- pagamento fallito;
- ticket cancellato;
- QR inesistente;
- partita diversa;
- due scanner contemporanei;
- ticket già CheckedIn.

### TICKET-QR-008 — Go-live

- test Android reale;
- test iOS reale;
- test scanner con rete mobile;
- test luminosità/QR;
- test backup/restore;
- test su PostgreSQL production;
- procedura operativa per gli steward.

## Criterio di completamento

La funzionalità sarà considerata completa quando:

1. il pagamento conferma realmente il ticket;
2. il ticket genera un token QR non prevedibile;
3. il fan vede il QR nell'app;
4. lo staff lo scansiona;
5. il server verifica il ticket;
6. il primo check-in passa a `CheckedIn`;
7. una seconda scansione viene rifiutata;
8. ogni operazione è auditabile;
9. il flusso è testato su dispositivi reali.

## Nota architetturale

Il QR è una **rappresentazione del ticket**, non il ticket stesso e non un metodo di autenticazione dell'utente.

La fonte di verità rimane il backend JSO/PostgreSQL. Questo permette di:

- revocare un ticket;
- bloccare duplicati;
- correggere uno stato;
- mantenere audit;
- cambiare il formato QR in futuro senza cambiare l'ordine di pagamento.

