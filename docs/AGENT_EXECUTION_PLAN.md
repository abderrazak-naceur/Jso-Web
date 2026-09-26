# Piano di lavoro degli agenti — JSO Web

**Obiettivo:** chiudere le parti verificabili della priorità 0 e preparare il collaudo sulla VM Oracle. Il deploy sul dominio reale e la prova di ripristino richiedono l'ambiente reale.

## Incarichi

| Agente | Incarico unico | File di competenza | Risultato atteso |
|---|---|---|---|
| A1 — Backup | Preparare pianificazione, retention e verifica periodica dei backup senza rischiare di cancellare copie non verificate. | `deploy/oracle/backup.sh`, nuovi file di backup e `deploy/oracle/README.md` | Script e istruzioni operative controllati con prove locali o simulate. |
| A2 — Collaudo deploy | Preparare controlli ripetibili di health, routing, HTTPS e configurazione per la VM Oracle. | Nuovi script in `deploy/oracle/` e `docs/DEPLOY_ORACLE_CLOUD.md` | Checklist eseguibile e istruzioni che distinguono test locali da verifiche sul dominio reale. |
| A3 — Flussi critici | Ampliare la CI PostgreSQL con il percorso partita → API → sito e verifiche di permessi dove possibile. | `.github/workflows/ci.yml` | Smoke test ripetibile che fallisce se il flusso essenziale si rompe. |
| A4 — API | Aggiungere la creazione admin di stagioni e competizioni, necessaria per inserire partite in un database di produzione nuovo. | `backend/src/` | Endpoint autorizzati e validati, con build o test pertinenti; nessuna modifica ai workflow. |
| A5 — Sito pubblico | Evitare notizie dimostrative quando l'API è disponibile ma non ci sono articoli; mostrare uno stato vuoto o di errore chiaro. | `src/` | Pagina verificata con build e lint; nessuna modifica ai contratti API. |

## Rotazione e integrazione

Il limite operativo è di tre sottoagenti contemporanei oltre all'agente principale. Partono A1–A3; quando uno conclude parte A4, poi A5. Un agente libero può ricevere un secondo incarico breve di revisione o correzione, senza lavorare sugli stessi file di un agente attivo. L'agente principale integra i risultati, risolve eventuali conflitti, esegue le verifiche e aggiorna il README. Il modello richiesto è Luna; ogni agente consuma comunque token.

## Criteri di completamento

1. Ogni agente consegna file modificati, verifica eseguita e limite rimasto.
2. Build, lint, configurazione Compose e CI pertinenti devono passare prima di considerare conclusa un'area.
3. Il README riporta solo risultati osservati. Restano aperti finché non verificati sulla VM: DNS/HTTPS, deploy reale, backup eseguito e restore riuscito.
