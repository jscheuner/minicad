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
- **`CHFCOMP`** — applique la valeur (signée) du champ toolbar « Compensation » telle quelle à
  tous les objets à contour fermé de la sélection — **même valeur pour tous, écrite telle quelle
  dans le fichier exporté**, aucune détection automatique extérieur/trou côté export (voir
  réserve #3 plus bas : abandonné suite à un retour terrain réel). Rien sélectionné → arme la
  boîte de sélection (Entrée pour relancer, Échap pour annuler), même mécanisme que
  `EXPLODE`/`GROUP`/`WBLOCK`. La **prévisualisation** (pointillé canvas, jamais le fichier)
  redevient sensible à l'imbrication — voir section dédiée plus bas.
- **`CHFREV`** — inverse individuellement le Sens (`_chfReverse`) de chaque objet supporté de
  la sélection (bascule chacun indépendamment, comme `MIRROR`).
- **`CHFSTART`** — pose le point de départ manuel par picking souris (2 clics : point sur le
  contour, puis vecteur longueur/angle de l'amorce). Rien sélectionné → arme la boîte de
  sélection ; un objet à contour fermé sélectionné → picking direct. Le 2ᵉ clic fixe
  `_chfLeadAngle` à partir du vecteur réellement cliqué — cette valeur est ensuite toujours
  respectée par l'aperçu telle quelle, y compris sur un contour fermé (voir « Amorce : direction
  automatique » plus bas, corrigé au 4ᵉ retour terrain).
- **`CHFSTARTAUTO`** — applique en lot la longueur/angle des champs toolbar « Amorce » tels
  quels à tous les objets sélectionnés — **même angle pour tous**, y compris cercles et
  rectangles (voir réserve #3 : la variante « pointe vers le centre du trou » testée
  initialement a été abandonnée côté export). Rien sélectionné → arme la boîte de sélection.
  Une fois appliqué, cet angle est également respecté tel quel par l'aperçu (même règle que
  `CHFSTART`) — voir « Amorce : direction automatique » plus bas.

## Prévisualisation (dessin canvas, avant export)

Affichée automatiquement dès qu'un objet a une Compensation et/ou une Amorce réglée (hook cœur
`pluginDecorateEntity`, recalculé à chaque frame — jamais désynchronisé d'une édition
ultérieure) :

- **Compensation** : contour fantôme en pointillé, décalé de la valeur **stockée** (celle tapée
  dans la barre d'outils, identique pour tous les objets — voir `CHFCOMP` plus haut), avec des
  flèches indiquant le sens de coupe réel (inversées si Sens = Inverse). Le **sens visuel** du
  décalage (agrandir vers l'extérieur / rétrécir vers l'intérieur) est en revanche choisi
  automatiquement par imbrication, pour que le fantôme corresponde à ce à quoi on s'attend en
  regardant le dessin — voir « Détection d'imbrication » ci-dessous. Cette détection ne touche
  **jamais** `_chfCompensation` lui-même ni le fichier exporté : uniquement le point de référence
  passé à `computeOffsetGeom` pour choisir le sens du fantôme.
- **Amorce** : segment pointillé du point d'entrée réel dans le contour vers le point extérieur
  (hors-pièce), flèche pointant vers l'entrée (sens réel de coupe : extérieur → entrée →
  contour), et un **repère carré + croix** au point de percée (l'extrémité extérieure, à
  l'opposé de la flèche). Sur un contour **fermé**, tant que `_chfLeadAngle` n'a **jamais** été
  fixé sur l'objet (ni par clic, ni tapé, ni via `CHFSTARTAUTO`), la **direction** du point
  extérieur est calculée automatiquement à partir de la géométrie (voir « Amorce : direction
  automatique » ci-dessous) — une simple valeur par défaut sensée, jamais une correction d'une
  valeur déjà posée. Dès que `_chfLeadAngle` a été fixé — y compris explicitement à 0, y compris
  via le picking manuel en 2 clics de `CHFSTART` — cette valeur est utilisée telle quelle, sans
  recalcul, y compris sur un contour fermé (voir réserve #3, correction du 4ᵉ retour terrain).
  Sur un contour **ouvert** (ligne, mur...), sans notion dedans/dehors, `_chfLeadAngle` pilote
  toujours directement la direction affichée, qu'il ait été fixé ou non.

## Détection d'imbrication — prévisualisation uniquement, jamais l'export

Deuxième retour terrain (2026-08-27, après le premier qui a rendu `CHFCOMP` uniforme — voir
réserve #3) : dans l'aperçu MiniCAD, une compensation positive faisait toujours grossir le
fantôme vers l'extérieur, y compris sur un trou détecté, ce qui ne correspond pas à ce à quoi
l'œil s'attend (un trou compensé doit visuellement rétrécir). Le fichier exporté restait
correct — c'est uniquement le choix du point de référence dans `decorateEntity` qui ignorait
l'imbrication. `_chfNestDepth`/`_chfRepPoint`/`_chfPointInContour`/`_chfIsHole` ont donc été
réintroduits dans le plugin, mais **cloisonnés au rendu** : `_chfApplyCompensationToSelection`
(la fonction qui écrit `_chfCompensation`) ne les appelle jamais.

- Sélecteur toolbar « Règle d'imbrication » (`data-tbid="chf-comp-mode"`) : **Alterné** (défaut)
  — parité de la profondeur (pair = extérieur, impair = trou), correct au-delà de 2 niveaux
  (anneau + moyeu plein) ; **Binaire** — extérieur seulement si profondeur 0, tout le reste
  traité comme trou. Son intitulé précise qu'il n'affecte pas la **valeur** exportée (toujours
  uniforme et positive, comme validé par `export_corrigé.chf`). ⚠ Depuis le 9ᵉ retour terrain il
  n'est plus vrai qu'il « n'affecte que l'aperçu » : le rôle extérieur/trou pilote aussi les deux
  **drapeaux entiers** écrits à l'export (rôle + côté de compensation), qui portent le sens réel
  du décalage — voir réserve #3, *neuvième retour*.
- Profondeur (`_chfNestDepth`) calculée sur **tout le dessin** (`S.entities`), pas seulement la
  sélection courante — un trou reste visuellement correct même si son contour extérieur n'est
  pas sélectionné au moment de la prévisualisation.
- Objet détecté « extérieur » : point de référence passé à `computeOffsetGeom` loin en dehors de
  sa bbox (comme avant le premier retour terrain) → le fantôme grossit avec une valeur positive.
  Objet détecté « trou » : point de référence au centre de la forme (centre du cercle, ou milieu
  de bbox sinon) → le fantôme rétrécit avec la **même** valeur positive stockée. La valeur
  elle-même ne change jamais de signe ; seul le point de référence géométrique change.

## Amorce : direction entièrement automatique (plus aucun angle saisi)

Retours terrain successifs du 2026-08-27 (captures d'écran) : le point de percée de l'amorce se
retrouvait du mauvais côté — pointant hors d'un trou détecté au lieu de vers son centre, ou, au
coin d'une plaque, produisant un segment **posé sur un bord de la pièce**. Après deux
itérations, l'utilisateur a tranché : « **enlève le choix de l'angle. c'est au plugin de trouver
la meilleure solution** ». Le champ Angle a donc été **supprimé** — toolbar (`chf-start-angle`),
panneau propriétés (mono et multi), stockage `_chfLeadAngle`, flag `_chfLeadManual`. Seule la
**longueur** (`_chfLeadLength`) reste saisissable ; la direction est recalculée à la volée par
`_chfAutoLeadAngle(e)`, **unique source de vérité pour l'aperçu comme pour l'export**. Le 2ᵉ clic
de `CHFSTART` ne sert donc plus qu'à mesurer une longueur : l'angle du vecteur cliqué est
volontairement ignoré (commentaire explicite dans la branche `chf_leadvector` du cœur).

`_chfAutoLeadAngle` = direction idéale, puis balayage anti-collision :

1. **Direction idéale** (`_chfIdealLeadAngle`) :
   - Cercle : radial depuis son propre centre — vers l'extérieur si l'objet est détecté
     extérieur, **vers le centre** s'il est détecté trou (même `_chfNestDepth`/`_chfIsHole` que
     le fantôme de compensation, donc sensible au sélecteur Alterné/Binaire).
   - Polygone : **bissectrice** des deux arêtes issues du point d'entrée, côté choisi par une
     sonde locale à 0,01 mm (`_chfPointInContour`) — dehors pour un extérieur, dedans pour un
     trou. ⚠ **Le piège central**, qui a survécu à trois itérations : `_chfOrderContourPoints[0]`
     tombe sur un **sommet** pour un rect, et sur un sommet la perpendiculaire à une arête est
     exactement **colinéaire avec l'arête voisine** — c'est-à-dire le cas nominal, pas un cas
     dégénéré. La perpendiculaire n'est correcte qu'en milieu d'arête ; sur un sommet il faut la
     bissectrice.
   - Contour **ouvert** (ligne, mur, arc partiel...) : pas de notion dedans/dehors → simple
     perpendiculaire à la tangente, le côté étant départagé par le balayage ci-dessous.
2. **Balayage anti-collision** (`_chfLeadIsClear` / `_chfAutoLeadAngle`) : le segment d'amorce est
   échantillonné de 20 % à 100 % de sa longueur et confronté à **tous** les contours du dessin
   (`_chfAllContours`, cache à double garde : purge en microtâche + comparaison identité/longueur
   du tableau `S.entities`), avec une marge `max(0,05 ; longueur × 0,15)`. Si l'idéal est bloqué,
   rotation par pas de 10° jusqu'à ±80° ; à défaut de solution propre, l'idéal est conservé.

### Point de départ automatique d'un contour EXTÉRIEUR

Demande utilisateur (2026-08-27) : *« pour les amorces extérieur j'aimerai qu'elle soit mise
plutôt en haut à gauche pour le sens anti-horaire et en bas à gauche pour le sens horaire »*.

`_chfDefaultStartPoint(e, contour)` applique une **règle unique** : le point du contour le plus
proche du coin **haut-gauche** (parcours anti-horaire) ou **bas-gauche** (parcours horaire) de sa
bbox.

- **Rect** → tombe exactement sur le coin.
- **Cercle** → sur la diagonale, 135° (CCW) / 225° (CW).
- **Polygone quelconque** → le **sommet** le plus proche, jamais un point inséré au milieu d'une
  arête : un sommet donne la bissectrice diagonale que `_chfIdealLeadAngle` sait dégager
  proprement, un point d'arête donnerait une perpendiculaire.

Le sens de parcours effectif vient de `_chfTravelCCW` = orientation intrinsèque du contour
(`_chfSignedArea`, aire signée en monde Y-haut) combinée à `_chfReverse` — la règle suit donc le
parcours réel, qu'il vienne du dessin ou du bouton **Sens**.

Deux exclusions volontaires :

- un **`_chfStartPoint` posé à la main** (clic, `CHFSTART`) reste prioritaire — régression déjà
  vécue en retour terrain, un point choisi ne doit jamais être recalculé ;
- les **trous** gardent leur comportement d'origine : la demande ne vise que l'extérieur.

Cohérent avec le fichier natif SC2000 (`laser_6mm.chf`), dont les contours à amorce activée
démarrent tous au coin haut-gauche.

### Angle exporté : relatif au sens de parcours

L'aperçu raisonne en angle **absolu monde**. Le fichier `.chf`, lui, stocke l'angle **entre le
trait d'amorce et le contour** au point d'entrée — donc relatif au sens de parcours, `90` =
amorce perpendiculaire, d'où la valeur par défaut universelle (démonstration en réserve #4) :

```
angle écrit = parcours − absolu + 180        absolu = parcours − angle + 180
```

`_chfExportLeadAngle` fait la conversion (normalisée dans `[0,360[`) et c'est elle seule que
`_chfBuildGuideCurve` écrit. ⚠ Sur un **cercle**, cette formule et la variante naïve
`absolu − parcours` coïncident toujours (`parcours − absolu` y vaut ±90°) — d'où un retour
terrain où les cercles sortaient justes et les polygones faux de ~90°. `_chfTravelTangent` diffère de
`_chfEntryTangent` sur un point volontaire : elle honore `_chfReverse` **aussi sur un cercle**
(via `_chfCircleStart(e, contour).dir`), là où le côté aperçu n'en a pas besoin.

## Barre d'outils « Export laser »

Bouton export (icône document), sélecteur de règle d'imbrication (aperçu uniquement, voir
ci-dessus), champ + bouton Compensation (CHFCOMP), bouton Sens (CHFREV), bouton point de départ
manuel (CHFSTART), champ longueur + bouton amorce auto (CHFSTARTAUTO, défaut 5 mm ; plus de
champ angle).

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
  soit sa valeur (observé 34/34 sur les fichiers réels) ; tout autre contour voit sa bbox
  élargie de `+compensation` sur chaque côté, **quel que soit son rôle** — le padding ne porte
  aucune information de sens (les deux polygones-trous du fichier corrigé du 9ᵉ retour gardent
  leur padding vers l'extérieur tout en étant compensés correctement).
- Les deux entiers qui suivent `<End Glyphs>` / ouvrent `<Crafts>` sont, eux, **porteurs du sens**
  de la compensation : `rôle` (1 = extérieur, 2 = trou) et `côté` (idem, mais toujours 1 sur un
  cercle). Voir réserve #3, *neuvième retour*.
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
   numérique signé dans le fichier, pas de flag intérieur/extérieur explicite. `CHFCOMP`/
   `CHFSTARTAUTO` calculaient auparavant ce signe et cet angle automatiquement par profondeur
   d'imbrication (extérieur = compensation positive, trou = négative + angle d'amorce recalculé
   vers le centre). Retour terrain SC2000 réel (2026-08-27, carré 100×100 + 4 trous Ø10,
   `export_corrigé.chf` redécoupé et confirmé bon par l'utilisateur) : cette détection auto
   était **fausse** — le fichier de référence validé utilise la MÊME compensation signée (0.2)
   et le MÊME angle d'amorce brut (90°, jamais recalculé) pour le contour extérieur et les 4
   trous. Les deux commandes ont donc été simplifiées en conséquence (valeur/angle toolbar
   appliqués tels quels, uniformément, à toute la sélection — c'est désormais à l'utilisateur de
   choisir le signe). Validé sur ce cas précis (un seul job, une seule machine/matière) ; à
   re-tester si le sens de coupe ou la matière change significativement.

   **Précision suite à un second retour (même jour)** : l'utilisateur a d'abord signalé que « la
   compensation se fait toujours vers l'extérieur » y compris sur les trous, ce qui semblait
   contredire la validation ci-dessus — clarifié qu'il s'agissait de l'**aperçu MiniCAD**
   (pointillé canvas), pas d'un nouveau test machine. La valeur écrite dans le fichier reste
   strictement uniforme comme validé par `export_corrigé.chf` ; seul le sens **visuel** du
   fantôme de prévisualisation a été corrigé pour redevenir sensible à l'imbrication (voir
   section « Détection d'imbrication » plus haut). Hypothèse de travail (non confirmée, non
   communiquée comme un fait) pour réconcilier les deux observations : le SC2000 résout
   probablement le sens intérieur/extérieur de la compensation par rapport au sens de parcours
   du contour (comme une compensation d'outil G41/G42), pas par le signe absolu tapé — ce qui
   expliquerait qu'une valeur uniforme suffise côté fichier tout en produisant le bon résultat
   physique des deux côtés.

   **Troisième retour (même jour)** : capture d'écran montrant, cette fois pour l'**amorce**, le
   même type de décalage aperçu/attente — un trou dont le repère de percée pointait hors de son
   propre trou, et un coin de plaque dont le segment d'amorce suivait exactement un bord au lieu
   de s'en écarter. Même traitement que pour la compensation : rien de changé côté export
   (`_chfLeadAngle`, `_chfStartAutoApply`, `_chfBuildGuideCurve` intacts), seule la direction
   affichée par `_chfLeadInGeom` sur un contour fermé est désormais calculée depuis la géométrie
   plutôt que depuis l'angle tapé — détail complet dans la section « Amorce : direction
   automatique » plus bas. Consigne explicite de l'utilisateur à cette occasion : ne toucher que
   le plugin/aperçu MiniCAD pour l'instant, le volet export sera repris séparément une fois
   l'interface jugée aboutie.

   **Quatrième retour (même jour)** : le picking manuel `CHFSTART` (2 clics souris) semblait ne
   plus tenir compte du point cliqué pour orienter l'amorce. Cause : le calcul automatique
   introduit au retour précédent s'appliquait à **tout** contour fermé sans exception, y compris
   quand l'utilisateur venait justement de fixer `_chfLeadAngle` à la main via ce picking — le
   clic était donc silencieusement écrasé. Corrigé en restreignant le calcul automatique au cas
   où `_chfLeadAngle` n'a **jamais** été fixé sur l'objet (`== null`) : dès qu'une valeur — même
   0 — a été posée par un clic, une saisie ou `CHFSTARTAUTO`, elle est désormais toujours
   respectée telle quelle dans l'aperçu, sur un contour fermé comme ouvert. Le calcul
   géométrique reste la valeur par défaut pour un objet dont l'amorce n'a jamais été configurée.
   Toujours cantonné à l'aperçu (`_chfLeadInGeom`) ; `_chfLeadAngle`, `_chfStartAutoApply` et
   `_chfBuildGuideCurve` inchangés.

   **Cinquième retour (même jour) — SUPERSÈDE les 3ᵉ et 4ᵉ ci-dessus** : le problème persistait
   (« c'est toujours le même problème »). Vraie cause enfin identifiée : sur un **sommet** de
   polygone, la perpendiculaire à une arête est colinéaire avec l'arête voisine (voir la section
   Amorce). L'utilisateur a alors levé lui-même la restriction « aperçu seulement » : « enlève le
   choix de l'angle, c'est au plugin de trouver la meilleure solution ». Champ Angle supprimé
   partout, `_chfAutoLeadAngle` devient l'unique source de vérité aperçu **et** export.

   **Sixième retour (même jour)** : côté MiniCAD validé (« ok côté minicad c'est bon, si possible
   on n'y touche plus ») ; restait un écart à la **réimportation du `.chf` dans le SC2000**, les
   amorces y apparaissant à des angles différents. Cause : l'angle du bloc est **relatif au sens
   de parcours**, pas absolu — voir réserve #4, désormais refermée. Correction confinée
   à l'export (`_chfExportLeadAngle` + `_chfTravelTangent`) ; `_chfAutoLeadAngle` et
   `_chfLeadInGeom`, donc l'aperçu, strictement inchangés comme demandé.

   **Septième retour (même jour)** : « ce n'est toujours pas bon » — dans le SC2000 le **cercle
   était juste** et **les deux rectangles faux** (~90° de rotation). La première correction
   (`absolu − parcours`) avait été calée sur un unique échantillon à 90°, valeur où 3 des 8
   conventions candidates coïncident. Formule exacte trouvée par élimination croisée (réserve #4).

   **Huitième retour (2026-08-27)** : « le sens du décalage change lors de l'export » — consigne
   explicite : *ne travailler que sur l'export, ne rien changer côté MiniCAD*. Le défaut portait
   sur le **rectangle intérieur** ; le trou **circulaire** de la même pièce, lui, sortait juste.
   La valeur `<Crafts>` n'était pas en cause (déjà uniforme +0.2, exactement comme le fichier
   validé machine). Mesure de la **bbox déclarée en en-tête vs la bbox réelle de la géométrie
   écrite**, sur les 43 graphes des trois fichiers réels :

   | fichier | graphes | padding mesuré |
   |---|---|---|
   | `laser_6mm.chf` (natif SC2000) | 30 cercles (trous) | **0** |
   | | 8 polygones (extérieurs) | **+0.25** |
   | `export_corrigé.chf` (validé machine) | 4 cercles (trous) | **0** |
   | | 1 polygone (extérieur) | **+0.2** |

   Deux règles expliquent ces 43 graphes de façon **identique** — « un cercle n'est jamais padé »
   (ce que faisait le code) et « un **trou** n'est jamais padé » — parce que dans tous les
   fichiers disponibles cercle ⇔ trou et polygone ⇔ extérieur. Elles ne divergent que sur **un
   seul cas, absent de tous les échantillons : le polygone-trou** — précisément l'objet signalé.
   Le padding avait donc été conditionné au rôle. **Hypothèse fausse, annulée au 9ᵉ retour** :
   le fichier corrigé fourni ensuite garde un padding de `+0.2` sur ses **deux polygones-trous**
   tout en coupant dans le bon sens. Le padding ne porte aucune information de sens ; il ne
   dépend que de la forme (cercle → 0, sinon `+comp`), comme le faisait le code d'origine.

   **Neuvième retour (2026-08-27) — RÉSOLU, le sens tient à deux drapeaux entiers** :
   « ce n'est toujours pas bon », avec cette fois **notre export ET le même fichier corrigé pour
   couper dans le bon sens**. Le diff fait **4 lignes** — deux champs, sur les deux
   polygones-trous. Ni la géométrie, ni la bbox, ni la valeur `<Crafts>`, ni l'amorce ne bougent :

   ```
   <End Glyphs>
   0
   2          ← rôle           (1 = extérieur, 2 = trou)   — nous écrivions 1
   <Crafts>
   2          ← côté de comp.  (1 = extérieur, 2 = trou)   — nous écrivions 1
   0.200000   ← valeur, inchangée
   ```

   Relevé sur les **48 graphes** de tous les fichiers de référence :

   | contour | rôle | côté | échantillons |
   |---|---|---|---|
   | polygone **extérieur** (CW *et* CCW) | 1 | 1 | 12 |
   | **cercle** trou | 2 | 1 | 34 |
   | **polygone trou** | 2 | **2** | 2 (les deux corrigés) |

   Le **rôle** était écrit `native === 'circle' ? 2 : 1` — rétro-ingénierie faite sur
   `laser_6mm.chf`, où les 30 trous sont **tous** des cercles et les 8 extérieurs **tous** des
   polygones : les prédicats « cercle » et « trou » y sont indiscernables. ⚠ **Troisième
   occurrence du même piège de corrélation sur ce format** (après l'angle relatif, invisible sur
   un cercle). Le fichier corrigé le tranche : un polygone-trou porte 2 → c'est le **rôle**.

   Le **côté** n'avait jamais été écrit autrement que 1. Sur un polygone il suit le rôle ; sur un
   cercle il reste 1 même pour un trou (34/34, dont les 4 trous du fichier redécoupé et validé
   machine) — la machine dérive vraisemblablement le côté du rayon, le drapeau ne servant qu'aux
   chaînes de segments. Ce n'est **pas** une corrélation cette fois : le fichier corrigé contient
   côte à côte un cercle-trou à 1 et un polygone-trou à 2.

   Le côté ne peut pas être « gauche/droite du parcours » : les 8 extérieurs de `laser_6mm.chf`
   sont 4 paires de pièces identiques en miroir (4 CW + 4 CCW) et portent **tous** 1 — une
   convention relative au parcours en compenserait la moitié vers l'intérieur.

   Vérification : en recalculant les deux drapeaux depuis notre export avec la règle implémentée,
   on retrouve le fichier corrigé **ligne à ligne, à l'identique**. Rien d'autre n'a bougé —
   `_chfAutoLeadAngle`, `_chfLeadInGeom` (aperçu), `_chfExportLeadAngle` et
   `_chfApplyCompensationToSelection` sont intacts.
4. **Mapping du bloc `<GuideCurve Para>` (amorce)** — ~~réserve la plus forte du plugin~~
   **refermée le 2026-08-27**, après le retour terrain « si j'exporte le `.chf` et
   que je le réimporte, les amorces changent d'angle » (l'aperçu MiniCAD étant lui validé
   visuellement par l'utilisateur). Analyse croisée de trois fichiers réels :

   | fichier | angles `<GuideCurve Para>` |
   |---|---|
   | `laser_6mm.chf` — produit **par le SC2000 lui-même**, 38 graphes de formes toutes différentes | **38 × 90.000000** (dont 4 avec flag 0 = amorce désactivée) |
   | `export_corrigé.chf` — corrigé main, redécoupé, **confirmé bon sur machine** | 4 × 90.000000 (trous) + 1 × 20.074123 |
   | `export.chf` — notre ancien export, mauvais à la coupe | 4 × 180.000000 + 1 × 90.000000 |

   Aucune convention d'angle **absolu** ne produit la même valeur pour 38 contours différents ;
   « amorce perpendiculaire au sens de coupe » (défaut standard des logiciels de découpe), si.
   **Ligne 2 = angle RELATIF à la direction de parcours au point d'entrée**, en degrés.

   La formule exacte a demandé une **élimination croisée** : les 8 conventions candidates
   (`±parcours ±absolu`, `+0/180`) confrontées à 4 contraintes physiques indépendantes —

   - **A.** `laser_6mm.chf` g13/18/28/33 : départ coin haut-gauche, parcours 0°, angle 90, amorce
     **activée** → doit sortir vers le haut, surtout pas longer une arête.
   - **B.** même fichier g5/9/23/38 : départ coin haut-**droit**, parcours 180°, angle 90, amorce
     **désactivée** (flag 0) → la direction auto doit y être *mauvaise*, sinon l'opérateur n'avait
     aucune raison de la couper. **C'est cette contrainte qui tue l'hypothèse « angle absolu ».**
     (Ces 8 contours forment 4 **paires** de pièces identiques, une CW une CCW : des miroirs.)
   - **C.** `export_corrigé.chf` g1 : **seul échantillon non-90° de tous les fichiers**
     (20.074123°), donc le seul qui sépare les conventions que 90° rend indistinguables — départ
     (10.2, 110.106204), parcours 270°, longueur 7.139919, plaque carrée 10.2..110.2 → le point
     d'amorçage doit tomber **hors matière**.
   - **D.** les 4 cercles du même fichier (validés machine) → amorce **vers le centre** du trou.

   Une seule convention passe les quatre :

   ```
   angle écrit = parcours − absolu + 180        absolu = parcours − angle + 180
   ```

   Sens physique : `angle` est l'angle entre le **trait d'amorce et le contour** au point d'entrée
   (90° = perpendiculaire) — d'où `90` comme défaut universel, et d'où le point d'amorçage à
   **gauche du sens de parcours** à 90°. Ça explique aussi la contrainte B : sur la copie miroir
   (parcours inversé), « à gauche » bascule dans la matière, et l'amorce a dû être désactivée.

   ⚠ Sur un **cercle**, cette formule et la variante naïve `absolu − parcours` donnent toujours le
   même résultat (`parcours − absolu` y vaut ±90°) : c'est précisément pourquoi le retour terrain
   intermédiaire montrait le cercle correct et les deux rectangles faux.

   Notre tout premier export écrivait 180 : l'angle absolu tel quel, réinterprété comme relatif
   par la machine. Corrigé par `_chfExportLeadAngle` (normalisé dans `[0,360[`) ; l'aperçu reste
   en absolu, inchangé.

   Restent des hypothèses : le **signe** de la convention relative (CCW positif — lecture qui
   colle aux données validées machine, mais un résultat en miroir se corrigerait par un seul
   signe), l'unité de la ligne 3 (mm) et la sémantique du flag final (0/1).

## Vérification effectuée

Aucun accès à une machine SC2000 réelle. Le format de fichier et les calculs géométriques ont
été vérifiés par un harness Node exécutant le vrai code du plugin + les vraies fonctions
géométriques du cœur (tessellation d'arcs, offsets, containment de polygones, etc.), et par des
tests en navigateur headless (Chromium + CDP) pilotant le vrai flux UI (dialogue, boutons,
raccourcis clavier, et — pour Sens/Compensation/Amorce — le fichier `.chf` réellement téléchargé
par le bouton « Exporter », pas seulement la prévisualisation). Le rendu visuel dans le
navigateur habituel de l'utilisateur, et le comportement réel face à la machine SC2000, restent
à confirmer manuellement.
