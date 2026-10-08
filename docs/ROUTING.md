# Link diretti admin e frontend

## Admin

Ogni voce della barra laterale ha un URL stabile: `/admin/<id-sezione>` (dashboard: `/admin`). Gli ID sono definiti in `frontend/src/admin/navigation.js`. Il percorso resta nella barra degli indirizzi e funziona dopo refresh, login e navigazione Indietro/Avanti. Il frontend mostra solo le sezioni consentite al ruolo; le API applicano comunque l'autorizzazione lato server. Un link admin non contiene credenziali e può essere condiviso solo con personale autorizzato.

Gli editor di notizie, prodotti, match ed eventi del club supportano `/admin/<sezione>/<id>/edit`. Le rispettive liste hanno un pulsante per copiare il link admin. Il percorso usa l'ID stabile del record: modificare il titolo o lo slug non lo invalida.

La barra laterale raggruppa le funzioni per area (biglietteria, finanze e doni, boutique e partner, sport, contenuti, comunità, sistema). La ricerca filtra solo le voci accessibili al ruolo; `Ctrl+K` o `⌘K` porta al campo di ricerca. Il dashboard mostra collegamenti rapidi anche quando le statistiche API non sono disponibili. Il pulsante «Copier le lien» condivide l'URL della sezione corrente; «Voir sur le site» apre la pagina pubblica corrispondente quando esiste.

Per aggiungere una sezione admin, registrare lo stesso ID in `frontend/src/admin/navigation.js` (etichetta, ruolo, categoria e permesso) e in `frontend/src/admin/moduleRegistry.js` (import del modulo). Il test `frontend/tests/routes.test.mjs` verifica che nessuna voce resti senza modulo o categoria. I moduli sono caricati solo all'apertura della relativa sezione; un errore di caricamento resta confinato nella sezione.

I controller API admin sono raccolti in `backend/src/JSO.Api/Controllers/Admin/` per dominio: `Commerce`, `Community`, `Content`, `Operations`, `Sport` e `System`. Namespace, attributi di routing e autorizzazioni sono invariati; lo spostamento dei file non modifica gli URL `/api/admin/*`.

## Pubblico

Le sezioni principali hanno pagine dedicate, ad esempio `/matchs`, `/boutique`, `/abonnements`, `/agenda`, `/equipe`, `/club`. `/actualites`, `/billetterie` e `/soutenir` mantengono i percorsi già esistenti. Le sezioni della vecchia homepage e i link `/#...` restano raggiungibili.

Contenuti individuali condivisibili:

- Articolo: `/actualites/<slug>`.
- Prodotto attivo: `/boutique/<slug>`.
- Match pubblicato: `/matchs/<id>`.
- Evento pubblicato: `/agenda/<slug>`.

Le pagine prodotto e evento leggono l'endpoint pubblico del singolo contenuto e mostrano un messaggio chiaro se il contenuto non è più pubblicato. Gli editor possono copiare i link pubblici dalle liste admin. Un contenuto non pubblicato non deve essere esposto dall'API pubblica.

## Anteprime social e deploy

La build genera un `index.html` con titolo, descrizione, canonical e Open Graph specifici per le **pagine principali**. Impostare `VITE_PUBLIC_SITE_URL` all'origine HTTPS definitiva del frontend (senza slash finale) durante la build Docker o statica; il valore di default è `https://jso-web.onrender.com`. La stessa origine viene applicata alla homepage, alla sitemap e a `robots.txt`. Nel Compose di produzione `PUBLIC_ORIGIN` alimenta sia la build frontend sia `Payments__PublicBaseUrl` dell'API. Nginx usa i file generati per i percorsi di sezione; `frontend/public/_redirects` contiene le regole equivalenti per hosting statico che le supporta. Verificare la risposta HTML effettiva sul dominio pubblicato dopo il deploy.

**Render Static Site:** configurare le Rewrite nel pannello *Redirects/Rewrites*; Render non applica automaticamente il file `_redirects`. Mettere `/admin/*` → `/admin/index.html` prima della regola generale `/*` → `/index.html`. Per le pagine principali aggiungere una Rewrite da ciascun percorso elencato in `frontend/scripts/build-share-pages.mjs` al rispettivo `/index.html` di sezione (esempio `/boutique` → `/boutique/index.html`). Una regola generica `/*` deve restare ultima per i dettagli dinamici. Nella preproduzione Render dell'8 ottobre 2026 `/admin/donations` e `/boutique` restituivano ancora l'HTML generico della homepage; dopo il deploy verificare nuovamente titolo, canonical e risposta HTML per ogni percorso.

Per i **singoli** articoli, prodotti, match ed eventi, i pulsanti di condivisione e copia usano `/api/share/<tipo>/<chiave>` sul dominio API. L'endpoint genera metadati Open Graph e Twitter leggendo **solo record pubblicati/attivi**, poi porta il visitatore alla pagina canonica del frontend. Questo mantiene l'anteprima aggiornata dopo la pubblicazione senza ricostruire il frontend. Se l'API è su un dominio separato, il link copiato usa quel dominio; il browser arriva comunque alla pagina pubblica JSO. Verificare l'anteprima effettiva su WhatsApp/Facebook nel deploy reale. La visita diretta del percorso canonico di un singolo contenuto può ancora mostrare l'anteprima generica della SPA ai crawler: la condivisione va fatta con il pulsante dedicato.

## Verifiche

`cd frontend && node --test tests/routes.test.mjs` verifica il parsing dei percorsi. `npm run build` genera le pagine di sezione; controllare per esempio `dist/boutique/index.html`. Testare su Nginx/hosting reale l'accesso diretto e il refresh di percorsi admin e pubblici, oltre ai permessi e ai record rimossi.
