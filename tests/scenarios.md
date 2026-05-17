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

## Scénario 11 — Sélection par fenêtre

**Étapes :**
1. Plusieurs objets présents
2. Mode select (V)
3. Cliquer+glisser gauche→droite (fenêtre) ou droite→gauche (croisement)

**Résultat attendu :**
- Rectangle cyan plein (fenêtre) ou vert pointillé (croisement) pendant le drag
- Fenêtre : sélectionne uniquement les entités entièrement à l'intérieur
- Croisement : sélectionne aussi les entités qui intersectent le rectangle

**État :** ✅

---

---

## Scénario 15 — Outil TUBE (mode graphique)

**Préconditions :** Application ouverte

**Étapes :**
1. Taper `TUBE` + Entrée (ou cliquer le bouton toolbar Dessin)
2. Cliquer 3 points non colinéaires sur le canvas
3. Appuyer Entrée (ou clic-droit) pour terminer

**Résultat attendu :**
- Tube dessiné : 2 traits pleins (parois) + 1 axe trait-point
- Coudes arrondis aux changements de direction
- Message terminal : `TUBE #X créé — 3 points, Ø40 R67`

**État :** ✅

---

## Scénario 16 — Outil TUBE (mode formule)

**Préconditions :** Application ouverte

**Étapes :**
1. Taper `TUBE 500+90R50+300` + Entrée
2. Cliquer le point d'insertion sur le canvas

**Résultat attendu :**
- Tube formulé : 500 droit, coude 90° rayon 50, 300 droit
- Longueurs droites réduites de T = R·tan(45°) ≈ 50 de chaque côté du coude
- Rendu correct (2 parois + axe)

**État :** ✅

---

## Scénario 17 — DIMANGULAR (nouveau workflow)

**Préconditions :** Deux lignes sécantes existent sur le canvas

**Étapes :**
1. Taper `DIMANGULAR` + Entrée
2. Cliquer sur la 1ère ligne
3. Cliquer sur la 2ème ligne
4. Déplacer la souris pour choisir le secteur angulaire voulu
5. Cliquer pour placer la cote

**Résultat attendu :**
- Étape 2 : 1ère ligne surlignée en orange
- Étape 3 : terminal affiche les coordonnées du vertex (intersection calculée)
- Étape 4 : arc dynamique suit la souris (4 secteurs possibles)
- Étape 5 : cote angulaire créée avec arc, flèches, et valeur en degrés

**État :** ✅

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
