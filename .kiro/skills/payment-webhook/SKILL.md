---
name: payment-webhook
description: Integrare un pagamento con provider esterno e webhook firmato nel backend JSO (crea sessione checkout, ricevi il webhook, verifica la firma, concedi l'accesso solo su pagamento verificato, in modo idempotente). Usa questa skill per lo Shop checkout, l'accesso a pagamento alla partita, o qualsiasi flusso di pagamento.
---

# Skill: pagamento con webhook firmato (JSO)

Pattern sicuro per aggiungere un pagamento al backend .NET del progetto JSO. Vale per ordini shop, accesso partita, membership.

## Principi non negoziabili

- **Mai** dati di carta sui nostri server: il provider gestisce il pagamento. Noi salviamo solo `ProviderRef` (id transazione/sessione).
- **L'accesso/lo stato "pagato" si concede SOLO dal webhook firmato**, mai dalla risposta del client (il client può mentire o non tornare).
- **Idempotenza**: il provider reinvia gli eventi. Un evento già processato non deve creare doppioni né riapplicare effetti.
- Segreti del provider (API key, webhook signing secret) **solo in configurazione/ambiente**, mai nel repo. Leggili da `IConfiguration` (es. `Payments:WebhookSecret`).

## Flusso

1. **Crea l'entità in stato `Pending`** (Order/MatchAccessPurchase/Membership) con importo e valuta ricalcolati lato server.
2. **Avvia il pagamento**: endpoint `POST .../{id}/pay` (ruolo `Fan`) che crea una sessione di checkout presso il provider e restituisce al client i dati per proseguire (url/clientSecret). Salva l'eventuale id sessione in `ProviderRef`.
3. **Webhook**: `POST /api/.../payments/webhook` pubblico ma con **verifica firma**:
   - Leggi il body RAW e l'header di firma; verifica con il signing secret (HMAC/utility del provider). Se non valido → ritorna 400/401 e NON modificare nulla.
   - Trova l'entità via `ProviderRef`. Se è GIÀ in stato finale (`Paid`) → ritorna 200 senza rifare nulla (idempotenza).
   - Altrimenti applica l'effetto in **transazione** (`Paid`, decremento stock/concessione accesso), registra audit, salva.
4. **Fallimento/annullamento**: imposta `Failed`/`Cancelled`, nessun accesso.

## Checklist implementazione

- [ ] Config: `Payments:Provider`, `Payments:WebhookSecret`, chiavi API in env (non nel repo). Documenta le variabili in `.env.prod.example`.
- [ ] Endpoint `pay` con `[Authorize(Roles="Fan")]`, opera solo sull'entità del chiamante e solo se `Pending`.
- [ ] Endpoint `webhook` senza `[Authorize]` ma con verifica firma; rate limiting.
- [ ] Idempotenza (stato finale o tabella eventi processati).
- [ ] Transazione EF per gli effetti (stock/accesso) + audit (`ORDER_PAID`/`ACCESS_GRANTED`).
- [ ] Test: firma valida → stato `Paid`; firma non valida → nessun cambiamento; reinvio → nessun doppione.

## Verifica

Backend Release 0 errori; migration (se nuove entità) su DB pulito; smoke test: crea → pay → webhook firmato → stato finale + effetto applicato; webhook non firmato → ignorato. Nessun segreto committato.
