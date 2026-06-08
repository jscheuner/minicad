# Plan — Connexion cloud kDrive (Infomaniak)

Statut : **proposé** (non démarré). But : ouvrir/enregistrer les `.mcad` sur kDrive.
Contrainte MiniCAD : le fichier livré reste un **HTML autonome** (seul `fetch()` natif,
aucune dépendance runtime).

## DÉCISION (2026-06-08) — CORS bloqué → proxy same-origin PHP
Test étape 0 sur `https://minicad.org` : `fetch` vers `api.infomaniak.com` →
**`TypeError: Failed to fetch`** ⇒ l'API n'envoie pas les en-têtes CORS ⇒
**connecteur pur-client impossible**.
minicad.org est déployé par FTP dans `web/` (hébergement web Infomaniak, PHP dispo)
⇒ solution retenue : **petit proxy PHP `web/kdrive.php` same-origin**.
- Le navigateur appelle `/kdrive.php` (même origine → **aucun CORS**).
- Le PHP relaie vers `api.infomaniak.com` (serveur→serveur, pas de CORS) avec le token.
- MVP : **token kDrive collé** par l'utilisateur, transmis au proxy (HTTPS, même origine),
  jamais journalisé. OAuth2 PKCE possible plus tard (le proxy garderait le secret).
- Limite : le cloud ne marche que sur **minicad.org** (pas en `file://`) — acceptable.

---

## Le verrou : CORS

La connexion se fait par `fetch()` **depuis le navigateur**. L'obstacle décisif est le
**CORS** : kDrive/Infomaniak doivent autoriser les requêtes cross-origin depuis
`minicad.org` (et idéalement `file://`).

Faits établis :
- **kDrive WebDAV** : `https://connect.drive.infomaniak.com/`, **Basic auth**
  (e-mail + *mot de passe d'application*). Protocole simple
  (`PROPFIND`/`GET`/`PUT`/`MKCOL`/`DELETE`) — mais CORS navigateur quasi sûrement **bloqué**.
- **API REST Infomaniak** : `https://api.infomaniak.com`, **OAuth2 Bearer**,
  scope **`drive`**, **60 req/min**. Endpoints kDrive sous `/2/drive/{drive_id}/...`
  (upload via `/3/drive/{drive_id}/upload`).
- **OAuth2** : supporte les **clients publics PKCE** (pas de secret) — confirmé par la
  lib Android (`clientId` + `redirectUri`). Endpoints type
  `https://login.infomaniak.com/authorize` et `/token`.
- **Jeton API personnel** : généré dans le manager, collé dans MiniCAD (pas d'OAuth).

### ÉTAPE 0 — Tester le CORS (décisif, à faire AVANT tout code)
À coller dans la console du navigateur sur `https://minicad.org` (remplacer TOKEN et DRIVE_ID) :

```js
// Test API REST
fetch('https://api.infomaniak.com/2/drive/DRIVE_ID/files', {
  headers: { 'Authorization': 'Bearer TOKEN' }
}).then(r => r.text()).then(t => console.log('API OK', t.slice(0,200)))
  .catch(e => console.error('API CORS/erreur', e));

// Test WebDAV (PROPFIND)
fetch('https://connect.drive.infomaniak.com/', {
  method: 'PROPFIND',
  headers: { 'Authorization': 'Basic ' + btoa('EMAIL:APP_PASSWORD'), 'Depth': '1' }
}).then(r => console.log('WebDAV', r.status))
  .catch(e => console.error('WebDAV CORS/erreur', e));
```

- **Pas d'erreur CORS** → connecteur 100 % client (idéal).
- **Erreur CORS** → il faut un **mini-proxy** (Infomaniak Functions / Cloudflare Worker /
  petit PHP sur l'hébergement minicad.org) qui ajoute les en-têtes CORS et garde le secret
  OAuth. Le HTML reste sans dépendance runtime, mais la *fonction cloud* dépend du proxy.

---

## Approches (simple → propre)

| # | Auth | Transport | Avantage | Risque |
|---|---|---|---|---|
| A | Jeton API collé | API REST | MVP rapide, zéro OAuth | CORS ; jeton puissant en localStorage |
| B | OAuth2 PKCE (bouton) | API REST | UX propre, pas de secret | CORS sur `/token` + redirection |
| C | Mot de passe d'app | WebDAV | Protocole trivial | CORS WebDAV quasi sûr d'être bloqué |
| D | A/B + mini-proxy | via proxy | Marche toujours | Rompt le « zéro serveur » |

**Reco** : MVP en **A**, puis **B** pour l'UX finale ; **D** seulement si l'étape 0 l'impose.

---

## Marche à suivre

**0. Faisabilité CORS** (0,5 j) — voir snippet ci-dessus. Décide client direct vs proxy.

**1. Couche d'abstraction « stockage »**
- Notion de backend : `local` (existant) et `kdrive`.
- Réutiliser `buildSaveData()` (sérialise) et `openJSON()` (désérialise) — le cloud
  n'échange que la chaîne JSON, le format `.mcad` ne change pas.
- Accroches : `cmdSave()`, `cmdOpen()`, indicateur de sauvegarde, `_fileHandle`
  (+ « handle cloud » : `{ driveId, fileId|path, name }`).

**2. Authentification**
- *A* : dialogue « Connexion kDrive » (drive_id + jeton) → `localStorage` (`minicad_kdrive`)
  + bouton « Tester ».
- *B (PKCE)* : `crypto.subtle` génère `code_verifier`/`code_challenge` → `/authorize`
  → callback `minicad.org/?kdrive_callback` (lit `code`) → échange `/token` →
  stockage access/refresh + expiration ; refresh auto.

**3. Opérations fichiers (module `cloud`)**
- `kdriveList(path)` — lister les `.mcad`.
- `kdriveDownload(id|path)` → JSON → `openJSON()`.
- `kdriveUpload(name, json)` → upload/`PUT` → mémoriser le handle (pour `Ctrl+S`).
- Gérer 60 req/min, erreurs (401→re-auth, 409, réseau), hors-ligne.

**4. UI**
- Menu Fichier : « Ouvrir depuis kDrive… », « Enregistrer sur kDrive… », « Déconnexion ».
- Dialogue navigateur de fichiers kDrive (dossiers + `.mcad`, nouveau nom à l'enregistrement).
- Indicateur « ☁ connecté / synchronisé ».

**5. Sécurité & robustesse**
- Jeton en localStorage : avertir (poste partagé) + bouton « oublier » ; scope minimal `drive`.
- `clientId` OAuth public (PKCE) → OK dans le HTML ; jamais de secret ni de jeton de test
  committé.
- Conflit d'édition : comparer `lastModified`/etag avant écrasement.

**6. Build & i18n**
- Isoler le connecteur (fichier injecté `@@CLOUD_BEGIN/END`, comme `animations/`/démo)
  ou dans `src/minicad.html`. Clés `fr.json`/`en.json`.

**7. Repli proxy (si CORS bloqué)**
- Mini-service (Functions/Worker) : `/auth/token`, `/list`, `/get`, `/put` relayant l'API
  kDrive avec en-têtes CORS pour `minicad.org`. Le HTML appelle le proxy.

---

## Estimation
- Étape 0 : 0,5 j (décisive).
- Client direct (A) : ~250–350 lignes.
- OAuth2 PKCE (B) : +150–250 lignes.
- Proxy (D) si nécessaire : ~80–150 lignes (hors HTML).

## Vigilance
- **CORS** = facteur n°1 (sans lui, proxy obligatoire).
- OAuth dans un HTML unique → callback stable nécessaire → surtout pour **minicad.org**
  (pas `file://`).
- Partir sur l'**API REST** (mieux documentée que le WebDAV pour un usage applicatif).

## Sources
- developer.infomaniak.com/getting-started, /docs/api
- infomaniak.com FAQ 2581 (découvrir l'API), 2582 (jetons), 2567 (applications OAuth)
- docs.cyberduck.io/protocols/webdav/kdrive (WebDAV)
- github.com/Infomaniak/android-login (OAuth2 PKCE)
