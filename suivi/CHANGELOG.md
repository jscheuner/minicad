# CHANGELOG — MiniCAD

Format : `[version] — YYYY-MM-DD — Description`

---

## [0.03] — 2026-05-19 — Version courante

### Ajouté
- **Impression avec sélection de zone** (Ctrl+P / menu Fichier / commande `PRINT`)
  - Dialog : format papier (A4/A3/A5/Letter), orientation, échelle (Adapter / 1:1 / 1:2 … 1:100), titre optionnel
  - Sélection de zone par rubber-band (cliquer-glisser orange) via outil `print_window`
  - Sans zone définie : impression de l'étendue de toutes les entités
  - Rendu off-screen sur fond blanc → popup navigateur → `window.print()` automatique
  - Bouton 🖨 dans la toolbar fichier
- **EXPLODE tube** — éclater un tube en lignes (parois) et arcs (coudes)
- **LEADER éditable** — double-clic ouvre la fenêtre de texte pour modifier le texte du repère
- **Outil TUBE** — tube 2 parois + axe trait-point
  - Mode graphique : cliquer les points du tracé (comme polyligne), Entrée/clic-droit/Échap pour terminer
  - Mode formule : `TUBE 1000+90R67+500` ou `TUBE 1000+90+500R67` (global R en fin)
  - Coudes calculés par tangentes : longueurs droites = longueur réelle − T (T = R·tan(φ/2))
  - Rendu : 2 traits pleins (parois) + 1 trait-point [8,3,2,3] (axe)
  - Commandes : `TUBE [formule]`, `TUBED <Ø>` (diamètre), `TUBEBR <R>` (rayon de coude), `TUBREF AXE|EXT|INT`
  - Défauts : Ø 40 mm, R coude 67 mm
  - Bouton dans la toolbar Dessin (icône 2 traits + tirets) + boutons AXE/EXT/INT
  - Entité `tube` : `startX/Y`, `startAngle`, `tubeRadius`, `segments[]`
  - Sélection/déplacement/copie/grip fonctionnels
- **TUBE — Référence de tracé EXT/AXE/INT** (v0.03 finale)
  - `TUBREF AXE` : tracé sur l'axe (défaut)
  - `TUBREF EXT` : tracé sur la paroi extérieure — tube entièrement à l'intérieur du tracé
  - `TUBREF INT` : tracé sur la paroi intérieure — tube entièrement à l'extérieur du tracé
  - `applyTubeRefOffset()` : décalage par point exact avec bisectrice miter (angle quelconque)
  - Détection automatique CW/CCW du tracé pour choisir le bon côté
  - Preview pendant le tracé reflète l'offset EXT/INT
- **TUBE — Bulles Dynamic Input** sur tous les tronçons (pas seulement le premier)
  - `ev.stopPropagation()` empêche le bubble de Enter vers le document après `diDist.blur()`
- **TUBE — OSNAP sur les parois**
  - ENDPOINT : extrémités des parois + axe, entrée et sortie de chaque coude
  - MIDPOINT : milieux de chaque paroi et de l'axe
  - NEAREST : projection sur chaque paroi (axe + wall+ + wall−)
  - PERPENDICULAR : projection perpendiculaire sur chaque paroi
- **DIMRADIUS / DIMDIAMETER redessiné**
  - Texte positionné le long du trait radial (rotation correspondante), plus de queue après la flèche
  - Texte déplaçable via une poignée dédiée (`textWx`, `textWy`)
  - Poignée bord : change l'angle sans déplacer le texte

### Corrigé
- **DIMANGULAR — nouveau workflow** : cliquer ligne 1 → cliquer ligne 2 → choisir le côté au clic
  - Remplacement de l'ancien workflow sommet + 2 rayons (4 clics) par 3 clics
  - `lineIntersect()` : calcul exact de l'intersection des deux droites (vertex automatique)
  - `_dimAngSector()` : parmi les 4 secteurs angulaires, sélection par position souris
  - Surlignage orange de la 1ère ligne pendant la sélection de la 2ème
  - Aperçu live de l'arc et de la valeur d'angle pendant le déplacement de la souris
  - Curseur `pick` (carrée) pendant la sélection des lignes, `draw` pour le placement
  - Correction du bug de sélection : `hitTest()` utilisé directement (au lieu de `entities.find()` qui ignorait le 3ème argument)
- **DIMANGULAR invisible à certains niveaux de zoom** — `getEntityBBox` utilisait `e.cx/e.cy` (undefined pour les cotes angulaires) au lieu de `e.vx/e.vy` → entité culled à tort
- **DIMANGULAR flèches pointaient vers l'extérieur** — inversion des signes ±π/2 pour les deux têtes de flèches
- **TUBE OSNAP manquant après les coudes** — `getTubeSnapPoints` n'ajoutait pas le point de début de chaque tronçon droit (= sortie de coude)
- **TUBE DI Enter bloqué après le premier tronçon** — `ev.stopPropagation()` ajouté aux handlers keydown de `diDist` / `diAngle`

### Connu / À améliorer
- **TUBE preview EXT/INT** — en mode multi-tronçons, le dernier point confirmé peut légèrement se déplacer lors du changement d'angle du tronçon suivant (bisectrice dynamique). La position finale à la validation (Enter) est correcte.

---

## [0.02] — 2026-05-17

### Ajouté
- **Gestionnaire de calques** (fenêtre dédiée style AutoCAD)
  - Panneau gauche simplifié : liste cliquable pour changer de calque actif
  - Bouton "⊞ Gérer les calques…" → dialogue complet avec couleur, nom, visibilité, épaisseur ISO (0.13→1.00 mm), type de ligne (5 types), suppression
  - `refreshLayerManager()` : mise à jour en temps réel sans fermer le dialogue
- **Transfert d'entités entre calques**
  - Sélectionner objets → cliquer un calque dans le panneau → les objets changent de calque
  - Indicateur visuel et curseur crosshair quand une sélection est active
  - Message terminal confirme : `3 entités → calque 1 - Construction`

### Corrigé
- **Grip editing sur cotations** : poignées (flèches + texte) désormais accrochables
  - Hit test utilise les coordonnées brutes avant OSNAP — l'OSNAP voisin ne peut plus dévier le clic
  - Tolérance d'accroche : 8 → 10 px
  - Flag `_gripJustConfirmed` : le `mouseup` après confirmation de grip ne démarre plus une sélection fenêtre parasite

---

## [0.01] — 2026-05-16

### Ajouté
- **Commandes FILLET / CHAMFER** (alias F/RACCORD, CHA/CHANFREIN)
  - Raccord arrondi et chanfrein entre deux lignes/murs
  - Saisie du rayon pendant l'outil : `R` → nouveau rayon, ou taper directement un nombre
  - Saisie des distances chanfrein : `D` → D1 puis D2
  - Boutons dans la barre d'outils "Modifier"
- **Polices ISO** : Share Tech et Oswald dans le dialogue texte
- **Symboles typographiques** : boutons Ø ° ± ² ³ × ≤ ≥ au-dessus du champ texte
- **Prévisualisation texte** en temps réel sur le canvas pendant le paramétrage
- **Double-clic** sur un texte existant → édition (dialogue avec valeurs actuelles)
- **Polylignes** : segments confirmés visibles en couleur pendant le dessin
- **DI auto-focus** : le curseur va automatiquement dans la bulle distance/angle pendant le dessin
- **Barres d'outils Architecture et Électricité** : boutons WALL, DOOR, WINDOW, OUTLET, SWITCH, CABLE

### Corrigé
- Arc de raccord (FILLET) apparaissant du mauvais côté (`trimLineToPt` : comparaison dot1 vs dot2)
- Espace bloqué dans les champs de saisie du dialogue texte
- Angle DI ne se mettant pas à jour pendant le tracé

---

## Versions préliminaires (historique de développement interne)

> Les versions ci-dessous sont les itérations internes de développement antérieures à la mise en place du versionnage public 0.01. Le contenu est conservé à titre d'historique.

### [3.6] — 2026-05-15

#### Ajouté
- **Commande OFFSET** (alias O, DECALER)
  - `OFFSET [distance]` → active l'outil avec la distance donnée (défaut: 10)
  - Cliquer l'objet à décaler (hover blanc, entité sélectionnée orange)
  - Cliquer du côté voulu → entité parallèle créée (ghost en pointillés pendant hover)
  - Mise à jour de la distance en tapant un nombre dans le terminal pendant l'outil
  - Support : ligne, mur, arc, cercle, rectangle, polyligne, câble
  - Mathématique polyligne : offset de chaque segment + recalcul des intersections de coins

---

### [3.5] — 2026-05-14

#### Ajouté
- **Historique de commandes terminal** (↑↓)
  - `↑` rappelle la commande précédente, `↓` avance vers la plus récente / vide le champ
  - Limité à 50 entrées, pas de doublons consécutifs
  - Curseur positionné en fin de champ lors de la navigation

---

### [3.4] — 2025-05-14

#### Modifié
- **Menu Fichier** converti en menu déroulant avec toutes les commandes :
  Nouveau / Ouvrir… (Ctrl+O) / Sauvegarder (Ctrl+S) / Sauvegarder sous… / Exporter DXF
- **Toolbar Fichier** épurée : suppression des boutons DXF, DWG, SVG — ne reste que 📂 et 💾

---

### [3.3] — 2025-05-14

#### Ajouté
- **Auto-save localStorage** — sauvegarde automatique à chaque modification
  - F5 restaure le projet automatiquement au rechargement
  - `beforeunload` sauvegarde aussi les changements de config (calques, modules)
- **File System Access API** (Chrome/Edge) — Ctrl+S écrit dans le même fichier sans télécharger
  - 1er Ctrl+S : dialogue de choix du fichier de destination
  - Appels suivants : écriture silencieuse dans ce fichier
  - Fallback téléchargement pour Firefox/Safari
- **Indicateur d'état** dans la barre de titre : `● NOUVEAU` / `● MODIFIÉ` / `● SAUVEGARDÉ`
- **SAVEAS** force le choix d'un nouveau fichier de destination
- **CLEAR/NOUVEAU** efface aussi la sauvegarde localStorage

#### Corrigé
- OSNAP endpoint désormais détecte les extrémités des arcs

---

### [3.2] — 2025-05-14

#### Ajouté
- **Sélection par fenêtre (rubber-band)**
  - Drag gauche→droite : fenêtre (rectangle cyan plein) — entité doit être entièrement dedans
  - Drag droite→gauche : croisement (rectangle vert pointillé) — entité intersectant suffit
  - Shift+drag pour ajouter à la sélection
  - Message terminal indiquant le mode et le nombre d'objets sélectionnés

---

### [3.1] — 2025-05-14

#### Ajouté
- **Grip editing complet** : poignées bleues sur tous les types d'entités
- **Dynamic Input** type AutoCAD : bulle D/A éditable près du curseur
- **Polaire tracking** (F10) avec incrément configurable (`POLAR [angle]`)
- **Export DXF AC1015** complet avec HEADER + TABLES + entités
- **Import DXF** avec LWPOLYLINE, POLYLINE/VERTEX, SPLINE, ELLIPSE, DIMENSION
- **Export DWG** (DXF renommé .dwg)
- **Toolbars drag & drop** dock/float avec menu contextuel clic-droit
- **Module Cotation** complet : DIMLINEAR, DIMALIGNED, DIMANGULAR, DIMRADIUS, DIMDIAMETER
- **Module Annotation** : TEXT, LEADER

---

### [2.0] — 2025-04-xx — Architecture + Électricité

#### Ajouté
- **Module Architecture** : Mur (épaisseur configurable), Porte (arc+ligne), Fenêtre
- **Module Électricité** : Prise, Interrupteur, Câble (pointillé)
- **Module Cotation** (v1) : DIMLINEAR, DIMALIGNED
- **OSNAP** v1 : endpoint, midpoint, center, nearest, intersection
- **Ortho** (F8)
- Sauvegarde/ouverture JSON natif (.mcad)

---

### [1.0] — 2025-03-xx — Version initiale

#### Ajouté
- Canvas 2D avec zoom molette et pan clic-milieu
- Grille + snap
- Outils de base : Ligne, Rectangle, Cercle, Arc, Polyligne
- Sélection, Déplacer, Copier, Supprimer
- Undo/Redo (50 niveaux)
- 4 calques avec couleur et visibilité
- Terminal de commandes (alias AutoCAD)
- Export SVG basique
- Interface dark theme JetBrains Mono

---

## À venir — voir [docs/action.md](../docs/action.md)
