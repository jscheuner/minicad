# Plugin `nesting` — Optimisation de découpe de tôle (imbrication)

Optimise l'imbrication de pièces de tôlerie dessinées dans MiniCAD à l'intérieur de formats
de tôle prédéfinis, puis **dessine le résultat** (vraies entités MiniCAD sur des calques
dédiés). Deux stratégies au choix :

- **Cisaille** — pièces rectangulaires uniquement, bin-packing **guillotine** (coupes bord à
  bord traversantes).
- **Laser** — formes quelconques, **imbrication vraie** par No-Fit-Polygon (NFP) + placement
  Bottom-Left-Fill, exploitant les vraies concavités (une pièce en L rentre dans le creux d'une
  autre).

Fichier source : `src/plugins/nesting.js` (généré vers `plugins/nesting.js` par `build.py`,
ne jamais éditer ce dernier). Chargé à la demande via le menu ⚙ Plugins… ou automatiquement
si déjà utilisé dans une session précédente (`S.loadedPlugins`).

## Marche à suivre

1. **Type de coupe** — bouton *Cisaille* / *Laser* dans le panneau (`NESTING`).
2. **Formats de tôle** — bouton *Formats de tôle…* : deux listes (voir plus bas).
3. **Pièces** — sélectionner une forme dans le dessin → *＋ Ajouter la sélection* → saisir le
   nombre de pièces. Répéter pour chaque pièce.
4. **Optimiser** — *Lancer l'optimisation…* : cocher les formats de tôle à utiliser, régler la
   quantité disponible (vide = illimité pour les standards) → *Optimiser*.
5. **Résultat** — dessiné à droite du dessin existant. *Effacer résultat* (`NESTCLR`) le retire.

## Les deux listes de tôles

| Liste | Contenu | Persistance |
|---|---|---|
| **1 · Formats standards** | Formats complets de tôle (nom, largeur, hauteur) | Fichier livré `plugins/nesting_formats.conf` + copie de travail `localStorage['minicad_nesting_formats']` (prioritaire si présente) |
| **2 · Chutes** | Rebuts réutilisables (nom, largeur, hauteur, **quantité**) | Dans le fichier `.mcad` (`S.pluginData.nesting.chutes`) |

Gestionnaire de formats (`NESTFMT`) :

- **Standards** : édition de lignes, *Enregistrer* (écrit la copie `localStorage`),
  *Exporter .conf* (`saveWithPicker` → fichier à replacer dans `src/plugins/nesting_formats.conf`
  puis `python build.py` pour le livrer), *Réinitialiser* (vide la copie et recharge le fichier).
- **Chutes** : *＋ Ligne* manuelle ou *＋ Depuis la sélection (bbox)* (crée une chute aux
  dimensions de la boîte englobante de la sélection courante).

À la découpe, le solveur consomme **les chutes d'abord** (quantité finie), puis les formats
standards.

## Commandes

- **`NESTING`** (alias `IMBRIC`, `IMBRICATION`, `OPTIDECOUPE`) — ouvre/affiche le panneau.
- **`NESTADD`** — ajoute la sélection courante à la liste des pièces (demande la quantité).
- **`NESTRUN`** — ouvre le dialogue de lancement de l'optimisation.
- **`NESTFMT`** (alias `NESTFORMATS`) — ouvre le gestionnaire de formats de tôle.
- **`NESTCLR`** (alias `NESTCLEAR`) — efface les entités du résultat (calques `NEST-*`).

## Paramètres (persistés dans le `.mcad`)

| Champ | Défaut | Effet |
|---|---|---|
| **Saignée** (`kerf`) | `0.2` mm | Largeur de matière consommée par la lame / le faisceau. En laser, `kerf/2` gonfle chaque contour ; en cisaille, retranchée à chaque refente. |
| **Marge rive** (`sheetMargin`) | `5` mm | Bande périphérique non exploitable de la tôle. |
| **Espace pièces** (`partGap`) | `3` mm | Distance minimale entre deux pièces. Laser : `partGap/2` gonfle chaque contour. Cisaille : ajouté aux dimensions de chaque cellule. |
| **Rotation** (`allowRotation`) | activé | Autorise la réorientation des pièces. |
| **Pas de rotation** (`rotationStep`) | `90` ° | Orientations testées : `0, step, 2·step … < 360`. `0` = orientation d'origine seule. Plafonné en interne à 24 orientations pour la performance. |

## Résolution du contour d'une pièce

`_nestResolveLoop()` transforme la sélection en boucle de points fermée simple :

- **1 seule entité fermée** (rect, cercle, polyline/spline fermée, ellipse) → sa boucle
  tessellée (cercle ≈ 20–48 segments, arcs pas ≈ 0,2 rad).
- **Plusieurs entités** → raboutage des segments par extrémités connexes (tolérance 0,8 mm)
  en une boucle fermée.
- **Échec de raboutage** → enveloppe convexe des points + drapeau `approx` (avertissement
  `termPrint`, la pièce est traitée en approximation).

Un `text` présent dans la sélection sert de **label** (sinon `P1, P2…`) et est exclu de la
géométrie. La boucle et les clones d'entités sont recentrés coin bas-gauche de la bbox à
`(0,0)`. `area` = aire du polygone (ou `w·h` si approximé).

## Algorithme A — Cisaille (guillotine)

`_solveShear()` : rectangles libres, best-fit petit côté, refente guillotine SAS du reste
en deux sous-rectangles (split sur le plus grand reste), saignée retranchée. Rotation 90°
testée si le pas de rotation l'autorise. `partGap` est intégré aux dimensions des cellules.
Sortie par tôle : `placements[{partId,x,y,w,h,rotated}]` + `cuts[]` (segments des refentes,
calque `NEST-COUPE`).

## Algorithme B — Laser (NFP + Bottom-Left-Fill)

`_solveLaser()`, sans bibliothèque de clipping :

1. **Gonflage** de chaque contour de `kerf/2 + partGap/2` (offset par bissectrice de sommet).
2. **Décomposition convexe** (`_convexPieces`) : polygone convexe → tel quel ; sinon
   ear-clipping (`_triangulate`) puis fusion gloutonne des triangles adjacents restant
   convexes. Garde-fou : > 14 morceaux → repli sur l'enveloppe convexe.
3. **NFP** entre deux convexes = **somme de Minkowski** de A et −B
   (`_minkowskiConvex`, fusion des arêtes par angle, O(n+m)). NFP concave = ensemble des NFP
   des morceaux convexes (pas d'union polygonale : on teste juste « point strictement dans
   l'un des NFP »).
4. **IFP** pièce ↔ rectangle utile de la tôle : rectangle réduit des dimensions de la pièce
   orientée → domaine des translations admissibles.
5. **Bottom-Left-Fill** : pour chaque orientation, positions candidates = coins de l'IFP +
   sommets des NFP contre les pièces déjà posées ; on garde celle qui minimise `(y, puis x)`
   et ne provoque **aucun** recouvrement réel (`_polyOverlap`, contact bord à bord toléré).
6. **Multi-départs** : 3 ordres de tri (aire ↓, plus grand côté ↓, hauteur ↓), borne de temps
   dure ≈ 6 s ; on garde le résultat avec le moins de tôles puis le moins de chute.
7. **Repli** : contour dégénéré / absent → boucle rectangulaire `w·h`.

## Rendu du résultat

Un seul `pushUndo()`, purge du résultat précédent, puis création d'entités :

- Calques créés au besoin : **`NEST-TÔLE`** (rect tôle + rect pointillé zone utile),
  **`NEST-PIÈCES`** (clones des entités source, tournés/translatés — alignés par coin bas-gauche
  de leur bbox, donc solveur et rendu concordent), **`NEST-COUPE`** (refentes guillotine,
  cisaille), **`NEST-TEXTE`** (label au centroïde + en-tête `nom · n°i · chute %`).
- Tôles posées côte à côte à droite du dessin (`drawingBBox().mxx + 250`).
- Récap `termPrint` + bloc texte : nombre de tôles, détail par format, surface, chute globale,
  pièces non placées éventuelles.

## Persistance

Sac générique cœur `S.pluginData` (sérialisé par `buildSaveData()`, restauré par `openJSON()`
et `loadFromLocalStorage()`, remis à zéro par `closeDrawing()`). Le plugin utilise
`S.pluginData.nesting = { mode, params, chutes, parts, lastResult }`. Les formats **standards**
n'y sont pas (globaux, via `.conf`). Rétro-compatible : un `.mcad` sans la clé → `{}`.

## Réserves / limites connues

- Le **gonflage** de contour (`_inflate`) est une dilatation par bissectrice de sommet, pas un
  offset de Minkowski exact avec arcs de raccord : sur des angles très aigus rentrants il peut
  légèrement sur- ou sous-estimer. Marge de sécurité : garder `partGap` ≥ 2 mm.
- Décomposition concave > 14 morceaux → approximation par enveloppe convexe (pièce très
  découpée : le solveur ne verra pas ses petits creux internes).
- BLF glouton sans recuit : bon rendement, pas l'optimum global. Le pas de rotation et l'ordre
  de tri (multi-départs) sont les principaux leviers.
- Piège NFP : une erreur de signe d'orientation ou dans la somme de Minkowski provoque des
  chevauchements — validation faite sur **polygone** (L concave), pas seulement sur cercle
  (cf. piège connu du plugin CHF). Auto-tests : `node` sur les primitives + e2e headless.
- Cisaille : la saignée est un modèle simplifié (intégrée aux cellules + retranchée aux
  refentes), pas une simulation de trait de lame réelle.
