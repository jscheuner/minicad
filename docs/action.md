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

## Phase 1 — Fondations (terminée)

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

## Phase 2 — Outils avancés (terminée)

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
| 2.9 | Export/Import DXF (AC1015) | ✅ | Réécriture complète v0.08 : CLASSES/BLOCKS/OBJECTS, AcDb*, 5 types DIMENSION, HATCH, TUBE |
| 2.10 | Toolbars dock/float/drag | ✅ |

---

## Phase 3 — Édition géométrique (terminée sauf 3.4 et 3.9)

| # | Fonctionnalité | Priorité | Complexité | Notes |
|---|---------------|----------|------------|-------|
| 3.1 | **Sélection par fenêtre** (rubber-band) | ✅ | Faible | Drag pour sélectionner plusieurs objets |
| 3.2 | **Historique commandes** (↑↓ terminal) | ✅ | Faible | Tableau `cmdHistory[]`, index |
| 3.3 | **TRIM** — raccourcir au croisement | ✅ | Haute | multi-limites, mode tout couper, circle/rect, limites auto-découpables |
| 3.4 | **EXTEND** — prolonger jusqu'à limite | 🔴 | Haute | Similaire à TRIM |
| 3.5 | **OFFSET** — parallèle à distance | ✅ | Moyenne | ligne, wall, arc, cercle, rect, pline |
| 3.6 | **ROTATE** — rotation d'objets | ✅ | Moyenne | Sélection préalable + point base |
| 3.7 | **SCALE** — mise à l'échelle | ✅ | Moyenne | Point base + facteur |
| 3.8 | **MIRROR** — symétrie axiale | ✅ | Moyenne | Axe en 2 points |
| 3.9 | **Arc 3 points** | ✅ | Moyenne | ARC multi-mode : 3P, SCE, SCA, SER — mots-clés DI, grips départ/fin |

---

## Phase 4 — UX et interface

| # | Fonctionnalité | Priorité | Notes |
|---|---------------|----------|-------|
| 4.1 | **Panneau propriétés éditable** | ✅ | Champs input X1,Y1,R… + select calque |
| 4.2 | **Gestionnaire de calques** | ✅ | Fenêtre dédiée + épaisseur/type de ligne + transfert entités |
| 4.3 | **Menu contextuel** clic-droit canvas | 🔴 | Couper/Copier/Coller/Propriétés |
| 4.4 | **Double-clic pour éditer** texte/cote | ✅ | Texte inline + dialogue texte de cote avec `<>` |
| 4.5 | **Zoom fenêtre** (sélection zone) | 🟢 | |
| 4.6 | **Drag to copy** (Ctrl+Drag) | 🟡 | |
| 4.7 | **Sélection par type** (SEL LINE etc.) | 🟢 | |
| 4.8 | **DIMANGULAR** — workflow repensé | ✅ | Clic ligne 1 → clic ligne 2 → choisir côté |

---

## Phase 5 — Mesure et annotation avancée

| # | Fonctionnalité | Priorité | Notes |
|---|---------------|----------|-------|
| 5.1 | **DIST** — mesure distance entre 2 points | ✅ | distance, Δx, Δy, angle |
| 5.2 | **AREA** — calcul de surface | 🔴 | Polygone ou sélection |
| 5.3 | **Hachures** (HATCH) | 🟡 | Remplissage polygone |
| 5.4 | **Blocs** (BLOCK/INSERT) | 🟢 | Symboles réutilisables |
| 5.5 | **Tableaux** | 🟢 | Grilles texte |

---

## Phase 6 — Persistance et collaboration

| # | Fonctionnalité | Priorité | Notes |
|---|---------------|----------|-------|
| 6.1 | **Auto-save** (localStorage) | ✅ | Récupération après fermeture |
| 6.2 | **Historique de sessions** | 🟢 | Liste des derniers fichiers |
| 6.3 | **Export PNG/Impression** | ✅ | Ctrl+P, sélection de zone, format papier, échelle |
| 6.4 | **Import SVG** | 🟡 | Parsing SVG en entités |
| 6.5 | **Fenêtres de présentation** (Paper Space) | 🟢 | Plusieurs vues, échelles indépendantes |
| 6.6 | **Préférences utilisateur** | ✅ | Dialogue PREFS, localStorage + bloc HTML embarqué, export/import JSON |

---

## Phase 7 — Métier tuyauterie

| # | Fonctionnalité | Priorité | Notes |
|---|---------------|----------|-------|
| 7.1 | **Assistant IA Ollama** | ✅ | Panneau flottant, streaming, génération entités |
| 7.2 | **Outil TUBE** | ✅ | 2 parois + axe, coudes, formule, EXT/AXE/INT |
| 7.3 | **TUBE preview EXT/INT** | ✅ | Bisectrices miter correctes, inclure point souris dans applyTubeRefOffset |
| 7.4 | **Nomenclature tube** | ✅ | Tableau TUBELBL : D/R, segments, Dév., poignées déplacement + redim |
| 7.5 | **Isométrie tuyauterie** | 🟢 | Vue isométrique automatique |

---

## Prochaine session de développement

**Objectif recommandé** : Phase 4 (UX restante) + Phase 5 (mesure)

Éléments prioritaires :
- **4.3 Menu contextuel** clic-droit canvas (Couper/Copier/Coller/Propriétés)
- **3.4 EXTEND** — vérification cas limites (multi-limites fait)
- **5.2 AREA** — calcul de surface d'un polygone
- **OSNAP Extension** — prolongement de ligne (non fonctionnel, à reprendre)

Terminé en session v0.09 (2026-05-30) :
- **ARC multi-mode** ✅ — 3P, SCE, SCA, SER ; mots-clés DI ; grips départ/fin ; preview live
- **Système démo** ✅ — `demo/demo_sequence.js`, `build.py --demo` → `minicad_demo.html`, bouton ▶ DÉMO
- **Build séparé** ✅ — `--demo` écrit dans `minicad_demo.html`, `minicad.html` toujours propre

Terminé en session v0.08 (2026-05-28) :
- **DXF Export AC1015** ✅ — réécriture complète : CLASSES/BLOCKS/OBJECTS, AcDb*, DIMENSION 5 types, LEADER+MTEXT, HATCH, TUBE
- **DXF Import** ✅ — SPLINE fit points, XLINE/RAY, DIMENSION, LEADER/MTEXT, HATCH, POINT, closed polyline
- **SPLINE / XLINE / RAY / RAY_REV** ✅ — outils avec boutons barre d'outils
- **Bibliothèque IPN** ✅ — profils 80→600

Terminé en session v0.07 (2026-05-26) :
- **DIVIDE / POINT** ✅ — diviser entité en N segments ; placement manuel de points
- **Styles de cote 1:1→1:100** ✅ — 7 styles scale-based
- **FILLET/CHAMFER sur rectangle** ✅ — conversion rect→polyligne
- **STRETCH cercles/arcs** ✅ — centre dans fenêtre → déplacement complet
- **LEADER lié au style de cote** ✅

Terminé en session v0.05 (2026-05-21) :
- **HATCH** ✅ — hachures lignes/croisé sur polyligne/rect/cercle
- **Sélection additive** ✅ — MOVE/COPY/ROTATE/SCALE/MIRROR/OFFSET sans Shift
- **OFFSET refactorisé** ✅ — sélection multiple, distance par clic, clic droit = Entrée
- **JOIN arcs** ✅ — arc joinable avec lignes/polylignes, bulge correct dans le résultat
- **Dialogue édition tube** ✅ — L. saisie REF, Prévisualiser, sens coude, Coter avec cotes liées

Terminé en session v0.04 :
- **6.6 Préférences utilisateur** ✅ — dialogue PREFS, stockage hybride localStorage + USER_PREFS embarqué
- **TRIM amélioré** ✅ — multi-limites, mode tout couper, circle/rect, limites auto-découpables
- **DIMRADIUS/DIMDIAMETER hitTest** ✅ — double-clic texte corrigé
- **Bouton téléchargement** ✅ — flottant bas-droit, visible sur minicad.org uniquement
