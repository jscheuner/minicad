# TODO — MiniCAD

Tâches classées par priorité. Cocher quand terminé, déplacer en CHANGELOG.

---

## 🔴 Priorité haute (prochaine session)

- [x] **4.3 — Menu contextuel** clic-droit canvas (Couper/Copier/Coller/Propriétés) ✅
- [ ] **3.4 — Commande EXTEND** *(multi-limites fait, mode tout prolonger fait — vérifier cas limites)*
- [x] **5.2 — Commande AREA** (surface d'un polygone) ✅

---

## 🟡 Priorité moyenne

- [ ] **Présentations (espace papier)** — onglets Objet/Présentation, fenêtres à l'échelle, cartouche, impression PDF
  - Plan détaillé Phase 1 : voir [plan_presentations.md](plan_presentations.md) (≈ 600–700 lignes)
  - En cours : étape 1 (données + persistance) + étape 2 (onglets + feuille)

- [ ] **OSNAP Extension** — prolongement de ligne/polyligne (EXT comme AutoCAD)
  - Acquisition du point d'extrémité au survol (marqueur "+")
  - Ligne pointillée sur le prolongement, snap au croisement
  - Implémenté partiellement (v0.06) — ne fonctionne pas correctement, à reprendre

- [ ] **HATCH V2 — Détection de frontière multi-entités**
  - Clic dans une zone délimitée par plusieurs lignes/arcs qui se croisent (pas une entité fermée unique)
  - Lancer de rayons depuis le point cliqué → trouver les intersections les plus proches → reconstruire le contour fermé
  - Similaire au "Pick Points" d'AutoCAD

- [ ] **TUBE preview EXT/INT à améliorer**
  - En mode multi-tronçons, le dernier point confirmé peut légèrement bouger lors du changement d'angle du tronçon suivant (bisectrice dynamique)
  - Piste : pré-calculer et stocker l'offset de chaque point confirmé dans `S.tubeOffsets[]`, le réutiliser dans la preview sans le recalculer depuis l'angle souris
  - La position finale à la validation (Enter) est correcte — c'est uniquement la preview qui est imparfaite
- [x] **3.9 — Arc 3 points** ✅ — ARC multi-mode complet (3P, SCE, SCA, SER)
- [ ] **4.6 — Ctrl+Drag pour copier** (drag d'un objet sélectionné avec Ctrl)
- [x] **5.3 — HATCH** (hachures / remplissage) ✅
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

- ✅ **AREA** — surface entité (cercle/rect/polyligne) ou polygone cliqué [P] ; preview live S≈ ; Entrée/clic-droit pour calculer ; alias AIRE/SURFACE
- ✅ **Menu contextuel** — clic-droit canvas : Couper/Copier/Coller (presse-papiers, Ctrl+X/C/V), Déplacer, Effacer, Propriétés, Tout sélectionner, Zoom étendu ; mode COLLER avec preview fantôme
- ✅ **ARC multi-mode** — 3P / SCE / SCA / SER, mots-clés DI, grips départ/fin, preview live
- ✅ **Système démo** — `demo/demo_sequence.js`, `build.py --demo` → `minicad_demo.html`, bouton ▶ DÉMO
- ✅ **DXF Export AC1015** — réécriture complète : CLASSES/BLOCKS/OBJECTS, AcDb*, DIMENSION 5 types, LEADER+MTEXT, HATCH, TUBE
- ✅ **DXF Import amélioré** — SPLINE fit points, XLINE/RAY, DIMENSION routage, LEADER/MTEXT, HATCH, POINT, closed polyline
- ✅ **SPLINE / XLINE / RAY / RAY_REV** — outils avec boutons barre d'outils
- ✅ **Bibliothèque IPN** — profils 80→600 SN EN 10365:2017
- ✅ **DIVIDE / POINT** — diviser entité en N segments par des points ; placement manuel de points ; export DXF
- ✅ **Styles de cote 1:1→1:100** — 7 styles scale-based remplacent les 3 ISO ; migration localStorage automatique
- ✅ **FILLET/CHAMFER sur rectangle** — conversion rect→polyligne en place ; undo restaure le rectangle
- ✅ **EXPLODE polyligne avec bulge** — tous les arcs extraits correctement (bug : seul le 1er arc était conservé)
- ✅ **STRETCH — cercles/arcs** — centre dans fenêtre → déplacement complet
- ✅ **STRETCH — rectangle de sélection** — masqué dès la fin de la fenêtre croisante
- ✅ **LEADER lié au style de cote** — taille/flèche/attache selon style ; épaulement gauche/droite ; hitText corrigé
- ✅ **FILLET R=0** — raccord angle vif sur lignes, polylignes et arcs
- ✅ **FILLET sur arc** — raccord ligne+arc (R=0 et R>0) via `applyFilletWithArc`
- ✅ **hitTest par distance** — sélection au clic par proximité réelle au contour (plus premier-trouvé)
- ✅ **Hachure hitTest contour** — détection sur le bord uniquement (plus surface)
- ✅ **Sélection croisée précise** — rect/circle/arc/polyline/hatch par géométrie (plus bounding box)

Voir [CHANGELOG.md](CHANGELOG.md) pour le détail.

- ✅ **HATCH** — hachures sur polyligne/rect/cercle, patterns lignes/croisé, angle, espacement, grip centroïde
- ✅ **Sélection additive** — MOVE/COPY/ROTATE/SCALE/MIRROR/OFFSET : clic sans Shift pour multi-sélection
- ✅ **OFFSET refactorisé** — sélection multiple puis direction, distance par 2 clics canvas, clic droit = Entrée
- ✅ **Clic droit = Entrée** — confirme états pending, active drawing, JOIN, TUBE, TRIM/EXTEND
- ✅ **Fix navigation navigateur** — preventDefault sur mousedown/mouseup bouton droit
- ✅ **Terminal sélectionnable** — user-select:text sur .terminal-output
- ✅ **JOIN arcs** — arc sélectionnable + bulge correctement transféré dans la polyligne résultante
- ✅ **Dialogue édition tube v0.05** — L. saisie REF, Prévisualiser, longeur AXE fixe, sens coude, Coter avec cotes liées (`linkedTubeId`)
- ✅ **Tableau nomenclature TUBE** — `TUBELBL`, taille fixe monde, poignées déplacement + redim, auto à finishTube
- ✅ **Preview TUBE EXT/INT** — bisectrices miter correctes, plus de segment en biais
- ✅ **DI Tab bug** — `relatedTarget` empêche l'écrasement de la distance lors du Tab entre champs
- ✅ **EXTEND amélioré** — mode tout prolonger + correction intersection sur droite infinie
- ✅ **Préférences utilisateur** — dialogue PREFS, localStorage + bloc USER_PREFS HTML, export/import JSON
- ✅ **TRIM amélioré** — multi-limites, mode tout couper, circle/rect découpables, limites auto-découpables
- ✅ **DIMRADIUS/DIMDIAMETER** — double-clic texte pour édition (hitTest corrigé)
- ✅ **Bouton téléchargement** sur minicad.org (flottant bas-droit, conditionnel au hostname)
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
