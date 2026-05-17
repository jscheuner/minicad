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
