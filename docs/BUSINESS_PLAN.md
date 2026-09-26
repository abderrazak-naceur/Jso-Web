# JSO — Business Plan

**Stato:** proposta economica (solo piano, nessun impegno di spesa o di ricavo). Estende la parte prodotto di [BUSINESS_ANALYSIS](BUSINESS_ANALYSIS.md) con **costi, ricavi, pricing e idee di monetizzazione**, allineato agli orizzonti O0–O4 di [PLATFORM_VISION_2030](PLATFORM_VISION_2030.md).

**Valuta:** importi in **€ (EUR)** con equivalente **TND** (dinaro tunisino). JSO — Jeunesse Sportive d'Oudhref — opera in Tunisia, quindi il club incassa in TND; i costi cloud/pagamenti sono spesso in EUR/USD. Tasso usato per gli esempi: **1 € ≈ 3,4 TND** `[DA CONFERMARE — tasso indicativo, aggiornare al cambio reale]`. Tutti i numeri di volume e conversione sono **ipotesi marcate `[DA CONFERMARE]`**, da sostituire con i dati reali del club.

---

## 1. Executive summary

JSO Web parte come sito ufficiale + admin a **costo infrastrutturale vicino a zero** (Oracle Always Free, dominio, TLS gratuito). Sopra questa base si aggiungono, per orizzonti successivi e solo dopo il go-live, **flussi di ricavo** a rischio e complessità crescente: prima gli sponsor (nessun costo per il tifoso, alto valore), poi l'accesso a pagamento alla partita, lo shop, i biglietti e la membership, infine gamification e donazioni.

Principio economico guida: **ogni flusso di ricavo deve coprire i suoi costi variabili** (fee di pagamento, streaming, notifiche) e **nessuna spesa ricorrente parte prima che esista il ricavo che la giustifica**.

---

## 2. Struttura dei costi

### 2.1 Costi di base (Orizzonte 0–1) — obiettivo ~€0/mese

| Voce | Costo EUR | Costo TND `[≈]` | Note |
|---|---|---|---|
| VM Oracle Ampere A1 (Always Free) | €0/mese | 0 TND | Solo dentro le quote gratuite; disponibilità regione non garantita |
| PostgreSQL (self-host su VM) | €0 | 0 | Nessuna licenza |
| Dominio (.tn o .com) | ~€10–15/anno | ~34–51 TND/anno `[DA CONFERMARE — .tn ha tariffe locali]` | Rinnovo annuale |
| TLS/HTTPS (Let's Encrypt / Cloudflare) | €0 | 0 | Gratuito |
| CDN base (Cloudflare Free) | €0 | 0 | Opzionale |
| **Totale base** | **~€1/mese ammortizzato** | **~3–4 TND/mese** | Il "€0/mese" regge solo dentro le quote |

### 2.2 Costi variabili (scattano con le feature a pagamento)

| Voce | Quando | Costo | Note |
|---|---|---|---|
| Provider pagamenti (Stripe / PayPal / provider locale) | O1–O2 | ~1,4–2,9% + ~€0,25 per transazione `[DA CONFERMARE]` | **Verificare disponibilità in Tunisia**: Stripe non copre tutti i paesi — valutare **provider locali TND** (es. gateway bancari tunisini, Flouci, ClicToPay) |
| Streaming / video | O1–O3 | YouTube unlisted = €0; provider con DRM/signed URL = a pagamento | Vedi limite paywall in [FAN_ACCOUNTS_PLAN](FAN_ACCOUNTS_PLAN.md) |
| Notifiche push (FCM) | O2 | €0 nella quota; email transazionali a volume = a pagamento | |
| Storage media a volume | O2–O3 | Oltre la quota VM → object storage a pagamento | Highlights/video pesano |
| AI del club | O4 | Per-token del provider | Solo se attivata |

**Nodo tunisino da chiarire:** l'incasso online in TND dipende dai gateway di pagamento disponibili localmente e dalle regole valutarie. Questo condiziona *tutti* i flussi a pagamento e va verificato prima di O1/O2. `[DA CONFERMARE — quali gateway accettano carte tunisine e pagamenti in TND]`

---

## 3. Flussi di ricavo per orizzonte

| Flusso | Orizzonte | Modello | Rischio | Costo per tifoso |
|---|---|---|---|---|
| **Sponsor** | O1 | Contratto B2B a fasce (Title/Gold/Silver/Partner) | Basso | €0 (nessun costo per il tifoso) |
| **Accesso partita (paywall)** | O1–O2 | Pay-per-view singola partita | Medio (diritti video, ri-condivisione link) | a pagamento |
| **Shop / merchandising** | O2 | Vendita prodotti ufficiali | Medio (logistica, stock) | a pagamento |
| **Biglietteria** | O2 | Vendita/prenotazione ingressi (QR) | Medio | a pagamento |
| **Membership** | O2 | Abbonamento ricorrente con vantaggi | Medio | ricorrente |
| **Donazioni / crowdfunding** | O3 | Campagne a obiettivo | Basso | volontario |
| **Gamification premium** | O3+ | Predictor/fantasy con premi | Basso-medio | opzionale |

### 3.1 Pricing indicativo `[DA CONFERMARE con il club]`

| Prodotto | Prezzo EUR | Prezzo TND `[≈]` |
|---|---|---|
| Accesso singola partita | €2–3 | 7–10 TND |
| Membership mensile | €3–5 | 10–17 TND |
| Membership stagionale | €25–40 | 85–136 TND |
| Sponsor Partner (annuo) | €200–500 | 680–1 700 TND |
| Sponsor Title (annuo) | €2 000–5 000 | 6 800–17 000 TND |

> I prezzi devono riflettere il **potere d'acquisto locale tunisino**, non i listini europei: un accesso partita a "€3" può essere troppo caro in TND. Calibrare sui prezzi reali del mercato locale.

---

## 4. Proiezione a scenari (illustrativa)

Ipotesi base `[DA CONFERMARE]`: base tifosi attiva mensile e conversione ai flussi a pagamento. Numeri **illustrativi** per mostrare la logica, non previsioni.

| Scenario | Tifosi attivi/mese | Conv. paywall/partita | Ricavo paywall/partita (a €2,5) | Sponsor/anno | Ordine di grandezza ricavo annuo |
|---|---|---|---|---|---|
| Conservativo | 300 | 5% (15) | ~€38 / ~128 TND | €500 / 1 700 TND | ~€1,5k / ~5k TND |
| Base | 1 000 | 10% (100) | ~€250 / ~850 TND | €2 000 / 6 800 TND | ~€8k / ~27k TND |
| Ottimista | 3 000 | 15% (450) | ~€1 125 / ~3 825 TND | €6 000 / 20 400 TND | ~€30k / ~100k TND |

(15 partite/stagione ipotizzate per il paywall.) **Da rifare con i dati reali del club** — bacino tifosi, prezzi sostenibili in TND e conversione osservata.

---

## 5. Unit economics (esempio: accesso partita a €2,5)

- Ricavo lordo: €2,50 / ~8,5 TND
- Fee pagamento (~2,9% + €0,25): ~€0,32
- **Netto al club: ~€2,18 / ~7,4 TND** per accesso `[DA CONFERMARE con fee gateway reale]`
- Costo video: €0 con YouTube unlisted; **positivo solo se** non si adotta un provider a pagamento.

Regola: se il gateway tunisino ha fee/minimi diversi, l'accesso a basso prezzo (€2–3) può avere margine sottile — valutare **bundle** (pacchetto multi-partita) per ridurre l'incidenza della fee fissa.

---

## 6. Idee di monetizzazione nuove (oltre ai piani esistenti)

Idee non ancora nei piani, ordinate per rapporto valore/rischio. Ognuna diventerebbe un piano dedicato prima dell'implementazione.

1. **Bundle stagionale streaming** — pacchetto "tutte le partite casalinghe" a prezzo scontato vs. pay-per-view singolo; riduce l'incidenza delle fee fisse e stabilizza i ricavi.
2. **Sponsor self-service con report** — portale sponsor con impression/clic (già ipotizzato in vision 4.1) venduto come **valore commerciale misurabile**: lo sponsor vede il ritorno, rinnova più facilmente.
3. **Sponsorizzazione di contenuti** — "Match Center offerto da X", "Highlights presented by Y": inventory pubblicitario nativo, non banner invasivi.
4. **Membership a livelli** — Bronze/Silver/Gold con vantaggi crescenti (contenuti riservati, sconto shop, priorità biglietti, badge community); ricavo ricorrente prevedibile.
5. **Donazioni ricorrenti "Socio sostenitore"** — piccola quota mensile volontaria con riconoscimento pubblico (nome sul sito); adatto a club di comunità.
6. **Crowdfunding a obiettivo** — campagne trasparenti (attrezzature, trasferte, settore giovanile) con barra di avanzamento; leva emotiva forte per un club locale.
7. **Merchandising print-on-demand** — evita stock e logistica: prodotti stampati su ordine da un fornitore terzo, il club prende un margine senza magazzino.
8. **Partnership locali / affiliazione** — sconti presso attività della zona per i membri; il club prende una fee di affiliazione o vende lo spazio ai partner.
9. **Contenuti premium academy** — video-analisi, sessioni tecniche del settore giovanile a pagamento per genitori/giovani.
10. **Eventi ibridi** — biglietti a eventi (cene di gala, incontri con la squadra) venduti online con QR.
11. **NFT/collectibles digitali** — ⚠️ **sconsigliato ora**: costo tecnico, reputazionale e regolatorio alto, valore incerto; elencato solo per completezza, non raccomandato.
12. **Fan ID come hub commerciale** — quando esiste (vision idea 1), diventa il punto unico per membership + biglietti + punti + sconti: aumenta il valore per tifoso nel tempo.

---

## 7. Sequenza di attivazione dei ricavi (allineata agli orizzonti)

```
O0 Go-live (nessun ricavo, solo costi ~€0)
      │
      ▼
O1  Sponsor  ──►  primo ricavo, zero costo per il tifoso
      │           (+ verificare gateway pagamenti TND)
      ▼
O2  Paywall partita + Shop + Biglietti + Membership + Notifiche
      │           (i pagamenti richiedono gateway attivo)
      ▼
O3  Donazioni + Gamification premium + Community
      │
      ▼
O4  Bundle avanzati, Fan ID hub, partnership a scala
```

Regola d'oro: **gli sponsor per primi** (ricavo senza far pagare il tifoso e senza gateway), i pagamenti solo dopo aver risolto il nodo gateway/TND.

---

## 8. KPI economici

- **ARPU** (ricavo medio per tifoso attivo/mese).
- **Tasso di conversione** per flusso (paywall, membership, shop).
- **Costo variabile per transazione** (fee gateway) vs. prezzo.
- **Break-even per flusso** (quando i ricavi coprono i costi variabili + eventuali fissi).
- **Valore sponsor / rinnovo** (impression, clic, tasso di rinnovo).
- **LTV membership** (durata media × quota).

---

## 9. Rischi economici

- **Dipendenza dalle quote gratuite:** superarle (traffico, storage, notifiche) introduce costi cloud non pianificati.
- **Gateway di pagamento in Tunisia:** disponibilità, fee e regole valutarie condizionano ogni flusso a pagamento in TND. **Nodo critico da chiudere prima di O2.**
- **Diritti video:** streaming reale richiede diritti; YouTube unlisted non protegge dalla ri-condivisione.
- **Prezzi vs. potere d'acquisto locale:** listini europei non trasferibili al mercato tunisino.
- **Capacità operativa:** shop/biglietti/community richiedono gestione umana (logistica, moderazione), un costo non monetario ma reale.
- **Fee fisse su micro-pagamenti:** un accesso partita a basso prezzo può avere margine eroso dalla fee fissa → preferire bundle.

---

## 10. Prossimo passo

1. Confermare **valuta operativa e tasso**, e i **gateway di pagamento disponibili in Tunisia** (nodo che sblocca tutti i flussi a pagamento).
2. Sostituire i placeholder `[DA CONFERMARE]` con i **dati reali del club** (bacino tifosi, prezzi sostenibili in TND).
3. Trasformare la prima idea approvata (proposta: **Sponsor**, ricavo senza costo per il tifoso) in un piano di implementazione dettagliato, come [FAN_ACCOUNTS_PLAN](FAN_ACCOUNTS_PLAN.md).
