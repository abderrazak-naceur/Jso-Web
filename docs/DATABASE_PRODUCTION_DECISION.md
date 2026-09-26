# JSO — Database production decision

## Decision

Per il deployment Oracle Cloud Ampere A1, la configurazione production usa PostgreSQL invece del container SQL Server.

## Motivo tecnico

La documentazione Microsoft indica che le immagini SQL Server Linux container sono supportate su host Linux con CPU Intel/AMD x86-64. QEMU/emulazione non e una configurazione supportata. Oracle Ampere A1 usa CPU Arm. Per questo SQL Server container non e una base production appropriata per la VM A1.

PostgreSQL viene usato nel compose production come database ARM64-compatible, mentre SQL Server resta disponibile per lo sviluppo locale tramite la configurazione esistente.

## Implementazione

Il backend supporta ora:

- `Database:Provider=sqlserver` per sviluppo SQL Server.
- `Database:Provider=postgres` per production Oracle A1.

Il compose production usa PostgreSQL 17 Alpine e una rete Docker privata. Il database non pubblica porte verso Internet.

## EF Core

Le migration production devono essere generate per il provider PostgreSQL. Non bisogna riutilizzare automaticamente una migration SQL Server per PostgreSQL.

Prima del go-live:

1. usare la migration PostgreSQL iniziale versionata in `backend/src/JSO.Infrastructure/Migrations/Postgres`;
2. verificare lo schema generato (script SQL già prodotto per revisione);
3. eseguire `database update` contro un database PostgreSQL di test;
4. verificare seed, health check e API;
5. eseguire backup e restore test.

## Nota

La scelta non modifica il dominio applicativo: EF Core mantiene l'accesso al database dietro `JsoDbContext`. SQL Server resta disponibile per sviluppo, mentre Oracle production usa PostgreSQL.

Stato: provider configurabile e migration PostgreSQL iniziale implementati; applicazione della migration a PostgreSQL e deploy reale ancora da eseguire e verificare.
