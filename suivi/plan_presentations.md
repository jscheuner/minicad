# Plan — Présentations (espace papier) · Phase 1

Statut : **proposé** (non démarré) — créé le 2026-06-07
Cible : `src/minicad.html` (cœur). Estimation : **≈ 600–700 lignes** pour la v1.

---

## 0. Objectif et périmètre

**Livrable** : onglets `Objet │ Présentation 1 │ +` ; chaque présentation = une feuille
(A4/A3…) avec cartouche et une ou plusieurs **fenêtres** montrant l'espace objet à une
échelle fixe ; impression PDF de la feuille.

**Inclus** : multi-feuilles, multi-fenêtres, création/déplacement/redimension des fenêtres,
réglage échelle + centrage, cartouche éditable, annotations texte/leader en espace papier,
persistance `.mcad`, impression.

**Exclu (phase 2)** : entrer *dans* une fenêtre pour recadrer le modèle (MSPACE), gel de
calques par fenêtre, cotation en espace papier, export DXF des layouts.

**Choix par défaut retenus** (modifiables) : multi-feuilles ✔, multi-fenêtres ✔,
échelle/centrage réglés par **dialogue** (pas de navigation « dans » la fenêtre en phase 1).

---

## 1. Modèle de données

**Où** : `S{}` (≈ minicad.html:2070).

- `S.space` : `'model'` ou l'`id` d'une présentation (état courant).
- `S.layouts` : tableau de feuilles. Schéma d'une feuille :
  - identité : `id`, `name`
  - feuille : `paper` ('A4'…), `orient`, `marginMm`
  - `cartouche` : `{ titre, echelle, date, auteur, indice, ... }`
  - `viewports` : `[{ id, xMm, yMm, wMm, hMm, centerX, centerY, scale, locked }]`
    - `xMm/yMm/wMm/hMm` = rectangle sur la feuille (mm)
    - `centerX/centerY` = point **monde** visé ; `scale` = dénominateur (1:N)
  - `paperEntities` : entités dessinées **en espace papier** (format d'entité existant,
    coordonnées en mm feuille)
- `S.paperView` : navigation de la feuille à l'écran `{ zoom, panX, panY }`
  (distincte des globales modèle `S.zoom/panX/panY`).

**Pourquoi séparé** : on ne touche pas aux globales modèle ; on ajoute un repère papier parallèle.

---

## 2. Transformations (point névralgique)

**Où** : à côté de `w2s/s2w` (≈ minicad.html:3672).

- Créer `p2s(xMm,yMm)` / `s2p(sx,sy)` : mm feuille ↔ écran, via `S.paperView`.
- **Réutiliser le pattern `doPrint`** pour les fenêtres : un helper
  `withModelTransform(zoom, panX, panY, fn)` qui sauve/écrase/restaure
  `ctx, canvasW, canvasH, S.zoom, S.panX, S.panY` autour de `fn`
  (extraction exacte de minicad.html:12076-12104). Sert aussi à nettoyer `doPrint`.
- Maths d'une fenêtre (identiques à `doPrint`) :
  `zoomVp = (1/scale) × pxParMm_feuille_à_l'écran` ; pan calculé pour que
  `centerX/centerY` tombe au centre du rectangle.

---

## 3. Rendu

**Où** : routeur de rendu autour de `_doRender` / `_drawStaticLayer` (≈ minicad.html:3796).

- Au sommet : `if (S.space === 'model') … (existant) else _drawPaperSpace(layout)`.
- `_drawPaperSpace(layout)` :
  1. fond gris atelier + **feuille blanche** + cadre marge (logique de cadre de `doPrint`) ;
  2. **cartouche** (`_drawCartouche`) : rectangle + champs ;
  3. pour chaque **fenêtre** : `ctx.save(); clip(rect)` →
     `withModelTransform(zoomVp, panVp, () => S.entities.forEach(drawEntity))` →
     `restore()` → bordure (et poignées si sélectionnée) ;
  4. **annotations papier** : `layout.paperEntities.forEach(drawEntity)` sous transfo `p2s`.
- **Perf** : réutiliser le culling bbox `_inViewport` (≈ minicad.html:3792) dans chaque
  fenêtre ; en phase 1 rendre le paper space sur le canvas dynamique (pas de couche statique
  séparée) — simple et suffisant.

---

## 4. Interface (onglets + barre d'état)

**Où** : bas de `canvas-area` (≈ minicad.html:1658) ; styles près de `.statusbar`
(≈ minicad.html:900).

- Barre d'onglets : `Objet`, un onglet par `S.layouts`, bouton `+`.
- Clic → `setSpace(id)` ; double-clic → renommer ; clic droit → menu
  (Renommer / Supprimer / Dupliquer).
- `setSpace()` : change `S.space`, met à jour l'outil actif autorisé, `render()`.
- i18n : clés (`tab.model`, `tab.layout`, `pres.*`) dans `translations/fr.json` + `en.json`
  (placeholders `{{}}`).

---

## 5. Interactions en espace papier

**Où** : entrées des handlers souris (clic/déplacement/molette) et clavier.

- **Garde-fou** : si `S.space !== 'model'`, détourner les handlers vers la logique papier
  (outils de dessin modèle désactivés ; autorisés : sélection/déplacement de fenêtres,
  texte/leader papier).
- **Pan/zoom feuille** : molette → `S.paperView.zoom` ; pan → `S.paperView.panX/Y`
  (miroir de la logique modèle).
- **Fenêtres** :
  - Outil « Nouvelle fenêtre » : cliquer-glisser un rectangle sur la feuille.
  - Sélection au clic ; **poignées de redimension** via l'infra de grips existante (4 coins) ;
    déplacement par glisser.
  - Dialogue fenêtre : `scale` (liste 1:1…1:200 + libre), `centerX/centerY`
    (+ bouton « centrer sur tout le dessin »), `locked`.
- **Annotations papier** : autoriser `TEXT` et `LEADER` à écrire dans `layout.paperEntities`
  en espace papier.

---

## 6. Impression

**Où** : `doPrint` (≈ minicad.html:11986).

- Si `S.space === 'model'` → comportement actuel inchangé.
- Si présentation → **la feuille est déjà la page** : rendre le layout dans le canvas
  off-screen 300 DPI (fenêtres + cartouche), puis `buildPrintPDF` **tel quel**.
- `paper/orient` viennent du layout ; le dialogue affiche « Présentation : <nom> ».

---

## 7. Persistance

**Où** : `buildSaveData` (≈ minicad.html:13921) et `openJSON` (≈ minicad.html:14245,
+ second bloc de restore ≈ 14248).

- Ajouter `layouts: S.layouts` et `space: S.space` au save ; bump `version`.
- Au load : `if (data.layouts) S.layouts = data.layouts; else S.layouts = []`
  (rétro-compat : anciens fichiers → aucune présentation, on reste en `model`).
- `autoSave()` sérialise `buildSaveData` → couvre les layouts automatiquement.

---

## 8. Ordre de travail + points de contrôle

1. **Données + persistance** (squelette `S.layouts`, save/load, rétro-compat).
   *Check* : un `.mcad` enregistré/rechargé conserve une présentation vide.
2. **Onglets + bascule d'espace** (UI + `setSpace`, rendu feuille blanche vide).
   *Check* : bascule Objet ↔ Présentation, feuille affichée, pan/zoom feuille OK.
3. **`withModelTransform` + refactor léger de `doPrint`** pour partager le helper.
   *Check* : impression objet inchangée (non-régression).
4. **Rendu d'une fenêtre** (rectangle codé en dur → `drawEntity` du modèle dedans).
   *Check* : le dessin apparaît à l'échelle dans la fenêtre.
5. **Création/sélection/déplacement/redimension** des fenêtres + dialogue échelle/centrage.
   *Check* : poser 2 fenêtres à 2 échelles différentes.
6. **Cartouche** (rendu + éditeur). *Check* : titre/échelle/date visibles et éditables.
7. **Annotations papier** (TEXT/LEADER). *Check* : un texte posé sur la feuille persiste.
8. **Impression de la présentation** → PDF. *Check* : PDF = feuille + fenêtres + cartouche,
   nets à 300 DPI.
9. **Build + scénarios** : `python build.py`, dérouler les checks, vérifier la non-régression
   de l'espace objet (dessin, OSNAP, impression objet).

À chaque étape : `python build.py` puis test dans le fichier généré ; commit sur `dev` par étape.

---

## 9. Risques & décisions à verrouiller

**Risques** :
- **Double repère** (modèle vs papier) → router strictement la transfo active ;
  `withModelTransform` isole le risque.
- **Refactor de `doPrint`** → régression d'impression possible ; étape 3 isolée avec check dédié.
- **OSNAP en espace papier** → désactivé hors modèle en phase 1 (fenêtres non « entrables »),
  supprime le risque.

**Décisions à confirmer avant l'UI** :
- Cartouche : **simple intégré** (titre/échelle/date/auteur/indice) en phase 1,
  vs cartouche dessiné librement (phase 2).
- Échelles de la liste : réutiliser celles des `dimStyles` existants
  (1:1, 1:2, 1:5, 1:10, 1:20, 1:50, 1:100, 1:200 + libre).

---

## Estimation de lignes (dans `src/minicad.html`)

| Bloc | Lignes |
|---|---|
| Modèle données + save/load + rétro-compat | ~40 |
| Barre d'onglets (HTML + CSS) + bascule d'espace | ~80 |
| Rendu espace papier (feuille, cartouche, fenêtres, annotations) | ~180 |
| Navigation feuille (pan/zoom) | ~40 |
| Création/déplacement/échelle des fenêtres (grips + dialogue) | ~130 |
| Éditeur de cartouche | ~80 |
| Impression d'une présentation (adaptation doPrint) | ~60 |
| **Phase 1 — présentation imprimable utilisable** | **≈ 600–700** |
| Phase 2 (édition dans la fenêtre, gel calques, cotation papier, multi-feuilles avancées) | +400–600 |
