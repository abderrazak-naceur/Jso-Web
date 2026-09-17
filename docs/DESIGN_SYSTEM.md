# JSO — Visual & Color Design System

## Brand direction

La direzione visuale del sito ufficiale **JSO — Jeunesse Sportive d'Oudhref** è premium, sportiva e contemporanea.

Il sistema evita l'aspetto da semplice fan page e usa un linguaggio da club professionistico: fotografia cinematografica, superfici glass, card stratificate, glow controllati, tipografia forte e molto spazio visivo.

## Core palette

| Token | Hex | Uso |
|---|---|---|
| `--ink` | `#040811` | background più profondo |
| `--navy` | `#071225` | superficie primaria |
| `--navy-2` | `#0B1A33` | pannelli e hero |
| `--navy-3` | `#102748` | card e stati attivi |
| `--blue` | `#2F6BFF` | CTA, link, interazioni |
| `--blue-2` | `#5A93FF` | highlight e gradienti |
| `--cyan` | `#58E1FF` | micro-accenti tech/live |
| `--gold` | `#F4C542` | identità JSO, CTA premium |
| `--gold-2` | `#FFD95A` | highlight e hover |
| `--white` | `#F7F9FD` | testo principale |
| `--muted` | `#9CAAC0` | testo secondario |
| `--muted-2` | `#708099` | metadata |

## Color strategy

### JSO Gold

Il **gold** è il colore identitario principale del club.

Usarlo per:

- CTA principali dove si vuole richiamare il club;
- numeri di maglia e micro-label;
- active states selezionati;
- membership/premium;
- dettagli grafici;
- elementi celebrativi.

### Deep Navy

Il **navy** costruisce la base premium del prodotto.

Usarlo per:

- body background;
- header/footer;
- Match Center;
- player cards;
- hero sections;
- overlay fotografici.

### Electric Blue

Il **blue** introduce energia digitale senza rubare spazio al gold.

Usarlo per:

- primary CTA quando il contesto è funzionale;
- link;
- progress/live states;
- focus states;
- gradienti.

### Cyan

Il cyan è volutamente secondario.

Usarlo solo per dettagli tecnologici come:

- live indicator;
- telemetry/data accents;
- navigation underline;
- micro glow;
- media/interactive states.

## Gradients

### Primary

```css
linear-gradient(135deg, #2F6BFF, #3A88FF)
```

### JSO Gold

```css
linear-gradient(135deg, #FFD95A, #F4C542)
```

### Premium hero

```css
linear-gradient(135deg, rgba(7,18,37,.96), rgba(10,28,54,.88))
```

### Gold / Blue identity

```css
linear-gradient(90deg, #FFFFFF 0%, #98B3FF 52%, #FFD95A 100%)
```

## Glassmorphism

Le card non devono essere piatte.

Pattern:

```css
background: rgba(10, 19, 35, .67);
backdrop-filter: blur(16px);
border: 1px solid rgba(255,255,255,.09);
box-shadow: 0 30px 90px rgba(0,0,0,.36);
```

Per livelli più importanti usare una superficie più opaca:

```css
background: rgba(13, 27, 49, .83);
```

## Borders

I bordi sono sempre sottili e semitrasparenti.

- standard: `rgba(255,255,255,.09)`
- hover: `rgba(255,255,255,.16)`
- cyan active: `rgba(88,225,255,.20)`
- gold active: `rgba(244,197,66,.20)`

## Radius

- Hero: 32–36px
- Large cards: 24–30px
- Standard cards: 18–22px
- Controls: 10–14px
- Pills: 999px

## Typography

### Headings

`Manrope` con peso 700–800.

Caratteristiche:

- titoli grandi;
- letter-spacing negativo;
- contrasto alto;
- poche parole e impatto visuale.

### UI/body

`Inter` per:

- menu;
- metadata;
- body copy;
- form controls;
- dashboard.

## Photography

Quando saranno disponibili fotografie reali del club, il sito deve privilegiare:

- stadio di Oudhref;
- squadra e staff;
- matchday;
- tifosi;
- academy;
- dettagli di maglie e crest;
- backstage.

Le immagini devono essere trattate con overlay navy, contrasto e vignette leggere per mantenere leggibilità del testo.

## Motion

Le animazioni devono essere brevi e funzionali:

- hover card: `180–260ms`;
- CTA hover: `180–220ms`;
- page transitions: `250–450ms`;
- marquee: lenta e discreta;
- glow/pulse solo per live state.

Evitare animazioni continue pesanti che distraggono dal contenuto sportivo.

## Responsive

Desktop:

- esperienza cinematografica;
- più card affiancate;
- hero split layout;
- dashboard data-rich.

Tablet:

- riduzione colonne;
- mantenimento glass UI;
- navigazione compatta.

Mobile:

- un contenuto principale per volta;
- CTA full-width dove necessario;
- card scorrevoli quando utili;
- bottom navigation potenziale per la futura app/PWA.

## Visual benchmark

Il riferimento qualitativo è un sito di club professionistico moderno: forte identità, grande hero editoriale, Match Center, newsroom, media, squadra, community e shop integrati in un unico design system.

Non replicare il layout o la grafica di un club specifico: usare il livello di qualità come benchmark e mantenere l'identità JSO originale.
