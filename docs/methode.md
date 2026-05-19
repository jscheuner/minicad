# M — Méthode et Architecture

## 1. Choix technologiques

| Choix | Décision | Justification |
|-------|----------|---------------|
| Langage | JavaScript vanilla | Aucune dépendance, fonctionne partout |
| Rendu | Canvas 2D API | Performances suffisantes, contrôle total |
| Structure | 1 fichier HTML | Portabilité maximale, déploiement zéro |
| Stockage | JSON + localStorage futur | Simple, lisible, versionnable |
| Style | CSS variables dark theme | Cohérence visuelle type IDE |

## 2. Principes d'architecture

### État global unique (pattern Singleton)

Tout l'état de l'application est dans l'objet `S` :

```javascript
const S = {
  entities: [],        // Tous les objets dessinés
  layers: [...],       // Définition des calques
  currentLayer: 0,     // Calque actif
  tool: 'select',      // Outil actif
  snap: true,          // Snap grille
  ortho: false,        // Mode ortho
  polar: false,        // Mode polaire
  polarAngle: 15,      // Incrément polaire
  zoom: 1,             // Facteur de zoom
  panX: 0, panY: 0,    // Décalage de vue
  selected: [],        // IDs des entités sélectionnées
  drawing: false,      // En cours de dessin
  drawPoints: [],      // Points saisis pour l'outil courant
  history: [],         // Stack undo (JSON stringified)
  redoStack: [],       // Stack redo
  // ...
};
```

### Boucle de rendu

```
Event (mouse/keyboard)
    ↓
Mise à jour de S
    ↓
render() ─→ clearRect
         ─→ drawGrid
         ─→ forEach entity → drawEntity(e)
         ─→ drawPreview (si drawing)
         ─→ drawOsnapMarker
         ─→ updateStatusBar
         ─→ updateDynamicInput
```

### Pipeline de saisie de points

```
Click souris / Saisie terminal
    ↓
resolvePoint(wx, wy)
    ├─ findOsnap(wx, wy)  → priorité OSNAP
    └─ snapToGrid(wx, wy) → si pas d'OSNAP
    ↓
applyConstraint(x1,y1, x2,y2)
    ├─ applyOrtho   (si F8)
    ├─ applyPolar   (si F10)
    └─ [aucun]      (mode libre)
    ↓
handleClick / executeCommand
    ↓
finishEntity / finishPolyline
    ↓
pushUndo + render()
```

## 3. Convention de nommage des entités

| Type | Propriétés géométriques |
|------|------------------------|
| `line`, `wall` | x1,y1, x2,y2 |
| `rect` | x1,y1 (coin min), x2,y2 (coin max) |
| `circle`, `arc` | cx,cy, r |
| `polyline`, `cable` | points[ [x,y], ... ] |
| `door`, `outlet`, `switch_sym`, `window_sym`, `text` | x,y (point d'insertion) |
| `tube` | startX,startY, startAngle, tubeRadius, segments[], tubeRef ('axe'|'ext'|'int') |
| `dim_angular` | vx,vy (sommet auto), x1,y1, x2,y2, startAngle, endAngle, r, angle |
| `dim_radius`, `dim_diameter` | cx,cy, r, angle |
| `block` | sourceIds[], cols, rows, dx, dy |

Toutes les entités ont : `id` (entier auto-incrémenté), `layer` (index dans S.layers).

## 4. Méthode de développement

### Workflow

1. **Identifier** la fonctionnalité dans [suivi/TODO.md](../suivi/TODO.md)
2. **Analyser** l'impact sur l'état `S` et les fonctions existantes
3. **Implémenter** dans `minicad.html` (section appropriée du script)
4. **Tester** avec les scénarios de [tests/scenarios.md](../tests/scenarios.md)
5. **Documenter** : mettre à jour CHANGELOG, TODO, documentation.md
6. **Valider** : vérifier que les fonctionnalités existantes ne régressent pas

### Règles de développement

- Ne pas sortir de la contrainte "1 fichier HTML"
- Garder la compatibilité avec les fichiers `.mcad` sauvegardés
- Toute nouvelle entité doit implémenter : `drawEntity`, `getGripPoints`, `hitTest`, `offsetEntity`, `exportDXF`
- Les commandes texte suivent la convention AutoCAD (alias courts)
- Le panneau terminal doit toujours guider l'utilisateur avec des messages `info`/`warning`

## 5. Checklist pour une nouvelle entité

```
[ ] Ajouter le type dans S.entities via finishEntity ou handleClick
[ ] drawEntity(e) → switch case
[ ] getGripPoints(e) → switch case
[ ] hitTest(wx,wy) → switch case
[ ] offsetEntity(e, dx, dy) → si x1/x2/cx/points ne suffisent pas
[ ] drawPreview() → aperçu pendant le dessin
[ ] exportDXF → section entities switch case
[ ] exportSVG → si pertinent
[ ] openDXF → si entité importable
[ ] updateProperties() → afficher les props spécifiques
[ ] Ajouter commande dans CMD ou module
[ ] Ajouter bouton dans la toolbar appropriée
[ ] Documenter dans docs/documentation.md
```
