# TODO — MiniCAD

Tâches classées par priorité. Cocher quand terminé, déplacer en CHANGELOG.

---

## 🔴 Priorité haute (prochaine session)

- [x] **3.1 — Sélection par fenêtre (rubber-band)** ✅ 2025-05-14
  - Gauche→droite = fenêtre (cyan plein) : entité doit être entièrement à l'intérieur
  - Droite→gauche = croisement (vert pointillé) : entité intersectant suffit
  - Shift pour ajouter à la sélection existante
  - Message terminal avec mode et nombre d'objets

- [x] **3.2 — Historique de commandes terminal (↑↓)** ✅ 2026-05-14
  - `S.cmdHistory[]` + `S.cmdHistoryIdx` dans l'état global
  - ↑ : commande précédente, ↓ : commande suivante / vider
  - Limité à 50 entrées, dédoublonnage consécutif
  - _Fichier :_ cmdInput keydown listener

- [x] **3.5 — Commande OFFSET** ✅ 2026-05-15
  - Syntax : `OFFSET [distance]` puis cliquer l'entité puis cliquer côté
  - Support : ligne, wall, arc, cercle, rectangle, polyligne, câble
  - Hover highlight blanc, entité sélectionnée en orange, ghost en pointillés

---

## 🟡 Priorité moyenne

- [x] **3.3 — Commande TRIM** ✅ 2026-05-17
  - Support : ligne, wall, arc, polyligne × toute entité limite
  - Algorithme paramétrique (t∈[0,1]) + extractSubPoly pour les polylignes

- [x] **3.6 — Commande ROTATE** ✅ 2026-05-17
  - Sélection préalable possible (comme COPY), point de base, angle terminal ou D.I.

- [x] **3.7 — Commande SCALE** ✅ 2026-05-17
  - Sélection, point de base, facteur

- [ ] **4.1 — Panneau propriétés éditable**
  - Champs input (pas div) pour X1,Y1,X2,Y2,R,thickness…
  - `onchange` → pushUndo + modifier entité + render

- [x] **4.2 — Gestionnaire de calques amélioré** ✅ 2026-05-17
  - Fenêtre dédiée (showLayerManager) : couleur, nom éditable, visibilité, épaisseur ISO, type de ligne
  - Panneau gauche simplifié pour changer de calque actif
  - Transfert d'entités entre calques par clic sur calque avec sélection active

- [x] **5.1 — Commande DIST** ✅ 2026-05-17
  - `DIST` → clic point 1 → clic point 2 → terminal : distance, Δx, Δy, angle

---

## 🟢 Priorité basse / Futur

- [ ] **3.4 — Commande EXTEND**
- [ ] **3.8 — Commande MIRROR**
- [ ] **3.9 — Arc 3 points** (commande ARC3 ou variante A)
- [ ] **4.3 — Menu contextuel** clic-droit canvas (Couper/Copier/Coller/Propriétés)
- [ ] **4.4 — Double-clic pour éditer** un texte inline
- [ ] **4.6 — Ctrl+Drag pour copier** (drag d'un objet sélectionné avec Ctrl)
- [ ] **5.2 — Commande AREA** (surface d'un polygone)
- [ ] **5.3 — HATCH** (hachures / remplissage)
- [ ] **5.5 — Tableaux** (grilles texte annotatives)
- [x] **6.1 — Auto-save localStorage + File System Access API** ✅ 2025-05-14
- [ ] **6.3 — Export PNG** (canvas.toBlob)
- [ ] **6.4 — Import SVG** (parsing SVG → entités)

---

## ✅ Terminé (résumé)

Voir [CHANGELOG.md](CHANGELOG.md) pour le détail.

- ✅ Canvas, zoom, pan, grille, snap
- ✅ Outils de base (ligne, rect, cercle, arc, polyligne)
- ✅ Sélection, move, copy, erase, undo/redo
- ✅ 4 calques + visibilité
- ✅ Terminal de commandes AutoCAD-like
- ✅ OSNAP 7 modes + perpendiculaire + tangente
- ✅ Ortho (F8) + Polaire (F10)
- ✅ Dynamic Input (bulle D/A)
- ✅ Grip editing (poignées cotations corrigées — OSNAP ne dévie plus le clic)
- ✅ Gestionnaire de calques (fenêtre + transfert d'entités)
- ✅ TRIM, ROTATE, SCALE, DIST, JOIN
- ✅ Module Architecture (mur, porte, fenêtre)
- ✅ Module Électricité (prise, interrupteur, câble)
- ✅ Module Cotation (5 types)
- ✅ Module Annotation (texte, repère)
- ✅ Export SVG, DXF, DWG
- ✅ Import DXF/DWG, sauvegarde JSON .mcad
- ✅ Toolbars dock/float
