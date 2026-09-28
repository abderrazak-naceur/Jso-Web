# JSO Web — piano aggiornato

**Aggiornato:** 28 settembre 2026
**Stato:** prodotto web e app mobile completi nel codice; resta il go-live su ambiente reale.

## Cosa manca (sintesi)

Il lavoro realizzabile via codice è completo. Ciò che resta richiede l'ambiente reale/gli account, non altro sviluppo:

- **Priorità 0 — Go-live (bloccato dall'ambiente):** VM Oracle, dominio + HTTPS, CORS verificati sul dominio reale; backup e restore eseguiti e verificati su dati reali; smoke test admin → API → PostgreSQL → sito nel browser di produzione. **Checklist operativa passo-passo: [Go-live](GO_LIVE.md).**
- **Priorità 1 — Prodotto web:** completo nel codice (contenuti+stati, editor admin, sicurezza/audit, SEO, accessibilità, prestazioni). Resta solo il collaudo manuale su ambiente reale (lettore di schermo per WCAG, Lighthouse).
- **Priorità 2 — App mobile:** completa nel codice. Resta il collaudo su dispositivi Android/iOS fisici, la firma e la pubblicazione sugli store, e le eventuali notifiche push FCM (richiedono account developer/Firebase).
- **Priorità 3 — Funzioni successive:** community/moderazione, pagamenti, analytics avanzati — in gran parte già presenti nel backend, da rifinire dopo il go-live.

## Decisione architetturale per l'MVP

- **Sito e admin:** React/Vite.
- **API e regole applicative:** ASP.NET Core .NET 10, condivisa con la futura app Flutter.
- **Dati di produzione:** PostgreSQL 17 tramite EF Core su Oracle Cloud Always Free; SQL Server resta un'opzione per lo sviluppo locale.
- **Media caricati dall'admin:** volume persistente sulla VM, con backup e prova di ripristino.
- **Mobile:** Flutter/Dart, inizialmente collegato alle API esistenti.
- **Firebase:** opzionale per Hosting del frontend, Cloud Messaging e Crashlytics. Non è prevista una migrazione a Firestore nell'MVP.

PostgreSQL non richiede una licenza a pagamento. L'obiettivo di costo infrastrutturale è €0/mese **solo se** risorse Oracle/Firebase e traffico restano nelle quote gratuite; disponibilità della VM, dominio e operatività vanno verificati. Le motivazioni e le fonti sono in [Firebase vs PostgreSQL](FIREBASE_VS_POSTGRESQL_ANALYSIS.md). Questa decisione non implica che il deployment sia già stato eseguito.

## Stato verificato nel repository

- [x] Sito pubblico React responsive e identità JSO; logo e concept Flutter nel README.
- [x] API .NET, modello EF Core, provider SQL Server/PostgreSQL configurabili e Docker Compose production.
- [x] Login admin JWT e ruoli, dashboard, gestione iniziale di squadra/giocatori, partite, news e upload media.
- [x] Gestione admin di stagioni e competizioni con CRUD completo (create/list/update/delete, autorizzato, validato, con audit; il delete è rifiutato se referenziate da una partita).
- [x] Sito pubblico senza contenuti demo: notizie con stati caricamento/errore/vuoto e link reale all'articolo via slug; badge di stato API in francese.
- [x] Workflow CI con build/lint frontend, build backend, controlli Docker frontend/ARM64 e configurazione Nginx verificati.
- [x] Migration EF Core PostgreSQL iniziale versionata, applicata e verificata su PostgreSQL 17 in CI, con login admin e smoke test di notizie e media.
- [x] URL API predefinito del frontend impostato su `/api`, con proxy locale Vite e proxy Nginx nel compose production.
- [x] Script di backup PostgreSQL/media e procedura di recovery predisposti; non ancora eseguiti su dati reali.
- [ ] URL API, CORS e HTTPS verificati sul dominio reale.
- [ ] Ambiente Oracle reale, HTTPS, backup e restore verificati.
- [x] App Flutter implementata: Home, Match Center (Résumé/Direct/Compos/Stats), Actualités, Équipe, Médias, account tifoso completo (profilo, password, RGPD), Boutique e Biglietteria, hub Plus, design allineato al brand. Vedi [`mobile/README.md`](../mobile/README.md).
- [ ] App Flutter collaudata su dispositivi Android/iOS reali e pubblicata sugli store; notifiche push (FCM) da valutare.

Le caselle completate attestano la presenza delle funzioni nel codice, non un collaudo end-to-end o il go-live.

## Priorità 0 — Rendere pubblicabile lo stack esistente

Lavorare in quest'ordine, perché i passaggi successivi dipendono dai precedenti:

1. **Configurazione API e frontend:** routing relativo `/api`, proxy Vite/Nginx e CORS configurati nel codice. Verificare richieste pubbliche e login admin dal browser sul dominio reale durante il collaudo.
2. **Schema PostgreSQL:** la migration iniziale e il bootstrap admin passano in CI. Prima del go-live verificare applicazione, backup e restore sull'ambiente Oracle scelto. Non riutilizzare una migration SQL Server senza controllo.
3. **Dati persistenti:** i volumi e lo script di backup sono predisposti; automatizzare backup, retention e copia esterna, poi completare almeno un restore documentato.
4. **Sicurezza e deploy:** la build ARM64 e il controllo Nginx passano in CI. Predisporre VM, segreti fuori dal repository, porte minime, HTTPS e dominio; verificare health check e accessi admin. Controllare disponibilità e limiti Always Free prima del go-live.
5. **Percorso end-to-end e CI:** notizie e media sono verificati contro PostgreSQL in CI. Estendere il test alle partite e collaudare admin → API → PostgreSQL → sito nel browser reale.

**Criterio di uscita:** sito e admin usabili sul dominio reale con PostgreSQL, dati persistenti, HTTPS, backup ripristinabile e flussi critici verificati. Senza questo criterio, lo stato resta pre-produzione.

## Priorità 1 — Completare il prodotto web

- [x] Collegare e rifinire tutti i contenuti pubblici ai dati reali: homepage, match center, notizie, squadra e media; gestire loading, assenza dati ed errori. Ogni sezione dinamica distingue caricamento/vuoto/errore (niente placeholder "à venir" quando l'API risponde o fallisce).
- [x] Completare gli editor admin: configurazione homepage e menu/footer, sponsor (+ QR), partite con eventi, formazioni, officiels e statistiche, articoli (create/update/publish/dépublier/supprimer) e libreria media (upload/modifica/suppression).
- [x] Rivedere sessioni e permessi admin, tracciamento audit e gestione degli errori. Audit di tutti i controller admin: ogni rotta sotto `[Authorize]` con ruoli corretti, nessun `[AllowAnonymous]`, nessuna superficie di escalation ruoli, token fan isolati, prezzi/stati validati server-side. Corretti gli unici due gap (audit mancante su team/giocatori e media). Resta da collaudare su flussi reali in produzione.
- [x] Accessibilità, prestazioni e SEO sulle pagine pubbliche: SEO (Open Graph/Twitter, canonical, JSON-LD, `robots.txt`, `sitemap.xml`, titoli dinamici); accessibilità (id duplicati risolti, nomi accessibili dei modali, alt significativi, link "nouvel onglet"; oltre al pannello accessibilità, skip link e focus management già presenti); prestazioni (code-splitting admin/paiement: bundle pubblico iniziale ~561→~281 kB). Restano fuori dal codice: audit WCAG manuale con lettore di schermo e misura Lighthouse sull'ambiente reale.

**Criterio di uscita:** il club pubblica contenuti e aggiorna i dati sportivi senza modificare il codice, e il sito riflette le modifiche. **Le funzioni sono complete nel codice; resta il collaudo su ambiente reale (vedi Priorità 0).**

## Priorità 2 — App Flutter

L'app Flutter è implementata e collegata all'API reale (vedi [`mobile/README.md`](../mobile/README.md)); i concept immagine restano riferimenti grafici.

1. [x] Progetto Flutter + design system JSO allineato al brand; ambienti e client API configurati.
2. [x] Home, Match Center (Résumé/Direct/Compos/Stats), notizie, squadra e media con stati caricamento/errore.
3. [x] Login, profilo, gestione account completa (modifica profilo, password, RGPD); token protetto nel keystore/Keychain.
4. [ ] Firebase Cloud Messaging (notifiche) e Crashlytics: da valutare. Un centro notifiche in-app (senza push) è già presente.
5. [ ] Testare su dispositivi Android e iOS reali; preparare build firmate e pubblicazione sugli store.

Extra implementati oltre al piano: Boutique con ordini, Biglietteria, hub "Plus" (agenda, documents, FAQ, musée, écoles, sponsors), blason officiel.

**Criterio di uscita:** app installabile su entrambi i sistemi, collegata agli stessi dati del sito, con flussi principali verificati su dispositivi reali. **Codice completo; resta il collaudo su dispositivi fisici, la firma/pubblicazione store e le eventuali notifiche push (richiedono account e ambiente dedicati).**

## Priorità 3 — Funzioni successive

- Community e moderazione, dopo regole di accesso, privacy e strumenti operativi.
- Boutique, pagamenti, sponsor e analytics avanzati, dopo definizione dei requisiti commerciali.
- Live data/provider esterni, dopo affidabilità del Match Center manuale.

## Opzioni Firebase e punti decisionali

- **Firebase Hosting:** fare una prova solo se offre un vantaggio operativo sul sito statico; misurare peso degli asset e traffico rispetto alla quota Spark. L'API .NET resta ospitata separatamente.
- **Firebase Cloud Messaging/Crashlytics:** introdurre con l'app Flutter se servono notifiche e diagnostica.
- **Firestore, Firebase Auth o Cloud Storage:** aprire una nuova decisione tecnica solo con un requisito concreto, una stima dei costi e un piano di migrazione. Cloud Storage richiede Blaze; il progetto non assume che l'intero stack Firebase sia sempre gratuito.

## Documenti collegati

- [Checklist go-live (passo-passo)](GO_LIVE.md)
- [Analisi Firebase vs PostgreSQL](FIREBASE_VS_POSTGRESQL_ANALYSIS.md)
- [Decisione database production](DATABASE_PRODUCTION_DECISION.md)
- [Piano deploy Oracle](DEPLOY_ORACLE_CLOUD.md)
- [Analisi mobile](MOBILE_ANALYSIS.md)
