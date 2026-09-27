# Spec — Shop: carrello, ordini e checkout (Requirements)

**Stato:** bozza spec (requisiti). Da approvare prima di design/tasks.
**Contesto:** lo Shop MVP (catalogo `Product` + admin CRUD + `/api/shop/products`) è già implementato. Manca la parte transazionale: carrello, ordini, pagamento, e le metriche di vendita reali in dashboard (oggi a 0). Questo spec copre l'**Orizzonte 2** della [PLATFORM_VISION_2030](../../docs/PLATFORM_VISION_2030.md).

## Obiettivo

Permettere a un tifoso autenticato di acquistare prodotti ufficiali del club: mettere prodotti nel carrello, effettuare un ordine, pagare tramite un provider esterno, e ricevere conferma. L'admin gestisce gli ordini; la dashboard mostra ricavo/ordini reali.

## Principi vincolanti

- **Nessun dato di carta sui nostri server.** Il pagamento passa da un provider certificato; noi salviamo solo il riferimento transazione.
- **L'accesso all'ordine si concede solo su pagamento verificato** (webhook firmato), mai lato client.
- Riuso dell'identità tifoso esistente (`FanUser`, ruolo `Fan`). Nessun ordine anonimo nell'MVP.
- Segui lo steering `jso-project` (entità, controller admin/pubblici, audit, migration, design system).

## Requisiti (EARS)

### R1 — Carrello (lato client)
- QUANDO un tifoso autenticato aggiunge un prodotto attivo al carrello, IL SISTEMA DEVE conservare quantità e prezzo corrente del prodotto nel carrello locale.
- SE un prodotto non è più attivo o è esaurito (`inStock=false`), IL SISTEMA DEVE impedirne l'aggiunta e mostrare un messaggio chiaro.
- IL carrello DEVE essere modificabile (quantità, rimozione) e mostrare un totale calcolato.

### R2 — Creazione ordine
- QUANDO un tifoso autenticato conferma il carrello, IL SISTEMA DEVE creare un `Order` con stato `Pending`, ricalcolando i prezzi **lato server** dal catalogo (mai fidarsi del prezzo inviato dal client).
- SE una riga riferisce un prodotto inattivo o quantità non valida, IL SISTEMA DEVE rifiutare l'ordine con un errore per riga.
- L'ordine DEVE registrare valuta (TND), totale, e le righe (`OrderItem`: prodotto, nome/prezzo storicizzati, quantità).

### R3 — Pagamento
- QUANDO un ordine `Pending` avvia il pagamento, IL SISTEMA DEVE creare una sessione presso il provider e restituire al client i dati per il checkout.
- QUANDO il provider invia il webhook di pagamento riuscito (firma valida), IL SISTEMA DEVE portare l'ordine a `Paid` e registrare il riferimento transazione.
- SE la firma del webhook non è valida, IL SISTEMA DEVE ignorare la richiesta e NON modificare l'ordine.
- IL sistema DEVE essere idempotente sui webhook (reinvii dello stesso evento non creano doppioni).
- SE il pagamento fallisce o è annullato, l'ordine DEVE passare a `Failed`/`Cancelled` senza concedere accesso.

### R4 — Gestione ordini (admin)
- L'admin (`SuperAdmin`,`ClubAdmin`,`ShopManager`) DEVE poter elencare gli ordini con stato e filtrarli, e vederne il dettaglio (righe, tifoso, totale).
- L'admin DEVE poter aggiornare lo stato logistico (`Paid` → `Shipped` → `Delivered`) con audit.
- Le rotte admin ordini DEVONO rifiutare gli anonimi (401) e i ruoli non autorizzati (403).

### R5 — Stock
- QUANDO un ordine diventa `Paid`, IL SISTEMA DEVE decrementare lo stock dei prodotti acquistati.
- IL sistema NON DEVE portare lo stock sotto zero (rifiuta o gestisce la concorrenza).

### R6 — Dashboard vendite reali
- QUANDO esistono ordini `Paid`, la dashboard admin DEVE mostrare ricavo totale, numero ordini e prodotti venduti reali (sostituendo gli attuali 0).

### R7 — Storia acquisti del tifoso
- Un tifoso autenticato DEVE poter vedere i propri ordini e il relativo stato dalla propria area account.

## Fuori scope (MVP)

- Resi/rimborsi automatici, spedizioni con corriere integrato, coupon/sconti, multivaluta, ordini anonimi come ospite.

## Decisioni aperte (da confermare prima del design)

1. **Provider di pagamento**: quale? (Stripe/PayPal richiedono account e supporto Tunisia; valutare un gateway locale). Determina l'integrazione del webhook.
2. **Valuta**: unica TND (consigliata) o multivaluta?
3. **Spedizione**: ritiro al club, spedizione manuale, o entrambi? Serve un indirizzo di spedizione nell'ordine?
4. **Stock**: decremento al `Paid` (scelta di questo spec) o riserva già alla creazione ordine?

## Criteri di uscita

Un tifoso completa un acquisto end-to-end in ambiente di test del provider; l'ordine risulta `Paid` solo dopo webhook firmato; lo stock si aggiorna; l'admin vede e gestisce l'ordine; la dashboard mostra ricavo/ordini reali. Backend Release, frontend build+lint e migration su DB pulito verdi; smoke test CI del percorso ordine.
