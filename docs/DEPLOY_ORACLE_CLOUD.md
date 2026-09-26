# JSO — piano deploy Oracle Cloud Always Free

**Aggiornato:** 26 settembre 2026. Preparazione documentata; deploy reale non ancora verificato.

## Architettura scelta

- VM Oracle Ampere A1 ARM64 entro i limiti Always Free, se disponibile nella regione.
- Docker Compose production: frontend React/Vite servito da Nginx, API ASP.NET Core .NET 10 e PostgreSQL 17.
- Database e API nella rete Docker privata; PostgreSQL senza porte pubbliche.
- Volumi persistenti per dati PostgreSQL e media caricati.
- Dominio e HTTPS tramite reverse proxy/TLS da configurare e verificare.

PostgreSQL è la scelta dati di produzione. SQL Server resta disponibile nello sviluppo locale. Firebase Hosting, Cloud Messaging e Crashlytics sono opzioni separate descritte nel [confronto dei costi](FIREBASE_VS_POSTGRESQL_ANALYSIS.md).

## Preparazione

1. Creare la VM A1 e verificare quota, disponibilità e compatibilità ARM64 delle immagini.
2. Proteggere SSH e aprire solo le porte necessarie per HTTP/HTTPS. Non esporre PostgreSQL.
3. Installare Docker Engine e Compose plugin.
4. Creare `.env.prod` da `.env.prod.example` fuori dal controllo versione; impostare `JWT_SECRET`, `PUBLIC_ORIGIN`, `POSTGRES_USER` e `POSTGRES_PASSWORD`.
5. Configurare DNS, certificato TLS e proxy; verificare che la build frontend usi l'URL API pubblico e che CORS consenta l'origine reale.

La procedura dei comandi è in [deploy/oracle/README.md](../deploy/oracle/README.md). La configurazione attuale espone HTTP su porta 80: HTTPS e la connessione dal browser al dominio reale sono criteri di go-live, non risultati già verificati.

## Database e dati

L'API in Production esegue `MigrateAsync` all'avvio. Prima di usarla su dati reali occorre:

1. Generare e versionare una migration EF Core per PostgreSQL.
2. Revisionare lo schema e applicare la migration a un database PostgreSQL di prova.
3. Verificare seed, health check, login admin e lettura/scrittura dei contenuti.
4. Configurare backup automatico di database e media, retention e copia esterna.
5. Eseguire un restore di prova e documentare il tempo necessario.

Senza una migration PostgreSQL verificata, il compose non va considerato pronto per il go-live.

## Verifiche prima del go-live

- [ ] VM e immagini ARM64 disponibili.
- [ ] Segreti e SSH protetti; database non esposto.
- [ ] Migration PostgreSQL applicata e controllata.
- [ ] URL API frontend, CORS e HTTPS verificati dal dominio reale.
- [ ] Backup di PostgreSQL e media eseguito; restore provato.
- [ ] `/health`, login admin, partite, notizie e upload verificati end-to-end.
- [ ] Workflow CI verdi e monitoraggio operativo attivo.

La sequenza generale e i criteri di uscita sono nel [piano aggiornato](ROADMAP.md).
