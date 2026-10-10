# JSO Web — Piano Area Cliente

**Stato:** prima versione frontend implementata su branch `feat/customer-account-dashboard`; verifiche CI e API di produzione ancora da completare  
**Priorità proposta:** P1 — esperienza cliente e-commerce/biglietteria  
**Ambito:** frontend React/Vite + API ASP.NET Core .NET 10 già esistenti

## Obiettivo

Creare un'area personale cliente distinta dal back office admin, accessibile dopo il login da una voce chiara nel menu del sito (es. **La mia area**). Deve mostrare esclusivamente i dati appartenenti all'utente autenticato e permettere di recuperare biglietti digitali, abbonamenti e ordini.

## Implementazione frontend (prima versione)\n\n- Route dedicata `/account`, distinta da `/admin`.\n- Voce «Mon espace» nel menu account desktop e mobile.\n- Accesso protetto tramite sessione Fan; utente anonimo invitato al login.\n- Riepilogo e sezioni per biglietti, abbonamenti e ordini usando le API Fan esistenti.\n- Stati loading, vuoto, errore e aggiornamento manuale; caricamento indipendente delle tre sezioni.\n- Pulsante QR che chiama l’endpoint digitale protetto solo per ticket che risultano confermati/pagati.\n- La presenza e il download di ricevute/documenti sono limitati ai dati realmente restituiti dall’API; non vengono creati documenti fittizi.\n\nDa verificare in CI e contro il backend effettivamente distribuito: shape esatti dei DTO, risposta dell’endpoint digitale e rendering del QR. Il frontend non considera mai il redirect del browser una conferma di pagamento.\n\n## Verifica iniziale del codice

Esistono già componenti per autenticazione e profilo nel frontend e API fan-facing per biglietteria e shop. In particolare:
- `GET /api/tickets/mine`: ordini/biglietti del tifoso autenticato.
- `GET /api/tickets/{id}/digital`: dettagli del biglietto digitale per il proprietario, solo quando confermato/utilizzato.
- `GET /api/shop/orders` e `GET /api/shop/orders/{id}`: ordini e dettagli shop del cliente autenticato.
- UI esistente per login, profilo, impostazioni e cambio password.

Prima di implementare, verificare contratti API, gestione errori e modelli effettivi per gli abbonamenti. Non assumere che una funzione sia completa solo perché esiste un endpoint.

## Sezioni della dashboard

1. **Panoramica** — saluto, stato abbonamento se presente, prossimi eventi, biglietti e ordini recenti.
2. **I miei biglietti** — lista, stato pagamento/conferma, partita, quantità, accesso al ticket digitale e QR solo dopo conferma server-side.
3. **I miei abbonamenti** — abbonamenti attivi/scaduti, periodo di validità, numero/identificativo e documento scaricabile se il sistema lo genera.
4. **I miei ordini** — storico shop, dettaglio articoli, importi, stato e data; ricevuta/fattura scaricabile soltanto se esiste un documento effettivo.
5. **Profilo e sicurezza** — riutilizzare le funzioni esistenti per dati personali, password e gestione account.

## Task di implementazione

- **ACCOUNT-DASH-001 — Audit dei contratti e dei modelli:** verificare autenticazione JWT/ruolo Fan, endpoint ticket/shop e modello abbonamenti; identificare API mancanti.
- **ACCOUNT-DASH-002 — Navigazione e routing:** aggiungere una route stabile `/account`, accesso dal menu utente e protezione login.
- **ACCOUNT-DASH-003 — Panoramica cliente:** KPI e riepiloghi basati su dati API reali, con loading, empty state, errore e retry.
- **ACCOUNT-DASH-004 — Area biglietti:** lista dei propri ticket e apertura QR digitale esclusivamente per ticket validi e confermati.
- **ACCOUNT-DASH-005 — Area ordini:** elenco e dettaglio degli ordini shop del proprietario, con stato pagamento chiaro.
- **ACCOUNT-DASH-006 — Area abbonamenti:** collegare il modello/API abbonamenti esistente; se manca, implementare prima contratto backend e persistenza necessari, senza mostrare abbonamenti fittizi.
- **ACCOUNT-DASH-007 — Download documenti:** offrire download solo di ticket/QR o ricevute realmente generati; controllare ownership su ogni richiesta e non esporre file di altri clienti.
- **ACCOUNT-DASH-008 — Test e sicurezza:** test API/UI per utente autenticato, accesso anonimo, tentativo di leggere ID di un altro utente, ordini pending, pagamento confermato, QR non valido e stati vuoti.

## Criteri di accettazione

- Il cliente può raggiungere `/account` dal sito dopo aver effettuato l'accesso.
- Gli endpoint restituiscono solo risorse del cliente autenticato; l'ID passato dal client non è sufficiente per autorizzare l'accesso.
- Nessun ticket digitale/QR viene esposto prima della conferma del pagamento.
- Ordini in attesa, confermati, annullati e rifiutati sono distinguibili in modo comprensibile.
- Gli abbonamenti sono mostrati solo se supportati da dati persistiti e verificabili.
- Download protetti da autenticazione e controllo di proprietà.
- Responsive desktop/mobile, accessibile da tastiera e con stati loading/error/empty.
- Test, lint e build passano; documentazione aggiornata.

## Sequenza consigliata

Completare prima l'audit (001), poi routing/shell (002), biglietti e ordini (004–005), abbonamenti (006), documenti (007) e infine test E2E (008). Non modificare o indebolire la dashboard admin; l'area cliente è separata e usa i permessi Fan.

## Collegamenti

- [Roadmap generale](ROADMAP.md)
- [Backlog tecnico](TECHNICAL_BACKLOG.md)
- [User stories](USER_STORIES.md)
