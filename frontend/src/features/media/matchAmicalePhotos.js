export const MATCH_AMICALE_PHOTOS = [
  {
    file: '842283246_1871850230840027_3397039685695024645_n.jpg',
    alt: 'Les joueurs de la JSO disputent un ballon aérien pendant le match amical.',
    caption: 'Dans le jeu',
  },
  {
    file: '841804600_29235823309359171_5540295931250527336_n.jpg',
    alt: 'Un joueur de la JSO se prépare à jouer le ballon sur le terrain.',
    caption: 'Prêts à jouer',
  },
  {
    file: '842696586_1810495486651698_3199140919906579583_n.jpg',
    alt: 'Les joueurs se saluent après une séquence du match amical.',
    caption: 'Esprit d’équipe',
  },
  {
    file: '842954766_1492066866096176_647311883475158210_n.jpg',
    alt: 'Un joueur de la JSO rejoint le terrain pendant le match amical.',
    caption: 'Les couleurs du club',
  },
  {
    file: '843190992_4297039220440877_3342635851119423872_n.jpg',
    alt: 'Deux joueurs de la JSO travaillent le ballon sur le terrain.',
    caption: 'Au travail',
  },
].map((photo) => ({ ...photo, src: `/img/Jso-match-amicale/${photo.file}` }))
