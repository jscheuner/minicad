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
