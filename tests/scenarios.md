# Scénarios de recette — MiniCAD

Chaque scénario décrit les étapes à suivre et le résultat attendu.
Cocher ✅ après validation, noter ❌ si échec avec description du problème.

---

## Scénario 1 — Dessin d'une ligne simple

**Préconditions :** Application ouverte, aucun objet

**Étapes :**
1. Appuyer `L` (ou cliquer outil Ligne)
2. Cliquer un point sur le canvas
3. Cliquer un 2ème point

**Résultat attendu :**
- Une ligne est créée entre les 2 points
- Message terminal : `#1 line créé L=xxx`
- Ligne visible avec couleur du calque actif

**État :** ✅

---

## Scénario 2 — Saisie de coordonnées précises

**Préconditions :** Outil Ligne actif

**Étapes :**
1. Cliquer un 1er point
2. Taper `100<45` dans le terminal + Entrée

**Résultat attendu :**
- Ligne de longueur 100 à 45° de l'horizontale
- Terminal : point résolu affiché

**État :** ✅

---

## Scénario 3 — Rectangle avec saisie dynamique

**Préconditions :** Application ouverte

**Étapes :**
1. Appuyer `R`
2. Cliquer un coin de départ
3. Appuyer `Tab` → les champs D.I. s'activent
4. Taper `200` dans le champ L, `Tab`, taper `100` dans H
5. Appuyer `Entrée`

**Résultat attendu :**
- Rectangle 200×100 créé
- Orientation selon position de la souris

**État :** ✅

---

## Scénario 4 — OSNAP endpoint

**Préconditions :** Une ligne existe, OSNAP activé

**Étapes :**
1. Outil Ligne actif
2. Approcher le curseur de l'extrémité d'une ligne existante
3. Cliquer

**Résultat attendu :**
- Marqueur carré rose s'affiche sur l'extrémité
- Tooltip "ENDPOINT" visible
- La nouvelle ligne part exactement de l'extrémité

**État :** ✅

---

## Scénario 5 — Mode Ortho

**Préconditions :** Outil Ligne actif

**Étapes :**
1. Appuyer `F8` (Ortho ON)
2. Cliquer un 1er point
3. Déplacer la souris dans une direction diagonale
4. Cliquer le 2ème point

**Résultat attendu :**
- La ligne est forcée à 0° ou 90° (la plus proche)
- Indicateur ORTHO en haut à droite actif

**État :** ✅

---

## Scénario 6 — Grip editing

**Préconditions :** Une ligne existe

**Étapes :**
1. Cliquer la ligne (sélection)
2. Cliquer sur une des poignées bleues aux extrémités
3. Déplacer la souris
4. Cliquer pour confirmer la nouvelle position

**Résultat attendu :**
- La poignée devient rouge quand saisie
- Preview en pointillés de la nouvelle forme
- Entité modifiée après confirmation
- Undo (Ctrl+Z) restaure l'état précédent

**État :** ✅

---

## Scénario 7 — Module Cotation

**Préconditions :** Deux points connus

**Étapes :**
1. Taper `LOAD dim` + Entrée
2. Taper `DIMLINEAR` + Entrée
3. Cliquer point 1
4. Cliquer point 2
5. Déplacer pour positionner la cote, cliquer

**Résultat attendu :**
- Cote horizontale ou verticale (auto-détectée)
- Valeur numérique affichée avec flèches
- Lignes d'attache depuis les points jusqu'à la ligne de cote

**État :** ✅

---

## Scénario 8 — Sauvegarde et réouverture

**Préconditions :** Dessin avec plusieurs objets

**Étapes :**
1. `Ctrl+S` → télécharge `minicad_project.mcad`
2. `Ctrl+O` → sélectionner le fichier téléchargé

**Résultat attendu :**
- Tous les objets rechargés à l'identique
- Calques restaurés avec couleurs et visibilité
- Modules rechargés dans leur état ON/OFF

**État :** ✅

---

## Scénario 9 — Export et import DXF

**Étapes :**
1. Créer quelques objets (ligne, cercle, rectangle, texte)
2. `EXPORT DXF` → télécharge `minicad_export.dxf`
3. `CLEAR` pour vider le dessin
4. `OPEN` → ouvrir le fichier .dxf

**Résultat attendu :**
- Objets réimportés avec positions correctes
- Calques DXF mappés aux calques MiniCAD
- Message terminal sur entités importées

**État :** ✅

---

## Scénario 10 — Polyligne fermée + OSNAP intersection

**Étapes :**
1. Dessiner une polyligne carrée à 4 points (PL)
2. Dessiner une ligne qui traverse le carré
3. Outil Ligne → approcher le croisement

**Résultat attendu :**
- Marqueur "×" dans cercle (intersection) s'affiche
- La nouvelle ligne peut partir exactement de l'intersection

**État :** ✅

---

## Scénario 11 — Sélection par fenêtre ❌ Non implémenté

**Étapes :**
1. Plusieurs objets présents
2. Mode select (V)
3. Cliquer+glisser pour dessiner un rectangle de sélection

**Résultat attendu :**
- Rectangle cyan pointillé pendant le drag
- Objets dans la fenêtre sélectionnés (bleus)

**État :** ❌ Non implémenté — voir TODO 3.1

---

## Scénario 12 — Historique commandes

**Étapes :**
1. Taper plusieurs commandes
2. Appuyer ↑ dans le terminal

**Résultat attendu :**
- Dernière commande rappelée dans le champ
- ↓ avance vers la plus récente ou vide le champ

**État :** ✅

---

## Scénario 13 — Module Architecture : mur

**Étapes :**
1. `LOAD arch` + Entrée
2. `WALL 30` (épaisseur 30)
3. Cliquer départ du mur
4. Cliquer arrivée

**Résultat attendu :**
- Mur avec épaisseur 30 dessiné
- Remplissage transparent légèrement visible
- Contours sur les deux côtés

**État :** ✅

---

## Scénario 14 — Undo/Redo multi-niveaux

**Étapes :**
1. Dessiner 5 objets
2. Ctrl+Z × 3
3. Ctrl+Y × 2

**Résultat attendu :**
- État après 2 undo restant (3 objets)
- Chaque undo/redo cohérent

**État :** ✅
