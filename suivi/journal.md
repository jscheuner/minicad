# Journal de développement — MiniCAD

Une entrée par session de travail significative.
Format : `## [YYYY-MM-DD] — Résumé court`

---

## [2025-05-14] — Mise en place de la structure projet

**Contexte :** Le projet a été développé dans claude.ai (web) et importé dans l'environnement local pour continuer le développement avec Claude Code.

**État à l'arrivée :**
- 1 seul fichier `minicad.html` (~3700 lignes)
- Version 3.1 — fonctionnalités complètes (voir CHANGELOG.md)
- Aucune structure de suivi

**Travail effectué :**
- Analyse complète du code source (architecture, entités, fonctions)
- Création de la structure BEMAD :
  ```
  docs/besoin.md      — Analyse du besoin (bête à cornes, FP, FC)
  docs/etude.md       — Architecture technique, modèle de données
  docs/methode.md     — Conventions, checklist nouvelle entité
  docs/action.md      — Roadmap phases 1→6
  docs/documentation.md — API complète des fonctions
  suivi/CHANGELOG.md  — Historique versions
  suivi/TODO.md       — Tâches priorisées
  suivi/journal.md    — Ce fichier
  tests/scenarios.md  — Scénarios de recette
  ```

**Prochaine étape recommandée :**
Implémenter **sélection par fenêtre** (TODO 3.1) et **historique commandes** (TODO 3.2).

---

## [2026-05-18] — v0.03 : Impression, EXPLODE tube, LEADER éditable

**Contexte :** Continuation du développement avec Claude Code (session context-compacted).

**Réalisé :**
- [x] **Impression avec fenêtre de sélection** (Ctrl+P)
  - Dialog complet : format, orientation, échelle, titre
  - Rubber-band orange (outil `print_window`) pour définir la zone
  - Rendu off-screen via swap `ctx` + `canvasW`/`canvasH`, calcul panX/panY correct pour Y-flip
  - Popup navigateur + `window.print()` automatique
- [x] **EXPLODE tube** — éclate en lignes (parois) + arcs (coudes), avec calcul du centre de coude et r1/r2 des parois
- [x] **LEADER éditable** — double-clic ouvre la fenêtre de texte (même que TEXT), champ `ent.text` (vs `ent.content` pour les textes)
  - `hitTest` : ajout du cas `leader` (segment + zone texte)
  - `confirmTextDialog` : branche sur `ent.type === 'leader'` pour écrire dans `ent.text`

**Prochaine étape :**
- 4.3 Menu contextuel clic-droit, 3.4 EXTEND, 5.2 AREA, 6.4 Import SVG

---

## [2026-05-17] — v0.03 : TUBE + DIMANGULAR refondu

**Contexte :** Continuation du développement avec Claude Code (session context-compacted).

**Réalisé :**
- [x] **Outil TUBE** — entité tube 2 parois + axe trait-point avec coudes
  - Mode graphique (clics comme polyligne) et mode formule (`TUBE 1000+90R67+500`)
  - Math des coudes : T = R·tan(φ/2), arcs canvas anticlockwise=(side>0) pour cohérence Y-flip
  - Helpers : `parseTubeFormula`, `buildTubeFromPoints`, `_drawTubePath`, `finishTube`
  - Commandes : TUBE / TUBED / TUBEBR, bouton toolbar Dessin
- [x] **DIMANGULAR — workflow repensé**
  - Ancienne méthode (sommet + 2 rayons) → nouvelle (clic ligne 1 → clic ligne 2 → secteur souris)
  - `lineIntersect()` : intersection de 2 droites (vertex automatique)
  - `_dimAngSector()` : détermine parmi 4 secteurs lequel contient la position souris
  - Correction bug : `hitTest()` directement (pas `entities.find(e => hitTest(..., e))` qui ignorait le 3ème param)

**Prochaine étape :**
- 4.3 Menu contextuel clic-droit, 3.4 EXTEND, 5.2 AREA, 6.3 Export PNG

---

## [2026-05-19] — v0.04 (suite) : TRIM amélioré, corrections cotations, bouton téléchargement

**Contexte :** Continuation de la session v0.04.

**Réalisé :**
- [x] **TRIM — refonte workflow**
  - `S.trimCuttingId` (singulier) → `S.trimCuttingIds[]` (tableau multi-limites)
  - Étape 1 : sélection des limites par clic (toggle orange), Entrée ou clic droit → étape 2
  - Étape 2 : clic sur partie à couper, reste en étape 2 pour coupes multiples, clic droit → quitter
  - Mode tout couper : Entrée/clic droit sans limite = toutes entités visibles comme limites
  - Entités limites également découpables (exclues d'elles-mêmes comme cutter)
  - `applyTrimCircle` : remplace `circle` par `arc(s)` en place
  - `applyTrimRect` : convertit `rect` en polyligne fermée puis applique `applyTrimPolyline`
- [x] **DIMRADIUS/DIMDIAMETER — double-clic pour éditer le texte**
  - Bug : `hitTest` calculait la position texte avec `toff = r*1.3 + offset` alors que `drawEntity` place le texte à `cx + r*0.55*cos(a)` (radius) ou `cx/cy` (diameter)
  - Fix : alignement exact des positions entre hitTest et drawEntity, tolérance `tol*6`
- [x] **Bouton "Télécharger MiniCAD"** (minicad.org uniquement)
  - Détection : `window.location.hostname` dans `['minicad.org','www.minicad.org']`
  - Bouton flottant `position:fixed` bas-droit, `<a download>` vers minicad.html
  - Style cyan cohérent avec le thème, hover inversé fond/texte

**Prochaine étape :**
- 4.3 Menu contextuel clic-droit, 3.4 EXTEND, 5.2 AREA

---

## [2026-05-19] — v0.04 : Tableau nomenclature TUBE + correctifs DI et preview

**Contexte :** Continuation de la session v0.04.

**Réalisé :**
- [x] **Tableau de nomenclature tube** (`TUBELBL` / `TUBTAB`)
  - Affiché automatiquement à la fin de chaque tracé TUBE
  - En-tête D/R, lignes longueur droite + angle coude (jaune), longueur développée (axe)
  - Taille en unités monde × zoom : garde la même proportion dans le dessin quel que soit le zoom
  - Poignée déplacement (grip bleu coin haut-gauche) + poignée redimensionnement (triangle bas-droit, `labelScale`)
  - Clic sur le tableau sélectionne le tube (`hitTest` étendu)
- [x] **Correctif preview TUBE EXT/INT — segment en biais**
  - Cause : les bisectrices miter n'étaient pas recalculées au dernier point confirmé lors du tracé multi-tronçons
  - Fix : inclure le point souris dans `applyTubeRefOffset([...S.tubePoints, mousePoint], ...)` pour corriger la jonction
- [x] **Correctif DI — distance écrasée lors du Tab dist→angle**
  - `blur` réinitialisait `diLocked = false` même en taboulant entre les deux champs DI
  - Fix : `ev.relatedTarget` — déverrouilage uniquement si focus sort des deux champs DI
- [x] **Correctif terminal TUBE — contrainte polaire ignorée**
  - Saisie d'une distance dans le terminal utilisait `S.mouseWorld` brut
  - Fix : `applyConstraint` appliqué avant calcul de l'angle
- [x] **Preview DI verrouillée** — avec `diLocked=true`, le preview tube reflète la distance saisie

**Prochaine étape :**
- 4.3 Menu contextuel clic-droit, 5.2 AREA, export PDF

---

## [2026-05-19] — v0.04 : Système de préférences utilisateur

**Contexte :** Continuation de la session v0.03 dans la même journée.

**Réalisé :**
- [x] **Système de préférences utilisateur** (commande `PREFS` / menu Fichier → Préférences…)
  - Dialogue graphique complet avec sections : Accrochage & Grille, Contraintes, Tube, Cotation
  - Paramètres : SNAP, gridSize, gridVis, OSNAP + 8 modes, Ortho, Polaire, incrément polaire, Ø tube, R coude, tubeRef, style de cote
  - `captureUserPrefs()` / `applyUserPrefs()` : sérialisation ↔ état S
  - `loadUserPrefs()` : chargé au démarrage, priorité localStorage → bloc HTML embarqué
  - `autoSavePrefs()` : câblé sur toggleSnap / toggleOsnap / toggleOrtho / togglePolar
  - `openPrefsDialog()` : dialogue HTML injecté dans le DOM, fermable via ✕ ou Échap
  - Export `.json` (File System Access API ou fallback téléchargement)
  - Import `.json` via `<input type=file>`
  - Réinitialisation aux valeurs du bloc `USER_PREFS` embedded
  - Bloc `USER_PREFS` avec marqueurs `===USER_PREFS_START===` / `===USER_PREFS_END===` juste avant `const S = {`
- [x] **Correctif fond transparent** : `var(--panel)` inexistant remplacé par `#1a1a2e` opaque

**Prochaine étape :**
- 4.3 Menu contextuel clic-droit, 3.4 EXTEND, 5.2 AREA

---

## [2026-05-19] — v0.03 : Cotations redessinées, TUBE amélioré, bugs DIMANGULAR

**Contexte :** Continuation du développement avec Claude Code (session context-compacted).

**Réalisé :**
- [x] **DIMANGULAR bugs corrigés**
  - Invisible à certains niveaux de zoom : `getEntityBBox` utilisait `e.cx/e.cy` (undefined) au lieu de `e.vx/e.vy` → entité culled à tort
  - Flèches pointaient vers l'extérieur : inversion des signes ±π/2 pour les deux têtes d'arc
- [x] **DIMRADIUS / DIMDIAMETER redessinés**
  - Texte positionné le long du trait radial (rotatif), plus de queue après la flèche
  - Texte déplaçable via poignée dédiée (`textWx`, `textWy`)
  - Preview pendant le tracé mise à jour
- [x] **TUBE — Référence de tracé EXT/AXE/INT**
  - `TUBREF AXE|EXT|INT`, boutons dans la toolbar
  - `applyTubeRefOffset()` : décalage exact par point avec bisectrice miter, auto-détection CW/CCW
  - Preview reflète l'offset EXT/INT pendant le tracé
  - Note : la preview en multi-tronçons peut légèrement bouger le dernier point confirmé lors du changement d'angle du tronçon suivant (amélioration future)
- [x] **TUBE — Dynamic Input sur tous les tronçons**
  - `ev.stopPropagation()` sur les handlers DI empêche le bubble de Enter
- [x] **TUBE — OSNAP sur les parois**
  - ENDPOINT sur extrémités parois + axe, entrées et sorties de coudes
  - MIDPOINT sur milieux de chaque paroi et axe
  - NEAREST : projection sur chaque paroi
  - PERPENDICULAR : projection perp sur chaque paroi
  - Ajout de `tube` dans `drawingTools2` / `tabDrawTools` pour auto-focus DI

**Problèmes rencontrés :**
- EXT/INT : offset uniforme depuis la direction du 1er tronçon seulement → faux pour les tronçons suivants. Résolu par bisectrice miter par point.
- Preview instable : le dernier point confirmé bougeait avec l'angle de la souris (miter dynamique). Résolu par calcul séparé (points confirmés stables + point souris indépendant).

**Prochaine étape :**
- 4.3 Menu contextuel clic-droit, 3.4 EXTEND, 5.2 AREA
- Amélioration preview TUBE EXT/INT (voir TODO)

---

## [2026-05-21] — v0.06 : FILLET arc, hitTest distance, sélection croisée géométrique

**Contexte :** Continuation du développement avec Claude Code.

**Réalisé :**
- [x] **FILLET R=0** — raccord en angle vif : validation `r>=0` aux 3 endroits, cas spécial dans `applyFilletChamfer` (tronque/prolonge sans créer d'arc)
- [x] **FILLET sur arc** — raccord ligne+arc (R=0 et R>0)
  - `getHitSeg` étendu au type `arc` (segIdx=-2, ax1/ay1=start, ax2/ay2=end)
  - Handler clic fillet : `supported` inclut `'arc'`
  - `applyFilletWithArc` : trouve l'intersection (ligne×cercle ou cercle×cercle), R=0 → tronque, R>0 → calcule centre tangent via boucle sur d=±R et D=r±R
  - `circleCircleIntersect`, `trimArcToPt`, `trimEntCorner`
- [x] **hitTest par distance minimale** — refonte complète : accumule les candidats dans le rayon `tol`, retourne le plus proche du clic
  - Suppression du premier-retourné, `tryHit(e, dist)` avec `bestDist`
  - Hachure : boundary `distToSeg` (suppression point-in-polygon)
  - Zones texte/cote : distance normalisée (`td/N`) pour rester compétitives
- [x] **Sélection croisée géométrique** (`entityInRect` mode croisement)
  - `segIntersectsRect` : Liang-Barsky pour lignes et bords de rect
  - `circleOutlineCrossesRect` : distMin<r ET pas tous les coins dans le cercle
  - `arcOutlineCrossesRect` : start/end/cardinaux dans boîte + même check coins
  - polyline/cable/hatch : segment par segment

**Problèmes rencontrés :**
- Sélection croisée cercle : `if(center inside box) return true` incorrecte → cercle large entourant la boîte sélectionné à tort. Fix : check unifié "tous les coins dans le cercle" dans les deux cas (centre dedans ou dehors).

**Prochaine étape :**
- 4.3 Menu contextuel clic-droit, 3.4 EXTEND, 5.2 AREA

---

## [2026-05-21] — HATCH, sélection additive, OFFSET refactorisé, clic droit

**Contexte :** Continuation du développement avec Claude Code.

**Réalisé :**
- [x] **HATCH** — nouvelle entité `hatch` : contour extrait depuis polyligne/rect/cercle, patterns `lines`/`cross`, angle et espacement configurables via dialogue, rendu scanline dynamique (`computeHatchLines`), hitTest point-in-polygon, grip centroïde, commande H/HACHURE
- [x] **Sélection additive sans Shift** — MOVE/COPY/ROTATE/SCALE/MIRROR/OFFSET : clic = toggle dans la sélection, clic dans le vide ne vide pas, curseur `pick`
- [x] **OFFSET refactorisé** — workflow identique aux autres commandes : sélection multiple → Entrée → clic côté ; ghost preview pour tous les sélectionnés ; retour auto en sélection après décalage
- [x] **Distance OFFSET par 2 clics** — curseur croix dès la demande de distance, cliquer 2 points sur le canvas calcule la distance avec preview ligne orange
- [x] **Clic droit = Entrée** — couvre drawing actif (polyline/tube/line), JOIN, TRIM/EXTEND, tous les états pending (MOVE/COPY/ROTATE/SCALE/MIRROR/OFFSET), confirmation distance OFFSET
- [x] **Fix navigation navigateur** — `ev.preventDefault()` sur mousedown et mouseup bouton 2
- [x] **Terminal sélectionnable** — `user-select:text` + `cursor:text` sur `.terminal-output`
- [x] **Fix rubber-band parasite** — flag `_offsetJustApplied` et guard `offsetAwaitDist` dans mouseup pour éviter démarrage involontaire du rubber-band

**Prochaine étape :**
- 4.3 Menu contextuel clic-droit, 3.4 EXTEND, 5.2 AREA

---

## [2026-05-20] — v0.05 : Dialogue tube amélioré + JOIN arc

**Contexte :** Continuation du développement avec Claude Code (session context-compacted).

**Réalisé :**
- [x] **Dialogue édition tube — L. saisie [REF]**
  - Colonne affichant la longueur point-à-point (distance saisie à la création)
  - Formule : `saisie = straightLen + T_before + T_after`, T_ref = R_ref × tan(φ/2)
  - Varie selon AXE / EXT / INT
- [x] **Dialogue édition tube — bouton Prévisualiser**
  - Applique sans fermer (`applyChanges()` partagé avec Appliquer)
- [x] **Dialogue édition tube — longeur développée AXE fixe**
  - Total en pied de dialogue = toujours AXE, quelle que soit la référence
- [x] **Dialogue édition tube — gestion du sens de coude**
  - Bouton ⟳/⟲, saisie négative → flip automatique
- [x] **Dialogue édition tube — bouton Coter avec cotes liées**
  - `createLinkedDims(tubeEnt, ref)` : crée des `dim_aligned` sur le chemin REF, à l'extérieur du tube
  - `linkedTubeId: ent.id` sur chaque cote → recalculées à chaque Appliquer / Prévisualiser
  - Fix offset : `bendSide * offsetDist` (positif = extérieur)
- [x] **JOIN — support des arcs**
  - `arc` ajouté à la liste des types acceptés (filtre `supported` dans le handler JOIN)
  - `endpts(arc)` : start/end depuis cx, cy, r, startAngle, endAngle
  - `getPts(arc)` : `[x1,y1,bulge], [x2,y2]` avec `bulge = tan(dθ/4)` (CCW world)
  - Fix concaténation : bulge de `pts[0]` transféré sur le point de jonction dans `allPts`

**Prochaine étape :**
- 4.3 Menu contextuel clic-droit, 3.4 EXTEND, 5.2 AREA

---

<!-- Template pour les prochaines sessions :

## [YYYY-MM-DD] — Titre

**Durée :** ~X heures

**Objectif :** Ce qu'on voulait faire

**Réalisé :**
- [x] Fonctionnalité A
- [x] Bug B corrigé
- [ ] C pas terminé → reporter en TODO

**Problèmes rencontrés :**
- Description du problème et solution

**Tests :**
- Scénarios testés
- Résultats

**Prochaine étape :**
- Ce qui reste à faire

-->
