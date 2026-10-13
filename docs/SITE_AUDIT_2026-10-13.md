# Verifica tecnica del sito — 13 ottobre 2026

## Esito

L'audit ha trovato e corretto difetti nel builder della homepage, nell'anteprima dei template, nella sicurezza del salvataggio e nel layout mobile stretto. Le modifiche sono nel working tree locale dopo V1.26 e non sono ancora commit o deploy. I test locali descritti sotto passano. Il dominio Render non è stato raggiungibile da questo ambiente per un errore di handshake TLS, quindi lo stato pubblico e le configurazioni esterne restano da verificare.

## Interventi completati in locale

- I quattro template ora hanno ordini delle sezioni distinti e temi CSS distinti. Le sezioni disponibili, incluse hero, highlights, fascia di supporto e promozione app, fanno parte della configurazione della homepage.
- L'admin monta una preview della homepage pubblica vera tramite `templatePreview`, con selettore desktop/mobile. La preview non salva né pubblica il modello.
- La scelta e il salvataggio restano disabilitati finché il valore corrente non è stato caricato correttamente; gli errori offrono un nuovo tentativo.
- L'ordinamento non nasconde le sezioni omesse dalla vecchia configurazione; l'ordine e la visibilità restano controlli distinti.
- Rimossi gli import e le variabili inutilizzati che generavano 13 avvisi lint.
- Risolto l'overflow orizzontale a 320 px: il logo del club semplifica il sottotitolo sotto la breakpoint `sm` e il documento non impone più una larghezza minima di 320 px.
- Aggiunti test per unicità/completezza degli ordini template, ordinamento parziale e mapping delle sezioni.
- Aggiornati README e cronologia versioni per separare verifiche locali, tag Git e stato del deploy.

I template condividono ancora componenti e dati del sito; le differenze sono ordine, tema e resa dei blocchi. Non sono quattro sistemi grafici indipendenti né quattro set di contenuti. Il builder accetta i tipi di sezione implementati; eventuali record legacy `Text`/`CustomHtml` non sono trasformati automaticamente.

## Verifiche locali

| Verifica | Esito |
|---|---|
| `frontend`: `npm run lint` | Superata, nessun avviso |
| `frontend`: `node --test` | 8 test superati, 0 falliti |
| `frontend`: `npm run build` | Superata; generate 15 pagine condivisibili |
| API .NET Release | 29 test superati, 0 falliti |
| Homepage a viewport stretto | Verificata nel browser locale a 315 CSS px: `scrollWidth` = `clientWidth`, senza overflow orizzontale |
| `git diff --check` | Superato sul diff finale; Git segnala solo la normale conversione LF/CRLF di un file |

La build Vite ha richiesto l'esecuzione fuori dai limiti di scansione del sandbox, perché Tailwind/esbuild tentavano di leggere le directory genitore. Questo è un limite dell'ambiente di esecuzione, non un errore della build.

## Da verificare su ambienti reali

- Deploy Render, rewrite e refresh diretto per `/admin/...`, `/soutenir` e gli URL condivisibili.
- Login e permessi admin, configurazione contenuti, donazioni, pagamenti/webhook, upload e dati reali.
- Flussi e resa delle pagine su telefoni reali, tablet, browser diversi e con utenti autenticati.
- CI GitHub, migrazioni, backup e ripristino sul database dell'ambiente di produzione.
- Anteprime social di URL dinamici e configurazione dei domini API/frontend.

Le prove TLS fallite da questo runner non dimostrano che il sito sia offline. Prima del rilascio, ripetere i controlli da una rete che raggiunge Render e distinguere risposte applicative, proxy e API.

## Prossime priorità

1. Eseguire smoke test autenticati e dei flussi di pagamento sull'ambiente configurato, senza effettuare transazioni reali non autorizzate.
2. Verificare da rete raggiungibile le rewrite Render, il percorso `/soutenir` e tutte le pagine pubbliche condivisibili.
3. Verificare i dati legacy `Text`/`CustomHtml` del builder e migrare o rendere esplicito il loro supporto prima di rimuoverli.
4. Eseguire QA responsive e accessibilità su più browser e dispositivi; i test automatici attuali non sono E2E.
