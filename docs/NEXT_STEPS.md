# JSO — prossimi passi operativi

**Aggiornato:** 26 settembre 2026. Il [piano completo](ROADMAP.md) è la fonte per priorità e criteri di uscita.

## Subito: preparare il rilascio web

1. Verificare sul dominio reale URL API `/api`, proxy, CORS e HTTPS; il fallback `localhost` è già stato rimosso.
2. Ripetere nell'ambiente Oracle reale la migration e il bootstrap admin già verificati in CI; provare backup e restore.
3. Configurare volumi persistenti, backup di database e media, retention e prova di restore.
4. Completare Oracle ARM64, segreti, HTTPS, dominio, health check e monitoraggio.
5. Verificare i flussi admin → API → PostgreSQL → sito e aggiungere test automatici critici alla CI.

## Dopo: prodotto e mobile

6. Completare l'integrazione dei dati pubblici e gli editor del pannello admin.
7. Stabilizzare i contratti API e gli URL media per Flutter.
8. Realizzare l'app Flutter per Android/iOS; valutare Firebase Cloud Messaging e Crashlytics solo per funzioni mobile utili.
9. Aggiungere community, moderazione e commercio dopo aver definito requisiti, privacy e operatività.

PostgreSQL è la scelta dati dell'MVP; Firebase Hosting resta opzionale e Firestore non è pianificato. Vedi [analisi costi e alternative](FIREBASE_VS_POSTGRESQL_ANALYSIS.md).
