# JSO — Go-live : checklist opérationnelle

**But :** mettre le site + l'admin + l'API en ligne sur une VM Oracle Cloud,
avec HTTPS et PostgreSQL persistant, puis vérifier les flux critiques.

Ce document est la **checklist exécutable** de bout en bout. Il relie les pièces
existantes plutôt que de les répéter :
- Plan et décisions : [`DEPLOY_ORACLE_CLOUD.md`](DEPLOY_ORACLE_CLOUD.md)
- Commandes de déploiement, sauvegarde et restauration : [`../deploy/oracle/README.md`](../deploy/oracle/README.md)
- Critères de sortie : [`ROADMAP.md`](ROADMAP.md) (Priorité 0)

> Rien ici ne nécessite d'écrire du code : tout le produit est prêt dans le dépôt.
> Ce qui reste, ce sont des actions d'environnement (VM, domaine, HTTPS, comptes).
> Suivre les étapes **dans l'ordre** : chacune dépend de la précédente.

---

## 0. Pré-requis (à réunir avant de commencer)

- [ ] Un **compte Oracle Cloud** (Always Free) et une région où la VM Ampere A1 (ARM64) est disponible.
- [ ] Un **nom de domaine** (ex. `jso-oudhref.tn`) sur lequel vous pouvez éditer le DNS.
- [ ] Une **clé SSH** pour accéder à la VM.
- [ ] Les valeurs de secrets prêtes : `JWT_SECRET` (≥ 32 caractères aléatoires),
      `POSTGRES_PASSWORD` (fort), `ADMIN_BOOTSTRAP_PASSWORD` (≥ 12 caractères).

Générer des secrets solides (exemples) :
```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 24   # POSTGRES_PASSWORD
```

---

## 1. Créer et sécuriser la VM

- [ ] Créer une VM **Ampere A1 (ARM64)** sous Oracle Linux ou Ubuntu, dans les limites Always Free.
- [ ] Dans la *Security List* / *Network Security Group* Oracle, autoriser en entrée uniquement :
      **22 (SSH)**, **80 (HTTP)**, **443 (HTTPS)**. Ne jamais exposer PostgreSQL (5432).
- [ ] Se connecter en SSH et mettre à jour le système.
- [ ] Ouvrir le pare-feu local pour 80/443 si `firewalld`/`ufw` est actif :
```bash
# Oracle Linux (firewalld)
sudo firewall-cmd --permanent --add-service=http --add-service=https && sudo firewall-cmd --reload
# Ubuntu (ufw)
sudo ufw allow 80,443,22/tcp && sudo ufw enable
```

## 2. Installer Docker

- [ ] Installer **Docker Engine + plugin Compose**, activer le service, ajouter l'utilisateur au groupe docker.
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"   # se reconnecter ensuite
docker compose version            # vérifier le plugin Compose
```

## 3. Récupérer le code et configurer les secrets

- [ ] Cloner le dépôt et créer `.env.prod` **hors du contrôle de version**.
```bash
git clone https://github.com/abderrazak-naceur/Jso-Web.git
cd Jso-Web
cp .env.prod.example .env.prod
nano .env.prod
```
- [ ] Renseigner au minimum : `JWT_SECRET`, `PUBLIC_ORIGIN` (ex. `https://jso-oudhref.tn`),
      `POSTGRES_USER`, `POSTGRES_PASSWORD`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`.
- [ ] Valider la configuration **avant** de démarrer :
```bash
bash deploy/oracle/check-config.sh
```

## 4. Premier déploiement (HTTP)

- [ ] Lancer le stack de production (frontend Nginx + API .NET + PostgreSQL 17).
      L'API applique les migrations au démarrage (`MigrateAsync`) et amorce l'admin.
```bash
chmod +x deploy/oracle/deploy.sh
deploy/oracle/deploy.sh
```
- [ ] Vérifier en local sur la VM (frontend, `/health`, routes API publiques) :
```bash
bash deploy/oracle/check-local.sh
```
- [ ] Contrôler les logs si besoin :
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api
```

## 5. Domaine + HTTPS (la pièce manquante)

Le stack expose HTTP sur le port 80. Pour le HTTPS public, mettre un reverse
proxy TLS **devant**. Deux options ; choisir **A** (le plus simple sur une VM seule).

### Option A — Caddy sur la VM (certificat Let's Encrypt automatique)

- [ ] Pointer le DNS : un enregistrement **A** `jso-oudhref.tn` → IP publique de la VM
      (et `www` si voulu). Attendre la propagation (`dig +short jso-oudhref.tn`).
- [ ] Installer Caddy et le configurer comme proxy vers le service web local.
      Comme le conteneur `web` publie le port 80, exposer plutôt Caddy sur 80/443
      et faire proxy vers le conteneur. Le plus net : republier le service `web`
      sur `127.0.0.1:8080` (éditer `ports: - "127.0.0.1:8080:80"` dans
      `docker-compose.prod.yml`) puis laisser Caddy prendre 80/443.
```bash
# Installer Caddy (Ubuntu) — voir caddyserver.com pour Oracle Linux
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
# ... dépôt officiel Caddy, puis:
sudo apt install caddy
```
- [ ] `/etc/caddy/Caddyfile` :
```
jso-oudhref.tn {
    reverse_proxy 127.0.0.1:8080
}
```
- [ ] `sudo systemctl reload caddy` — Caddy obtient et renouvelle le certificat tout seul.

### Option B — Cloudflare devant la VM

- [ ] Déléguer le domaine à Cloudflare, créer l'enregistrement A (proxied) vers la VM,
      régler SSL/TLS sur **Full (strict)** avec un certificat d'origine sur la VM.
      (Plus de mises en garde dans [`deploy/oracle/README.md`](../deploy/oracle/README.md).)

### Vérifier le HTTPS depuis l'extérieur

- [ ] Depuis une machine **hors** de la VM, avec validation TLS réelle :
```bash
bash deploy/oracle/check-domain.sh https://jso-oudhref.tn
```
- [ ] Confirmer que `PUBLIC_ORIGIN` = l'URL HTTPS réelle (le CORS et les liens partagés en dépendent).
      Si vous l'avez changé, recréer le conteneur API :
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --force-recreate api
```

## 6. Sauvegarde et restauration (obligatoire avant le go-live)

- [ ] Première sauvegarde manuelle vers un disque persistant :
```bash
chmod +x deploy/oracle/backup.sh
deploy/oracle/backup.sh /mnt/jso-backups
```
- [ ] Planifier sauvegarde quotidienne + vérification hebdo (crontab) — voir
      [`deploy/oracle/README.md`](../deploy/oracle/README.md#schedule-and-verify).
- [ ] **Tester une restauration** sur une *stack de récupération séparée*
      (`.env.recovery`, projet `jso-recovery`, jamais les secrets de prod) et
      enregistrer le marqueur `RESTORE_TESTED`. Tant que ce test n'est pas fait,
      la sauvegarde n'est pas prouvée.
- [ ] Garder **au moins une copie hors VM**.

## 7. Sécurité post-démarrage

- [ ] Se connecter à l'admin sur `https://jso-oudhref.tn/admin`, **changer le mot de passe** initial.
- [ ] Retirer `ADMIN_BOOTSTRAP_PASSWORD` de `.env.prod` et recréer le conteneur API
      (le bootstrap ne modifie pas un admin déjà présent) :
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --force-recreate api
```
- [ ] Confirmer que PostgreSQL n'est **pas** accessible depuis l'extérieur (aucun port 5432 publié/ouvert).

## 8. Recette end-to-end (critère de sortie Priorité 0)

Depuis un navigateur, sur le domaine réel :
- [ ] `GET https://jso-oudhref.tn/health` répond OK.
- [ ] Le site public s'affiche ; actualités, matchs, boutique se chargent.
- [ ] Login admin OK ; créer/publier une actualité → visible sur le site.
- [ ] Upload d'un média dans l'admin → visible et persistant après redémarrage du conteneur.
- [ ] Une route admin appelée **sans** jeton renvoie 401.
- [ ] Les workflows CI GitHub sont verts sur `main`.

Quand toutes les cases sont cochées, le critère de sortie **Priorité 0** de la
[ROADMAP](ROADMAP.md) est atteint : le club peut publier et mettre à jour sans
toucher au code.

---

## Après le go-live (non bloquant)

- **Web :** audit WCAG manuel (lecteur d'écran) + mesure Lighthouse sur l'environnement réel.
- **Mobile :** tests sur appareils Android/iOS réels, signature et publication sur les stores,
  notifications push FCM éventuelles (compte Firebase). Voir [`../mobile/README.md`](../mobile/README.md).
- **Réseaux sociaux :** auto-post Facebook activable avec un jeton de Page — voir [`SOCIAL.md`](SOCIAL.md).
