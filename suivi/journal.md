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
