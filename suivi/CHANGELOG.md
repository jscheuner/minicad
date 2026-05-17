# CHANGELOG — MiniCAD

Format : `[version] — YYYY-MM-DD — Description`

---

## [0.02] — 2026-05-17 — Version courante

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

## [3.6] — 2026-05-15

### Ajouté
- **Commande OFFSET** (alias O, DECALER)
  - `OFFSET [distance]` → active l'outil avec la distance donnée (défaut: 10)
  - Cliquer l'objet à décaler (hover blanc, entité sélectionnée orange)
  - Cliquer du côté voulu → entité parallèle créée (ghost en pointillés pendant hover)
  - Mise à jour de la distance en tapant un nombre dans le terminal pendant l'outil
  - Support : ligne, mur, arc, cercle, rectangle, polyligne, câble
  - Mathématique polyligne : offset de chaque segment + recalcul des intersections de coins

---

## [3.5] — 2026-05-14

### Ajouté
- **Historique de commandes terminal** (↑↓)
  - `↑` rappelle la commande précédente, `↓` avance vers la plus récente / vide le champ
  - Limité à 50 entrées, pas de doublons consécutifs
  - Curseur positionné en fin de champ lors de la navigation

---

## [3.4] — 2025-05-14

### Modifié
- **Menu Fichier** converti en menu déroulant avec toutes les commandes :
  Nouveau / Ouvrir… (Ctrl+O) / Sauvegarder (Ctrl+S) / Sauvegarder sous… / Exporter DXF
- **Toolbar Fichier** épurée : suppression des boutons DXF, DWG, SVG — ne reste que 📂 et 💾

---

## [3.3] — 2025-05-14

### Ajouté
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

### Corrigé
- OSNAP endpoint désormais détecte les extrémités des arcs

---

## [3.2] — 2025-05-14

### Ajouté
- **Sélection par fenêtre (rubber-band)**
  - Drag gauche→droite : fenêtre (rectangle cyan plein) — entité doit être entièrement dedans
  - Drag droite→gauche : croisement (rectangle vert pointillé) — entité intersectant suffit
  - Shift+drag pour ajouter à la sélection
  - Message terminal indiquant le mode et le nombre d'objets sélectionnés

---

## [3.1] — 2025-05-14

### Ajouté
- **Grip editing complet** : poignées bleues sur tous les types d'entités
  - Ligne, Mur, Leader : extrémités
  - Rectangle : 4 coins
  - Cercle : centre + 2 grips de rayon
  - Polyligne/Câble : tous les sommets
  - Cotations : points de définition
- **Dynamic Input** type AutoCAD : bulle D/A éditable près du curseur
  - Tab pour basculer Distance ↔ Angle
  - Mode X/Y pour le 1er point
  - Mode L/H pour Rectangle (Largeur/Hauteur)
  - Mode R pour Cercle
- **Polaire tracking** (F10) avec incrément configurable (`POLAR [angle]`)
  - Ligne verte étendue indiquant l'axe polaire
  - Badge d'angle affiché
  - Ortho et Polaire mutuellement exclusifs
- **Export DXF AC1015** complet avec :
  - Section HEADER + TABLES (calques avec couleurs ACI)
  - LWPOLYLINE pour rectangles et polylignes
  - ARC, CIRCLE, LINE, TEXT, POINT
  - Cotations exportées
- **Import DXF** avec :
  - Parsing LWPOLYLINE, POLYLINE/VERTEX
  - SPLINE → polyligne, ELLIPSE → cercle, DIMENSION → dim_linear
  - Mapping calques DXF → calques MiniCAD
- **Export DWG** (DXF renommé .dwg)
- **Toolbars drag & drop** dock/float avec menu contextuel clic-droit
- **Commandes terminales** : POLAR, OSNAP [mode], EXPORT, SAVE, OPEN, SAVEAS
- **Module Cotation** complet : DIMLINEAR, DIMALIGNED, DIMANGULAR, DIMRADIUS, DIMDIAMETER
- **Module Annotation** : TEXT, LEADER

### Amélioré
- OSNAP 7 modes : perpendiculaire et tangente ajoutés
- Tooltip OSNAP coloré près du curseur
- Parser d'entrée : syntaxe `100<45`, `50,30`, `@50,30`, `#x,y`, `200`
- Grip edit via Dynamic Input (D+A confirmés à l'Entrée)
- Panneau OSNAP dans la sidebar avec checkboxes
- Panneau Objets (liste des 20 derniers)

### Corrigé
- Coordonnées Y inversées corrigées dans exportSVG
- Grip edit annulé correctement par Échap

---

## [2.0] — 2025-04-xx — Architecture + Électricité

### Ajouté
- **Module Architecture** : Mur (épaisseur configurable), Porte (arc+ligne), Fenêtre
- **Module Électricité** : Prise, Interrupteur, Câble (pointillé)
- **Module Cotation** (v1) : DIMLINEAR, DIMALIGNED
- **OSNAP** v1 : endpoint, midpoint, center, nearest, intersection
- **Ortho** (F8)
- Sauvegarde/ouverture JSON natif (.mcad)

---

## [1.0] — 2025-03-xx — Version initiale

### Ajouté
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
