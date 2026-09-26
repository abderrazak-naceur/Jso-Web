# JSO - Piano di idee nuove (complementari alla vision)

**Stato:** proposta / solo piano, nessuna implementazione. Nessun codice scritto, nessun impegno di spesa. Ogni idea qui elencata va approvata e poi trasformata in un piano dedicato prima di toccare il codice.

Questo documento estende [PLATFORM_VISION_2030](PLATFORM_VISION_2030.md) con un catalogo di **idee nuove e complementari**. Non duplica le 12 idee della sezione 5 della vision (Fan ID & wallet, gamification & fedeltà, predictor/fantasy, assistente AI del club, highlights e clip, multilingua AR/FR/EN, PWA installabile, sponsor analytics & self-service, accademia/settore giovanile, donazioni & crowdfunding, CRM tifosi & segmentazione, osservabilità & resilienza) né le 12 idee di monetizzazione della sezione 6 del [BUSINESS_PLAN](BUSINESS_PLAN.md) (bundle stagionale streaming, sponsor self-service con report, sponsorizzazione di contenuti, membership a livelli, donazioni ricorrenti, crowdfunding a obiettivo, merchandising print-on-demand, partnership locali/affiliazione, contenuti premium academy, eventi ibridi, NFT sconsigliati, Fan ID come hub commerciale). Dove un'idea è adiacente a un piano già esistente, la si collega con un link relativo invece di ripeterne il contenuto.

**Convenzioni onorate ovunque** (dalla sezione 2 della vision): sicurezza prima (rotte admin sotto `[Authorize(Roles=...)]`, identità tifoso separata dagli admin, audit su tutte le scritture, nessun segreto nel repo); dati con migration PostgreSQL versionata, campi aggiunti a entità esistenti sempre nullable o con default, soldi in `numeric(14,2)`; API-first e versionabile, pensata anche per Flutter; frontend con riuso del [design system JSO](DESIGN_SYSTEM.md) e stati loading/vuoto/errore chiari; privacy/GDPR (consenso, informativa, cancellazione) dove si raccolgono dati personali; costi vicino a zero dentro le quote gratuite, con nota costi esplicita su ogni servizio a pagamento.

**Nota sullo stato attuale delle registrazioni:** oggi nel codice esiste **solo l'identità admin** (`AdminUser` con ruoli `SuperAdmin, ClubAdmin, Editor, MatchManager, CommunityManager, ShopManager`): gli unici account che esistono oggi sono amministrativi. Non c'è un flusso di auto-registrazione pubblico (l'attuale `AuthController` gestisce solo il login su account admin gia predisposti) e non esiste ancora un account tifoso. L'identità tifoso separata (`FanUser`, ruolo `Fan` che non accede a `/api/admin/*`) è una **proposta prerequisito** descritta in [FAN_ACCOUNTS_PLAN](FAN_ACCOUNTS_PLAN.md), non una funzione già disponibile. Perciò ogni idea qui sotto che richiede un profilo tifoso (invio contenuti, acquisti, preferenze personali) presuppone che quel piano venga realizzato prima; fino ad allora quelle idee restano bloccate su questo prerequisito e i riferimenti a `FanUser`/ruolo `Fan` vanno letti come identità futura da introdurre, mai come un privilegio concesso a un admin.

**Legenda orizzonti** (vedi [PLATFORM_VISION_2030](PLATFORM_VISION_2030.md) sezione 3): O0 go-live MVP, O1 prodotto web completo + account, O2 mobile + monetizzazione, O3 coinvolgimento e dati avanzati, O4 innovazione e scala, O5 ecosistema (direzionale), O6 visione lunga (esplorativo).

---

## A. Engagement tifosi

### A1. Match day live blog / second screen
- **Obiettivo/valore:** un flusso testuale di aggiornamenti in tempo quasi reale (gol, cartellini, sostituzioni, commento redazionale) che tiene i tifosi sul sito durante la partita, anche senza streaming. Complementare al live match center avanzato della vision 4.9, ma qui è puramente editoriale e disponibile da subito.
- **Dominio/API/frontend:** nuova entità `LiveBlogEntry` (`Id`, `MatchId`, `Minute` nullable, `Kind` [testo/gol/cartellino/sostituzione], `Body`, `CreatedAt`, `IsPinned`) collegata a `Match`; admin `POST/PUT/DELETE /api/admin/matches/{id}/liveblog` sotto `[Authorize(Roles="MatchManager,ClubAdmin,Editor")]`; pubblico `GET /api/matches/{id}/liveblog` con polling leggero. Frontend: componente timeline che riusa il design system, con stati loading/vuoto/errore e auto-refresh a intervalli.
- **Impatto e rischio/costo:** alto engagement a costo vicino a zero (nessun servizio esterno). Rischio basso: solo carico di scrittura redazionale in giornata partita. Nessun dato personale del tifoso raccolto.
- **Collegamento:** orizzonte O1/O3, precursore di [PLATFORM_VISION_2030](PLATFORM_VISION_2030.md) 4.9.

### A2. UGC foto tifosi con moderazione
- **Obiettivo/valore:** i tifosi caricano foto da stadio/trasferte; la redazione modera e pubblica una galleria community. Aumenta appartenenza e contenuti gratuiti.
- **Dominio/API/frontend:** `FanPhoto` (`Id`, `FanUserId`, `MediaAssetId`, `Caption` nullable, `Status` [in attesa/approvata/rifiutata], `SubmittedAt`); riusa `MediaAsset` per lo storage. API: invio autenticato `Fan` `POST /api/fan/photos`; coda di moderazione `GET/PUT /api/admin/fan-photos` sotto `[Authorize(Roles="CommunityManager,Editor")]`. Frontend: upload con anteprima, galleria pubblica solo approvate.
- **Impatto e rischio/costo:** engagement alto; rischio contenuti inappropriati mitigato da moderazione obbligatoria pre-pubblicazione e audit. Privacy/GDPR: consenso alla pubblicazione, diritto di rimozione, attenzione a volti di minori (richiedere consenso esplicito). Costo storage dentro la quota VM; oltre soglia serve object storage a pagamento (nota costi).
- **Collegamento:** dipende dagli account tifoso di [FAN_ACCOUNTS_PLAN](FAN_ACCOUNTS_PLAN.md); orizzonte O3, adiacente a community/moderazione [PLATFORM_VISION_2030](PLATFORM_VISION_2030.md) 4.3.

### A3. Touchpoint compleanni e anniversari tifoso
- **Obiettivo/valore:** messaggi automatici di auguri e ricorrenze (anni da iscrizione, anniversario prima partita seguita) per fidelizzare senza costi.
- **Dominio/API/frontend:** campi nullable su `FanUser` (`BirthDate`, `MemberSince`); job schedulato che genera un touchpoint. API interna, nessun endpoint pubblico nuovo; opzionale banner personalizzato in home tifoso. Frontend: messaggio nel profilo/e-mail digest.
- **Impatto e rischio/costo:** valore relazionale medio, sforzo basso. Privacy/GDPR: data di nascita è dato personale, richiede consenso e minimizzazione; invio solo con opt-in. Costo zero (email nella quota, altrimenti nota costi provider).
- **Collegamento:** adiacente a CRM tifosi (vision idea 11) ma qui è un automatismo mirato; orizzonte O2. Vedi [FAN_ACCOUNTS_PLAN](FAN_ACCOUNTS_PLAN.md).

### A4. Newsletter digest via e-mail
- **Obiettivo/valore:** riepilogo settimanale (risultati, prossime partite, ultime news) inviato a chi si iscrive; riporta traffico al sito.
- **Dominio/API/frontend:** `NewsletterSubscription` (`Id`, `Email`, `FanUserId` nullable, `ConfirmedAt` nullable per double opt-in, `Unsubscribed`); generazione digest da dati esistenti. API: `POST /api/newsletter/subscribe` pubblico con conferma; gestione invii sotto `[Authorize(Roles="Editor,CommunityManager")]`. Frontend: form iscrizione con stati chiari e pagina di conferma.
- **Impatto e rischio/costo:** retention medio-alta. Privacy/GDPR: double opt-in, link di disiscrizione in ogni e-mail, informativa. Nota costi: provider e-mail transazionale gratuito entro quota, a pagamento a volume.
- **Collegamento:** orizzonte O1/O2; complementare a notifiche [PLATFORM_VISION_2030](PLATFORM_VISION_2030.md) 4.7.

---

## B. Monetizzazione (nuove leve, non in BUSINESS_PLAN sez. 6)

### B5. Attivazione sponsor via QR allo stadio
- **Obiettivo/valore:** QR fisici a bordocampo/nei programmi partita che aprono una landing sponsor tracciata; misura l'attivazione offline-to-online e dà valore vendibile allo sponsor senza fee di pagamento.
- **Dominio/API/frontend:** estende `Sponsor` con `ActivationSlug` nullable e nuova `SponsorActivation` (`Id`, `SponsorId`, `Channel`, `ScannedAt`) per il conteggio scansioni. API: pubblico `GET /api/sponsors/activation/{slug}` (registra scan e reindirizza); report sotto `[Authorize(Roles="ClubAdmin,SuperAdmin")]`. Frontend: landing riusa design system; nessun dato personale nel tracking (solo aggregati).
- **Impatto e rischio/costo:** valore commerciale medio-alto, costo zero. Distinto dal report impression/clic web della vision 4.1 e dal sponsor self-service del business plan (qui è attivazione fisica in-stadio). Privacy: conteggio anonimo, nessun tracking individuale.
- **Collegamento:** orizzonte O1, estende [PLATFORM_VISION_2030](PLATFORM_VISION_2030.md) 4.1.

### B6. Marketplace piccoli annunci della comunità
- **Obiettivo/valore:** bacheca moderata dove attività locali e tifosi pubblicano annunci (a pagamento simbolico o gratuito con priorità a pagamento); ricavo nuovo e servizio alla comunità.
- **Dominio/API/frontend:** `ClassifiedAd` (`Id`, `AuthorFanUserId`, `Title`, `Body`, `Category`, `Status` moderazione, `Price` `numeric(14,2)` nullable per la fee di pubblicazione, `ExpiresAt`). API: invio autenticato `Fan`, moderazione `CommunityManager`. Frontend: elenco filtrabile con stati vuoto/errore.
- **Impatto e rischio/costo:** ricavo piccolo ma ricorrente; rischio moderazione e responsabilità sui contenuti (serve regolamento). Se si introduce la fee, dipende dal gateway TND (nota costi, vedi nodo pagamenti nel [BUSINESS_PLAN](BUSINESS_PLAN.md)). Privacy/GDPR: dati di contatto trattati con consenso.
- **Collegamento:** orizzonte O3, distinto da partnership/affiliazione del business plan.

### B7. Muro dei sostenitori digitale (mattoni virtuali)
- **Obiettivo/valore:** i tifosi acquistano un "mattone" con nome/dedica visibile in una pagina permanente del sito; leva emotiva per raccolta fondi non basata su campagne temporanee.
- **Dominio/API/frontend:** `SupporterBrick` (`Id`, `FanUserId` nullable, `DisplayName`, `Message` nullable, `Amount` `numeric(14,2)`, `PaidAt`). API: acquisto `Fan`, moderazione testo `CommunityManager`, muro pubblico in sola lettura. Frontend: griglia/muro con ricerca nome.
- **Impatto e rischio/costo:** ricavo volontario, valore di appartenenza alto. Distinto da donazioni ricorrenti e crowdfunding (qui è un riconoscimento permanente una tantum). Richiede gateway pagamenti (nota costi). Privacy: nome mostrato solo con consenso, moderazione anti-abuso.
- **Collegamento:** orizzonte O3, complementare a donazioni [PLATFORM_VISION_2030](PLATFORM_VISION_2030.md) sez. 5 idea 10.

---

## C. Sportivo / analytics

### C8. Registro infortuni e disponibilità giocatori
- **Obiettivo/valore:** traccia infortuni, tempi di recupero e disponibilità per partita; supporta le scelte di formazione e collega gli assenti al match center.
- **Dominio/API/frontend:** `PlayerInjury` (`Id`, `PlayerId`, `Type`, `StartDate`, `ExpectedReturn` nullable, `Status`, `Notes` nullable). API admin `/api/admin/players/{id}/injuries` sotto `[Authorize(Roles="MatchManager,ClubAdmin")]`. Frontend: sezione nel profilo giocatore admin con stati chiari.
- **Impatto e rischio/costo:** valore sportivo/operativo medio, costo zero. Privacy/GDPR: dati sanitari sono categoria particolare, accesso ristretto, audit, minimizzazione (evitare dettagli clinici non necessari).
- **Collegamento:** estende [ADMIN_SQUAD_FINANCE_ANALYTICS_PLAN](ADMIN_SQUAD_FINANCE_ANALYTICS_PLAN.md) (gestione squadra/disponibilità); orizzonte O1/O3.

### C9. Note di scouting avversari e giovani osservati
- **Obiettivo/valore:** appunti strutturati su squadre avversarie e giocatori osservati (settore giovanile o mercato locale), riutilizzabili dallo staff tecnico.
- **Dominio/API/frontend:** `ScoutingNote` (`Id`, `Subject`, `SubjectType` [avversario/giocatore], `MatchId` nullable, `Rating` nullable, `Body`, `AuthorAdminId`, `CreatedAt`). API admin sotto `[Authorize(Roles="MatchManager,ClubAdmin")]`. Frontend: elenco filtrabile per tipo/valutazione.
- **Impatto e rischio/costo:** valore sportivo medio, sforzo basso. Privacy/GDPR: se riguarda minori del vivaio, consenso e accesso ristretto. Costo zero.
- **Collegamento:** distinto dall'accademia della vision (idea 9, orientata a profili di crescita pubblici); qui è uno strumento interno. Estende [ADMIN_SQUAD_FINANCE_ANALYTICS_PLAN](ADMIN_SQUAD_FINANCE_ANALYTICS_PLAN.md); orizzonte O3.

### C10. Museo digitale e archivio storico
- **Obiettivo/valore:** navigazione dell'archivio del club (stagioni passate, risultati storici, foto d'epoca, albo d'oro) come patrimonio e contenuto sempreverde.
- **Dominio/API/frontend:** `ArchiveItem` (`Id`, `Year` nullable, `Category`, `Title`, `Body`, `MediaAssetId` nullable); riusa `MediaAsset`. API: pubblico `GET /api/archive`, gestione sotto `[Authorize(Roles="Editor,ClubAdmin")]`. Frontend: timeline navigabile per anno con stati vuoto/errore.
- **Impatto e rischio/costo:** valore identitario alto, sforzo medio (soprattutto raccolta dati). Costo storage dentro quota. Nessun dato personale sensibile.
- **Collegamento:** concretizza l'"eredità del club" dell'orizzonte O6; orizzonte O2/O4.

---

## D. Operations / admin

### D11. Gestione volontari e roster giornata partita
- **Obiettivo/valore:** pianificare chi fa cosa in giornata partita (biglietteria, accoglienza, sicurezza informale, foto) con turni e conferme; riduce il caos operativo di un club di comunità.
- **Dominio/API/frontend:** `Volunteer` (`Id`, `Name`, `Contact` nullable, `Role`) e `MatchAssignment` (`Id`, `MatchId`, `VolunteerId`, `Task`, `Status` [proposto/confermato]). API admin `/api/admin/matches/{id}/assignments` sotto `[Authorize(Roles="MatchManager,ClubAdmin")]`. Frontend: griglia turni per partita.
- **Impatto e rischio/costo:** valore operativo alto, costo zero. Privacy/GDPR: dati di contatto dei volontari con consenso e minimizzazione.
- **Collegamento:** orizzonte O1/O2, area operations non coperta dai piani esistenti.

### D12. Assegnazione arbitri e ufficiali di gara
- **Obiettivo/valore:** registrare arbitro e ufficiali designati per ogni partita, con stato conferma; utile per organizzazione e archivio storico.
- **Dominio/API/frontend:** `MatchOfficial` (`Id`, `MatchId`, `Name`, `Role` [arbitro/assistente/quarto uomo], `Confirmed`). API admin sotto `[Authorize(Roles="MatchManager,ClubAdmin")]`; opzionale esposizione pubblica minimale in scheda partita. Frontend: campo nel dettaglio partita admin.
- **Impatto e rischio/costo:** valore operativo basso-medio, sforzo minimo. Privacy: dati minimi, solo nome/ruolo pubblico se consentito.
- **Collegamento:** estende il match center; orizzonte O1.

### D13. Calendario editoriale e pubblicazione programmata
- **Obiettivo/valore:** pianificare quando escono news/contenuti, con stato bozza/programmato/pubblicato e vista calendario; evita pubblicazioni disordinate.
- **Dominio/API/frontend:** aggiungere ad `Article` campi nullable `ScheduledAt` e `EditorialStatus` (default bozza); job che pubblica gli articoli programmati. API admin `/api/admin/editorial-calendar` sotto `[Authorize(Roles="Editor,ClubAdmin")]`. Frontend: vista calendario e stato pubblicazione.
- **Impatto e rischio/costo:** valore operativo alto per la redazione, sforzo medio. Costo zero. Nessun dato personale.
- **Collegamento:** estende la gestione contenuti attuale; orizzonte O1.

### D14. Checklist automatica giornata partita
- **Obiettivo/valore:** una checklist ricorrente generata per ogni partita (impianto pronto, biglietteria aperta, live blog attivo, social programmati) con spunte e responsabili; standardizza le operazioni.
- **Dominio/API/frontend:** `MatchdayChecklistTemplate` e `MatchdayChecklistItem` (`Id`, `MatchId`, `Label`, `Done`, `AssigneeAdminId` nullable). API admin sotto `[Authorize(Roles="MatchManager,ClubAdmin")]`. Frontend: lista con spunte e progresso.
- **Impatto e rischio/costo:** valore operativo alto, costo zero, sforzo basso-medio. Nessun dato personale rilevante.
- **Collegamento:** si integra con D11 (volontari); orizzonte O1/O2.

### D15. Prenotazione strutture e manutenzione campo
- **Obiettivo/valore:** calendario di prenotazione di campo/sala e registro manutenzioni (irrigazione, taglio erba, riparazioni); evita sovrapposizioni e tiene lo storico.
- **Dominio/API/frontend:** `Facility` e `FacilityBooking` (`Id`, `FacilityId`, `StartsAt`, `EndsAt`, `Purpose`, `BookedByAdminId`), più `MaintenanceLog`. API admin sotto `[Authorize(Roles="ClubAdmin,MatchManager")]`. Frontend: calendario prenotazioni con conflitti evidenziati.
- **Impatto e rischio/costo:** valore operativo medio, costo zero. Nessun dato personale sensibile.
- **Collegamento:** area operations nuova; orizzonte O2.

---

## E. Tech / piattaforma

### E16. Dashboard di utilizzo e rate limit delle API
- **Obiettivo/valore:** vista admin del volume di richieste per endpoint, errori e prossimità alle quote gratuite; anticipa i costi cloud prima di superare le soglie.
- **Dominio/API/frontend:** aggregazione da log/metriche (nessuna entità di dominio pesante; opzionale `ApiUsageDaily` con contatori). API `GET /api/admin/api-usage` sotto `[Authorize(Roles="SuperAdmin,ClubAdmin")]`. Frontend: grafici semplici con soglie evidenziate.
- **Impatto e rischio/costo:** valore operativo/costi alto, costo zero (metriche interne). Privacy: solo dati aggregati, nessun IP grezzo conservato oltre il necessario.
- **Collegamento:** concretizza l'osservabilità (vision idea 12) sul versante costi/quote; orizzonte O2/O4. Vedi [DEPLOY_ORACLE_CLOUD](DEPLOY_ORACLE_CLOUD.md).

### E17. Centro esportazione e portabilità dati (GDPR)
- **Obiettivo/valore:** self-service per il tifoso che scarica i propri dati (profilo, ordini, preferenze) e richiede la cancellazione; requisito di conformità e fiducia.
- **Dominio/API/frontend:** `DataExportRequest` (`Id`, `FanUserId`, `RequestedAt`, `Status`, `FileRef` nullable) e flusso di cancellazione con anonimizzazione. API: `POST /api/fan/data-export` e `POST /api/fan/account-deletion` autenticati `Fan`; gestione richieste sotto `[Authorize(Roles="SuperAdmin,ClubAdmin")]` con audit. Frontend: sezione privacy nel profilo tifoso.
- **Impatto e rischio/costo:** valore conformità alto, sforzo medio. Privacy/GDPR: è il cuore del diritto di accesso e cancellazione; audit obbligatorio. Costo zero.
- **Collegamento:** rende operativi i principi GDPR della vision sez. 2 e di [FAN_ACCOUNTS_PLAN](FAN_ACCOUNTS_PLAN.md); orizzonte O1/O2. Vedi [SECURITY_ANALYSIS](SECURITY_ANALYSIS.md).

### E18. Feature flag e A/B test dei contenuti
- **Obiettivo/valore:** attivare/disattivare funzioni o varianti di home senza rilascio, e misurare quale versione converte meglio; sperimentazione a basso rischio.
- **Dominio/API/frontend:** `FeatureFlag` (`Id`, `Key`, `Enabled`, `Variant` nullable, `RolloutPercent` nullable). API: lettura pubblica dei flag attivi, gestione sotto `[Authorize(Roles="SuperAdmin,ClubAdmin")]`. Frontend: guardie di rendering basate sui flag, con fallback sicuro.
- **Impatto e rischio/costo:** valore piattaforma medio, sforzo medio, costo zero (interno). Privacy: assegnazione variante senza profilazione personale (per sessione anonima).
- **Collegamento:** abilita sperimentazione su Homepage Builder [PLATFORM_VISION_2030](PLATFORM_VISION_2030.md) 4.2; orizzonte O3/O4.

### E19. Modalità stadio offline (PWA leggera)
- **Obiettivo/valore:** cache di calendario, formazioni e info essenziali per l'uso allo stadio con rete debole; migliora l'esperienza dal vivo.
- **Dominio/API/frontend:** nessuna entità nuova; service worker con cache dei dati pubblici già esposti e pagina offline. API: riuso endpoint pubblici esistenti con header di cache. Frontend: banner "modalità offline" con dati salvati e stati chiari.
- **Impatto e rischio/costo:** valore esperienza medio, costo zero. Rischio basso (solo dati pubblici in cache). Nessun dato personale.
- **Collegamento:** taglio verticale e distinto della PWA della vision (idea 7), focalizzato sul contesto stadio; orizzonte O4.

---

## F. Innovazione / AI

### F20. Sottotitoli e trascrizioni automatiche dei contenuti
- **Obiettivo/valore:** generare trascrizioni/sottotitoli per interviste e clip, migliorando accessibilità e SEO. Con revisione umana prima della pubblicazione.
- **Dominio/API/frontend:** `MediaTranscript` (`Id`, `MediaAssetId`, `Language`, `Body`, `ReviewedByAdminId` nullable, `Status`). API admin sotto `[Authorize(Roles="Editor,ClubAdmin")]`. Frontend: pannello di revisione e player con sottotitoli.
- **Impatto e rischio/costo:** valore accessibilità/SEO alto. Nota costi: servizio di trascrizione AI a pagamento per-minuto/token, da attivare solo se giustificato; alternativa manuale a costo zero. Privacy: attenzione a voci/dati personali nei contenuti. Distinto dall'assistente AI (vision idea 4) e dagli highlights (idea 5): qui è testo di supporto ai media.
- **Collegamento:** orizzonte O4; complementare al multilingua (vision idea 6).

---

## G. Sostenibilità / comunità territoriale

### G21. Modalità accessibilità e lettura facilitata
- **Obiettivo/valore:** temi ad alto contrasto, testo ingrandibile, riduzione animazioni e struttura leggibile da screen reader; inclusione e conformità alle buone pratiche di accessibilità.
- **Dominio/API/frontend:** nessuna entità; preferenze salvate localmente (o campo nullable `AccessibilityPrefs` su `FanUser` se loggato). API: nessuna nuova rotta necessaria. Frontend: switch nel design system, attributi ARIA, focus management.
- **Impatto e rischio/costo:** valore inclusione alto, sforzo medio, costo zero. Privacy: preferenze non sensibili, salvate localmente per gli anonimi.
- **Collegamento:** rafforza il design system [DESIGN_SYSTEM](DESIGN_SYSTEM.md); orizzonte O1/O2.

### G22. Promemoria partita con meteo
- **Obiettivo/valore:** promemoria pre-partita che includono le condizioni meteo previste (utile per trasferte e partite all'aperto); piccola comodità che aumenta le presenze.
- **Dominio/API/frontend:** nessuna entità di dominio nuova rilevante; il promemoria riusa i dati partita. API: arricchimento del promemoria lato server. Frontend: card promemoria con icona meteo e stati chiari.
- **Impatto e rischio/costo:** valore comodità basso-medio. Nota costi: API meteo esterna gratuita entro quota, a pagamento a volume; scegliere un provider con piano free. Privacy: nessun dato personale oltre la preferenza di notifica (opt-in).
- **Collegamento:** si appoggia alle notifiche [PLATFORM_VISION_2030](PLATFORM_VISION_2030.md) 4.7; orizzonte O2.

### G23. Programma scuole e club partner del territorio
- **Obiettivo/valore:** pagine e gestione di iniziative con scuole e associazioni locali (open day, tornei di quartiere), rafforzando il radicamento territoriale del club.
- **Dominio/API/frontend:** `CommunityProgram` (`Id`, `Title`, `PartnerName`, `Description`, `StartDate`, `EndDate` nullable, `ContactEmail` nullable). API: pubblico in sola lettura, gestione sotto `[Authorize(Roles="ClubAdmin,CommunityManager")]`. Frontend: elenco iniziative con stati vuoto/errore.
- **Impatto e rischio/costo:** valore comunità alto, costo zero. Privacy/GDPR: contatti dei partner con consenso; se coinvolge minori, gestione consensi lato scuola.
- **Collegamento:** area comunità nuova, coerente con l'orizzonte O5 (ecosistema del territorio); orizzonte O2/O3.

---

## H. Riepilogo prioritizzazione (valore vs sforzo/rischio)

Scala qualitativa (Basso / Medio / Alto). Il valore è per il club/tifosi; lo sforzo/rischio include complessità tecnica, moderazione e costi.

| # | Idea | Tema | Valore | Sforzo/Rischio | Orizzonte | Nota costi |
|---|---|---|---|---|---|---|
| A1 | Live blog / second screen | Engagement | Alto | Basso | O1/O3 | Zero |
| A2 | UGC foto tifosi | Engagement | Alto | Medio | O3 | Storage oltre quota |
| A3 | Touchpoint compleanni | Engagement | Medio | Basso | O2 | Zero/email |
| A4 | Newsletter digest | Engagement | Medio-Alto | Basso | O1/O2 | Email a volume |
| B5 | QR sponsor allo stadio | Monetizzazione | Medio-Alto | Basso | O1 | Zero |
| B6 | Marketplace annunci | Monetizzazione | Medio | Medio-Alto | O3 | Gateway TND se a pagamento |
| B7 | Muro dei sostenitori | Monetizzazione | Medio | Medio | O3 | Gateway pagamenti |
| C8 | Registro infortuni | Sportivo | Medio | Basso | O1/O3 | Zero (dati sanitari) |
| C9 | Note scouting | Sportivo | Medio | Basso | O3 | Zero |
| C10 | Museo digitale | Sportivo | Alto | Medio | O2/O4 | Storage in quota |
| D11 | Volontari giornata partita | Operations | Alto | Basso | O1/O2 | Zero |
| D12 | Assegnazione arbitri | Operations | Basso-Medio | Basso | O1 | Zero |
| D13 | Calendario editoriale | Operations | Alto | Medio | O1 | Zero |
| D14 | Checklist giornata partita | Operations | Alto | Basso-Medio | O1/O2 | Zero |
| D15 | Prenotazione strutture | Operations | Medio | Basso | O2 | Zero |
| E16 | Dashboard uso API | Tech | Alto | Medio | O2/O4 | Zero |
| E17 | Centro export/portabilità | Tech | Alto | Medio | O1/O2 | Zero |
| E18 | Feature flag / A/B | Tech | Medio | Medio | O3/O4 | Zero |
| E19 | Modalità stadio offline | Tech | Medio | Basso | O4 | Zero |
| F20 | Trascrizioni automatiche | AI | Alto | Medio | O4 | AI a pagamento |
| G21 | Accessibilità | Comunità | Alto | Medio | O1/O2 | Zero |
| G22 | Promemoria con meteo | Comunità | Basso-Medio | Basso | O2 | API meteo a volume |
| G23 | Programma scuole/partner | Comunità | Alto | Basso | O2/O3 | Zero |

**Quick win consigliati** (alto valore, basso sforzo, costo zero): A1 live blog, D11 volontari, D14 checklist, B5 QR sponsor, G23 programma scuole. Sono buoni candidati ai primi piani dedicati perché non dipendono dai pagamenti né da servizi a pagamento.

---

## I. Prossimi passi

1. **Prioritizzare insieme al club** le idee di questo catalogo usando la tabella della sezione H, allineandole agli orizzonti O0-O6 di [PLATFORM_VISION_2030](PLATFORM_VISION_2030.md) e alle priorità della [ROADMAP](ROADMAP.md).
2. **Selezionare i quick win** (costo zero, nessuna dipendenza dai pagamenti) come primi candidati, senza anticipare aree che richiedono account tifoso o gateway di pagamento non ancora risolti (vedi nodo pagamenti nel [BUSINESS_PLAN](BUSINESS_PLAN.md)).
3. **Per ogni idea approvata, redigere un piano dedicato** sul modello di [FAN_ACCOUNTS_PLAN](FAN_ACCOUNTS_PLAN.md) e [ADMIN_SQUAD_FINANCE_ANALYTICS_PLAN](ADMIN_SQUAD_FINANCE_ANALYTICS_PLAN.md), con: dominio ed entità (migration PostgreSQL versionata, campi nullable/con default, soldi in `numeric(14,2)`), contratti API versionabili e pensati per Flutter, ruoli e `[Authorize]`, riuso del [design system](DESIGN_SYSTEM.md) con stati loading/vuoto/errore, valutazione privacy/GDPR e stima costi esplicita su ogni servizio a pagamento.
4. **Solo dopo l'approvazione del piano dedicato** si passa all'implementazione, con build/lint, smoke test CI e controlli anti-escalation dei ruoli prima di considerare chiusa l'area, coerentemente con la sezione 2 della vision.

> Questo documento resta una proposta: nessuna delle idee sopra è implementata o pianificata in via definitiva finché non diventa un piano dedicato approvato.
