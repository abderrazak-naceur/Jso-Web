# JSO Web — piano aggiornato

**Aggiornato:** 26 settembre 2026
**Stato:** sviluppo; il deployment production e l'app mobile non sono ancora completati.

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
- [x] Workflow CI e verifiche di build/lint presenti.
- [ ] Migration EF Core PostgreSQL versionata e provata su database di test.
- [ ] URL API del frontend corretto per il deploy; oggi il fallback è `http://localhost:5080/api`.
- [ ] Ambiente Oracle reale, HTTPS, backup e restore verificati.
- [ ] App Flutter implementata; le immagini attuali sono concept visivi.

Le caselle completate attestano la presenza delle funzioni nel codice, non un collaudo end-to-end o il go-live.

## Priorità 0 — Rendere pubblicabile lo stack esistente

Lavorare in quest'ordine, perché i passaggi successivi dipendono dai precedenti:

1. **Configurazione API e frontend:** eliminare il fallback `localhost` nella build production; configurare `VITE_API_URL`, CORS e proxy per il dominio reale. Verificare richieste pubbliche e login admin da un browser esterno durante il collaudo.
2. **Schema PostgreSQL:** generare migration per il provider PostgreSQL, revisionarla, applicarla a un database di prova e verificare seed, lettura e scrittura. Non riutilizzare una migration SQL Server senza controllo.
3. **Dati persistenti:** configurare volumi per database e upload, backup automatico con retention e copia esterna; completare almeno un restore documentato.
4. **Sicurezza e deploy:** predisporre VM ARM64, segreti fuori dal repository, porte minime, HTTPS e dominio; verificare health check e accessi admin. Controllare disponibilità e limiti Always Free prima del go-live.
5. **Percorso end-to-end e CI:** testare admin → API → PostgreSQL → sito per partita, articolo e immagine; aggiungere test automatici sui flussi critici e rendere la pipeline verde.

**Criterio di uscita:** sito e admin usabili sul dominio reale con PostgreSQL, dati persistenti, HTTPS, backup ripristinabile e flussi critici verificati. Senza questo criterio, lo stato resta pre-produzione.

## Priorità 1 — Completare il prodotto web

- [ ] Collegare e rifinire tutti i contenuti pubblici ai dati reali: homepage, match center, notizie, squadra e media; gestire loading, assenza dati ed errori.
- [ ] Completare gli editor admin: configurazione homepage, sponsor, menu/footer, partite con eventi e formazioni, articoli e libreria media.
- [ ] Rivedere sessioni e permessi admin, tracciamento audit e gestione degli errori su flussi reali.
- [ ] Verificare accessibilità, prestazioni e SEO sulle pagine pubbliche.

**Criterio di uscita:** il club pubblica contenuti e aggiorna i dati sportivi senza modificare il codice, e il sito riflette le modifiche.

## Priorità 2 — App Flutter

La realizzazione mobile inizia dopo la stabilizzazione dei contratti API, degli URL media e dell'ambiente HTTPS. I concept nel README sono riferimenti grafici, non schermate dell'app funzionante.

1. Creare il progetto Flutter e il design system JSO; configurare ambienti e client API.
2. Implementare Home, Match Center, notizie, squadra e media con stati di caricamento/errore.
3. Integrare login e profilo quando i flussi account sono pronti; proteggere i token sul dispositivo.
4. Valutare Firebase Cloud Messaging per le notifiche e Crashlytics per la diagnostica, senza spostare il database.
5. Testare su dispositivi Android e iOS; preparare build e pubblicazione sugli store.

**Criterio di uscita:** app installabile su entrambi i sistemi, collegata agli stessi dati del sito, con flussi principali verificati su dispositivi reali.

## Priorità 3 — Funzioni successive

- Community e moderazione, dopo regole di accesso, privacy e strumenti operativi.
- Boutique, pagamenti, sponsor e analytics avanzati, dopo definizione dei requisiti commerciali.
- Live data/provider esterni, dopo affidabilità del Match Center manuale.

## Opzioni Firebase e punti decisionali

- **Firebase Hosting:** fare una prova solo se offre un vantaggio operativo sul sito statico; misurare peso degli asset e traffico rispetto alla quota Spark. L'API .NET resta ospitata separatamente.
- **Firebase Cloud Messaging/Crashlytics:** introdurre con l'app Flutter se servono notifiche e diagnostica.
- **Firestore, Firebase Auth o Cloud Storage:** aprire una nuova decisione tecnica solo con un requisito concreto, una stima dei costi e un piano di migrazione. Cloud Storage richiede Blaze; il progetto non assume che l'intero stack Firebase sia sempre gratuito.

## Documenti collegati

- [Analisi Firebase vs PostgreSQL](FIREBASE_VS_POSTGRESQL_ANALYSIS.md)
- [Decisione database production](DATABASE_PRODUCTION_DECISION.md)
- [Piano deploy Oracle](DEPLOY_ORACLE_CLOUD.md)
- [Analisi mobile](MOBILE_ANALYSIS.md)
