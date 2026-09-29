# JSO — Report: cosa manca da fare (Web e Mobile)

**Aggiornato:** 29 settembre 2026
**Base:** stato reale del codice in `main` (verificato) + piani (`Attivita.md`, `ROADMAP.md`, `ADMIN_SQUAD_FINANCE_ANALYTICS_PLAN.md`, `MOBILE_TICKETING_QR_PLAN.md`, `FAN_ACCOUNTS_PLAN.md`, `GO_LIVE.md`, `PAYMENTS.md`).

Legenda: ✅ fatto · 🟡 parziale · ⛔ da fare (fattibile in sandbox) · 🔒 bloccato da credenziali/servizi/infrastruttura esterni (fuori sandbox).

---

## 0. Sintesi in una riga

Il prodotto è **quasi completo nel codice** sia su web sia su mobile. Quello che manca è: **1 area web costruibile** (gestione squadra estesa + analytics giocatore dedicati), **l'allineamento della mobile al web sulle funzioni a pagamento/monetizzazione**, e — soprattutto — **i passi che dipendono da te** (deploy, chiavi pagamenti, email, push, store), che sono la maggior parte del valore residuo.

---

## 1. WEB (sito pubblico + admin)

### ⛔ Da fare — costruibile in sandbox
- **Gestione squadra estesa** (Area A del piano squad/finance): campi giocatore aggiuntivi (data nascita, nazionalità, piede, altezza, stato, valore, date contratto), entità `PlayerContract` (storico) e `PlayerAvailability` (infortuni/squalifiche). *Verificato assente nel codice.*
- **Analytics giocatore dedicati** (Area C): entità `PlayerMatchStat` (minuti, gol, assist, cartellini, rating) per metriche non derivabili dagli eventi. Oggi le analytics esistono solo **derivate** da eventi/formazioni. *`PlayerMatchStat` assente.*

### 🟡 Parziale
- **Frontend web lato tifoso**: presenti account, shop/carrello, commenti, abbonamenti, streaming; restano rifiniture (es. UI GDPR dedicata al tifoso, pagine specifiche).
- **Account tifoso**: mancano sessione cookie HttpOnly, verifica email, reset password (richiede però email reale per essere completo — vedi 🔒).
- **Collaudo Priorità 1**: codice completo; resta la verifica manuale WCAG (screen reader) e Lighthouse su ambiente reale.

### 🔒 Bloccato da te (fuori sandbox)
- **Attivazione pagamenti**: integrazione Flouci (Tunisia) / Stripe (estero) **implementata** su shop, biglietti, muro sostenitori, membership, streaming. Manca: creare gli account provider, mettere le **chiavi come variabili d'ambiente**, impostare il tasso TND→valuta Stripe, **puntare i webhook**, e il **collaudo end-to-end** con pagamento vero. Vedi `PAYMENTS.md`.
- **Invio email reale**: newsletter, conferme GDPR/compleanni, verifica email tifoso — oggi stub. Serve un provider SMTP/transazionale.
- **Auto-post social (Facebook)**: predisposto (`SOCIAL.md`), da attivare con un token di Pagina.
- **F20 — trascrizioni/sottotitoli AI**: richiede provider AI a pagamento.

---

## 2. MOBILE (Flutter — Android/iOS)

La mobile è ampia (Home, Match Center 4 tab, News, Équipe, Médias, Archivio, Eventi, FAQ, Documenti, Community, Sponsor, Boutique, Biglietteria, account/RGPD, **biglietto QR + scanner staff**). Ma è **rimasta indietro rispetto al web sulle funzioni di monetizzazione**.

### ⛔ Da fare — costruibile in sandbox (allineamento mobile → web)
- **Pagamento online nell'app**: la mobile **non chiama gli endpoint `/pay`** (Flouci/Stripe). Shop e biglietti sono ancora "prenotazione / pagamento al club". Il web ha già il checkout online; la mobile no. *Verificato: nessuna chiamata `/pay`/redirect di pagamento in `mobile/lib`.*
- **Membership / abbonamenti**: nessuna schermata mobile (il web ce l'ha). *Nessuna feature `membership` in `mobile/lib/features`.*
- **Streaming pay-per-view**: nessuna schermata mobile. *Assente.*
- **Muro dei sostenitori**: nessuna schermata mobile. *Assente.*

### 🔒 Bloccato da te (fuori sandbox)
- **Notifiche push (FCM)**: oggi la schermata "Notifiche" è un **feed in-app** costruito da dati esistenti; **non c'è push reale**. Richiede account Firebase.
- **Collaudo su dispositivi reali + pubblicazione store**: build APK/IPA, firma, account sviluppatore Google/Apple, test camera dello scanner QR su device reale. Richiede Android SDK / macOS+Xcode.

---

## 3. Gap trasversali (valgono per entrambi) — 🔒 fuori sandbox

- **Go-live in produzione (Priorità 0)**: VM Oracle, dominio + HTTPS, backup con copia esterna + **prova di restore**, collaudo end-to-end nel browser reale. **Checklist pronta e senza codice in `GO_LIVE.md`.**
- **Test automatici backend**: quasi assenti (verifica oggi = build + lint + smoke CI). La mobile ha test widget.

---

## 4. Tabella riepilogo

| Area | Web | Mobile | Note |
|------|-----|--------|------|
| Contenuti pubblici (home/match/news/media/équipe) | ✅ | ✅ | — |
| Admin (CMS, match, sponsor, community, homepage builder, ecc.) | ✅ | n/a | — |
| Account tifoso | 🟡 | ✅ | Web: manca cookie HttpOnly/verifica email/reset (🔒 email) |
| Shop | ✅ (checkout online) | ⛔ (solo prenotazione) | Mobile: manca `/pay` |
| Biglietteria | ✅ | ✅ (+ QR/check-in) | — |
| Biglietto QR + check-in staff | n/a | ✅ | Collaudo camera su device = 🔒 |
| Muro sostenitori | ✅ | ⛔ | Mobile assente |
| Membership | ✅ | ⛔ | Mobile assente |
| Streaming pay-per-view | ✅ | ⛔ | Mobile assente |
| Community & moderazione | ✅ | ✅ | — |
| Finanze del club | ✅ | n/a | Fatto (Area B) |
| Gestione squadra estesa (contratti) | ⛔ | n/a | Area A, da fare |
| Analytics giocatore dedicati | ⛔ | n/a | Area C (`PlayerMatchStat`), da fare |
| Pagamenti reali (attivazione) | 🔒 | 🔒 | Chiavi + webhook + collaudo |
| Email reale | 🔒 | 🔒 | Provider |
| Push notifications | n/a | 🔒 | FCM/Firebase |
| Go-live produzione | 🔒 | 🔒 | `GO_LIVE.md` |
| Pubblicazione store | n/a | 🔒 | Account sviluppatore |

---

## 5. Prossimi passi consigliati (per valore)

1. **Allineare la mobile al web** sui pagamenti: collegare `/pay` (checkout online) a shop e biglietti, e aggiungere le schermate membership / streaming / muro sostenitori. *Fattibile in sandbox; il collaudo con pagamento vero resta post-attivazione.*
2. **Completare il piano squad/analytics** (web): Area A (gestione squadra estesa + contratti) e Area C (`PlayerMatchStat`). *Fattibile in sandbox.*
3. **Sbloccare i 🔒 (richiede te)**: scelta/attivazione provider **email** e **pagamenti** (chiavi + webhook), poi **go-live** su Oracle seguendo `GO_LIVE.md`, infine **push FCM** e **pubblicazione store** per la mobile.

> Nota di onestà: gran parte del valore che resta (pagamenti attivi, email, deploy pubblico, store) **non è completabile in questo ambiente** perché richiede account, credenziali e infrastruttura reali. Il codice è pronto ad accoglierli.
