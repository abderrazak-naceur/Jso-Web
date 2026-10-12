# JSO Web — Cronologia delle versioni

Questo documento registra le modifiche rilasciate in JSO Web. Le voci sono basate sui commit e sui deploy verificati; le versioni più vecchie non ancora ricostruite in modo affidabile sono indicate come da completare, invece di inventare funzionalità.

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