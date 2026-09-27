# Spec — Shop: carrello, ordini e checkout (Design)

Basato su `requirements.md`. Segue i pattern dello steering `jso-project`.

## Architettura d'insieme

```
Tifoso (Fan, JWT)                Provider pagamento (esterno)
   │  carrello (client)                 ▲   │ webhook firmato
   ▼                                    │   ▼
POST /api/shop/orders  ──create──▶  Order(Pending)
   │                                    │
   ▼                                    │
POST /api/shop/orders/{id}/pay ─────────┘ (crea sessione checkout)
                                         │
                          POST /api/shop/payments/webhook (firma verificata)
                                         │  → Order(Paid), stock--, audit
Admin (ShopManager) ─▶ /api/admin/shop/orders (lista/dettaglio/stato)
Dashboard ─▶ /api/admin/dashboard (ricavo/ordini reali)
```

## Dominio (nuove entità, file separati per non toccare Entities.cs)

- `Order` (`backend/src/JSO.Domain/Order.cs`): `Id`, `FanUserId`, `Status` (`Pending`/`Paid`/`Failed`/`Cancelled`/`Shipped`/`Delivered`), `Currency` (TND), `Total` (decimal 14,2), `ProviderRef` (string?), `ShippingName`/`ShippingAddress` (string?, se spedizione), `CreatedAt`, `PaidAt` (DateTimeOffset?).
- `OrderItem` (`backend/src/JSO.Domain/OrderItem.cs`): `Id`, `OrderId`, `ProductId`, `ProductName` (storicizzato), `UnitPrice` (decimal 14,2, storicizzato), `Quantity`, `LineTotal`.

Indici: `Order` su `(FanUserId, CreatedAt)` e `Status`; `OrderItem` su `OrderId`. `ProviderRef` unico (filtrato non-null) per idempotenza.

## API

### Pubbliche/tifoso (ruolo `Fan`)
- `POST /api/shop/orders` — crea ordine dal carrello. Body: righe `[{ productId, quantity }]`. Il server ricalcola prezzi/nomi dal catalogo, valida attivo+stock, crea `Order(Pending)` + `OrderItem`. Ritorna l'ordine.
- `POST /api/shop/orders/{id}/pay` — avvia il pagamento (crea sessione provider), ritorna i dati di checkout. Solo sull'ordine del tifoso corrente, solo se `Pending`.
- `GET /api/shop/orders` — lista ordini del tifoso corrente (stato, totale, data).
- `GET /api/shop/orders/{id}` — dettaglio di un proprio ordine.

### Webhook (pubblico, firma verificata)
- `POST /api/shop/payments/webhook` — endpoint del provider. Verifica la **firma** (secret in configurazione, mai nel repo). Su evento "pagamento riuscito": trova l'ordine via `ProviderRef`, se non già `Paid` lo porta a `Paid`, decrementa stock in transazione, registra audit `ORDER_PAID`. Idempotente. Ignora eventi non firmati (400/401 senza modifiche).

### Admin (`SuperAdmin`,`ClubAdmin`,`ShopManager`)
- `GET /api/admin/shop/orders` — lista con filtro `?status=`.
- `GET /api/admin/shop/orders/{id}` — dettaglio (righe + tifoso).
- `PUT /api/admin/shop/orders/{id}/status` — aggiorna stato logistico (`Paid`→`Shipped`→`Delivered`), con audit. Transizioni non valide → 400.

## Sicurezza

- Prezzi **sempre ricalcolati lato server**; il client non invia prezzi.
- Accesso `Paid` concesso **solo** dal webhook firmato.
- Il tifoso opera solo sui propri ordini (id dal JWT: `sub`/`NameIdentifier`).
- Webhook: verifica firma HMAC/secret del provider; rate limiting.
- Audit su create/pay/paid/status. Nessun dato di carta persistito.

## Concorrenza stock

Decremento stock nel webhook dentro una transazione EF; ricontrollo `Stock >= quantity` prima di scalare; se insufficiente, marca l'ordine `Failed` e (fase 2) predisponi rimborso. Nell'MVP: log + stato `Failed`.

## Dashboard

Estendere `AdminDashboardController` `sales`: `revenue = Σ Order.Total dove Status in (Paid,Shipped,Delivered)`, `orders = count`, `productsSold = Σ OrderItem.Quantity`. `enabled` resta legato ai prodotti attivi.

## Frontend

- **Carrello** (client, `localStorage` `jso_cart`): hook `useCart` in `frontend/src/features/shop/`. Badge carrello nell'header.
- **Pagina/Drawer carrello**: righe, quantità, totale, "Passer commande".
- **Checkout**: crea ordine → avvia pagamento → redirect/embed provider → pagina esito.
- **Area account**: scheda "Mes commandes" con storico e stato (riusa il pannello parametri account).
- **Admin**: modulo "Commandes" in `AdminApp.jsx` (lista + dettaglio + cambio stato), file separato `frontend/src/admin/Orders.jsx`.

## Migration

Una sola migration `AddOrders` (generata dall'agente principale dopo che le entità sono pronte, per evitare conflitti snapshot). Colonne decimali `HasPrecision(14,2)`.

## Verifica

Backend Release; frontend build+lint; migration su DB pulito; smoke test CI: crea ordine → simula webhook firmato → ordine `Paid` → stock scalato → dashboard ricavo>0 → rotta admin ordini anonima=401.
