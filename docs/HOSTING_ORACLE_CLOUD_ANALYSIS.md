# JSO Hosting & Cost Analysis — Oracle Cloud Always Free

## Obiettivo

Valutare Oracle Cloud Infrastructure (OCI) come hosting a costo minimo/zero per JSO – Jeunesse Sportive de Oudhref, mantenendo l'architettura prevista: React/Vite/Tailwind, ASP.NET Core .NET 10, Docker e SQL Server.

## Executive summary

Oracle Cloud Free Tier offre servizi Always Free senza scadenza, oltre a una prova di 30 giorni con 300 USD di credito. Le risorse Always Free continuano dopo la scadenza della prova, purché si rimanga nei limiti del piano.

Per JSO, OCI è interessante soprattutto per una VM ARM Ampere A1, storage, networking e trasferimento dati. La scelta del database richiede però una verifica importante: SQL Server deve essere compatibile con l'architettura ARM64 e con il modello di deployment scelto. Non va quindi considerato automaticamente garantito su una VM A1.

## Risorse Always Free rilevanti

Secondo la documentazione Oracle aggiornata:

- Compute Ampere A1 ARM: quota Always Free equivalente a 2 OCPU e 12 GB RAM complessivi per la tenancy.
- Compute AMD: risorse Always Free entro i limiti Oracle.
- Block Volume: 200 GB complessivi, includendo boot e block volumes.
- Backup dei volumi: fino a 5 backup Always Free.
- Object Storage: 10 GB.
- Outbound data transfer: 10 TB/mese.
- Autonomous Database: 2 istanze Always Free da 20 GB ciascuna.
- Sono disponibili anche servizi Always Free di networking, monitoring, logging, notifications, bastion e altri servizi OCI.

Le quote sono per tenancy e non per ogni VM.

## Architettura proposta per JSO

```
Internet
   |
Cloudflare
DNS + SSL + CDN
   |
   +----------------------+
   |                      |
React/Vite             api.jso.tn
Cloudflare Pages            |
€0                          |
                       Oracle Cloud
                            |
                    Ampere A1 VM
                    2 OCPU / 12 GB
                            |
                         Docker
                     +------+------+
                     |             |
                ASP.NET Core    Database
                   .NET 10       SQL Server*
```

Il frontend può rimanere separato e gratuito tramite Cloudflare Pages o GitHub Pages. OCI viene utilizzato principalmente per API, servizi applicativi e database.

## Costo

### Scenario Always Free

| Componente | Costo target |
|---|---:|
| Ampere A1 Compute | €0 |
| Block Volume entro 200 GB | €0 |
| Object Storage entro 10 GB | €0 |
| Outbound transfer entro 10 TB/mese | €0 |
| Networking Always Free | €0 entro limiti |
| React static hosting | €0 con Cloudflare Pages/GitHub Pages |
| Docker | €0 |
| ASP.NET Core | €0 |
| **Totale infrastruttura target** | **€0/mese** |

Il dominio resta un costo separato.

## Prova gratuita

Oracle offre anche 300 USD di credito per 30 giorni. Questi crediti sono separati dalle risorse Always Free e possono essere utilizzati per provare risorse aggiuntive. Alla scadenza della prova, le risorse Always Free continuano a essere disponibili; le risorse a pagamento vengono recuperate se non viene effettuato l'upgrade.

## Rischi e punti di attenzione

### 1. ARM64

Ampere A1 utilizza ARM64. .NET 10 e Docker supportano ARM64, ma ogni immagine Docker e ogni dipendenza devono essere compatibili.

### 2. SQL Server

Questo è il principale punto da verificare per JSO. Non bisogna assumere che una normale installazione SQL Server x64 sia intercambiabile con ARM64.

Prima del deployment definitivo occorre testare:

- SQL Server supportato su ARM64;
- eventuale container ARM64 disponibile;
- compatibilità EF Core;
- backup/restore;
- performance;
- eventuale alternativa PostgreSQL/MySQL se SQL Server non fosse praticabile.

Se SQL Server è un requisito rigido, va valutata anche una VM AMD/x86 o Google Cloud/AWS.

### 3. Capacità della VM

2 OCPU e 12 GB RAM sono adeguati per un MVP e per un backend di dimensioni contenute, ma non equivalgono a un'infrastruttura enterprise ad alta disponibilità.

### 4. Host capacity

La disponibilità delle VM Always Free può dipendere dalla capacità nella home region. Oracle documenta il caso di errore "out of host capacity". Potrebbe essere necessario attendere o verificare un availability domain diverso.

### 5. Inattività

Oracle può reclamare risorse Always Free considerate inattive secondo le proprie metriche e condizioni. Il deployment deve quindi essere monitorato.

### 6. Backup

Always Free non sostituisce una strategia completa di backup. Per JSO bisogna prevedere almeno:

- backup database;
- backup configurazioni;
- backup media importanti;
- copia esterna dei dati critici.

## Strategia consigliata

### Fase 1 — sviluppo

Sviluppo locale:

- Docker Compose
- ASP.NET Core .NET 10
- SQL Server
- React/Vite
- GitHub

Costo: €0.

### Fase 2 — staging

Oracle Cloud:

- VM Always Free;
- Docker;
- API;
- database compatibile;
- Cloudflare davanti ai servizi.

Costo target: €0.

### Fase 3 — produzione

Prima di pagare un provider, misurare:

- CPU;
- RAM;
- storage;
- traffico;
- numero utenti;
- dimensione database;
- quantità di immagini/video;
- richieste API.

Se OCI Always Free rimane sufficiente, si può continuare a €0 di infrastruttura. Se non è sufficiente, confrontare OCI Pay As You Go, Google Cloud, AWS, Azure, Hetzner e DigitalOcean.

## Decisione tecnica preliminare

Oracle Cloud Always Free è un candidato valido per l'infrastruttura JSO a costo zero, ma non va ancora considerato la scelta definitiva finché non viene risolta la compatibilità del database con ARM64.

La soluzione più portabile rimane Docker + ASP.NET Core. Il database deve essere astratto tramite EF Core in modo da mantenere possibile una futura migrazione.

## Fonti ufficiali

- Oracle Cloud Free Tier: https://www.oracle.com/it/cloud/free/
- Oracle Always Free Resources: https://docs.oracle.com/it-it/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- Oracle Free Tier FAQ: https://www.oracle.com/it/cloud/free/faq/

## Conclusione

Per l'obiettivo "non voglio consumare soldi", la strategia è:

1. GitHub per source control e CI/CD.
2. Cloudflare Pages per il frontend statico.
3. Oracle Cloud Always Free per backend/container.
4. Utilizzare i 300 USD Oracle solo per test di servizi aggiuntivi, se necessario.
5. Non effettuare upgrade a pagamento finché JSO non richiede risorse superiori.
6. Verificare SQL Server/ARM64 prima del deployment.
7. Mantenere Docker per poter spostare il backend verso Google Cloud, AWS, Azure o un VPS senza riscrivere l'applicazione.

**Stato: analisi tecnica preliminare — nessuna modifica al codice applicativo.**
