# JSO Web — Proposta interfaccia frontend premium

**Stato:** concept UX/UI e mockup testuale, non implementato nel frontend.  
**Repository:** `abderrazak-naceur/Jso-Web`  
**Branch:** `design/jso-premium-frontend-mockups`

## Direzione creativa

Un'esperienza da club professionistico, mobile-first, con palette coerente con lo stemma JSO: blu navy, blu acceso, giallo oro e bianco. Fotografia sportiva autentica, tipografia forte, CTA visibili ma non invadenti, card con bordi arrotondati moderati e gerarchia editoriale chiara.

Lingua di riferimento della proposta: francese, coerente con l'interfaccia pubblica esistente. I testi restano compatibili con l'internazionalizzazione già presente.

## Schermata 1 — Home / Matchday

1. Barra superiore discreta: nome completo del club, collegamenti social e selezione lingua.
2. Header sticky: stemma JSO, Accueil, Matchs, Actualités, Équipe, Billetterie, Abonnements, Boutique; CTA “Mon compte”.
3. Hero con fotografia di partita, messaggio “TOUJOURS PLUS HAUT. TOUJOURS JSO.” e due azioni: “Acheter un billet” e “Devenir membre”.
4. Scheda “Prochain match” con stemmi, data/ora provenienti dall'API, stato vendita e link a Match Center.
5. Barra di conversione: biglietti, abbonamenti, shop ufficiale.
6. Sezione “Prochains rendez-vous” con calendario e ultimi risultati.
7. Sezione ultime notizie con immagine ampia e due articoli secondari.
8. Vetrina sponsor ordinata per tier e priorità, con link sicuri e CTA per diventare partner.
9. Banner membership e sostegno economico con vantaggi trasparenti.
10. Footer ricco: contatti ufficiali, social, partner, documenti, privacy e accessibilità.

## Schermata 2 — Biglietteria

- Banner partita e stato vendita.
- Scelta tra categorie di biglietto con prezzo e disponibilità reali.
- Dettagli di accessibilità, condizioni e politica di rimborso.
- Riepilogo ordine sempre visibile su desktop; riepilogo sticky su mobile.
- Pagamento solo tramite provider esterno; non memorizzare dati carta.
- Conferma ordine e ticket digitale con QR univoco, pagina “I miei biglietti” e istruzioni all'ingresso.
- Stati espliciti: vendita non aperta, disponibile, esaurito, errore, pagamento in attesa.

## Schermata 3 — Abbonamenti / Membership

- Piani configurati dall'amministrazione, non prezzi hardcoded.
- Card piani “Supporter”, “Membre”, “Partenaire” soltanto come naming proposto da validare con il club.
- Per ogni piano: prezzo e periodo, vantaggi, condizioni di rinnovo, durata, eventuale limite di disponibilità.
- Evidenza chiara del piano selezionato e riepilogo prima del pagamento.
- Area profilo con stato membership, scadenza, rinnovo e ricevute.
- Nessun vantaggio premium concesso soltanto dal frontend: validazione sempre lato server.

## Schermata 4 — Sponsor & partnership

- Sponsor title / gold / silver / partner, secondo i dati configurati.
- Posizionamenti distinti: home, footer, matchday.
- CTA “Devenir partenaire de la JSO” con contatto commerciale configurato dal club.
- In prospettiva, report sponsor con impression e clic, senza promettere dati finché il tracciamento non è implementato.
- Non mostrare sponsor scaduti, inattivi o fuori periodo.

## Schermata 5 — Profilo tifoso / Fan wallet

- Profilo, preferenze lingua e comunicazioni.
- “Mes billets” con codice QR e stato check-in.
- “Mon abonnement” con vantaggi e scadenza.
- Ordini shop e ricevute.
- Notifiche preferite per match, risultati e news.
- Accessibilità e sicurezza dell'account.
- Preparare la UX al futuro wallet digitale senza presentarlo come già attivo.

## Componenti e stati UX

- MatchCard, TicketCard, MembershipPlanCard, SponsorLogoCard, NewsCard, EmptyState, LoadingSkeleton, ErrorState e CTASection.
- Loading, assenza dati, errore API, stato offline e fallback immagine sempre previsti.
- Prezzi e disponibilità provengono dall'API; i testi demo non devono comparire quando l'API è disponibile.
- Responsive: breakpoint mobile, tablet e desktop; focus keyboard visibile; contrasto e label accessibili.
- Evitare carousel automatici invasivi e banner pubblicitari che sottraggano spazio a biglietti e informazioni sportive.

## Mappatura con l'implementazione esistente

Nel repository sono già presenti HomePage, MatchdaySection, MembershipsSection, SponsorsSection, CartDrawer, account tifosi, shop e routing pubblico. La proposta privilegia il riuso e il restyling graduale di queste aree, non una seconda app parallela.

Da verificare prima dell'implementazione:
- contratti API e stati di disponibilità dei ticket;
- piani membership e provider pagamenti realmente configurati;
- generazione/verifica QR e controllo accessi;
- contatto sponsor configurato nel build frontend;
- validazione mobile, i18n e test end-to-end;
- consenso, privacy e misurazione delle esposizioni sponsor.

## Criteri di accettazione

1. Navigazione e CTA funzionano con mouse, tastiera e touch.
2. Nessun prezzo, evento, sponsor o disponibilità falsa in produzione.
3. Flusso biglietto: scelta → riepilogo → provider pagamento → conferma → QR verificabile.
4. Flusso membership: piano → pagamento → stato membership verificato sul server.
5. Sponsor: filtri per attività, date, posizionamento e collegamenti esterni sicuri.
6. Test responsive a 360px, tablet e desktop; stati loading/vuoto/errore.
7. Build, lint, test frontend/API e flussi E2E verificati in CI prima del merge.

## Mockup da produrre

- `docs/mockups/jso-home-premium.svg` — homepage desktop, con hero, prossima partita, ticketing, news e sponsor.
- `docs/mockups/jso-tickets-membership.svg` — biglietteria e piani di abbonamento.
- `docs/mockups/jso-mobile-home.svg` — home mobile con ticket e membership.
