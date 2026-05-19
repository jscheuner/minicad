# TODO — MiniCAD

Tâches classées par priorité. Cocher quand terminé, déplacer en CHANGELOG.

---

## 🔴 Priorité haute (prochaine session)

- [ ] **4.3 — Menu contextuel** clic-droit canvas (Couper/Copier/Coller/Propriétés)
- [ ] **3.4 — Commande EXTEND**
- [ ] **5.2 — Commande AREA** (surface d'un polygone)

---

## 🟡 Priorité moyenne

- [ ] **TUBE preview EXT/INT à améliorer**
  - En mode multi-tronçons, le dernier point confirmé peut légèrement bouger lors du changement d'angle du tronçon suivant (bisectrice dynamique)
  - Piste : pré-calculer et stocker l'offset de chaque point confirmé dans `S.tubeOffsets[]`, le réutiliser dans la preview sans le recalculer depuis l'angle souris
  - La position finale à la validation (Enter) est correcte — c'est uniquement la preview qui est imparfaite
- [ ] **3.9 — Arc 3 points** (commande ARC3 ou variante A)
- [ ] **4.6 — Ctrl+Drag pour copier** (drag d'un objet sélectionné avec Ctrl)
- [ ] **5.3 — HATCH** (hachures / remplissage)
- [ ] **5.5 — Tableaux** (grilles texte annotatives)
- [ ] **6.4 — Import SVG** (parsing SVG → entités)
- [ ] **6.5 — Fenêtres de présentation (Paper Space)**
  - Concept AutoCAD : espace papier + espace modèle
  - Plusieurs vues du dessin sur une même feuille, chacune avec sa propre échelle et calques
  - Cadres de fenêtres paramétrables (position, taille, échelle, rotation)

---

## 🟢 Priorité basse / Futur

- [ ] **BLOCK — Créer un bloc nommé** depuis une sélection (commande BLOCK, point d'insertion, nom)
- [ ] **INSERT — Insérer un bloc** existant avec point d'insertion, échelle, rotation
- [ ] **REFEDIT — Éditer un bloc** en place (double-clic pour entrer dans le bloc)
- [ ] **4.5 — Zoom fenêtre** (sélection zone)
- [ ] **4.7 — Sélection par type** (SEL LINE etc.)

---

## ✅ Terminé (résumé)

Voir [CHANGELOG.md](CHANGELOG.md) pour le détail.

- ✅ Canvas, zoom, pan, grille, snap
- ✅ Outils de base (ligne, rect, cercle, arc, polyligne)
- ✅ Sélection, move, copy, erase, undo/redo
- ✅ 4 calques + visibilité
- ✅ Terminal de commandes AutoCAD-like
- ✅ OSNAP 7 modes + perpendiculaire + tangente (dont sur tube)
- ✅ Ortho (F8) + Polaire (F10)
- ✅ Dynamic Input (bulle D/A, tous tronçons TUBE inclus)
- ✅ Grip editing (poignées cotations corrigées — OSNAP ne dévie plus le clic)
- ✅ Gestionnaire de calques (fenêtre + transfert d'entités)
- ✅ TRIM, ROTATE, SCALE, DIST, JOIN, MIRROR
- ✅ Module Architecture (mur, porte, fenêtre)
- ✅ Module Électricité (prise, interrupteur, câble)
- ✅ Module Cotation (5 types, DIMANGULAR refondu, DIMRADIUS/DIAM redessinés)
- ✅ Module Annotation (texte, repère éditable)
- ✅ Export SVG, DXF, DWG
- ✅ Import DXF/DWG, sauvegarde JSON .mcad
- ✅ Toolbars dock/float
- ✅ Auto-save localStorage + File System Access API
- ✅ Impression (Ctrl+P, sélection de zone, format papier, échelle)
- ✅ TUBE (2 parois + axe, coudes, mode formule, EXT/AXE/INT, OSNAP sur parois)
- ✅ EXPLODE (tube → lignes + arcs)
- ✅ ARRAY (réseau rectangulaire)
- ✅ OFFSET, FILLET, CHAMFER
- ✅ Assistant IA Ollama
