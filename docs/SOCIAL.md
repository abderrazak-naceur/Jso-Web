# Partage et publication sur les réseaux sociaux

Ce document décrit comment fonctionne le partage des actualités (news) du site
JSO et comment activer la publication automatique sur la Page Facebook du club.

## Vue d'ensemble

Deux niveaux, du plus simple au plus avancé :

1. **Lien public + partage manuel** (actif par défaut, sans configuration)
   - Chaque article publié possède une URL partageable : `/actualites/{slug}`.
   - Sur le site public, la fenêtre de l'article affiche une barre « Partager »
     (Facebook, X, WhatsApp, LinkedIn) et un bouton « Copier le lien ».
   - Dans l'admin (News CMS), chaque article publié affiche « Copier le lien
     public » et « Partager » (ouvre le partageur officiel de Facebook).
   - Aucune clé, aucune approbation Meta, aucune donnée personnelle.

2. **Publication automatique sur la Page Facebook** (optionnelle)
   - Bouton « Publier sur Facebook » dans l'admin : poste automatiquement le
     lien de l'article sur la Page du club via la Graph API.
   - Nécessite une app Meta et un jeton d'accès de Page (voir plus bas).
   - Tant que le jeton n'est pas configuré, le bouton renvoie un message clair
     et l'admin bascule automatiquement sur le partage manuel : jamais bloquant.

## Configuration (production)

Les valeurs sont lues depuis la section `Social` de la configuration
(variables d'environnement en production). Rien n'est jamais committé.

| Variable | Rôle |
| --- | --- |
| `Social__PublicSiteUrl` | URL publique du site (réutilise `PUBLIC_ORIGIN`). Sert à construire le lien partagé. |
| `Social__Facebook__PageId` | Identifiant de la Page Facebook du club. |
| `Social__Facebook__PageAccessToken` | Jeton d'accès de Page longue durée. **Secret.** |
| `Social__Facebook__GraphApiVersion` | Version de la Graph API (défaut `v21.0`). |

Dans `docker-compose.prod.yml`, `Social__PublicSiteUrl` est déjà mappé sur
`PUBLIC_ORIGIN`. Renseignez `FACEBOOK_PAGE_ID` et `FACEBOOK_PAGE_ACCESS_TOKEN`
dans `.env.prod` pour activer l'auto-publication.

### Obtenir un jeton de Page (résumé)

1. Créez une app sur [developers.facebook.com](https://developers.facebook.com/).
2. Ajoutez le produit « Facebook Login » et demandez la permission
   `pages_manage_posts` (revue Meta requise pour la production).
3. Générez un **User access token**, échangez-le contre un **long-lived token**,
   puis récupérez le **Page access token** de la Page du club via
   `GET /me/accounts`.
4. Copiez l'`id` de la Page et son `access_token` dans les variables ci-dessus.

Le jeton n'est utilisé que comme paramètre de la requête Graph
(`POST /{version}/{pageId}/feed`), jamais journalisé.

## Aperçu riche (Open Graph)

Quand un lien est collé sur Facebook, l'aperçu (image, titre, description) vient
des balises Open Graph de la page. Le site expose des balises OG globales
(voir `frontend/index.html`). Un aperçu **par article** (image de couverture et
titre spécifiques) nécessite un rendu Open Graph côté serveur pour la route
`/actualites/{slug}`, car le robot de Facebook n'exécute pas le JavaScript.
C'est une évolution d'infrastructure prévue mais non incluse ici : le partage et
l'auto-publication fonctionnent déjà avec l'aperçu global.

## Sécurité et confidentialité

- Aucun secret dans le dépôt ; jeton fourni uniquement par variable d'env.
- Seuls un lien public et le titre/extrait de l'article sont transmis.
- Chaque publication automatique est tracée dans l'audit
  (`PUBLISH_FACEBOOK` / `Article`).
- La publication n'est accessible qu'aux rôles autorisés
  (`SuperAdmin`, `ClubAdmin`, `Editor`, `CommunityManager`).
