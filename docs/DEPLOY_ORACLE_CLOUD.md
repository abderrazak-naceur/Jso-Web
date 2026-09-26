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
4. Creare `.env.prod` da `.env.prod.example` fuori dal controllo versione; impostare `JWT_SECRET`, `PUBLIC_ORIGIN`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `ADMIN_BOOTSTRAP_EMAIL` e `ADMIN_BOOTSTRAP_PASSWORD`. Al primo avvio la password admin deve avere almeno 12 caratteri; il bootstrap non modifica gli utenti già presenti. Dopo il primo accesso, rimuovere la password di bootstrap dall'ambiente e ricreare il container API.
5. Configurare DNS, certificato TLS e proxy; verificare che la build frontend usi l'URL API pubblico e che CORS consenta l'origine reale.

La procedura dei comandi è in [deploy/oracle/README.md](../deploy/oracle/README.md). La configurazione attuale espone HTTP su porta 80: HTTPS e la connessione dal browser al dominio reale sono criteri di go-live, non risultati già verificati.

## Controlli ripetibili

Eseguire gli script dalla root del repository (con Bash e `curl`; `check-config.sh` richiede anche Docker Compose). Sono controlli distinti: il test locale non prova DNS o TLS pubblici.

1. Validare variabili richieste, segnaposto, lunghezza minima del segreto JWT, origine HTTPS e sintassi Compose:
   `bash deploy/oracle/check-config.sh`
   Usa `.env.prod`; per un file alternativo: `ENV_FILE=/percorso/assoluto/file bash deploy/oracle/check-config.sh`.
2. Dopo aver avviato lo stack sul computer o sulla VM, controllare il frontend, il proxy `/health` e le route API pubbliche via HTTP locale:
   `bash deploy/oracle/check-local.sh`
   Per una porta locale diversa: `bash deploy/oracle/check-local.sh http://127.0.0.1:8080`.
3. Dopo aver configurato DNS e TLS, controllare il dominio pubblico con validazione TLS di `curl`:
   `bash deploy/oracle/check-domain.sh https://jso.example.com`

Gli script terminano con codice diverso da zero al primo controllo fallito. Il controllo sul dominio segue al massimo tre redirect; non disabilita la verifica del certificato. Il controllo locale non contatta internet. Entrambi verificano risposte HTTP e routing, ma non effettuano login, upload, test CORS nel browser, verifica della migration né prova di backup/restore. Lo script di configurazione verifica il file locale e la configurazione Compose, non i valori effettivamente installati sulla VM. HTTPS sul dominio resta non verificato finché `check-domain.sh` non viene eseguito dall'ambiente che deve raggiungerlo.

## Database e dati

L'API in Production esegue `MigrateAsync` all'avvio. La migration PostgreSQL iniziale è versionata e passa in CI su PostgreSQL 17, insieme a bootstrap admin, login e smoke test di notizie/media. Prima di usarla su dati reali occorre:

1. Applicare la migration anche sulla VM Oracle e controllare schema e log di avvio.
2. Verificare seed del club, bootstrap dell'admin, health check, login e lettura/scrittura dei contenuti sul dominio reale.
3. Attivare backup automatico di database e media, retention e copia esterna.
4. Eseguire un restore di prova e documentare il tempo necessario.

La verifica CI non sostituisce il collaudo della VM e il restore di dati reali.

## Verifiche prima del go-live

- [ ] VM e immagini ARM64 disponibili.
- [ ] Segreti e SSH protetti; database non esposto.
- [ ] Migration PostgreSQL applicata e controllata.
- [ ] URL API frontend, CORS e HTTPS verificati dal dominio reale.
- [ ] Backup di PostgreSQL e media eseguito; restore provato.
- [ ] `/health`, login admin, partite, notizie e upload verificati end-to-end.
- [ ] Workflow CI verdi e monitoraggio operativo attivo.

La sequenza generale e i criteri di uscita sono nel [piano aggiornato](ROADMAP.md).
