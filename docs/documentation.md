# D — Documentation Technique Interne

## 1. API des fonctions principales

### Rendu

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `render()` | `() → void` | Efface et redessine tout le canvas |
| `drawEntity(e)` | `(entity) → void` | Dessine une entité selon son type |
| `drawGrips(e)` | `(entity) → void` | Dessine les poignées (rectangles bleus) |
| `drawPreview()` | `() → void` | Aperçu de l'entité en cours de dessin |
| `drawOsnapMarker(snap)` | `(osnapResult) → void` | Marqueur OSNAP coloré |
| `drawPolarGuides(bx,by,tx,ty)` | `(...) → void` | Ligne verte polaire étendue |
| `drawArrowHead(fx,fy,tx,ty)` | `(...) → void` | Flèche remplie pour cotations |

### Coordonnées

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `w2s(wx,wy)` | `(num,num) → [num,num]` | World → Screen |
| `s2w(sx,sy)` | `(num,num) → [num,num]` | Screen → World |
| `snapToGrid(wx,wy)` | `(num,num) → [num,num]` | Arrondi à la grille |
| `resolvePoint(wx,wy)` | `(num,num) → [num,num]` | OSNAP > grille > libre |
| `applyConstraint(x1,y1,x2,y2)` | `(...) → [num,num]` | Ortho ou Polaire ou libre |
| `applyOrtho(x1,y1,x2,y2)` | `(...) → [num,num]` | Force 0°/90°/180°/270° |
| `applyPolar(x1,y1,x2,y2)` | `(...) → [num,num]` | Snap à l'incrément polaire |

### OSNAP

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `findOsnap(wx,wy)` | `(num,num) → osnapResult\|null` | Cherche le meilleur snap dans la tolérance |
| `projectOnSeg(px,py,x1,y1,x2,y2)` | `(...) → [num,num]\|null` | Projection sur segment (nearest) |
| `projectOnLine(px,py,x1,y1,x2,y2)` | `(...) → [num,num]\|null` | Projection sur droite (perp) |
| `segSegIntersect(...)` | `(8 nums) → [num,num]\|null` | Intersection segment×segment |
| `getEntitySegments(e)` | `(entity) → [[x1,y1,x2,y2],...]` | Segments d'une entité |

**Résultat osnapResult :**
```javascript
{ x: number, y: number, type: string, entity: object }
// type ∈ 'endpoint'|'midpoint'|'center'|'nearest'|'intersection'|'perpendicular'|'tangent'
```

### Édition

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `finishEntity(tool, pts)` | `(string, [[x,y],...]) → void` | Crée et ajoute une entité 2 points |
| `finishPolyline(tool)` | `(string) → void` | Finalise une polyligne/câble |
| `offsetEntity(e,dx,dy)` | `(entity,num,num) → void` | Déplace une entité |
| `getGripPoints(e)` | `(entity) → [{x,y,apply}]` | Liste des poignées |
| `findGripHit(wx,wy)` | `(num,num) → gripHit\|null` | Poignée sous le curseur |
| `applyGripMove(nx,ny)` | `(num,num) → void` | Applique le déplacement de poignée |
| `pushUndo()` | `() → void` | Sauvegarde l'état dans history[] |
| `hitTest(wx,wy)` | `(num,num) → entity\|null` | Entité sous le curseur |

### Interface

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `setTool(t)` | `(string) → void` | Change l'outil actif, réinitialise S.drawing |
| `executeCommand(input)` | `(string) → void` | Parse et exécute une commande terminal |
| `termPrint(text,cls)` | `(string,string) → void` | Affiche dans le terminal |
| `updateUI()` | `() → void` | Reconstruit les listes (calques, modules, objets) |
| `updateProperties()` | `() → void` | Met à jour le panneau propriétés |
| `updateStatusBar()` | `() → void` | Met à jour la barre de statut |
| `syncUIState()` | `() → void` | Synchronise les boutons avec l'état S |
| `zoomExtents()` | `() → void` | Zoom pour voir toutes les entités |

### Export/Import

| Fonction | Description |
|----------|-------------|
| `exportSVG()` | Génère SVG + télécharge |
| `exportDXF()` | Génère DXF AC1015 + télécharge |
| `exportDWG()` | DXF renommé .dwg + télécharge |
| `cmdSave(name?)` | Sauvegarde JSON .mcad |
| `cmdOpen()` | Ouvre le sélecteur de fichier |
| `openJSON(content,filename)` | Charge un .mcad |
| `openDXF(content,filename)` | Parse et importe un DXF |
| `downloadBlob(content,mime,filename)` | Téléchargement générique |

---

## 2. Commandes disponibles

### Commandes core

| Commande | Alias | Description |
|----------|-------|-------------|
| `LINE` | L, LIGNE | Dessiner une ligne |
| `RECT` | REC, RECTANGLE | Rectangle |
| `CIRCLE` | C, CERCLE | Cercle |
| `ARC` | A | Arc |
| `POLYLINE` | PL, POLYLIGNE | Polyligne |
| `ERASE` | E, EFFACER, DEL | Supprimer sélection |
| `COPY` | CO, COPIER | Copier sélection |
| `MOVE` | M, DEPLACER | Déplacer sélection |
| `UNDO` | U, ANNULER | Annuler |
| `REDO` | — | Refaire |
| `ZOOM` | Z | Zoom (E=étendue, ou facteur) |
| `PAN` | P | Panoramique |
| `LAYER` | LA, CALQUE | Changer calque actif |
| `COLOR` | COULEUR | Couleur du calque courant |
| `LOAD` | MODULE, MOD | Charger un module |
| `UNLOAD` | — | Décharger un module |
| `LIST` | LS | Lister les objets |
| `CLEAR` | CLS, NOUVEAU | Tout effacer |
| `GRID` | GRILLE | Toggle/taille grille |
| `SNAP` | ACCROCHAGE | Toggle snap grille |
| `ORTHO` | — | Toggle ortho |
| `POLAR` | POLAIRE | Toggle polaire ou POLAR [angle] |
| `OSNAP` | — | Toggle OSNAP ou OSNAP [mode] |
| `SELECT` | V, SEL | Mode sélection |
| `HELP` | ?, AIDE | Aide |
| `EXPORT` | SVG, DXF, DWG | Exporter |
| `SAVE` | SAUVER | Sauvegarder JSON |
| `OPEN` | OUVRIR | Ouvrir fichier |

### Syntaxe de saisie de points

| Syntaxe | Signification |
|---------|--------------|
| `100<45` | Polaire : distance 100 à 45° |
| `50,30` | Relatif : +50 X, +30 Y |
| `@50,30` | Relatif explicite |
| `#200,300` | Absolu : X=200, Y=300 |
| `150` | Distance 150 dans la direction de la souris |

### Commandes de modules

**arch :** WALL [ép], DOOR [larg], WINDOW [larg]
**elec :** OUTLET, SWITCH, CABLE
**dim :** DIMLINEAR, DIMALIGNED, DIMANGULAR, DIMRADIUS, DIMDIAMETER
**annot :** TEXT "contenu", LEADER "texte"

---

## 3. Ajout d'une nouvelle commande

```javascript
// Dans l'objet CMD (commandes core) :
CMD.NOMCMD = {
  alias: ['ALIAS1', 'ALIAS2'],       // optionnel
  desc: 'Description pour HELP',
  exec: (args) => {
    // args = tableau de chaînes après le nom de commande
    setTool('nom_outil');             // si outil de dessin
    termPrint('Message guide', 'info');
  }
};

// Dans un module (commands object du module) :
modules.architecture.commands.MONOUTIL = {
  desc: 'Description',
  exec(args) { setTool('mon_outil'); }
};
```

---

## 4. Ajout d'un nouvel outil de dessin (checklist)

Voir [docs/methode.md](methode.md) section 5.

---

## 5. Format .mcad (JSON natif)

```json
{
  "version": 3,
  "app": "MiniCAD",
  "date": "2025-01-15T10:30:00.000Z",
  "layers": [
    { "name": "0 - Défaut", "color": "#00d4ff", "visible": true }
  ],
  "entities": [
    { "type": "line", "x1": 0, "y1": 0, "x2": 100, "y2": 0, "id": 1, "layer": 0 }
  ],
  "currentLayer": 0,
  "nextId": 2,
  "modules": {
    "architecture": false,
    "electrical": false,
    "dimensioning": false,
    "annotation": false
  },
  "gridSize": 20
}
```

---

## 6. Correspondance DXF → MiniCAD (import)

| DXF type | MiniCAD type | Notes |
|----------|-------------|-------|
| LINE | line | |
| CIRCLE | circle | |
| ARC | arc | angles en radians (DXF = degrés) |
| LWPOLYLINE fermée 4pts rect | rect | si isRectangle() |
| LWPOLYLINE | polyline | |
| POLYLINE + VERTEX | polyline | ancien format |
| TEXT, MTEXT | text | |
| SPLINE | polyline | approximation par points de contrôle |
| ELLIPSE | circle | approximation rayon = demi-grand axe |
| DIMENSION | dim_linear | approximation basique |
| INSERT | — | ignoré (blocs non supportés) |
