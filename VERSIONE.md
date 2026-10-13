# JSO Web — Cronologia delle versioni

Questo documento registra le versioni presenti nel repository e indica separatamente quando un deploy è stato verificato. Un tag o un numero versione non significa che Render sia aggiornato; le versioni più vecchie non ricostruite in modo affidabile restano da completare.

## V1.26 — Template homepage: API e anteprime

**Versione nel codice:** `frontend/src/version.json` riporta V1.26.

**Commit funzionale/tag:** [9bd945c](https://github.com/abderrazak-naceur/Jso-Web/commit/9bd945ce5f5b1769f8e1066507221086dfb0ff66) · [tag V1.26](https://github.com/abderrazak-naceur/Jso-Web/releases/tag/V1.26)

**Commit versione:** [ed7f928](https://github.com/abderrazak-naceur/Jso-Web/commit/ed7f9282e6831a26bc3cb9c6338bc44cd92998eb)

- Corretto il collegamento API del selettore dei template homepage e migliorate le anteprime.
- L'audit del 13 ottobre ha portato a quattro ordini di homepage distinti, anteprima della pagina reale desktop/mobile, salvataggio bloccato se la configurazione non si carica, e gestione di ordine/visibilità per le sezioni principali. Questi interventi sono modifiche locali successive a V1.26; il numero di versione non è stato incrementato e non è dichiarato un deploy Render.
- Corretto anche il taglio orizzontale dell'intestazione sui viewport mobile stretti.

**Deploy Render:** non verificato da questa sessione. Il tag e la versione nel repository non dimostrano che il deploy sia LIVE.

## V1.25 — Editor admin in finestre modali

**Commit funzionale/tag:** [5624af1](https://github.com/abderrazak-naceur/Jso-Web/commit/5624af160d734a5edcc4c6b57036513823a89914) · [tag V1.25](https://github.com/abderrazak-naceur/Jso-Web/releases/tag/V1.25)

- Spostati in finestre modali gli editor CRUD che prima comparivano in linea nelle schermate admin.

## V1.24 — Template homepage Modern 2026

**Commit funzionale/tag:** [d4efe26](https://github.com/abderrazak-naceur/Jso-Web/commit/d4efe2603af5ed6e7ba271d4ce28613df8de045d) · [tag V1.24](https://github.com/abderrazak-naceur/Jso-Web/releases/tag/V1.24)

- Aggiunto il template Modern 2026 alla selezione della homepage.

## V1.23 — Modifica della partita in un modal

**Commit funzionale/tag:** [3c50308](https://github.com/abderrazak-naceur/Jso-Web/commit/3c5030813eebe14577ce1969cdf571319e37637d) · [tag V1.23](https://github.com/abderrazak-naceur/Jso-Web/releases/tag/V1.23)

- Aperto l'editor della partita in una finestra modale nell'admin.

## V1.22 — Logo dell'avversario nelle partite

**Commit funzionale/tag:** [008e7fd](https://github.com/abderrazak-naceur/Jso-Web/commit/008e7fd99947edd6b97f868f2f35213c730af822) · [tag V1.22](https://github.com/abderrazak-naceur/Jso-Web/releases/tag/V1.22)

- Aggiunto nell'admin il caricamento del logo della squadra avversaria.

## V1.21 — Importo selezionato nelle donazioni

**Commit funzionale/tag:** [5bb1f3b](https://github.com/abderrazak-naceur/Jso-Web/commit/5bb1f3ba825aeb8f87efe46a730d6dde4c8dd65a) · [tag V1.21](https://github.com/abderrazak-naceur/Jso-Web/releases/tag/V1.21)

- Corretto il riepilogo dell'importo scelto nel flusso di donazione.

## V1.20 — URL delle partite con il nome dell'avversario

**Commit funzionale/tag:** [e43d80b](https://github.com/abderrazak-naceur/Jso-Web/commit/e43d80bdd79f592e47636ae91c1634d77594fc33) · [tag V1.20](https://github.com/abderrazak-naceur/Jso-Web/releases/tag/V1.20)

- Inclusi i nomi delle squadre avversarie negli URL delle partite.

## V1.19 — Amministrazione dei supporter su mobile

**Commit funzionale/tag:** [8abddac](https://github.com/abderrazak-naceur/Jso-Web/commit/8abddacfc27e459635c19589c1afce7749cc3f98) · [tag V1.19](https://github.com/abderrazak-naceur/Jso-Web/releases/tag/V1.19)

- Aggiunta la gestione dei supporter nell'app mobile.

## V1.18 — Gestione degli account tifosi

**Commit funzionale/tag:** [a98acba](https://github.com/abderrazak-naceur/Jso-Web/commit/a98acba63aa715d4b66bdbb53eabcf8104e82655) · [tag V1.18](https://github.com/abderrazak-naceur/Jso-Web/releases/tag/V1.18)

- Aggiunte nell'admin la gestione degli account, il blocco degli utenti e le stelle VIP.

## V1.17 — URL leggibili per le partite

**Commit funzionale/tag:** [12a84f2](https://github.com/abderrazak-naceur/Jso-Web/commit/12a84f25441a7a68e55cf105d610abd6afbec834) · [tag V1.17](https://github.com/abderrazak-naceur/Jso-Web/releases/tag/V1.17)

- Aggiunti slug leggibili e orientati alla condivisione nelle pagine di dettaglio partita.

## V1.16 — Codici promozionali streaming nell'admin

**Commit funzionale/tag:** [b5fa730](https://github.com/abderrazak-naceur/Jso-Web/commit/b5fa730c74acd4e475dfea56fdb5464d49f5086b) · [tag V1.16](https://github.com/abderrazak-naceur/Jso-Web/releases/tag/V1.16)

- Resi visibili i codici promozionali e corretta la relazione con la diretta nell'admin.

## V1.15 — Codici promozionali per le dirette

**Commit funzionale/tag:** [b91f546](https://github.com/abderrazak-naceur/Jso-Web/commit/b91f546dbf7121a903d467fe3a858dd17dd516da) · [tag V1.15](https://github.com/abderrazak-naceur/Jso-Web/releases/tag/V1.15)

- Aggiunti codici promozionali per singola partita e riscatto gratuito dello streaming.

## V1.14 — Errori API visibili nello streaming

**Commit funzionale/tag:** [7226993](https://github.com/abderrazak-naceur/Jso-Web/commit/72269939e62536142b0421025b2ebfb0aa040437) · [tag V1.14](https://github.com/abderrazak-naceur/Jso-Web/releases/tag/V1.14)

- Le schermate di streaming mostrano gli errori API invece di nasconderli.

## V1.13 — Avvio della cronologia versioni

**Commit funzionale/tag:** [9bba8e6](https://github.com/abderrazak-naceur/Jso-Web/commit/9bba8e65f42092ba23ffcd45b76386badf1fe76b) · [tag V1.13](https://github.com/abderrazak-naceur/Jso-Web/releases/tag/V1.13)

- Aggiunto il documento di cronologia delle versioni.

**Deploy Render delle versioni V1.13–V1.26:** non verificato in questa sessione. Le voci sopra descrivono commit e tag Git, non attestano la pubblicazione online.

## V1.12 — Navigazione dell'area personale

**Stato:** pubblicata su Render  
**Commit versione:** [281356f](https://github.com/abderrazak-naceur/Jso-Web/commit/281356f337e60c02628b0a645e3ab6e047af777f)  
**Modifica funzionale:** [d04dfec](https://github.com/abderrazak-naceur/Jso-Web/commit/d04dfec01abcb5abcf163297f082945d42684b2c)

- Aggiunto un menu responsive nell'header condiviso delle pagine secondarie.
- Su desktop, i collegamenti sono visibili nella barra superiore.
- Su smartphone, i collegamenti sono raccolti nel menu hamburger.
- Il menu permette di raggiungere Partite, Attualità, Biglietteria e pagamenti, Il mio spazio e la home.
- Obiettivo: rendere nuovamente accessibile la navigazione entrando nell'area personale.
- Versionamento automatico aggiornato a **V1.12**.

**Deploy:** Render confermato come LIVE il 12 ottobre 2026.  
**Verifica suggerita:** https://jso-web.onrender.com/account

## V1.11 — Stato della diretta nella pagina partita

**Stato:** pubblicata su Render  
**Commit versione:** [b358fd9](https://github.com/abderrazak-naceur/Jso-Web/commit/b358fd98478e33eaff70489ed16379837b3b1ff9)  
**Modifica funzionale:** [a3ea71c](https://github.com/abderrazak-naceur/Jso-Web/commit/a3ea71cde7f986f10702ba9f0ee3f805235536f8)

- Il pannello video della partita mostra un messaggio esplicito quando non è disponibile una diretta pubblicata.
- Evitata la scomparsa silenziosa del pannello quando non esiste uno stream disponibile.
- Chiarito che la diretta può essere visualizzata soltanto quando lo stream è configurato e pubblicato.

## V1.10 — Collegamenti e configurazione delle dirette

**Stato:** pubblicata su Render  
**Commit versione:** [ad8eae3](https://github.com/abderrazak-naceur/Jso-Web/commit/ad8eae3df31922c634024d9b03134b88cbc93a98)  
**Modifica funzionale:** [0f7a2f8](https://github.com/abderrazak-naceur/Jso-Web/commit/0f7a2f8f81bafe781e548aa02b9bec57705f552a)

- Sistemati i collegamenti al pannello amministrativo delle dirette.
- La riproduzione usa un URL Mux Playback.
- Distinzione tra URL di playback per guardare il video e URL RTMP di ingest per inviare il flusso video.
- Il deploy Render della versione è stato confermato LIVE l'11 ottobre 2026.

## Versioni precedenti

La cronologia completa delle versioni precedenti a V1.10 deve essere ricostruita dai tag, dai commit e dai deploy storici del repository. Per evitare un registro inesatto, non vengono attribuite funzionalità a versioni non ancora verificate.

## Regola di aggiornamento

A ogni rilascio futuro, aggiungere una sezione all'inizio di questo file con:
1. Numero versione.
2. Data e stato del deploy.
3. Funzionalità aggiunte o corrette.
4. Commit della modifica e commit di versione.
5. Verifiche effettuate e limitazioni note.

Non indicare una versione come pubblicata finché il deploy Render non risulta effettivamente LIVE.
