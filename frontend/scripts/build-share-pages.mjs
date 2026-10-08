import { readFile, mkdir, writeFile } from 'node:fs/promises'

const dist = new URL('../dist/', import.meta.url)
const source = await readFile(new URL('index.html', dist), 'utf8')
const site = (process.env.VITE_PUBLIC_SITE_URL || 'https://jso-web.onrender.com').replace(/\/+$/, '')

const pages = [
  ['/matchs', 'Matchs et résultats', 'Calendrier, résultats et Match Center de la JSO.'],
  ['/actualites', 'Actualités', 'Les nouvelles et les communiqués de la JSO.'],
  ['/equipe', 'Équipe', 'Découvrez les joueurs de la Jeunesse Sportive de Oudhref.'],
  ['/club', 'Le Club', 'Découvrez la Jeunesse Sportive de Oudhref.'],
  ['/boutique', 'Boutique officielle', 'Découvrez les produits officiels de la JSO.'],
  ['/soutenir', 'Soutenir la JSO', 'Participez à la campagne de soutien de la JSO.'],
  ['/abonnements', 'Abonnements', 'Rejoignez les abonnés de la JSO.'],
  ['/medias', 'Médias', 'Photos et médias de la JSO.'],
  ['/agenda', 'Agenda', 'Les rendez-vous à venir de la JSO.'],
  ['/communaute', 'Communauté', 'Les initiatives de la communauté JSO.'],
  ['/musee', 'Musée', 'Les archives et souvenirs de la JSO.'],
  ['/application', 'Application mobile', 'Retrouvez la JSO sur votre mobile.'],
  ['/partenaires', 'Partenaires', 'Les partenaires de la JSO.'],
  ['/infos', 'Infos pratiques', 'Informations pratiques de la JSO.'],
  ['/billetterie', 'Billetterie', 'Réservez vos billets pour les matchs de la JSO.'],
]

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
}

function setMeta(html, name, value) {
  const escaped = escapeHtml(value)
  return html.replace(new RegExp(`(<meta (?:name|property)="${name}" content=")[^"]*(" />)`), `$1${escaped}$2`)
}

for (const [path, title, description] of pages) {
  const absolute = site + path
  let html = source
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)} · JSO</title>`)
    .replace(/(<link rel="canonical" href=")[^"]*(" \/>)/, `$1${absolute}$2`)
  for (const key of ['description', 'og:description', 'twitter:description']) html = setMeta(html, key, description)
  for (const key of ['og:title', 'twitter:title']) html = setMeta(html, key, `${title} · JSO`)
  html = setMeta(html, 'og:url', absolute)
  const directory = new URL(`.${path}/`, dist)
  await mkdir(directory, { recursive: true })
  await writeFile(new URL('index.html', directory), html)
}

process.stdout.write(`Generated ${pages.length} shareable section pages.\n`)
