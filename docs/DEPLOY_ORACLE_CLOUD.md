# JSO — Deploy Oracle Cloud Always Free

## Obiettivo

Deploy JSO con target infrastruttura a costo zero, usando Oracle Cloud Always Free dove possibile.

> Punto da verificare prima del go-live: compatibilita ARM64 della piattaforma database scelta.

## Architettura

- React/Vite: static hosting gratuito.
- ASP.NET Core .NET 10: Docker.
- Oracle Ampere A1: VM Always Free.
- Database: SQL Server solo se compatibile con la piattaforma scelta; in alternativa valutare PostgreSQL mantenendo EF Core.
- Cloudflare: DNS e HTTPS.

## VM Oracle

Creare una VM Ampere A1 nella home region con le risorse Always Free disponibili.

Aprire solo le porte necessarie:

- TCP 22 per SSH, preferibilmente limitato al proprio IP.
- TCP 80 per HTTP.
- TCP 443 per HTTPS.

Non esporre la porta 1433 del database a Internet.

## Docker

Su una distribuzione Linux supportata:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Riconnettersi dopo l'aggiunta al gruppo Docker.

## Repository

```bash
git clone https://github.com/abderrazak-naceur/Jso-Web.git
cd Jso-Web
```

Creare `.env` partendo da `.env.example` e impostare almeno:

```env
MSSQL_SA_PASSWORD=<password-forte>
JWT_SECRET=<segreto-random-di-almeno-32-caratteri>
ADMIN_BOOTSTRAP_EMAIL=admin@jso.tn
ADMIN_BOOTSTRAP_PASSWORD=<password-admin-forte>
```

Non committare `.env`.

## ARM64

Prima del deployment definitivo:

```bash
docker buildx inspect --bootstrap
docker build --platform linux/arm64 -t jso-api ./backend
```

Il backend .NET deve essere disponibile per ARM64.

### Database

Il database e il principale punto di compatibilita. Non assumere che il container SQL Server attuale sia eseguibile sulla VM Ampere ARM64.

Se SQL Server non e utilizzabile su A1:

1. valutare una VM x86/AMD disponibile;
2. oppure usare un database compatibile ARM64;
3. mantenere EF Core per ridurre l'impatto della scelta.

## Production

La configurazione Docker attuale e orientata allo sviluppo locale. Prima del go-live bisogna separare development e production, usare secrets fuori dal repository, impostare l'ambiente Production, configurare HTTPS e mantenere il database su rete privata.

Architettura target:

```text
Internet
   |
Cloudflare
   |
HTTPS :443
   |
Reverse proxy
   |
ASP.NET Core :8080
   |
Database privato
```

## Database e migrations

Per production bisogna usare EF migrations e non `EnsureCreatedAsync`.

Comandi previsti:

```bash
dotnet ef migrations add InitialCreate --project src/JSO.Infrastructure --startup-project src/JSO.Api --output-dir Migrations
dotnet ef database update --project src/JSO.Infrastructure --startup-project src/JSO.Api
```

La migration non e ancora presente nel repository e non deve essere considerata verificata finche non viene generata e controllata.

## Backup

Prevedere almeno:

- backup database giornaliero;
- copia dei media importanti;
- retention;
- test periodico del restore;
- copia esterna dei dati critici.

## Health check

L'API espone `GET /health` per il monitoraggio.

## Checklist go-live

- [ ] VM Always Free creata.
- [ ] SSH protetto.
- [ ] Docker installato.
- [ ] ARM64 verificato.
- [ ] Database scelto e verificato.
- [ ] EF migrations generate e controllate.
- [ ] Backup configurato.
- [ ] HTTPS configurato.
- [ ] Secrets fuori dal repository.
- [ ] CORS configurato con il dominio reale.
- [ ] Admin bootstrap password gestita.
- [ ] `/health` verificato.
- [ ] GitHub CI verde.
- [ ] Frontend collegato all'API production.
- [ ] Login admin verificato.
- [ ] Match Center verificato.
- [ ] News CMS verificato.
- [ ] Media verificato.
- [ ] Eventi partita verificati.

## Stato

Preparazione deployment — non ancora go-live.

Docker mantiene la portabilita del backend: la scelta Oracle puo essere cambiata senza riscrivere l'applicazione.
