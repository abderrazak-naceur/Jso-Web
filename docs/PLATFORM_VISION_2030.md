# JSO — Piano piattaforma e visione fino al 2050

**Stato:** proposta strategica (solo piano, nessuna implementazione). Documento pluriennale che estende la [ROADMAP](ROADMAP.md) con orizzonti temporali e **idee nuove**. Le date sono obiettivi indicativi, non impegni; ogni fase parte solo dopo che la precedente ha superato i suoi criteri di uscita. **Più lontano è l'orizzonte, più le date sono direzionali e le idee esplorative** — gli orizzonti oltre il 2030 sono una *bussola strategica*, non un piano eseguibile.

**Rimando:** i piani di dettaglio già esistenti restano la fonte per le rispettive aree:
- Account tifosi e visione partita online → [FAN_ACCOUNTS_PLAN](FAN_ACCOUNTS_PLAN.md)
- Admin: squadra, finanze, analytics giocatore → [ADMIN_SQUAD_FINANCE_ANALYTICS_PLAN](ADMIN_SQUAD_FINANCE_ANALYTICS_PLAN.md)
- Costi, ricavi, pricing e idee di monetizzazione → [BUSINESS_PLAN](BUSINESS_PLAN.md)

---

## 1. Visione 2030

Trasformare JSO da sito vetrina a **piattaforma digitale del club**: un unico ecosistema (web + mobile + admin) dove tifosi, giocatori, staff, sponsor e amministrazione vivono il club tutto l'anno. Principio guida invariato: **"build once, use everywhere"** — API .NET condivise, PostgreSQL, costi vicino allo zero finché si resta nelle quote gratuite, sicurezza e auditability per impostazione predefinita.

Tre pilastri di valore:
1. **Coinvolgimento** dei tifosi (contenuti, live, community, gamification).
2. **Sostenibilità economica** (sponsor, shop, biglietti, donazioni, membership).
3. **Eccellenza sportiva e gestionale** (analytics, gestione rosa, finanze, operations).

---

## 2. Principi e convenzioni condivise (validi per ogni fase)

- **Sicurezza prima:** ogni rotta admin sotto `[Authorize(Roles=...)]`; identità tifoso separata dagli admin (vedi FAN_ACCOUNTS_PLAN); audit su tutte le scritture; nessun segreto nel repo.
- **Dati:** nuove entità/campi con migration PostgreSQL versionata; campi aggiunti a entità esistenti sempre nullable/con default. Soldi in `decimal`/`numeric(14,2)`.
- **API-first:** contratti stabili e versionabili, pensati anche per Flutter.
- **Frontend:** riuso del design system JSO; stati loading/vuoto/errore chiari; niente contenuti demo quando l'API risponde.
- **Verifica:** build/lint frontend, build backend, smoke test CI e controlli anti-escalation ruoli prima di considerare chiusa un'area.
- **Privacy/GDPR:** consenso, informativa e cancellazione account dove si raccolgono dati personali.

---

## 3. Orizzonti temporali

### Orizzonte 0 — Go-live MVP (2026, in corso)
Chiudere la Priorità 0 della roadmap: deploy Oracle, DNS/HTTPS, backup automatico con copia esterna, restore provato, flussi critici verificati sul dominio reale. **Prerequisito di tutto il resto.**

### Orizzonte 1 — Prodotto web completo + fondamenta account (fine 2026 → 2027)
- Contenuti pubblici tutti collegati a dati reali; editor admin completi.
- **Account tifosi** (registrazione/login) — base per community, notifiche, shop, biglietti.
- **Sponsor** (area gestione + vetrina pubblica) — prima leva di ricavo.
- **Analytics giocatore** e **gestione squadra estesa** (piano dedicato).

### Orizzonte 2 — Mobile + monetizzazione (2027 → 2028)
- **App Flutter** (Home, Match Center, News, Media, account, notifiche push).
- **Shop** e **biglietteria/eventi**; **membership** tifosi.
- **Finanze del club** a regime (piano dedicato) con reportistica.

### Orizzonte 3 — Coinvolgimento e dati avanzati (2028 → 2029)
- **Community & moderazione**; **gamification** (fedeltà, badge, predizioni).
- **Live match center avanzato** e valutazione **provider dati/streaming**.
- **Analytics avanzate** club e audience; dashboard decisionali.

### Orizzonte 4 — Innovazione e scala (2029 → 2030)
- Idee innovative (sezione 5): personalizzazione, AI assistita, multilingua, esperienze immersive.
- Ottimizzazione costi/scala, osservabilità, resilienza.

### Orizzonte 5 — Ecosistema e sostenibilità (2030 → 2040) — *direzionale*
Da "piattaforma del club" a **ecosistema digitale del territorio sportivo**. Idee esplorative, non impegni:
- **Piattaforma multi-club / white-label:** JSO Web diventa un prodotto riutilizzabile da altri club locali/regionali (stesse API .NET, tenant separati) — leva di ricavo B2B oltre il singolo club.
- **Fan ID a regime** come identità unica (membership + biglietti + punti + pagamenti) e possibile interoperabilità con lega/federazione.
- **AI del club matura:** assistente conversazionale, generazione contenuti assistita (con revisione umana), analisi predittiva partite/audience.
- **Dati sportivi propri:** tracking eventi/performance del settore giovanile e prima squadra come asset del club.
- **Sostenibilità operativa:** processi, ruoli e automazioni che rendono la piattaforma gestibile da un club con risorse limitate.

### Orizzonte 6 — Visione lunga (2040 → 2050) — *esplorativo*
Scenari di lungo periodo, da rivalutare con la tecnologia dell'epoca. Nessuna assunzione tecnica vincolante oggi:
- **Esperienze immersive matchday:** streaming multi-angolo, realtà aumentata/virtuale, esperienze da stadio a distanza.
- **Community e identità digitale del tifoso** durature, portabili tra dispositivi e generazioni di tifosi.
- **Automazione editoriale e operativa avanzata** (AI) con la persona che resta responsabile di decisioni e contenuti.
- **Resilienza pluridecennale:** portabilità dei dati, indipendenza da singoli fornitori, sostenibilità economica ed energetica.
- **Eredità del club:** archivio storico digitale permanente (media, risultati, memoria del club) come patrimonio per le generazioni future.

> **Nota di realismo:** oltre il 2030 la tecnologia, i costi e il contesto cambieranno in modo non prevedibile. Questi due orizzonti servono a dare *direzione*, non a vincolare scelte tecniche. Rivalutare la sezione ogni 2–3 anni.

---

## 4. Aree funzionali (spec PRO compatte)

Per ognuna: obiettivo, dominio, API, frontend, sicurezza, verifica. Il livello di dettaglio è sufficiente per aprire l'implementazione dopo approvazione.

### 4.1 Sponsor (Orizzonte 1)
- **Obiettivo:** gestire e mostrare gli sponsor del club, con posizionamento e periodo di validità.
- **Dominio:** `Sponsor` (`Id`, `Name`, `LogoUrl`, `WebsiteUrl`, `Tier` [Title/Gold/Silver/Partner], `Placement` [Home/Footer/Matchday], `StartDate`, `EndDate`, `IsActive`, `Priority`). Opzionale `SponsorClick` per tracciare i clic.
- **API:** admin CRUD `/api/admin/sponsors`; pubblico `GET /api/sponsors?placement=` (solo attivi e in periodo).
- **Frontend:** modulo admin (upload logo via media esistente); vetrina pubblica su home/footer/matchday con ordinamento per tier/priorità.
- **Sicurezza:** admin `SuperAdmin,ClubAdmin`; link esterni con `rel="noopener noreferrer"`.
- **Idea+:** report di esposizione (impression/clic) da mostrare allo sponsor come valore commerciale.

### 4.2 Homepage Builder & Menu/Footer (Orizzonte 1)
- **Obiettivo:** il club compone la home e i menu senza toccare il codice.
- **Dominio:** `HomeSection` (tipo, ordine, payload JSON, visibilità) e `NavigationItem` (label, url/route, ordine, posizione header/footer). Riusa `SiteContent` dove possibile.
- **API:** admin CRUD; pubblico letto dalla home/nav.
- **Frontend:** editor drag-order semplice; render dinamico lato pubblico con fallback sicuri.
- **Verifica:** ordinamento e visibilità coerenti; stato vuoto pulito.

### 4.3 Community & moderazione (Orizzonte 3)
- **Obiettivo:** interazione tifosi (commenti su news/partite, reazioni), con moderazione.
- **Dominio:** `Comment` (autore = FanUser, target, testo, stato Moderation), `Reaction`, `Report`.
- **API:** creazione autenticata (ruolo `Fan`); code di moderazione per `CommunityManager`.
- **Sicurezza:** rate limiting, filtro contenuti, audit; niente PII esposta.
- **Idea+:** "tifoso della settimana", thread live durante la partita.

### 4.4 Shop / Merchandising (Orizzonte 2)
- **Obiettivo:** vendere prodotti ufficiali.
- **Dominio:** `Product`, `ProductVariant` (taglia/colore/stock), `Order`, `OrderItem`, `Payment`.
- **API:** catalogo pubblico; carrello/ordine per `Fan`; gestione ordini per `ShopManager`.
- **Pagamenti:** provider esterno (es. Stripe/PayPal) — decisione dedicata; nessun dato carta sui nostri server.
- **Verifica:** stock non negativo, idempotenza ordini, stati pagamento tracciati.

### 4.5 Biglietteria & eventi (Orizzonte 2)
- **Obiettivo:** vendere/prenotare ingressi a partite ed eventi.
- **Dominio:** `TicketType`, `TicketOrder`, `Ticket` (QR/codice), collegati a `Match`/evento.
- **API:** disponibilità pubblica; acquisto `Fan`; validazione ingressi (staff).
- **Idea+:** biglietto digitale con QR nel wallet dell'app; check-in allo stadio.

### 4.6 Membership / abbonamenti tifosi (Orizzonte 2)
- **Obiettivo:** entrate ricorrenti e vantaggi (contenuti riservati, sconti shop, priorità biglietti).
- **Dominio:** `MembershipPlan`, `Membership` (FanUser, stato, rinnovo).
- **Sicurezza:** i vantaggi verificati lato server; nessun accesso premium senza abbonamento valido.

### 4.7 Notifiche & messaging (Orizzonte 2)
- **Obiettivo:** avvisi partite/risultati/news su web e mobile.
- **Tecnica:** preferenze per FanUser; push mobile via **Firebase Cloud Messaging** (coerente con roadmap); email transazionali via provider.
- **Verifica:** opt-in/opt-out rispettati; nessun invio senza consenso.

### 4.8 Analytics avanzate & SEO (Orizzonti 1→3)
- **Obiettivo:** decisioni basate sui dati (audience, contenuti, sportivo) e visibilità.
- **Tecnica:** metriche audience privacy-friendly; dashboard admin; SEO tecnica (metadati, sitemap, performance).
- **Rimando:** analytics per giocatore/squadra e finanze nel piano dedicato.

### 4.9 Live match center & dati (Orizzonte 3)
- **Obiettivo:** esperienza live affidabile (eventi in tempo reale, commentary).
- **Tecnica:** aggiornamenti quasi-real-time; valutare provider dati/streaming solo dopo affidabilità del match center manuale.

---

## 5. Idee nuove (differenzianti, 2028 → 2030)

1. **Fan ID & wallet digitale:** identità tifoso unica che unisce membership, biglietti (QR), punti fedeltà e preferenze — un solo profilo per tutto.
2. **Gamification & fedeltà:** punti per presenza, acquisti, predizioni risultati; badge, classifiche tifosi, premi riscattabili nello shop.
3. **Predictor / fantasy JSO:** pronostici pre-partita e mini-fantasy sulla rosa reale, per engagement ricorrente.
4. **Assistente AI del club (con dati propri):** risposte su calendario, risultati, come comprare biglietti; generazione bozze di articoli/social per l'editor (sempre con revisione umana). Nessun dato sensibile esposto.
5. **Highlights e clip:** caricamento e ritaglio momenti salienti; galleria video oltre le foto.
6. **Multilingua (AR/FR/EN):** contenuti e UI localizzati; base per audience più ampia.
7. **PWA installabile & offline-light:** il sito diventa installabile con notifiche, in attesa/oltre l'app nativa.
8. **Sponsor analytics & self-service:** portale sponsor con report di esposizione e rinnovo contratti.
9. **Accademia/settore giovanile:** aree squadre giovanili, tornei, profili di crescita giocatori.
10. **Donazioni & crowdfunding:** campagne per obiettivi del club (attrezzature, trasferte) con trasparenza sui fondi.
11. **CRM tifosi & segmentazione:** comunicazioni mirate (nel rispetto del consenso) per membership, eventi, shop.
12. **Osservabilità & resilienza:** monitoraggio, alert, e piani di continuità mano a mano che la scala cresce.

Ogni idea diventa un piano dedicato (come FAN_ACCOUNTS_PLAN) prima dell'implementazione, con requisiti, sicurezza e stima costi.

---

## 6. Dipendenze (ordine obbligato)

```
Go-live MVP (Orizzonte 0)
        │
        ▼
Prodotto web completo + Account tifosi + Sponsor (Orizzonte 1)
        │
        ├── Mobile Flutter ─┐
        ▼                   ▼
Shop / Biglietti / Membership + Notifiche + Finanze (Orizzonte 2)
        │
        ▼
Community + Gamification + Live avanzato + Analytics avanzate (Orizzonte 3)
        │
        ▼
Innovazione (Fan ID, AI, multilingua, PWA, donazioni…) e scala (Orizzonte 4)
```

Regole: gli account tifosi precedono community/shop/notifiche; i pagamenti precedono shop/biglietti/membership; il live avanzato arriva dopo un match center manuale affidabile.

---

## 7. Rischi e nodi decisionali (da chiarire per fase)

- **Costi vs quote gratuite:** shop, notifiche push, streaming e AI possono richiedere servizi a pagamento (es. Stripe, Blaze, provider dati). Ogni introduzione con stima costi.
- **Diritti e privacy:** streaming/video richiede diritti; community e CRM richiedono conformità GDPR.
- **Capacità operativa:** più aree = più moderazione e gestione contenuti; servono ruoli e processi.
- **Pagamenti e sicurezza:** mai gestire dati carta internamente; usare provider certificati.
- **Sostenibilità mobile:** l'app parte solo dopo contratti API e HTTPS stabili.

---

## 8. Criteri di successo per orizzonte

- **O0:** sito+admin live su dominio reale, HTTPS, backup ripristinabile, flussi critici verificati.
- **O1:** il club pubblica contenuti senza toccare il codice; tifosi registrati; sponsor visibili e gestiti.
- **O2:** app installabile su iOS/Android collegata alle stesse API; primo flusso di ricavo (shop o biglietti o membership) funzionante.
- **O3:** community attiva e moderata; analytics che guidano decisioni editoriali/sportive.
- **O4:** almeno due funzioni innovative in produzione con impatto misurabile su engagement o ricavi.
- **O5 (direzionale):** piattaforma sostenibile e gestibile dal club; almeno un asset riutilizzabile (white-label o Fan ID a regime) o una nuova leva di ricavo consolidata.
- **O6 (esploratorio):** il club ha un'identità e un archivio digitali duraturi, portabili e indipendenti da un singolo fornitore.

---

## 9. Prossimo passo

Confermare gli **orizzonti e le priorità**, poi trasformare la prima area dell'Orizzonte 1 (proposta: **Sponsor**, alto valore e basso rischio) in un piano di implementazione dettagliato e, dopo approvazione, in codice. Le idee nuove della sezione 5 vanno prioritizzate insieme prima di aprirne i piani dedicati.
