# A — Plan d'Action et Roadmap

## Priorités de développement

### Légende

| Symbole | Signification |
|---------|--------------|
| ✅ | Implémenté |
| 🔄 | En cours |
| 🔴 | Priorité haute |
| 🟡 | Priorité moyenne |
| 🟢 | Priorité basse / Futur |

---

## Phase 1 — Fondations (état actuel : terminée)

| # | Fonctionnalité | État |
|---|---------------|------|
| 1.1 | Canvas 2D + zoom/pan | ✅ |
| 1.2 | Grille + snap | ✅ |
| 1.3 | Outils : Ligne, Rectangle, Cercle, Arc, Polyligne | ✅ |
| 1.4 | Sélection + Déplacer + Copier + Supprimer | ✅ |
| 1.5 | Undo/Redo (50 niveaux) | ✅ |
| 1.6 | Calques (4, couleur, visibilité) | ✅ |
| 1.7 | Terminal de commandes (type AutoCAD) | ✅ |
| 1.8 | Export SVG | ✅ |
| 1.9 | Sauvegarde/Ouverture JSON (.mcad) | ✅ |

## Phase 2 — Outils avancés (état actuel : terminée)

| # | Fonctionnalité | État |
|---|---------------|------|
| 2.1 | OSNAP 7 modes (endpoint, mid, center, nearest, int, perp, tan) | ✅ |
| 2.2 | Ortho (F8) + Polaire (F10, incrément configurable) | ✅ |
| 2.3 | Saisie dynamique Distance/Angle (Tab, bulle curseur) | ✅ |
| 2.4 | Grip editing (poignées bleues sur sélection) | ✅ |
| 2.5 | Module Architecture (Mur, Porte, Fenêtre) | ✅ |
| 2.6 | Module Électricité (Prise, Interrupteur, Câble) | ✅ |
| 2.7 | Module Cotation (5 types) | ✅ |
| 2.8 | Module Annotation (Texte, Repère) | ✅ |
| 2.9 | Export/Import DXF (AC1015) | ✅ |
| 2.10 | Toolbars dock/float/drag | ✅ |

---

## Phase 3 — Édition géométrique (prochaine étape)

| # | Fonctionnalité | Priorité | Complexité | Notes |
|---|---------------|----------|------------|-------|
| 3.1 | **Sélection par fenêtre** (rubber-band) | 🔴 | Faible | Drag pour sélectionner plusieurs objets |
| 3.2 | **Historique commandes** (↑↓ terminal) | 🔴 | Faible | Tableau `cmdHistory[]`, index |
| 3.3 | **TRIM** — raccourcir au croisement | 🔴 | Haute | Sélectionner limite puis segment |
| 3.4 | **EXTEND** — prolonger jusqu'à limite | 🟡 | Haute | Similaire à TRIM |
| 3.5 | **OFFSET** — parallèle à distance | 🔴 | Moyenne | Pour lignes, polylignes, arcs |
| 3.6 | **ROTATE** — rotation d'objets | 🟡 | Moyenne | Avec centre de rotation |
| 3.7 | **SCALE** — mise à l'échelle | 🟡 | Moyenne | Avec point de base + facteur |
| 3.8 | **MIRROR** — symétrie axiale | 🟡 | Moyenne | Axe en 2 points |
| 3.9 | **Arc 3 points** | 🟡 | Moyenne | P1, P2, P3 sur l'arc |

---

## Phase 4 — UX et interface

| # | Fonctionnalité | Priorité | Notes |
|---|---------------|----------|-------|
| 4.1 | **Panneau propriétés éditable** | 🟡 | Modifier X1,Y1,R… directement |
| 4.2 | **Gestionnaire de calques** | 🟡 | Ajouter, renommer, supprimer calques |
| 4.3 | **Menu contextuel** clic-droit canvas | 🟡 | Couper/Copier/Coller/Propriétés |
| 4.4 | **Double-clic pour éditer** texte | 🟡 | Inline editing du contenu texte |
| 4.5 | **Zoom fenêtre** (sélection zone) | 🟢 | |
| 4.6 | **Drag to copy** (Ctrl+Drag) | 🟢 | |
| 4.7 | **Sélection par type** (SEL LINE etc.) | 🟢 | |

---

## Phase 5 — Mesure et annotation avancée

| # | Fonctionnalité | Priorité | Notes |
|---|---------------|----------|-------|
| 5.1 | **DIST** — mesure distance entre 2 points | 🟡 | Commande + affichage terminal |
| 5.2 | **AREA** — calcul de surface | 🟢 | Polygone ou sélection |
| 5.3 | **Hachures** (HATCH) | 🟢 | Remplissage polygone |
| 5.4 | **Blocs** (BLOCK/INSERT) | 🟢 | Symboles réutilisables |
| 5.5 | **Tableaux** | 🟢 | Grilles texte |

---

## Phase 6 — Persistance et collaboration

| # | Fonctionnalité | Priorité | Notes |
|---|---------------|----------|-------|
| 6.1 | **Auto-save** (localStorage) | 🟡 | Récupération après fermeture |
| 6.2 | **Historique de sessions** | 🟢 | Liste des derniers fichiers |
| 6.3 | **Export PNG/PDF** | 🟢 | Capture du canvas |
| 6.4 | **Import SVG** | 🟢 | Parsing SVG en entités |

---

## Prochaine session de développement

**Objectif recommandé : Phase 3.1 + 3.2**

Ces deux fonctionnalités sont les plus demandées et les moins complexes :

1. **Sélection par fenêtre** : détecter mousedown + mousemove + mouseup sans tool actif en mode select, dessiner un rectangle de sélection, sélectionner toutes les entités dont la bounding box intersecte.

2. **Historique de commandes** : ajouter `S.cmdHistory = []` et `S.cmdHistoryIdx = -1`, intercepter ↑↓ dans le keydown du terminal.
