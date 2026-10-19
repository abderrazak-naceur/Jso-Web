# Raccolta fondi per progetti

## Configurare la prima campagna

1. Accedere al pannello con un ruolo SuperAdmin, ClubAdmin o FinanceManager.
2. Aprire **Finances & dons → Obiettivi della raccolta fondi**: `/admin/fundraising-projects`.
3. Scegliere un modello (bus, attrezzature, trasferte, strutture) oppure **Créez le vôtre**.
4. Inserire titolo, descrizione e budget reale in TND. La durata è di 10 mesi. Il budget non viene precompilato con i 30.000 TND del mockup.
5. Impostare l’immagine dal sito o da un indirizzo HTTPS. L’immagine del bus inclusa è un’illustrazione del progetto, non la prova di un acquisto.
6. Usare **Prévisualiser la page publique** e controllare entrambe le viste.
7. Salvare come **Brouillon** per mantenerlo privato oppure scegliere **Publié** e salvare per renderlo pubblico.

La pagina `/nos-projets` mostra solo progetti pubblicati. Il pulsante **Partager le projet** genera un collegamento diretto `/nos-projets?projet=<id>`. `/soutenir` e il vecchio collegamento all’anteprima aprono lo stesso template.

## Partecipazione e incasso

- Nel menu pubblico sono disponibili **Se connecter**, **Créer un compte** e, dopo l’accesso, **Mon dashboard**. Prima di confermare un nuovo sostegno dal sito è necessario accedere o creare il profilo supporter. Dopo l’accesso si riprende il progetto selezionato.
- Il sostenitore sceglie 5, 10, 20, 30 o 50 TND al mese per 10 mesi. I dieci pagamenti sono separati: non viene creato un addebito automatico.
- Il nome pubblico è obbligatorio; email e telefono restano privati. Il telefono permette al club di contattare chi sceglie i contanti. Paymee richiede anche i contatti.
- **Contanti:** l’iscrizione compare nell’elenco come importo da confermare. L’Admin apre **Gérer les contributions**, individua la rata e usa **Confirmer les espèces reçues** soltanto dopo aver ricevuto il denaro. Ogni conferma aggiorna lo storico e il totale reale.
- **Online:** vengono offerti soltanto i gestori configurati da `/api/donations/payment-methods`. L’utente viene indirizzato al gestore esistente. Il ritorno del browser non conferma il pagamento: serve la conferma verificata del gestore. Le iscrizioni online senza pagamenti confermati non compaiono tra i sostenitori pubblici.
- Il totale raccolto somma soltanto rate con stato **Paid**; i sostenitori vengono contati per iscrizione, non per rata.

## Area personale

Il calendario delle dieci rate è visibile sia nella pagina del progetto sia in **Mon dashboard → Mes soutiens** (`/account#mes-soutiens`). Comprende importi, totale versato, residuo, istruzioni contanti e calendario. I pagamenti sono associati al titolare e compaiono anche nello storico pagamenti esistente. Il calendario è recuperabile tramite `GET /api/fundraising/mine`, compresi i progetti archiviati.

Le vecchie adesioni ospite si collegano dal dashboard con **Rattacher à mon compte**, usando lo stesso browser in cui furono create. Serve sia il segreto casuale già conservato sia l’accesso Fan: l’email coincidente non basta e un’adesione già posseduta non può essere trasferita. Le dieci rate, anche pagate, sono collegate atomicamente senza cambiare ricevute o stato. Una volta collegate, il segreto locale viene rimosso; i nuovi sostegni autenticati non lo salvano nel browser. Non viene promessa un’email automatica di attivazione.

## Modificare, cancellare e ricominciare un test

- **Modifier le projet** modifica i contenuti; **Modifier les coordonnées** aggiorna nome pubblico, email e telefono del sostenitore conservando i dati già utilizzati per ricevute e tentativi.
- **Supprimer le projet** elimina progetto, iscrizioni e rate solo quando non esistono pagamenti o tentativi. **Supprimer l’inscription** segue la stessa regola per una sola partecipazione.
- Se esistono pagamenti, riferimenti provider o audit finanziari, l’API risponde `409`: usare **Archiver** per togliere il progetto dal pubblico senza perdere lo storico.
- **Dupliquer** prepara una nuova bozza con gli stessi contenuti e senza sostenitori né pagamenti. Verificare e salvare per ricominciare una raccolta di prova. **Restaurer en brouillon** recupera invece un progetto archiviato.
- Nessun pagamento reale viene azzerato o trasformato in una promessa non pagata.

## Verifiche prima del deploy

- Build e lint frontend, test delle route e dei template.
- Test backend per bozze, importi, dieci rate, privacy, autorizzazioni e conferma contanti.
- Workflow **PostgreSQL EF validation**: migrare il database CI, verificare le nuove tabelle e avviare l’API. `backend/tests/fundraising_smoke.py` esercita il flusso HTTP contro quel database isolato. Lo script è vincolato a localhost e all’ambiente CI.
- Verificare che Render Web e API usino lo stesso commit. Applicare la migrazione `20261019090000_AddFundraisingProjects` prima di attivare il nuovo frontend.
- Verificare in produzione `/api/fundraising/projects`, accesso Admin, pubblicazione di un progetto con dati approvati e vista mobile. Non eseguire un pagamento reale senza una procedura di collaudo concordata.

La migrazione non inserisce dati dimostrativi. Se nessun progetto è pubblicato, il sito presenta la nuova pagina di attesa JSO senza inventare obiettivi o importi raccolti.

Verifiche locali del 19 ottobre 2026, aggiornamento account/CRUD: build frontend riuscita, 13 test frontend e 107 test backend passati, incluso `HasPendingModelChanges() == false`. Lint senza errori, con due avvisi preesistenti. Verificati nel browser menu e modulo account, accesso e ripresa del sostegno, calendario nel dashboard a 390 px, duplicazione in bozza, archiviazione/ripristino e dialog di cancellazione con fixture esclusivamente locali, poi rimosse. La migrazione su un server PostgreSQL reale e il test HTTP CI restano da eseguire; queste nuove modifiche non dichiarano un deploy.
