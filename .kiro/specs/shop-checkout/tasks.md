# Spec — Shop: carrello, ordini e checkout (Tasks)

Piano di implementazione basato su `design.md`. Ogni task cita i requisiti che soddisfa. Le migration EF le genera l'agente principale (non i sub-agent) per evitare conflitti sullo snapshot.

## Fase 0 — Decisioni (bloccante)
- [ ] 0.1 Confermare provider di pagamento, valuta (TND), spedizione (ritiro/spedizione), momento del decremento stock. (Decisioni aperte R-spec.)

## Fase 1 — Dominio e persistenza
- [ ] 1.1 Creare `Order.cs` e `OrderItem.cs` in `backend/src/JSO.Domain/` (file separati). (R2)
- [ ] 1.2 Aggiungere `DbSet<Order>` e `DbSet<OrderItem>` + indici in `JsoDbContext` (righe minime); precisione `14,2` sui decimali. (R2, R5)
- [ ] 1.3 Generare UNA migration Postgres `AddOrders` e verificare snapshot + `dotnet ef database update` su DB pulito. (R2)

## Fase 2 — API tifoso
- [ ] 2.1 `POST /api/shop/orders` con ricalcolo server dei prezzi e validazione attivo/stock; crea `Order(Pending)`+`OrderItem`. (R1, R2)
- [ ] 2.2 `GET /api/shop/orders` e `GET /api/shop/orders/{id}` (solo ordini del tifoso). (R7)

## Fase 3 — Pagamento
- [ ] 3.1 Integrare il provider scelto: `POST /api/shop/orders/{id}/pay` crea la sessione e ritorna i dati checkout. (R3)
- [ ] 3.2 `POST /api/shop/payments/webhook` con verifica firma, idempotenza, transizione a `Paid`, decremento stock in transazione, audit. (R3, R5)
- [ ] 3.3 Gestire `Failed`/`Cancelled` senza concedere accesso. (R3)

## Fase 4 — Admin e dashboard
- [ ] 4.1 `AdminShopOrdersController`: lista (filtro stato), dettaglio, `PUT .../status` con transizioni valide + audit; anonimo=401, ruolo errato=403. (R4)
- [ ] 4.2 Estendere `AdminDashboardController` `sales` con ricavo/ordini/prodotti venduti reali. (R6)

## Fase 5 — Frontend
- [ ] 5.1 `useCart` + badge carrello nell'header + drawer/pagina carrello. (R1)
- [ ] 5.2 Flusso checkout (crea ordine → pay → esito). (R2, R3)
- [ ] 5.3 "Mes commandes" nell'area account tifoso. (R7)
- [ ] 5.4 Modulo admin `Orders.jsx` + voce menu "Commandes". (R4)

## Fase 6 — Verifica (parità CI)
- [ ] 6.1 `dotnet build ... -c Release` = 0 errori; `npm run build` + `npm run lint` verdi.
- [ ] 6.2 Migration applicata su DB pulito.
- [ ] 6.3 Smoke test CI: crea ordine → webhook firmato → `Paid` → stock scalato → dashboard ricavo>0 → rotta admin ordini anonima=401.

## Note di esecuzione con sub-agent
- Un sub-agent per: (a) dominio+API ordini (Fase 1-2), (b) admin ordini+dashboard (Fase 4), (c) frontend carrello/checkout (Fase 5). Il pagamento (Fase 3) lo fa l'agente principale perché tocca configurazione/segreti e webhook. La migration la genera SOLO l'agente principale dopo che le entità sono pronte.
