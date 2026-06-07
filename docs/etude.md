# E — Étude de l'Existant et Analyse Technique

## 1. Étude de l'existant

### Logiciels CAO de référence

| Logiciel | Type | Avantages | Inconvénients pour ce projet |
|----------|------|-----------|------------------------------|
| CAO 2D | Bureau (payant) | Référence industrie, commandes puissantes | Payant, lourd, installation requise |
| FreeCAD | Bureau (libre) | Open-source, paramétrique | Complexe, pas web |
| LibreCAD | Bureau (libre) | DXF natif, léger | Pas web |
| DraftSight | Bureau | Proche logiciel CAO | Freemium, installation |
| CAO en ligne | Web | Officiel Autodesk | Nécessite compte, pas offline |
| Tinkercad | Web | Simple | 3D, pas 2D technique |
| **MiniCAD** | **Web (ce projet)** | **Offline, 1 fichier HTML** | En développement |

### Analyse des commandes CAO cibles

Les commandes implémentées reprennent exactement les alias CAO standard :
`L` (LINE), `R` (RECTANG), `C` (CIRCLE), `A` (ARC), `PL` (PLINE),
`M` (MOVE), `CO` (COPY), `E` (ERASE), `U` (UNDO)

---

## 2. Architecture technique actuelle

### Structure du fichier `minicad.html`

```
minicad.html
├── <head> — styles CSS inline (~520 lignes)
│   ├── Variables CSS (palette de couleurs dark)
│   ├── Layout (menubar, dock, main-area, terminal, statusbar)
│   ├── Toolbar system (docked/floating)
│   ├── Dynamic Input (bulles près curseur)
│   └── OSNAP styles
│
├── <body> — HTML (~230 lignes)
│   ├── Menubar (logo, menus, coordonnées, indicateurs)
│   ├── Dock area (6 toolbars : Fichier, Modification, Dessin, Cotation, Accrochage, Vue)
│   ├── Main area
│   │   ├── Side panel (Calques, OSNAP, Modules, Objets)
│   │   ├── Canvas area (canvas 2D + overlays)
│   │   └── Props panel (propriétés de la sélection)
│   ├── Terminal (entrée commande + sortie)
│   └── Statusbar
│
└── <script> — JavaScript inline (~8800 lignes)
    ├── État global S (objet singleton)
    ├── Moteur OSNAP (findOsnap, drawOsnapMarker)
    ├── Parser d'entrée distance (parseDistanceInput)
    ├── Définition des modules (architecture, electrical, dimensioning, annotation)
    ├── Commandes core CMD {}
    ├── Canvas (w2s, s2w, snapToGrid, resolvePoint)
    ├── Rendu (render, drawEntity, drawGrips, drawPreview)
    ├── Interaction (mousemove, mousedown, handleClick)
    ├── Outils UI (setTool, toggleSnap, toggleOrtho…)
    ├── Terminal (termPrint, executeCommand)
    ├── Export (exportSVG, exportDXF, exportDWG)
    ├── Import (handleFileOpen, openJSON, openDXF)
    ├── Toolbar system (startTBDrag, redockToolbar…)
    └── Init (resizeCanvas, updateUI, syncUIState)
```

### Modèle de données (entités)

Toutes les entités sont stockées dans `S.entities[]` sous forme d'objets plats :

```javascript
// Ligne
{ type:'line', x1, y1, x2, y2, id, layer }

// Rectangle
{ type:'rect', x1, y1, x2, y2, id, layer }

// Cercle
{ type:'circle', cx, cy, r, id, layer }

// Arc
{ type:'arc', cx, cy, r, startAngle, endAngle, id, layer }

// Polyligne
{ type:'polyline', points:[[x,y],...], id, layer }

// Mur (architecture)
{ type:'wall', x1, y1, x2, y2, thickness, id, layer }

// Porte
{ type:'door', x, y, width, id, layer }

// Fenêtre
{ type:'window_sym', x, y, width, id, layer }

// Prise électrique
{ type:'outlet', x, y, id, layer }

// Interrupteur
{ type:'switch_sym', x, y, id, layer }

// Câble (polyligne pointillée)
{ type:'cable', points:[[x,y],...], id, layer }

// Tube (v0.03) — 2 parois + axe trait-point, avec coudes
{ type:'tube', startX, startY, startAngle, tubeRadius,
  segments:[ {type:'straight', length} | {type:'bend', angle, bendRadius, side} ], id, layer }

// Cote linéaire
{ type:'dim_linear', x1, y1, x2, y2, offset, id, layer }

// Cote parallèle
{ type:'dim_aligned', x1, y1, x2, y2, offset, id, layer }

// Cote angulaire
{ type:'dim_angular', vx, vy, x1, y1, x2, y2, startAngle, endAngle, r, angle, id, layer }

// Cote rayon
{ type:'dim_radius', cx, cy, r, angle, id, layer }

// Cote diamètre
{ type:'dim_diameter', cx, cy, r, angle, id, layer }

// Texte
{ type:'text', x, y, content, size, id, layer }

// Repère
{ type:'leader', x1, y1, x2, y2, text, id, layer }

// Bloc réseau (ARRAY)
{ type:'block', sourceIds:[], cols, rows, dx, dy, id, layer }
```

### Système de coordonnées

- **Monde (world):** Y positif vers le haut, origine au centre du canvas
- **Écran (screen):** Y positif vers le bas (standard canvas HTML)
- **Conversion :** `w2s(wx, wy)` et `s2w(sx, sy)` avec zoom + pan

```
Screen: (sx, sy) = (wx * zoom + panX + W/2,  -wy * zoom + panY + H/2)
World:  (wx, wy) = ((sx - panX - W/2) / zoom, -(sy - panY - H/2) / zoom)
```

---

## 3. Points forts du code actuel (v0.03)

- OSNAP complet et performant (7 modes, priorité sur snap grille)
- Saisie dynamique type CAO (Tab, Distance/Angle, relatif/polaire)
- Grip editing fonctionnel pour tous les types d'entités
- Export DXF AC1015 propre avec couches et couleurs ACI
- Import DXF avec LWPOLYLINE, POLYLINE, SPLINE, ELLIPSE, DIMENSION
- Toolbars drag & drop dock/float
- Sélection par fenêtre (rubber-band cyan) et par croisement (vert pointillé)
- TRIM, OFFSET, ROTATE, SCALE, MIRROR, FILLET, CHAMFER, JOIN, DIST, ARRAY
- Gestionnaire de calques complet (épaisseur ISO, type de ligne, transfert entités)
- Outil TUBE (2 parois + axe, coudes par tangentes, mode formule et graphique, EXT/AXE/INT)
- OSNAP sur parois de tube (endpoint, midpoint, nearest, perpendicular)
- DIMANGULAR redessiné : sélection par clic sur lignes + secteur dynamique souris, bugs bbox/flèches corrigés
- DIMRADIUS/DIMDIAMETER : texte le long du trait radial, déplaçable par poignée
- Impression (Ctrl+P) avec sélection de zone, format papier, échelle
- Assistant IA Ollama (panneau flottant, streaming, génération d'entités)

## 4. Points à améliorer (voir docs/action.md)

- EXTEND (prolonger jusqu'à limite) non implémenté
- Arc 3 points non implémenté
- Menu contextuel clic-droit canvas absent
- Export PNG absent
- AREA (calcul de surface) absent
- Blocs nommés (BLOCK/INSERT) absents
