# JSO — analisi app mobile

**Aggiornato:** 28 settembre 2026. L'app Flutter è **implementata** e collegata all'API reale; restano il collaudo su dispositivi fisici e la pubblicazione sugli store. I dettagli tecnici e i comandi sono in [`mobile/README.md`](../mobile/README.md).

## Scelta tecnica

Flutter + Dart per Android e iOS. L'app usa l'API ASP.NET Core e gli stessi dati PostgreSQL del sito; non serve un secondo backend.

```text
Sito React ──┐
Admin React ─┼── API ASP.NET Core ── PostgreSQL
App Flutter ─┘          │
                       └── media persistenti
```

Firebase Cloud Messaging può gestire le notifiche push e Crashlytics la diagnostica dell'app. Questi servizi sono separati dal database; l'MVP non prevede Firestore. Valutare quote e piano di fatturazione prima di adottare altri servizi Firebase.

## Stato implementato

Design allineato alla [guida di brand](BRAND_GUIDELINES.md): superfici chiare (paper), header d'accueil navy con blason ufficiale, accenti oro, bottom navigation chiara a cinque voci francesi (Accueil, Matchs, Équipe, Actualités, Plus). Testi UI in francese; ogni schermata gestisce stati caricamento/vuoto/errore.

- **Accueil** — header con blason e saluto, card "Prochain match", Actualités con immagini, risultati recenti (`GET /api/home`).
- **Matchs** — calendario/risultati; dettaglio partita a quattro tab: Résumé (cronologia + meteo), Direct (live blog con polling), Compos (formazioni e arbitri), Stats.
- **Équipe** — squadre e rose giocatori.
- **Actualités** — elenco e dettaglio articoli (per slug).
- **Plus** — hub verso Mon compte, Boutique, Agenda del club, Médias, Sponsors, Documents, FAQ, Musée e Écoles & partenaires.
- **Account tifoso** — registrazione, login, profilo, modifica profilo (con opt-in anniversario), cambio password e spazio RGPD (export dati + cancellazione account). Token JWT protetto nel keystore/Keychain.
- **Biglietteria** e **Boutique** con gateway manuale (conferma admin): prenotazioni/ordini con "Mes billets" e "Mes commandes".

Il blason ufficiale è incluso come asset; le immagini di concept nel repository restano riferimenti grafici.

## Prerequisiti (per il go-live mobile)

1. API pubblica via HTTPS con contratti stabili, paginazione e gestione errori.
2. URL media accessibili dall'app e backup verificato.
3. Autenticazione e permessi definiti per i tifosi, separati dagli account admin. **Fatto** lato app (ruolo `Fan`, token separato).
4. Strategia notifiche con consenso utente e gestione dei token dispositivo. **Da fare** (FCM non ancora integrato).
5. Test su dispositivi Android e iOS reali. **Da fare** (richiede SDK/piattaforme e account sviluppatore).

La sequenza operativa e i criteri di uscita sono nel [piano aggiornato](ROADMAP.md), Priorità 2.
