# JSO — Functional Analysis

## Obiettivo
Verificare cosa offre oggi il prodotto e cosa richiede la roadmap funzionale.

## Area pubblica
### Disponibile nel prototipo
- Homepage.
- Presentazione club.
- Preview Match Center.
- Sezione squadra.
- Newsroom demo.
- Media House demo.
- Boutique placeholder.
- Navigazione responsive.

### Funzionalità target
- Dati reali del club.
- Calendario e risultati.
- Classifiche.
- Profili giocatori/staff.
- News CMS.
- Media library.
- Community.
- Shop.
- Sponsor.
- Contatti e pagine legali.

## Area admin
Target funzionale:
- Login.
- Dashboard.
- Utenti amministrativi.
- Ruoli/permessi.
- Club settings.
- Squadre/giocatori/staff.
- Partite.
- News.
- Media.
- Homepage builder.
- Menu/footer.
- Moderazione.
- Analytics.
- Audit log.

Stato: **specificato/documentato, non ancora implementato nel codice verificato**.

## Flussi principali
### Pubblicazione news
`Draft → Review → Scheduled → Published → Archived`

### Match
`Create → Edit → Add events/result → Validate → Publish`

### Media
`Upload → Metadata → Review → Publish → Archive/Delete`

### Admin
`Login → Authorization → Module → CRUD → Audit`

## Requisiti funzionali mancanti
- Persistenza dati.
- API.
- RBAC reale.
- Workflow editoriale reale.
- Upload/storage reale.
- Match data provider/manual fallback.
- Notifiche.
- Community moderation.
- Shop/order management.

## Acceptance focus
Ogni modulo deve avere:
- autorizzazione coerente con ruolo;
- validazione;
- conferma per operazioni distruttive;
- loading/empty/error states;
- audit per azioni amministrative sensibili;
- comportamento responsive dove applicabile.

## Functional conclusion
Il concept funzionale è ben documentato; il lavoro principale è trasformare i flussi documentati in funzionalità reali attraverso API, database e admin.
