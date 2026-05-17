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

- [x] **4.1 — Panneau propriétés éditable** ✅
  - Champs input pour X1,Y1,X2,Y2,R,thickness… avec `onchange` → pushUndo + render
  - Select calque par entité

- [x] **4.2 — Gestionnaire de calques amélioré** ✅ 2026-05-17
  - Fenêtre dédiée (showLayerManager) : couleur, nom éditable, visibilité, épaisseur ISO, type de ligne
  - Panneau gauche simplifié pour changer de calque actif
  - Transfert d'entités entre calques par clic sur calque avec sélection active

- [x] **5.1 — Commande DIST** ✅ 2026-05-17
  - `DIST` → clic point 1 → clic point 2 → terminal : distance, Δx, Δy, angle

---

## 🟢 Priorité basse / Futur

- [ ] **3.4 — Commande EXTEND**
- [x] **3.8 — Commande MIRROR** ✅ (déjà implémenté)
- [ ] **3.9 — Arc 3 points** (commande ARC3 ou variante A)
- [x] **ARRAY / RÉSEAU** ✅ 2026-05-17 — Réseau rectangulaire (popup dialog, preview pointillés, résultat = bloc)
- [ ] **BLOCK — Créer un bloc nommé** depuis une sélection (commande BLOCK, point d'insertion, nom)
- [ ] **INSERT — Insérer un bloc** existant avec point d'insertion, échelle, rotation
- [ ] **EXPLODE** ✅ partiellement (éclate les blocs ARRAY) — à étendre aux blocs INSERT futurs
- [ ] **REFEDIT — Éditer un bloc** en place (double-clic pour entrer dans le bloc)
- [x] **DIMANGULAR — Nouveau workflow** ✅ 2026-05-17
  - Cliquer ligne 1 → cliquer ligne 2 → choisir côté → cliquer pour placer
  - Vertex calculé automatiquement par intersection (`lineIntersect`)
  - Secteur sélectionné par position souris (`_dimAngSector`)
- [ ] **4.3 — Menu contextuel** clic-droit canvas (Couper/Copier/Coller/Propriétés)
- [ ] **4.4 — Double-clic pour éditer** un texte inline
- [ ] **4.6 — Ctrl+Drag pour copier** (drag d'un objet sélectionné avec Ctrl)
- [ ] **5.2 — Commande AREA** (surface d'un polygone)
- [ ] **5.3 — HATCH** (hachures / remplissage)
- [ ] **5.5 — Tableaux** (grilles texte annotatives)
- [x] **6.1 — Auto-save localStorage + File System Access API** ✅ 2025-05-14
- [ ] **6.3 — Export PNG** (canvas.toBlob)
- [ ] **6.4 — Import SVG** (parsing SVG → entités)
- [x] **7.2 — Outil TUBE** ✅ 2026-05-17
  - Entité `tube` : parois (2 traits) + axe (trait-point), coudes avec tangentes
  - Mode graphique (clics comme polyligne) + mode formule (ex: `TUBE 1000+90R67+500`)
  - Commandes : `TUBE`, `TUBED <Ø>`, `TUBEBR <R>` — rayon défaut R67, Ø40
  - Bouton dans toolbar Dessin, Enter/Échap pour terminer, clic-droit valide

- [x] **7.1 — Assistant IA Ollama** ✅ 2026-05-17
  - Panneau flottant déplaçable, bouton 🤖 dans toolbar fichier
  - Sélection de modèle depuis `/api/tags`, streaming réponse
  - Génération d'entités via balises `<entities>[...]</entities>`
  - Bouton "+ Ajouter au dessin" → `pushUndo()` + `render()`
  - Prompt système avec format JSON des entités et calques actuels
  - Commande terminal : `AI` / `OLLAMA` / `ASSISTANT`

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
