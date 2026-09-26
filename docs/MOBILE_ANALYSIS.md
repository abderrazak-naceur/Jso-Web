# JSO — analisi app mobile

**Aggiornato:** 26 settembre 2026. L'app è pianificata, non ancora implementata.

## Scelta tecnica

Flutter + Dart per Android e iOS. L'app usa l'API ASP.NET Core e gli stessi dati PostgreSQL del sito; non serve un secondo backend. Le immagini nel README sono concept visivi.

```text
Sito React ──┐
Admin React ─┼── API ASP.NET Core ── PostgreSQL
App Flutter ─┘          │
                       └── media persistenti
```

Firebase Cloud Messaging può gestire le notifiche push e Crashlytics la diagnostica dell'app. Questi servizi sono separati dal database; l'MVP non prevede Firestore. Valutare quote e piano di fatturazione prima di adottare altri servizi Firebase.

## Schermate previste

- Home con prossimo match e notizie.
- Calendario, risultati e dettaglio partita.
- Notizie e articoli.
- Squadra e profili giocatori.
- Foto e video.
- Profilo e notifiche quando i relativi flussi sono pronti.
- Community e shop in una fase successiva.

## Prerequisiti

1. API pubblica via HTTPS con contratti stabili, paginazione e gestione errori.
2. URL media accessibili dall'app e backup verificato.
3. Autenticazione e permessi definiti per i tifosi, separati dagli account admin quando necessario.
4. Strategia notifiche con consenso utente e gestione dei token dispositivo.
5. Test su dispositivi Android e iOS reali.

La sequenza operativa e i criteri di uscita sono nel [piano aggiornato](ROADMAP.md).
