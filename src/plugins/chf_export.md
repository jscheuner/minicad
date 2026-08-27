# Plugin `chf_export` — Export découpe laser SC2000

Exporte tout ou partie d'un dessin MiniCAD vers le format `.chf`, lu par le logiciel de
pilotage laser **SC2000** (Au3Tech). Format retro-ingénierié à partir d'un seul fichier
d'exemple fourni par l'utilisateur (`laser_6mm.chf`, 38 graphes) — aucune documentation
publique disponible. Voir la section **Réserves** en fin de document avant toute utilisation
sur une pièce définitive.

Fichier source : `src/plugins/chf_export.js` (généré vers `plugins/chf_export.js` par
`build.py`, ne jamais éditer ce dernier directement). Chargé à la demande via `LOAD chf_export`
ou automatiquement si déjà utilisé dans une session précédente (`S.loadedPlugins`).

## Types d'entités supportés

`line, wall, rect, circle, arc, polyline, cable, spline, ellipse` (`CHF_SUPPORTED_TYPES`).
Un bloc `insert` (référence de bloc) est automatiquement « déplié » en ses entités constituantes
au moment de l'export (`_chfFlattenScope`, récursif jusqu'à 5 niveaux d'imbrication) — mais les
réglages Sens/Compensation/Amorce doivent être posés sur les entités elles-mêmes, pas sur le
bloc qui les contient.

## Réglages par objet (panneau propriétés)

Quatre champs additifs apparaissent dans le panneau propriétés pour toute entité d'un type
supporté (mono- et multi-sélection) :

| Champ | Propriété interne | Défaut | Effet |
|---|---|---|---|
| **Sens** | `_chfReverse` (bool) | `false` | Inverse le sens de parcours du contour à l'export. |
| **Compensation (mm)** | `_chfCompensation` (mm, signé) | `0` | Décalage du tracé : **positif = extérieur**, **négatif = intérieur**. |
| **Longueur amorce (mm)** | `_chfLeadLength` (mm) | `0` (désactivée) | Longueur du segment de départ hors-pièce. |
| **Angle amorce (°)** | `_chfLeadAngle` (°, 0°=+X, sens trigonométrique) | `0` | Direction du segment de départ, en coordonnées monde. |
| **Point de départ** | `_chfStartPoint {x,y}` | auto | Bouton ⌖ : clic sur le contour pour choisir le point de départ manuel ; bouton ↺ pour revenir à l'automatique. Seulement proposé sur les contours **fermés** (rect/circle toujours ; arc/ellipse pleins ; polyline/cable/spline fermés — `_chfSupportsStartPoint`). |

Le point de départ manuel est toujours re-projeté sur la géométrie courante avant export
(`_chfNearestPointOnEntity`), donc reste valide si l'objet est déplacé/redimensionné après coup.

## Commandes

- **`EXPORTCHF`** (alias `ECHF`) — ouvre le dialogue d'export (portée : sélection courante ou
  tout le dessin, choix du fichier de destination), écrit le fichier `.chf` au clic sur
  « Exporter ».
- **`CHFCOMP`** — applique la valeur du champ toolbar « Compensation » à tous les objets
  sélectionnés, en déterminant **automatiquement le signe** selon la profondeur d'imbrication
  (extérieur vs intérieur — voir plus bas). Rien sélectionné → arme la boîte de sélection
  (Entrée pour relancer, Échap pour annuler), même mécanisme que `EXPLODE`/`GROUP`/`WBLOCK`.
- **`CHFREV`** — inverse individuellement le Sens (`_chfReverse`) de chaque objet supporté de
  la sélection (bascule chacun indépendamment, comme `MIRROR`).
- **`CHFSTART`** — pose le point de départ manuel par picking souris (2 clics : point sur le
  contour, puis vecteur longueur/angle de l'amorce). Rien sélectionné → arme la boîte de
  sélection ; un objet à contour fermé sélectionné → picking direct.
- **`CHFSTARTAUTO`** — applique en lot la longueur/angle des champs toolbar « Amorce » à tous
  les objets sélectionnés, avec **détection automatique trou/extérieur** pour les cercles et
  rectangles (voir plus bas). Rien sélectionné → arme la boîte de sélection.

## Détection extérieur/intérieur par imbrication (CHFCOMP et CHFSTARTAUTO)

Les deux commandes batch partagent le **même calcul de profondeur d'imbrication**
(`_chfNestDepth`) et le **même sélecteur toolbar** « Règle d'imbrication » (`data-tbid="chf-comp-mode"`) :

- **Alterné** (défaut) — la parité de la profondeur détermine le sens : pair = extérieur,
  impair = intérieur. Correct pour un remplissage vectoriel standard (anneau + moyeu plein à
  3 niveaux : extérieur/intérieur/extérieur).
- **Binaire** — extérieur seulement si profondeur 0, intérieur dès qu'il y a imbrication (un
  objet au 3ᵉ niveau reste « intérieur », contrairement au mode Alterné).

Profondeur = nombre d'AUTRES objets **fermés et supportés** de la **même sélection courante**
dont le contour contient le point représentatif de l'objet (pas tout le dessin — seulement ce
qui est sélectionné au moment de l'appel).

Effet du mode sur chaque commande :
- **CHFCOMP** : signe de la compensation appliquée (`+valeur` extérieur / `-valeur` intérieur).
- **CHFSTARTAUTO** : pour un **cercle ou un rectangle** détecté « trou » (intérieur), l'angle
  d'amorce est calculé automatiquement pour pointer vers le **centre** de ce trou (le point de
  percée tombe dans la matière retirée, pas dans la pièce conservée) au lieu d'utiliser l'angle
  fixe du champ toolbar. Un objet extérieur, ou d'un autre type que cercle/rectangle, garde
  l'angle toolbar tel quel.

## Prévisualisation (dessin canvas, avant export)

Affichée automatiquement dès qu'un objet a une Compensation et/ou une Amorce réglée (hook cœur
`pluginDecorateEntity`, recalculé à chaque frame — jamais désynchronisé d'une édition
ultérieure) :

- **Compensation** : contour fantôme en pointillé, décalé de la valeur signée, avec des flèches
  indiquant le sens de coupe réel (inversées si Sens = Inverse).
- **Amorce** : segment pointillé du point d'entrée réel dans le contour vers le point extérieur
  (hors-pièce), flèche pointant vers l'entrée (sens réel de coupe : extérieur → entrée →
  contour), et un **repère carré + croix** au point de percée (l'extrémité extérieure, à
  l'opposé de la flèche).

## Barre d'outils « Export laser »

Bouton export (icône document), sélecteur de mode d'imbrication, champ + bouton Compensation
(CHFCOMP), bouton Sens (CHFREV), bouton point de départ manuel (CHFSTART), champs longueur/angle
+ bouton amorce auto (CHFSTARTAUTO, défauts 5 mm / 90°).

## Format `.chf` — structure générale

```
scFlie
5
<Begin Graphs>
<nombre de graphes>
####graph NO:1
8
0.100000
<Glyphs>
<longueur totale>
<bbox min x,y>
<bbox max x,y>
<point départ x,y>
<point fin x,y>
<nombre de Gly>
####Gly: 1
<dir>          (1 ou -1)
<type>         (2 = segment, 4 = cercle)
<x1,y1> <x2,y2>            (segment)
  ou <cx,cy> <r>           (cercle)
...
<End Glyphs>
0
<code craft>   (2 = cercle natif, 1 sinon)
<Crafts>
1
<compensation signée>
<PWM Control>...<End PWM Control>       (fixe, hors-périmètre)
<GuideCurve Para>                        (amorce)
1
<angle>
<longueur>
1.000000
<0 ou 1>       (flag actif/inactif)
<End GuideCurve Para>
<coolPos Para>...<End coolPos Para>     (fixe, hors-périmètre)
<End Crafts>
####graph NO:2
...
<End Graphs>
0
0.0
0.000000,0.000000
0.000000,0.000000
eof
```

Points clés vérifiés contre l'exemple d'origine :
- La bbox déclarée d'un **cercle natif n'est jamais paddée** par la compensation, quelle que
  soit sa valeur — seuls les contours non-cercle voient leur bbox élargie/rétrécie de
  `±compensation` sur chaque côté.
- `dir` encode le Sens de parcours (segment : ordre des points inversé de façon
  « direction-préservante » — le point de départ ne bouge pas, seul le reste de l'ordre change ;
  cercle : `dir=-1` si Sens = Inverse).
- Le bloc `<GuideCurve Para>` (amorce/« Lead Line ») garde sa valeur constante d'origine
  (`1 / 90.000000 / 4.000000 / 1.000000 / 0`, flag désactivé) tant qu'aucune longueur d'amorce
  n'est réglée sur l'objet — comportement par défaut inchangé pour tout objet n'utilisant pas
  cette fonctionnalité.

## Réserves — non confirmées sur machine réelle

Aucune machine/logiciel SC2000 n'a été disponible pour valider ces hypothèses. À tester en
priorité sur une chute avant toute pièce définitive :

1. **`dir=-1` sur un cercle** — l'exemple d'origine ne contient que des cercles `dir=1` ; le
   mapping CW/CCW réel n'est pas vérifié.
2. **Point de départ non-défaut sur un cercle** — aucun exemple disponible ; SC2000 pourrait
   l'ignorer.
3. **Sens de la compensation** (retrait intérieur vs expansion extérieure) — un seul champ
   numérique signé dans le fichier, pas de flag intérieur/extérieur explicite. Réserve
   particulièrement importante depuis l'ajout de `CHFCOMP` : toute la détection auto
   extérieur/intérieur par imbrication repose sur l'hypothèse qu'une compensation positive
   signifie « agrandir » côté machine — si c'est l'inverse, **chaque objet** compensé
   automatiquement sortirait dans le sens opposé de celui voulu.
4. **Mapping du bloc `<GuideCurve Para>` (amorce)** — réserve la plus forte du plugin : reconstruit
   à partir d'un **seul** graphe de l'exemple (jamais recoupé sur plusieurs graphes, contrairement
   à tout le reste du format). Le sens des lignes angle/longueur, l'unité, la convention d'angle
   et la sémantique du flag final sont des hypothèses de bon sens, pas des faits vérifiés.

## Vérification effectuée

Aucun accès à une machine SC2000 réelle. Le format de fichier et les calculs géométriques ont
été vérifiés par un harness Node exécutant le vrai code du plugin + les vraies fonctions
géométriques du cœur (tessellation d'arcs, offsets, containment de polygones, etc.), et par des
tests en navigateur headless (Chromium + CDP) pilotant le vrai flux UI (dialogue, boutons,
raccourcis clavier, et — pour Sens/Compensation/Amorce — le fichier `.chf` réellement téléchargé
par le bouton « Exporter », pas seulement la prévisualisation). Le rendu visuel dans le
navigateur habituel de l'utilisateur, et le comportement réel face à la machine SC2000, restent
à confirmer manuellement.
