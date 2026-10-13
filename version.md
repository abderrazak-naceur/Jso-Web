# JSO-Web — Registro versioni e attività

**Data aggiornamento:** 14 ottobre 2026  
**Repository:** https://github.com/abderrazak-naceur/Jso-Web  
**Branch principale:** `main`  
**Versione applicativa rilevata nei commit:** V1.37  
**Frontend:** https://jso-web.onrender.com  
**API:** https://jso-api.onrender.com

Questo documento riassume le funzionalità e le correzioni già implementate nel progetto secondo i commit e le attività registrate. Le funzionalità in lavorazione o non verificate in produzione sono indicate separatamente, per non confonderle con quelle completate.

---

## 1. Ultima modifica — 14 ottobre 2026

### PR #138 — Correzione dell'editor generico dei contenuti
**Stato GitHub:** integrata in `main`  
**Commit di merge:** `5864f3c7d75e037ca19cfe2f9c3f7097f98fb2a4`

- L'endpoint `GET /api/admin/content` non mostra più le configurazioni di sistema con prefisso `__system.`, le righe di traduzione `i18n:` e i parametri della campagna donazioni.
- L'editor generico rifiuta le modifiche alle chiavi gestite dalle sezioni dedicate.
- La configurazione `home_template` resta disponibile all'API per non interrompere il selettore dei template; il frontend dell'editor generico la nasconde.
- Lo stato vuoto dell'editor spiega che le configurazioni tecniche vanno gestite dalle sezioni dedicate per template homepage e donazioni.

**Verifica produzione:** il merge è confermato. Al momento della redazione non è ancora stata confermata una nuova distribuzione Render successiva al merge né la verifica manuale della pagina in produzione.

---

## 2. Funzionalità implementate

### Sito, homepage e navigazione
- Homepage con selettore di template amministrativo e modello predefinito `modern-2026`.
- Palette JSO basata su blu, giallo e bianco; il template classico resta un'alternativa selezionabile.
- Varianti visuali distinte per Modern 2026, Stadium e Club Magazine.
- Aggiunti template homepage dedicati ad Academy, Supporters, Matchday e Heritage, con ordine delle sezioni e anteprime differenziate.
- Anteprima della homepage nell'area amministrativa con modalità desktop e mobile.
- Correzioni alla connettività dell'anteprima: origine CORS canonica del frontend e fallback dell'URL API di produzione.
- URL delle partite con slug leggibili, mantenendo l'identificativo univoco e la compatibilità con i vecchi link.
- Normalizzazione dei nomi delle squadre avversarie e fallback per gli slug quando il nome non è disponibile.

### Amministrazione e gestione contenuti
- Moduli amministrativi per contenuti, template homepage, notizie, eventi, prodotti, sponsor, documenti, FAQ, volontari, bacheca supporter e libreria media.
- Conversione in modali di diversi flussi di creazione/modifica, mantenendo le azioni esistenti e la navigazione diretta dove prevista.
- Gestione di logo e immagine della squadra avversaria dalla scheda della partita, con anteprima e rimozione; visualizzazione pubblica con fallback alle iniziali.
- Correzione dell'integrazione dell'area amministrativa per la gestione delle dirette live.
- Protezione delle configurazioni tecniche dall'editor generico dei contenuti (PR #138).

### Account supporter e profili
- Gestione amministrativa degli account supporter: ricerca, filtri, blocco e riattivazione.
- Valutazioni supporter a 1, 3 o 5 stelle; 3 e 5 stelle determinano lo stato VIP, mentre 1 stella corrisponde allo stato standard.
- Controllo dello stato dell'account durante l'autenticazione API, così da rifiutare i token degli account bloccati.
- Registrazione e modifica del profilo con nome, cognome e numero di telefono.
- Collegamenti rapidi alle sezioni amministrative per i ruoli autorizzati.
- Le modifiche di stato e valutazione sono soggette ad autorizzazione e registrazione nell'audit log.

### Partite, dirette e accesso ai contenuti
- Gestione amministrativa delle configurazioni streaming associate alle partite, con URL HTTPS del player, orari, prezzo, valuta e stato bozza/pubblicato.
- Visibilità del modulo dirette per i ruoli amministrativi autorizzati.
- Correzioni alla gestione e alla visualizzazione degli errori API delle dirette.
- Supporto ai codici promozionali per singola diretta: percentuale di sconto, scadenza facoltativa, limite di utilizzi e attivazione/disattivazione.
- Riscatto gratuito con sconto del 100%, registrato come accesso promozionale e non come pagamento incassato.
- Gli URL inseriti per l'embed devono essere pagine player HTTPS; i manifest HLS `.m3u8` e DASH `.mpd` non sono accettati come URL iframe.
- Gli utenti Developer/Admin/SuperAdmin possono visualizzare i contenuti premium pubblicati secondo le regole implementate, senza generare pagamenti fittizi.

### Donazioni e pagamenti
- Pagina pubblica di sostegno con selezione esplicita dell'importo, importo personalizzato e validazione prima di procedere.
- Area amministrativa donazioni con riepiloghi, obiettivi della campagna, elenco contributi e stato dei metodi di pagamento.
- Gestione dedicata dei parametri della campagna donazioni.
- La pagina pubblica mostra come disponibili soltanto i metodi di pagamento configurati come operativi.
- Le chiavi di pagamento e le configurazioni riservate non devono essere modificate attraverso l'editor generico dei contenuti.

### CMS notizie e media
- È stato preparato il flusso CMS in stile WordPress con editor di creazione/modifica, slug, excerpt, stato bozza/pubblicato, data di pubblicazione, immagine in evidenza, anteprima e strumenti di formattazione.
- È prevista la selezione di media dalla Media Library e l'inserimento di più immagini nel corpo dell'articolo, con rendering di immagini, didascalie, citazioni ed elenchi.
- **Nota sullo stato:** la PR #136 relativa al CMS WordPress-style risulta separata dal merge #138; non va considerata pubblicata in `main` finché non viene verificata come integrata.

### Applicazione mobile e distribuzione
- App Flutter con navigazione alle partite e scheda diretta live; il flusso di accesso ai contenuti usa l'API con controllo dei diritti.
- Workflow GitHub Actions per analisi/test Flutter e build APK Android.
- Pubblicazione dell'APK come artefatto scaricabile e collegamento di download Android sul sito.
- Correzione del riferimento al nome reale dell'APK `app-release.apk`.
- Workflow per produrre un archivio iOS non firmato compatibile con il runner macOS.
- Aggiunta della cronologia pagamenti nell'app mobile.
- **Limite:** la distribuzione iOS via TestFlight non è completata; richiede firma Apple e configurazione App Store Connect.

### API, database e sicurezza
- API ASP.NET Core con Entity Framework Core e PostgreSQL in produzione.
- Migrazioni per nuove funzionalità supporter e altri moduli.
- Configurazione TLS PostgreSQL e correzioni alla pipeline CI per i test locali.
- Controlli di autorizzazione per le operazioni amministrative, validazione degli input e registrazione audit per operazioni sensibili.
- Build, test, controlli di sicurezza e validazione schema database sono stati eseguiti per più PR; lo stato va comunque verificato sul commit corrente prima di ogni rilascio.

### Documentazione e pianificazione
- Aggiunti documenti di pianificazione per dashboard cliente, roadmap, backlog tecnico e user stories.
- Corretti i ritorni a capo letterali nei documenti di roadmap/backlog/user stories.

---

## 3. PR e riferimenti rilevanti

| PR / commit | Ambito | Stato noto |
|---|---|---|
| [PR #138](https://github.com/abderrazak-naceur/Jso-Web/pull/138) | Editor contenuti e configurazioni di sistema | Integrata in `main` |
| [PR #136](https://github.com/abderrazak-naceur/Jso-Web/pull/136) | CMS notizie stile WordPress e Media Library | Da verificare separatamente; non conteggiata come integrata |
| [PR #132](https://github.com/abderrazak-naceur/Jso-Web/pull/132) | CORS, URL API e anteprima template | Riferimento di implementazione |
| [PR #130](https://github.com/abderrazak-naceur/Jso-Web/pull/130) | Modali CRUD nell'admin | Riferimento di implementazione |
| [PR #128](https://github.com/abderrazak-naceur/Jso-Web/pull/128) | Modale modifica partita | Riferimento di implementazione |
| [PR #127](https://github.com/abderrazak-naceur/Jso-Web/pull/127) | Logo squadra avversaria | Riferimento di implementazione |
| [PR #125](https://github.com/abderrazak-naceur/Jso-Web/pull/125) | Importo donazione selezionato | Riferimento di implementazione |
| [PR #124](https://github.com/abderrazak-naceur/Jso-Web/pull/124) | Slug leggibili delle partite | Riferimento di implementazione |
| [PR #123](https://github.com/abderrazak-naceur/Jso-Web/pull/123) | Accesso admin e gestione supporter mobile | Stato da verificare prima di dichiarare parity completa |
| [PR #122](https://github.com/abderrazak-naceur/Jso-Web/pull/122) | Blocco account e stelle VIP | Integrata in `main` secondo il registro lavori |
| [PR #121](https://github.com/abderrazak-naceur/Jso-Web/pull/121) | Template homepage Modern 2026 | La precedente registrazione la indicava come draft; verificare lo stato corrente prima di considerarla rilasciata |
| [PR #117](https://github.com/abderrazak-naceur/Jso-Web/pull/117) | Codici promo per le dirette | Riferimento di implementazione |
| [PR #115](https://github.com/abderrazak-naceur/Jso-Web/pull/115) | API admin dirette e download APK | Riferimento di implementazione |
| [PR #113](https://github.com/abderrazak-naceur/Jso-Web/pull/113) | Dirette nell'app Flutter | Riferimento di implementazione |
| [PR #111](https://github.com/abderrazak-naceur/Jso-Web/pull/111) | Accesso premium per ruoli interni | Integrata in `main` secondo il registro lavori |

---

## 4. Attività da completare o verificare

- [ ] Verificare che Render abbia pubblicato il commit successivo al merge della PR #138.
- [ ] Testare in produzione `/admin/content`: le configurazioni tecniche non devono apparire nell'editor generico.
- [ ] Verificare che il selettore template continui a leggere e salvare `home_template`.
- [ ] Controllare i workflow CI, Docker, backend e frontend sul commit effettivamente rilasciato.
- [ ] Verificare lo stato e l'eventuale merge della PR #136 (CMS WordPress-style).
- [ ] Completare il test end-to-end delle dirette con provider di pagamento e playback firmato; il funzionamento reale dei pagamenti e dei token firmati richiede verifica separata.
- [ ] Completare la configurazione Apple Developer/App Store Connect per TestFlight.
- [ ] Eseguire una revisione visuale reale su desktop e mobile per i template homepage.
- [ ] Completare il test interattivo degli account supporter con account di prova.

---

## 5. Regola per gli aggiornamenti futuri

A ogni rilascio aggiornare questo file con:
1. data e versione;
2. funzionalità nuove;
3. correzioni e regressioni risolte;
4. migrazioni database;
5. test e workflow con esito verificato;
6. commit/PR integrati;
7. stato del deploy frontend/API Render;
8. limitazioni note e attività ancora aperte.

**Importante:** una PR aperta, un workflow ancora in esecuzione o un commit integrato ma non distribuito non devono essere descritti come funzionalità verificate in produzione.
