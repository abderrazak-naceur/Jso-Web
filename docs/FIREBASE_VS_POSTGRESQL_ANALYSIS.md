# JSO — Firebase o PostgreSQL? Rivalutazione dei costi

**Data:** 26 settembre 2026
**Ambito:** sito React/Vite, API e pannello admin ASP.NET Core, futura app Flutter.

## Sintesi

PostgreSQL è software gratuito: il costo eventuale è l'hosting, non una licenza. Il piano Oracle Cloud Always Free prevede risorse con cui il progetto può ospitare PostgreSQL e l'API .NET senza canone, se rimane nelle quote e se la VM è disponibile nella regione scelta. Firebase Spark è interessante per Hosting statico, Firestore entro quota e servizi mobile, ma non sostituisce a costo zero tutto il backend JSO: Cloud Storage for Firebase richiede Blaze e un'API containerizzata su Cloud Run richiede un account di fatturazione.

**Raccomandazione:** per l'MVP mantenere PostgreSQL + API .NET su una VM Oracle Always Free, valutando Firebase Hosting per il solo frontend e Firebase Cloud Messaging/Crashlytics per Flutter. Non migrare ora tutti i dati a Firestore per la sola ragione del costo. Questa è una proposta architetturale, non un deployment eseguito.

## Confronto dei servizi

| Esigenza JSO | Stack attuale: PostgreSQL su OCI Always Free | Firebase |
|---|---|---|
| Database partite, squadre, news e audit | PostgreSQL senza licenza; usa CPU, RAM e disco della VM | Firestore Spark: 1 GiB di dati, 50.000 letture, 20.000 scritture e 20.000 eliminazioni al giorno; oltre la quota serve Blaze |
| API ASP.NET Core | Eseguibile sulla stessa VM | Firebase Hosting serve il frontend statico; per eseguire l'API .NET su Cloud Run occorre collegare la fatturazione e passare a Blaze |
| Sito React statico | Nginx sulla VM attuale | Firebase Hosting Spark: 10 GB di storage e 360 MB/giorno di trasferimento, con dominio personalizzato e SSL |
| Foto e media caricati dall'admin | Volume persistente della VM; backup da progettare | Cloud Storage for Firebase richiede il piano Blaze, anche per il bucket predefinito; Blaze può comunque avere una quota senza addebito |
| Notifiche e qualità dell'app Flutter | Da integrare | Firebase Cloud Messaging e Crashlytics sono utilizzabili senza costo del servizio entro le relative condizioni |
| Backup e ripristino | Da implementare e testare sulla VM | Backup, restore e PITR di Firestore non sono inclusi nella quota gratuita |

Le quote sono limiti di servizio, non una garanzia che il progetto resti sempre a €0. Su Spark, superare una quota può interrompere quel servizio; su Blaze l'uso oltre le quote gratuite può generare addebiti. Il dominio, eventuali servizi esterni e il lavoro operativo restano separati.

## Impatto sul codice esistente

JSO ha già un modello relazionale EF Core con 17 insiemi di entità in `JsoDbContext`, API ASP.NET Core, autenticazione JWT, audit e upload dei media su disco. Firestore usa documenti e collezioni anziché tabelle SQL. Una migrazione completa richiederebbe di riscrivere accesso dati, query, relazioni, autorizzazioni, migrazione dei dati e test. Sostituire solo PostgreSQL con Firestore lasciando l'API .NET non eliminerebbe il costo o la gestione del server che esegue l'API.

Firebase Authentication può essere adottato in futuro, ma oggi login e ruoli admin sono già implementati in .NET: una sostituzione richiederebbe la migrazione degli utenti e delle regole di accesso. Firebase Hosting statico, invece, può ospitare la build Vite senza cambiare database; va prima corretto l'URL API del frontend per puntare all'API pubblica e configurare CORS.

Firebase Data Connect offre PostgreSQL gestito tramite Cloud SQL, ma **non è un PostgreSQL gratuito permanente**: la prima istanza ha una prova di tre mesi, poi il prezzo parte da circa 9,37 USD/mese e varia con regione e configurazione. Non risolve l'obiettivo di spesa mensile zero.

## Tre scenari pratici

### A. Conservare lo stack attuale — scelta consigliata per l'MVP

- Frontend React su Nginx/OCI oppure Firebase Hosting Spark.
- API .NET, PostgreSQL e media su OCI Always Free.
- Flutter usa l'API esistente; Firebase Cloud Messaging e Crashlytics possono essere aggiunti separatamente.
- **Costo infrastrutturale target:** €0/mese entro le quote OCI/Firebase, escluso l'eventuale dominio. Occorrono disponibilità della VM, amministrazione, sicurezza, backup e restore verificati.
- **Lavoro sul codice:** relativamente basso; restano migration PostgreSQL, correzione URL API, test end-to-end e deployment.

### B. Migrare tutto a Firebase/Firestore

- Frontend e futura app leggono/scrivono Firestore; login con Firebase Authentication; foto su Cloud Storage.
- Serve riprogettare i dati relazionali e la logica oggi nell'API. Se l'API .NET resta, occorre comunque ospitarla.
- **Piano necessario per le funzioni richieste:** Blaze per Cloud Storage e per eventuali Cloud Functions/Cloud Run. Una fattura di €0 è possibile solo se l'uso resta nelle quote gratuite applicabili; non è garantita.
- **Lavoro sul codice:** alto; non consigliato soltanto per risparmiare il costo di PostgreSQL.

### C. Firebase Data Connect / Cloud SQL PostgreSQL

- Mantiene un database SQL gestito, ma la prova gratuita della prima istanza dura tre mesi.
- Dopo la prova è una soluzione a pagamento; richiede comunque di valutare come ospitare l'API .NET.
- **Adatto se** in futuro si preferisce pagare per ridurre la gestione operativa del database.

## Passi prima di scegliere un deployment

1. Correggere l'URL API: oggi il frontend usa `http://localhost:5080/api` come fallback; non funzionerebbe per i visitatori di un sito pubblicato.
2. Generare e verificare una migration EF Core PostgreSQL in repository, poi provare il ripristino da backup.
3. Misurare traffico previsto e dimensione delle immagini. Il sito contiene già asset grafici pesanti: per Firebase Hosting Spark, verificare il limite di trasferimento quotidiano.
4. Se si sceglie Blaze per foto o funzioni, impostare budget e avvisi prima del lancio e testare il costo con traffico realistico.
5. Fare una prova end-to-end del flusso admin → API → database → sito → app Flutter prima di cambiare architettura.

## Fonti ufficiali consultate

- [Licenza PostgreSQL](https://www.postgresql.org/about/press/faq/) — uso senza canone di licenza.
- [Oracle Cloud Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) — quote e disponibilità della VM Arm.
- [Prezzi Firebase](https://firebase.google.com/pricing) — quote Spark/Blaze, Hosting, Cloud Storage e Data Connect.
- [Quota Firestore e backup](https://firebase.google.com/docs/firestore/pricing).
- [Requisito Blaze per Cloud Storage](https://firebase.google.com/docs/storage/faq-and-troubleshooting).
- [Firebase Hosting e Cloud Run](https://firebase.google.com/docs/hosting/cloud-run) — requisito dell'account di fatturazione per l'API containerizzata.
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions/get-started) — Blaze richiesto per il deployment.
- [Modello dati Firestore](https://firebase.google.com/docs/firestore/data-model).
