# Connecteur MCP MiniCAD

Serveur MCP qui pilote une instance **visible** de MiniCAD (`minicad.html`) dans
Chromium ou Opera, en tapant des commandes dans son terminal intégré via Chrome
DevTools Protocol — exactement comme un humain le ferait. Aucune modification
de `src/minicad.html` : c'est un outil externe, le fichier livré reste
autonome.

## Outils exposés

- `minicad_command(commands: list[str])` — envoie une séquence de commandes
  terminal (ex: `["RECT", "0,0", "100,100"]` pour une plaque 100×100mm).
  Couvre tous les outils tapables au clavier : dessin (LINE, RECT, CIRCLE,
  ARC, POLYLINE, WALL, CABLE, TUBE…), modification (MOVE, COPY, ROTATE,
  OFFSET, TRIM, FILLET, ARRAY…), et les deux premiers points de DIMLINEAR /
  DIMALIGNED.
- `minicad_click(x, y)` — simule un clic canvas en coordonnées monde (mm),
  pour les étapes qui ne sont pilotables que par clic (pas par texte tapé) :
  le 3ᵉ clic (placement/offset) d'une cote DIMLINEAR/DIMALIGNED, ou le
  placement de DOOR/OUTLET/WINDOW/SWITCH (modules arch/elec).
- `minicad_text(x, y, content, size=None)` — place un texte (module annot) :
  gère lui-même `LOAD annot` + `TEXT` + le clic d'insertion + le remplissage
  et la confirmation de la boîte de dialogue.
- `minicad_select(ids: list[int])` — assigne directement `S.selected` (liste
  d'ids). Nécessaire avant les commandes « verbe-nom » qui exigent une
  sélection préalable : MOVE, COPY, ROTATE, SCALE, MIRROR, ARRAY, ARRAY_POLAR,
  DIVIDE, EXPLODE, SMOOTH… Utiliser `minicad_entities()` pour retrouver les
  ids.
- `minicad_selection()` — lit `S.selected` en lecture seule, sans le modifier.
  Reflète aussi bien une sélection faite à la souris par l'utilisateur dans la
  fenêtre visible qu'un `minicad_select()` précédent — utile pour voir ce que
  l'utilisateur a sélectionné manuellement avant d'agir dessus.
- `minicad_entities()` — liste les entités du dessin (id, type, calque,
  géométrie clé) en JSON, pour retrouver des ids sans deviner à partir d'une
  capture d'écran.
- `minicad_eval(js: str)` — échappatoire générique : exécute du JavaScript
  arbitraire dans la page (pas d'API dédiée dans MiniCAD, tout vit dans l'état
  global `S{}` et des fonctions globales `render()`, `pushUndo()`…). Sert pour
  les boîtes de dialogue sans fonction de confirmation exposée ailleurs (voir
  exemples ARRAY/ARRAY_POLAR/HATCH/STRETCH plus bas).
- `minicad_screenshot()` — capture PNG du canvas pour vérification visuelle.

Exemple cote linéaire entre (0,0) et (100,0), ligne de cote 20mm au-dessus :

```python
minicad_command(["LOAD dim", "DIMLINEAR", "0,0", "100,0"])
minicad_click(50, 20)
```

Exemple déplacer une entité déjà présente de (0,0) vers (50,50) — **MOVE,
COPY, ROTATE, SCALE, MIRROR, STRETCH ne sont PAS dans la liste des outils
« tapables » au clavier** (`drawingTools` dans `src/minicad.html`) : leur(s)
point(s) de base/destination doivent passer par `minicad_click`, jamais par
`minicad_command` :

```python
minicad_select([1])            # id retrouvé via minicad_entities()
minicad_command(["MOVE"])
minicad_click(0, 0)
minicad_click(50, 50)
```

Exemple réseau rectangulaire (ARRAY), dialogue sans fonction de confirmation
exposée autrement que via `minicad_eval` :

```python
minicad_select([1, 2])
minicad_command(["ARRAY"])
minicad_eval("""
document.getElementById('ar-cols').value=3;
document.getElementById('ar-rows').value=2;
document.getElementById('ar-dx').value=50;
document.getElementById('ar-dy').value=30;
confirmArray();
""")
```

Exemple hachure (HATCH), dialogue à boutons `.onclick` liés en closure — un
`.click()` via `minicad_eval` déclenche quand même le handler :

```python
minicad_click(50, 50)   # clic dans un contour fermé, ouvre le dialogue HATCH
minicad_eval("""
document.querySelector('.hpat-tile[data-pid="ANSI31"]').click();
document.getElementById('h-spacing').value=10;
document.getElementById('h-ok').click();
""")
```

Exemple étirement (STRETCH) : la fenêtre croisante n'est pilotable que par un
vrai drag souris, impossible à simuler proprement — on court-circuite en
assignant `S.stretchRect`/`S.stretchStep` directement après avoir invoqué
STRETCH (pour que `S.tool` passe à `'stretch'`), puis on enchaîne avec deux
clics (base, destination) :

```python
minicad_command(["STRETCH"])
minicad_eval("S.stretchRect={minX:0,minY:0,maxX:100,maxY:100}; S.stretchStep=1;")
minicad_click(300, 50)   # point de base
minicad_click(350, 50)   # destination
```

## Installation

```bash
pip install -r requirements.txt   # mcp, websockets (déjà présents dans cet environnement)
```

## Enregistrement dans Claude Code

Le serveur a besoin de `DISPLAY`/`XAUTHORITY` pour ouvrir une fenêtre
Chromium visible (Claude Code lance les serveurs MCP avec un environnement
restreint par défaut) :

```bash
claude mcp add minicad -e DISPLAY="$DISPLAY" -e XAUTHORITY="$XAUTHORITY" \
  -- python3 /home/joel/minicad/mcp-server/server.py
```

Redémarrer Claude Code (ou reconnecter les serveurs MCP) pour que le
connecteur soit actif.

## Enregistrement dans OpenCode

Ajouter une entrée dans `~/.config/opencode/opencode.json` (config
utilisateur, active dans tous les projets), section `mcp` :

```json
{
  "mcp": {
    "minicad": {
      "type": "local",
      "command": ["python3", "/home/joel/minicad/mcp-server/server.py"],
      "environment": {
        "DISPLAY": ":0",
        "XAUTHORITY": "/run/user/1000/gdm/Xauthority"
      }
    }
  }
}
```

Vérifier avec `opencode mcp list` (doit afficher `minicad ✓ connected`).
Ajouter d'autres variables (`MINICAD_BROWSER`, etc., voir plus bas) dans le
même objet `environment`.

## Variables d'environnement (optionnelles)

- `MINICAD_HTML_PATH` — chemin du fichier HTML à ouvrir (défaut :
  `minicad.html` à la racine du repo, le fichier **livré/buildé** — pas
  `src/minicad.html` qui contient des placeholders `{{clé}}` non substitués).
- `MINICAD_BROWSER` — `chromium` (défaut) ou `opera`.
- `MINICAD_BROWSER_BIN` — chemin du binaire, si besoin de forcer un chemin
  différent des défauts (`/usr/bin/chromium`, `/usr/bin/opera`).
- `MINICAD_DEBUG_PORT` — port CDP (défaut `9333`).

Exemple pour basculer sur Opera :

```bash
claude mcp add minicad -e DISPLAY="$DISPLAY" -e XAUTHORITY="$XAUTHORITY" \
  -e MINICAD_BROWSER=opera \
  -- python3 /home/joel/minicad/mcp-server/server.py
```

## Fonctionnement

Une seule session navigateur est réutilisée entre les appels. Au premier
appel :

1. Si le port de debug (`9333` par défaut) répond déjà, le serveur s'y
   raccroche **sans rien lancer** — c'est le cas si toi-même (ou un appel MCP
   précédent) as déjà démarré un navigateur avec `--remote-debugging-port`.
   S'il n'y a pas déjà d'onglet MiniCAD ouvert dans cette instance, le serveur
   en ouvre un automatiquement (via l'API HTTP DevTools) plutôt que d'échouer.
2. Sinon, il lance le navigateur choisi (`MINICAD_BROWSER`) avec un profil
   temporaire dédié et `minicad.html` déjà ouvert.

Dans les deux cas, il attend que `executeCommand` soit disponible dans la
page avant d'exécuter les commandes — le rendu est donc visible en direct.

### Réutiliser ton propre navigateur (onglet déjà ouvert)

Par défaut, le serveur lance un **profil temporaire dédié** (pas ta session
habituelle, pas tes onglets). Pour piloter une fenêtre que tu as toi-même
ouverte (et donc pouvoir réutiliser un onglet MiniCAD déjà présent, ou en
laisser un s'ouvrir automatiquement dedans) :

1. Ferme complètement le navigateur visé (Chromium ou Opera).
2. Relance-le toi-même avec le flag de debug, en gardant **ton profil
   habituel** (donc sans `--user-data-dir` personnalisé, ou avec le chemin de
   ton profil existant) :
   ```bash
   opera --remote-debugging-port=9333 &            # ou : chromium --remote-debugging-port=9333 &
   ```
3. Appelle un outil MCP MiniCAD normalement — le serveur détecte le port déjà
   actif, s'y raccroche, et ouvre/réutilise un onglet MiniCAD dans **cette**
   fenêtre.

Limite du protocole CDP (pas de notre outil) : il est impossible d'activer le
débogage a posteriori sur un navigateur déjà lancé sans le flag — il faut
redémarrer le navigateur avec `--remote-debugging-port` dès le départ.
