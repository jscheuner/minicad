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

## Installation (Omarchy / Arch Linux)

Arch marque l'environnement Python comme *externally-managed* (PEP 668) : on
installe donc dans un **virtualenv dédié**, pas en global. Le SDK `mcp` doit
rester en **v1** — la v2 a supprimé `mcp.server.fastmcp` (`FastMCP`) utilisé
par `server.py`, d'où `requirements.txt` qui épingle `mcp>=1.27.0,<2`.

```bash
sudo pacman -S --needed chromium python                 # navigateur piloté + Python
cd ~/minicad/mcp-server
python -m venv venv-mcp
./venv-mcp/bin/pip install -r requirements.txt          # mcp<2, websockets
```

> Debian/Ubuntu : `apt install chromium` puis même séquence de venv.

## Enregistrement dans Claude Code

Sur Omarchy la session est Wayland/Hyprland ; le serveur ouvre Chromium via
XWayland, il suffit donc de passer `DISPLAY=:0` (pas besoin de `XAUTHORITY`).
Pointer explicitement le **python du venv** et le **chemin absolu réel** de
`server.py` (adapter `~` / le nom d'utilisateur) :

```bash
claude mcp add minicad -s local -e DISPLAY=":0" \
  -- ~/minicad/mcp-server/venv-mcp/bin/python ~/minicad/mcp-server/server.py
```

Vérifier : `claude mcp get minicad` doit afficher `✔ Connected`. Redémarrer
Claude Code (ou reconnecter les serveurs MCP) pour que le connecteur soit
actif.

## Enregistrement dans OpenCode

Ajouter une entrée dans `~/.config/opencode/opencode.json` (config
utilisateur, active dans tous les projets), section `mcp` :

```json
{
  "mcp": {
    "minicad": {
      "type": "local",
      "command": [
        "/home/USER/minicad/mcp-server/venv-mcp/bin/python",
        "/home/USER/minicad/mcp-server/server.py"
      ],
      "environment": {
        "DISPLAY": ":0"
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
claude mcp add minicad -s local -e DISPLAY=":0" -e MINICAD_BROWSER=opera \
  -- ~/minicad/mcp-server/venv-mcp/bin/python ~/minicad/mcp-server/server.py
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

## Dépannage

`claude mcp get minicad` → `CONNECTION_CLOSED` / `Failed to connect` : le
process serveur meurt au démarrage. Causes vues :

- **Mauvais chemin enregistré** — le `claude mcp add` a été fait avec un chemin
  d'un autre poste (`/home/joel/...`). Vérifier avec `claude mcp get minicad`,
  puis `claude mcp remove minicad -s local` et re-`add` avec le vrai chemin
  absolu.
- **`ModuleNotFoundError: No module named 'mcp.server.fastmcp'`** — le venv a
  `mcp` 2.x. Corriger : `./venv-mcp/bin/pip install 'mcp<2'`.
- **`mcp` introuvable** — la commande enregistrée utilise `python3` (système)
  au lieu de `venv-mcp/bin/python`. Re-`add` en pointant le python du venv.

Test manuel : `./venv-mcp/bin/python server.py` doit rester en attente sur
stdin sans traceback (Ctrl+C pour quitter).
