# CHANGELOG — MiniCAD

Format : `[version] — YYYY-MM-DD — Description`

---

## [0.1] — 2026-06-16 — Version courante

### Corrigé
- **Amorce : l'angle exporté dans le `.chf` est RELATIF au sens de parcours, pas absolu** —
  retour terrain (2026-08-27, captures MiniCAD + SC2000) : *« ok côté minicad c'est bon, si
  possible on n'y touche plus. par contre si j'exporte le chf et que je l'importe les amorces
  changent d'angle »*. L'aperçu était donc juste, seul le fichier était mal interprété par la
  machine. **Preuve croisée sur trois fichiers réels** : `laser_6mm.chf`, produit **par le
  SC2000 lui-même**, écrit `90.000000` sur ses **38** graphes de formes toutes différentes —
  aucune convention d'angle *absolu* ne peut produire une valeur unique pour 38 contours
  différents, alors que « amorce perpendiculaire au sens de coupe » (défaut standard des
  logiciels de découpe), si ; `export_corrigé.chf`, corrigé main, redécoupé et **confirmé bon
  sur machine**, écrit lui aussi `90.000000` sur ses 4 trous ; notre ancien `export.chf`,
  mauvais à la coupe, écrivait `180.000000` — c'est-à-dire l'angle absolu tel quel, réinterprété
  comme relatif par la machine.

  **Formule exacte, établie par élimination croisée** (une première correction,
  `absolu − parcours`, calée sur un seul échantillon à 90°, était encore fausse : retour terrain
  *« ce n'est toujours pas bon »*, cercle correct mais **les deux rectangles faux** dans le
  SC2000). Les 8 conventions candidates (`±parcours ±absolu`, `+0/180`) ont été confrontées à
  4 contraintes physiques indépendantes tirées des fichiers réels :
  **(A)** `laser_6mm.chf` g13/18/28/33, départ coin haut-gauche, parcours 0°, angle 90, amorce
  **activée** → doit sortir vers le haut sans longer d'arête ;
  **(B)** même fichier g5/9/23/38, départ coin haut-**droit**, parcours 180°, angle 90, amorce
  **désactivée** (flag 0) → la direction auto doit y être *mauvaise*, sinon l'opérateur n'avait
  aucune raison de la couper — **c'est cette contrainte qui élimine l'hypothèse « angle absolu »** ;
  **(C)** `export_corrigé.chf` g1, **seul échantillon non-90° de tous les fichiers** (20.074123°),
  donc le seul qui sépare les conventions que 90° rend indistinguables → point d'amorçage hors
  matière ; **(D)** les 4 cercles du même fichier (validés machine) → amorce vers le centre.
  Une seule convention passe les quatre :

  > **angle écrit = parcours − absolu + 180**  (donc `absolu = parcours − angle + 180`)

  Sens physique enfin limpide : `angle` est l'angle **entre le trait d'amorce et le contour** au
  point d'entrée (90° = amorce perpendiculaire) — d'où `90` comme défaut universel, et d'où le
  point d'amorçage à **gauche du sens de parcours** à 90°. Ça explique aussi (B) : les 8 contours
  de `laser_6mm.chf` forment **4 paires de pièces identiques, une CW une CCW** (copies miroir) ;
  sur la copie au parcours inversé, « à gauche » bascule dans la matière et l'amorce a dû être
  désactivée. ⚠ **Sur un CERCLE l'ancienne formule et la nouvelle donnent toujours le même
  résultat** (`parcours − absolu` y vaut toujours ±90°) : c'est exactement pourquoi le retour
  terrain montrait le cercle juste et les deux rectangles faux.

  Corrigé dans **`_chfExportLeadAngle`** (normalisé dans `[0,360[`), seule valeur écrite par
  `_chfBuildGuideCurve`. `_chfTravelTangent` honore `_chfReverse` **y compris sur un cercle**
  (via `_chfCircleStart().dir`), contrairement au `_chfEntryTangent` de l'aperçu qui n'en a pas
  besoin. **L'aperçu MiniCAD est strictement inchangé** (`_chfAutoLeadAngle` et `_chfLeadInGeom`
  non touchés), comme demandé. Referme la réserve #4 du plugin (mapping du bloc
  `<GuideCurve Para>`). Vérifié en headless : 159/159, dont l'invariant aller-retour
  « parcours − angle écrit + 180 == direction absolue prévisualisée » sur cercle, cercle inversé
  et coin de polygone. ⚠ Reste une hypothèse : le **signe** de la convention (CCW positif —
  lecture qui colle aux données validées machine) ; un résultat en miroir se corrigerait par un
  seul signe. À valider sur chute.
- **Amorce : le choix de l'angle est supprimé, la direction est entièrement calculée par le
  plugin** — retour terrain (2 captures d'écran successives, 2026-08-27) : *« les amorces
  intérieur (trous) doivent aller en direction du centre. et dans tout les cas l'amorce ne
  doit pas être par dessus un trait de la pièce. enlève le choix de l'angle. c'est au plugin
  de trouver la meilleure solution »*. Une première tentative gardait l'angle saisi et ne
  corrigeait que l'aperçu via un flag `_chfLeadManual` : insuffisante, car le défaut était
  géométrique. **Cause racine** : sur un COIN de polygone, la perpendiculaire à une arête est
  exactement colinéaire avec l'arête voisine — l'amorce se posait donc dans le prolongement
  d'un trait de la pièce. Corrigé en distinguant sommet (→ **bissectrice extérieure** des 2
  arêtes, jamais alignée avec aucune des deux) et milieu d'arête (→ perpendiculaire), plus un
  **contrôle anti-collision** qui échantillonne le segment d'amorce contre tous les contours
  du dessin et pivote par pas de 10° (±80°) jusqu'à trouver une direction dégagée.
  **Suppressions** : champ Angle de la barre d'outils (`chf-start-angle`), champ Angle du
  panneau propriétés (simple et multi), `_chfPropLeadAngleMulti`, flag `_chfLeadManual`. Le
  picking 2-clics `CHFSTART` ne fixe plus que la longueur ; `CHFSTARTAUTO` n'applique plus que
  la longueur. Le panneau propriétés affiche la direction calculée en lecture seule.
  **`_chfAutoLeadAngle` est désormais la seule source de vérité**, consommée à la fois par
  l'aperçu (`_chfLeadInGeom`) et par l'export (`_chfBuildGuideCurve`) : l'aperçu ne peut plus
  diverger du fichier, et un objet déplacé après coup exporte une amorce cohérente avec sa
  position réelle. Contours ouverts (ligne, mur) : perpendiculaire à l'extrémité, côté
  départagé par le contrôle anti-collision. Perf : liste des contours résolue une seule fois
  par frame (cache microtask + garde d'identité du tableau `S.entities`). Vérifié en
  headless : 153/153. ⚠ **Change l'angle réellement exporté** (le champ saisi n'existe plus) :
  à re-tester sur chute avant une pièce définitive.
- **CHFCOMP/CHFSTARTAUTO : détection auto extérieur/trou par imbrication abandonnée — valeur et
  angle toolbar désormais appliqués uniformément à toute la sélection** — retour terrain réel
  sur SC2000 (2026-08-27) : l'utilisateur a exporté `export.chf`, découpé sur la machine, et
  signalé deux écarts : *« le décalage contre l'intérieur des trous n'était pas sur l'export »*
  et *« le sens des amorces ne correspond pas au dessin, l'angle a l'air de changer »*. Un
  premier correctif avait élargi le calcul de profondeur d'imbrication (`_chfNestDepth`) de la
  sélection seule à tout le dessin (`S.entities`) — insuffisant : il supposait la détection auto
  extérieur/trou globalement correcte, seulement mal comparée.

  Comparaison fine du fichier que l'utilisateur a corrigé à la main, **redécoupé sur le SC2000
  et confirmé bon** (`export_corrigé.chf`), contre `export.chf` : le fichier validé utilise la
  MÊME compensation signée (0.2) et le MÊME angle d'amorce brut (90°, jamais recalculé) pour le
  carré extérieur ET ses 4 trous — la détection auto elle-même (pas seulement sa portée) était
  fausse. `CHFCOMP` et `CHFSTARTAUTO` ont donc été simplifiées : chacune applique désormais la
  valeur/l'angle tel que tapé dans la barre d'outils, **de façon uniforme, à tous les objets de
  la sélection**, sans aucune tentative de détection extérieur/trou — c'est à l'utilisateur de
  choisir le signe/l'angle. Suppression complète du code devenu mort : `_chfNestDepth`,
  `_chfRepPoint`, `_chfPointInContour`, `_chfHoleCenter`, et le sélecteur toolbar Alterné/
  Binaire (`chf-comp-mode`, plus aucun signe à choisir automatiquement).

  Vérifié par la réécriture des tests headless qui validaient l'ancienne détection auto
  (désormais : même valeur/angle appliqué quel que soit le niveau d'imbrication, y compris une
  valeur négative, y compris à 3 niveaux) — 123/123 au total. **Non revérifié sur machine pour
  ce changement précis** au-delà d'`export_corrigé.chf`, déjà redécoupé et validé par
  l'utilisateur avant même le correctif (c'est cette validation qui l'a motivé) ; la réserve sur
  le mapping exact du bloc `<GuideCurve Para>` reste ouverte (voir `src/plugins/chf_export.md`,
  réserve #4) — le retour terrain confirme la valeur d'angle appliquée mais pas la sémantique
  complète du bloc côté SC2000. Détail complet dans `src/plugins/chf_export.md` (réserve #3).

- **CHFCOMP : sens de l'aperçu pointillé de nouveau sensible à l'imbrication (extérieur/trou) —
  la valeur écrite dans le fichier exporté reste, elle, strictement uniforme** — même jour
  (2026-08-27), suite immédiate du correctif ci-dessus : l'utilisateur a signalé que « la
  compensation se fait toujours vers l'extérieur » même sur les trous. Question posée avant
  d'agir vu l'enjeu matière/machine : s'agit-il de l'aperçu MiniCAD ou d'un nouveau test machine
  contredisant `export_corrigé.chf` ? Réponse : **l'aperçu MiniCAD uniquement** — le fichier
  exporté n'a pas été remis en cause.

  `_chfNestDepth`/`_chfRepPoint`/`_chfPointInContour`/`_chfIsHole` et le sélecteur toolbar
  Alterné/Binaire (`chf-comp-mode`) sont donc réintroduits, mais **cloisonnés au rendu** :
  `decorateEntity` choisit désormais un point de référence différent pour `computeOffsetGeom`
  selon la profondeur d'imbrication détectée (loin à l'extérieur de la bbox pour un contour
  extérieur → le fantôme grossit ; centre de la forme pour un trou détecté → le fantôme rétrécit
  avec la **même** valeur stockée). `_chfApplyCompensationToSelection` (celle qui écrit
  `_chfCompensation`, appelée par `CHFCOMP`) n'appelle jamais ces helpers — le fichier exporté
  continue d'utiliser la même valeur uniforme qu'`export_corrigé.chf`, validée sur machine.
  `_chfNestDepth` reste calculée sur tout `S.entities` (pas seulement la sélection), comme le
  premier correctif l'avait déjà corrigé.

  Vérifié headless : 136/136 (13 nouveaux tests, dont un scénario carré + 4 trous répliquant
  exactement le cas terrain — même valeur exportée sur les 5 objets, fantôme carré qui grossit,
  fantôme de trou qui rétrécit). Réserve #3 de `src/plugins/chf_export.md` mise à jour avec une
  hypothèse de travail non confirmée pour réconcilier « valeur uniforme dans le fichier » et
  « bon sens physique des deux côtés » (compensation résolue par le SC2000 relativement au sens
  de parcours du contour, pas au signe absolu).

- **Amorce : direction de l'aperçu calculée automatiquement sur contour fermé — `_chfLeadAngle`
  et l'export restent inchangés** — même jour (2026-08-27), troisième retour (capture d'écran) :
  le repère de percée d'un trou pointait hors de ce trou au lieu de vers son centre, et au coin
  d'une plaque le segment d'amorce suivait exactement un bord au lieu de s'en écarter. L'angle
  brut du champ « Angle amorce » (`_chfLeadAngle`), jusque-là utilisé tel quel par la
  prévisualisation quelle que soit la géométrie réelle, pouvait par coïncidence numérique tomber
  aligné sur un bord ou pointer vers l'extérieur d'un trou.

  `_chfLeadInGeom` calcule désormais la direction du point extérieur automatiquement sur tout
  contour **fermé** (cercle ou polygone/polyligne/spline/ellipse fermé), via une nouvelle
  fonction `_chfEntryOutwardAngle` : tangente au contour au point d'entrée (`_chfEntryTangent`),
  les deux perpendiculaires à cette tangente départagées par une sonde locale à 0,01 mm
  (`_chfPointInContour`) plutôt que par une convention de signe — extérieur détecté → sonde côté
  hors-contour ; trou détecté → sonde côté dans-le-contour, direction plonge vers son propre
  centre. Même classification `_chfNestDepth`/`_chfIsHole` que le fantôme de compensation
  ci-dessus, donc même sélecteur toolbar Alterné/Binaire. Sur un contour **ouvert** (ligne,
  mur...), sans notion dedans/dehors, `_chfLeadAngle` continue de piloter la direction affichée,
  inchangé.

  Consigne explicite de l'utilisateur : ne toucher que le plugin/aperçu pour l'instant, l'export
  sera repris séparément une fois l'interface aboutie. En conséquence, `_chfLeadAngle` lui-même
  (stockage, panneau propriétés, champs toolbar `CHFSTARTAUTO`), `_chfStartAutoApply` et
  `_chfBuildGuideCurve` (export du bloc `<GuideCurve Para>`) restent strictement inchangés — un
  objet à contour fermé peut donc temporairement afficher un aperçu dont la direction diverge de
  l'angle réellement exporté ; attendu tant que le volet export n'a pas été revu à son tour.
  L'utilisateur a évoqué, en le nuançant, l'idée de retirer à terme le champ Angle amorce —
  non tranché, champ/UI laissés intacts.

  Vérifié headless : 144/144 (8 nouveaux tests couvrant cercle/rectangle × extérieur/trou ×
  indépendance à la valeur stockée, plus un test de non-régression sur contour ouvert). Détail
  complet dans `src/plugins/chf_export.md` (section « Amorce : direction automatique » + réserve
  #3, précision « Troisième retour »).

- **Amorce : le picking manuel `CHFSTART` (2ᵉ clic) était écrasé par le calcul automatique
  ci-dessus** — même jour (2026-08-27), quatrième retour : le 2ᵉ clic du picking manuel
  (point sur le contour, puis vecteur longueur/angle) semblait n'avoir aucun effet sur un
  contour fermé. Cause : le correctif précédent faisait ignorer `_chfLeadAngle` sur **tout**
  contour fermé sans exception, y compris quand l'utilisateur venait justement de le fixer à la
  main via ce clic (`chf_leadvector`, `src/minicad.html` ~L11240, qui pose l'angle réel depuis
  le vecteur cliqué).

  `_chfLeadInGeom` n'invoque désormais `_chfEntryOutwardAngle` que si `_chfLeadAngle` n'a
  **jamais** été fixé sur l'objet (`e._chfLeadAngle == null`) — le calcul automatique redevient
  une valeur par défaut, jamais une correction silencieuse d'une valeur déjà posée. Dès qu'une
  valeur — même 0 — a été écrite par un clic (`CHFSTART`), une saisie (panneau propriétés) ou
  `CHFSTARTAUTO`, elle est désormais toujours respectée telle quelle par l'aperçu, sur un
  contour fermé comme ouvert. `_chfLeadAngle`, `_chfStartAutoApply` et `_chfBuildGuideCurve`
  (export) restent inchangés — un seul changement d'une ligne dans `_chfLeadInGeom`.

  Vérifié headless : 145/145 (Test 44 étendu avec 3 nouveaux cas de non-régression prouvant
  qu'une valeur explicitement posée — clic simulé à 60°, 0°, 200° — est honorée telle quelle sur
  cercle extérieur, trou et coin de rectangle, plutôt que redirigée vers le résultat auto).

### Ajouté
- **`CHFSTART` interactif + `CHFSTARTAUTO`** — `CHFSTART` sait désormais s'adapter à l'état
  de la sélection au lieu d'exiger un objet déjà sélectionné : rien sélectionné → arme la
  boîte de sélection (même patron `S._chfStartPending`/`Entrée`/`Échap` que `CHFCOMP`) ; un
  objet valide sélectionné → le picking du point de départ (1 clic) enchaîne désormais
  automatiquement sur un 2ᵉ clic qui trace longueur et angle de l'amorce directement à la
  souris (nouvel outil `chf_leadvector`), sans repasser par le panneau propriétés.

  Nouvelle commande **`CHFSTARTAUTO`** (+ bouton toolbar dédié) : applique en lot la
  longueur/l'angle d'amorce à toute la sélection sans aucun clic sur le dessin, à partir de
  deux nouveaux champs numériques dans la barre Export laser (`chf-start-length` /
  `chf-start-angle`, **défauts 5 mm / 90°** comme demandé). Ne pose pas de point de départ
  explicite sur les objets : seuls `_chfLeadLength`/`_chfLeadAngle` sont réglés, le point
  d'entrée réel sur le contour reste calculé automatiquement à l'export (`_chfEntryPoint`) —
  cohérent avec le mode "Auto (défaut)" déjà affiché dans le panneau propriétés quand aucun
  point n'est fixé manuellement.

  **Bug découvert et corrigé en cours de session, indépendant de la fonctionnalité mais
  révélé par elle** : `cmdInput` a son propre gestionnaire `keydown` local (Entrée = exécute
  la commande tapée, Échap = annule l'état en cours), qui s'exécute **avant** le gestionnaire
  global `document` puisque `cmdInput` a le focus la plupart du temps (`smartFocus()` le
  refocalise après quasi chaque clic). Les nouveaux états (`chf_leadvector`, `chf_startpoint`,
  `_chfStartPending`, `_chfStartAutoPending`) n'étant listés que côté gestionnaire global,
  Échap tombait dans le bloc générique du gestionnaire local (`setTool('select')` sans purger
  les variables de picking) avant même d'atteindre le bon handler — un premier correctif
  ajouté uniquement côté global semblait fonctionner (28/28 sur une suite de tests basée sur
  des appels directs) mais échouait silencieusement avec de vrais événements clavier. Corrigé
  en ajoutant aussi les 4 cas dans la chaîne du gestionnaire local de `cmdInput`, même patron
  que les états préexistants (`copyPending`, `offsetAwaitDist`, `fillet`...) à cet endroit.

  Vérifié par 28 assertions d'état (appels directs) **plus 4 scénarios rejoués avec de vrais
  événements souris/clavier simulés via CDP** (clic réel aux coordonnées écran calculées,
  vrais `keyDown`/`keyUp`) — ce second passage, plus coûteux mais plus fidèle à un usage réel,
  est ce qui a révélé le bug ci-dessus après que la suite basée sur des appels directs soit
  passée au vert. Vérification visuelle par capture d'écran (toolbar : champs et bouton
  rendus correctement, valeurs par défaut et tooltips corrects). Non testé sur machine SC2000
  réelle (réserve déjà connue sur le bloc `<GuideCurve Para>`, voir l'entrée `CHFSTART`
  ci-dessous, inchangée).

- **Amorce : repère visuel + détection auto trou/extérieur pour `CHFSTARTAUTO`** —
  la prévisualisation en pointillé de l'amorce (`_chfDrawLeadInPreview`) affiche désormais
  un repère carré+croix au point de percée hors-pièce (l'extrémité du segment opposée à la
  flèche, qui elle pointe vers l'entrée dans le contour), en trait plein pour rester lisible
  même superposé à la ligne pointillée.

  `CHFSTARTAUTO` détecte maintenant si chaque objet rond ou rectangulaire de la sélection est
  un **trou** (contour imbriqué) ou le **bord extérieur**, en réutilisant tel quel le mécanisme
  de profondeur d'imbrication déjà écrit pour `CHFCOMP` (`_chfNestDepth`/`_chfRepPoint`/
  `_chfPointInContour`) — et le même sélecteur toolbar Alterné/Binaire (`chf-comp-mode`,
  désormais partagé entre les deux fonctions, tooltip mis à jour en conséquence). Un objet
  détecté trou ignore l'angle réglé dans le champ toolbar et pointe automatiquement son amorce
  vers son propre centre (perce dans la zone rebut plutôt que dans la matière conservée) ; un
  objet extérieur, ou d'un type autre que cercle/rect (pas de notion de centre non ambiguë),
  garde l'angle toolbar comme avant. Le message de confirmation dans le terminal distingue les
  deux cas (nombre de trous détectés vs angle uniforme appliqué).

  Vérifié par un test headless dédié (5 objets : rect extérieur, trou rond, îlot rond imbriqué
  deux fois — pair en Alterné donc traité comme extérieur, impair en Binaire donc traité comme
  trou —, trou rectangulaire, et une ligne en contour ouvert qui doit rester insensible à toute
  cette logique) : angles obtenus conformes au calcul manuel dans les deux modes, plus
  vérification visuelle par capture d'écran (recadrée) confirmant le rendu net du repère
  carré+croix et le sens correct des flèches vers le centre des deux trous.

- **`CHFSTART` — Amorce de départ (départ hors-pièce) dans la barre Export laser** —
  nouveaux champs par objet `_chfLeadLength` (mm, défaut 0 = désactivé) et
  `_chfLeadAngle` (°, monde absolu, 0°=+X, CCW+), réglables via deux nouvelles lignes
  numériques du panneau Propriétés (mono-sélection : `inp('_chfLeadLength', …)` /
  `inp('_chfLeadAngle', …)`, zéro câblage cœur nouveau — le mécanisme générique
  `_propChange` gère déjà n'importe quel nom de champ ; multi-sélection : nouvelles
  fonctions `window._chfPropLeadLengthMulti`/`_chfPropLeadAngleMulti`, même patron que
  `_chfPropCompensationMulti`). Nouveau bouton toolbar (`data-tbid="chf-start-pick"`,
  commande `CHFSTART`) qui raccourcit vers le mécanisme de picking manuel du point de
  départ déjà existant (`window._chfPickStartPoint`, jusque-là accessible seulement
  via le bouton ⌖ du panneau propriétés d'un objet déjà sélectionné) — exige
  exactement un objet sélectionné, à contour fermé supporté (`_chfSupportsStartPoint`).

  Prévisualisation en pointillé (`_chfDrawLeadInPreview`, branchée dans
  `decorateEntity`) : segment du point d'entrée réel du contour (calculé par
  `_chfEntryPoint`, qui réutilise tel quel `_chfCircleStart`/`_chfOrderContourPoints`
  — déjà la source de vérité utilisée par l'export, donc la prévisualisation ne peut
  pas diverger de ce qui sera effectivement exporté) vers un point extérieur décalé de
  `_chfLeadLength` à `_chfLeadAngle`, avec flèche pointant vers l'entrée (sens réel de
  coupe : extérieur → entrée → contour). `decorateEntity` restructuré : le fantôme de
  compensation et l'amorce sont maintenant deux blocs indépendants (chacun gated sur
  son propre champ) plutôt qu'un seul early-return sur `_chfCompensation`, pour
  qu'ils puissent coexister sur le même objet.

  Câblage export : le bloc `<GuideCurve Para>` du fichier `.chf` (jusqu'ici recopié
  verbatim et constant pour tous les graphes, jamais exploré — hors-périmètre de la
  session de rétro-ingénierie initiale) est désormais construit dynamiquement par
  `_chfBuildGuideCurve(e)` à partir de `_chfLeadLength`/`_chfLeadAngle` (longueur 0 →
  reproduit exactement l'ancien bloc constant, comportement par défaut inchangé).
  **RÉSERVE FORTE, plus incertaine que les 3 autres réserves déjà connues du plugin**
  (celles-ci recoupées sur les 38 graphes de l'exemple fourni) : le mapping des 5
  champs du bloc (ligne 2 = angle°, ligne 3 = longueur mm, ligne 5 = flag actif 0/1)
  repose sur un **seul point de donnée** (`1 / 90.000000 / 4.000000 / 1.000000 / 0`,
  un seul graphe de l'exemple d'origine, fichier `laser_6mm.chf` non ré-examinable
  cette session) — jamais recoupé contre plusieurs graphes ni contre une machine
  réelle. **À tester en priorité sur une chute avant toute pièce définitive**, plus
  encore que les autres réserves du plugin.

  Vérifié par harness Node headless (34 nouveaux cas, **118/118** au total) :
  géométrie de l'amorce (point d'entrée = source de vérité de l'export, décalage par
  longueur/angle, y compris rotation de direction avec l'angle), non-tracé quand
  `_chfLeadLength` est nul, coexistence indépendante fantôme-compensation/amorce
  (0/1/1/2 flèches selon les combinaisons), garde-fous `CHFSTART` (0, 2+ sélectionnés,
  type non supporté → avertissement sans effet ; 1 objet valide → picking armé),
  multi-sélection (`_chfPropLeadLengthMulti`/`_chfPropLeadAngleMulti`, y compris NaN
  ignoré), et bout-en-bout sur `chfBuildFileContent` (bloc `<GuideCurve Para>`
  correctement encadré par `<PWM Control>`/`<coolPos Para>` dans le fichier final, cas
  désactivé et activé). `node --check` OK sur les deux copies du plugin. **Non
  vérifié en navigateur réel** (blocage `file://` MCP inchangé) : seuls le calcul
  géométrique et la grammaire de sortie sont couverts, ni le rendu visuel ni le
  comportement réel de la machine SC2000 face au bloc `<GuideCurve Para>`.
- **`CHFCOMP` — Compensation auto (extérieur/intérieur) dans la barre Export laser** —
  applique en un clic un décalage signé (`_chfCompensation`) à toute une sélection
  d'objets : on règle une magnitude (mm) dans un nouveau champ toolbar puis on
  applique — le sens (agrandir vers l'extérieur / rétrécir vers l'intérieur) est
  déterminé automatiquement par la profondeur d'imbrication au sein de la sélection
  (nombre d'autres contours sélectionnés qui contiennent le point représentatif de
  l'objet — cercle : test de distance ; sinon `pointInPolygon`). Deux règles au choix
  via un nouveau sélecteur toolbar (`data-tbid="chf-comp-mode"`, "Alterné" par défaut)
  — proposées toutes les deux plutôt qu'une seule tranchée d'office, à la demande de
  l'utilisateur : **Alterné** (parité pair/impair, correct dès 3 niveaux d'imbrication,
  ex. anneau + moyeu plein) vs **Binaire** (extérieur seulement si non imbriqué du
  tout — diverge de Alterné dès le 3ᵉ niveau). Contours ouverts (ligne, mur, polyligne
  non fermée...) ignorés, comptés dans le message terminal. Ré-exécuter la commande
  **remplace** la compensation existante, jamais de cumul. `_chfCompensation` devient
  une valeur signée (positif = extérieur, négatif = intérieur) — réinterprétation
  non-cassante, l'export (`_chfBuildGraph`) traitait déjà ce champ comme signé, aucun
  changement requis côté grammaire `.chf`.

  Prévisualisation en pointillé du contour compensé (nouveau handler
  `decorateEntity`), recalculée à chaque rendu depuis la géométrie courante — jamais
  stockée, reste donc automatiquement synchrone après un déplacement/rotation/échelle
  — en réutilisant `computeOffsetGeom` déjà existant : point de référence fixé loin à
  l'extérieur de la bbox de l'objet, ce qui fait toujours résoudre le signe interne de
  `computeOffsetGeom` à +1, donc le signe de `_chfCompensation` seul pilote
  agrandir/rétrécir sans écrire de nouvelle géométrie d'offset.

  Nouveau hook cœur additif **`pluginDecorateEntity(e, ctx)`**, branché aux deux
  points d'appel `drawEntity()` existants (couche statique `_drawStaticLayer` et
  couche dynamique `_drawDynamicLayer`, car les entités sélectionnées sont exclues de
  la couche statique). Contrairement à `pluginExtraPropsHandler` (un seul gagnant par
  type), appelle TOUS les plugins ayant un handler `decorateEntity` — chacun décide en
  interne s'il a quelque chose à dessiner pour l'entité. `ctx` passé en paramètre
  explicite (jamais lu comme variable globale : `ctx`/`TC` sont des `let` de portée
  module, invisibles depuis un plugin chargé via `new Function()`). Réutilisable par
  tout futur plugin voulant superposer un rendu additif sur les entités existantes.

  Vérifié par harness Node headless (prolongement de celui de `chf_export`, 66/66
  checks dont 19 nouveaux, code réel du plugin + fonctions géométriques réelles du
  cœur) : divergence Alterné/Binaire reproduite sur un cas à 3 niveaux d'imbrication
  (anneau + moyeu), contour ouvert ignoré avec décompte correct dans le message,
  remplacement idempotent (ré-exécution avec une nouvelle magnitude, pas de cumul),
  signe du fantôme de prévisualisation (rayon +mag/-mag), et imbrication via
  `pointInPolygon` vérifiée sur des rectangles (pas seulement le raccourci cercle
  natif). **Réserve inchangée** (déjà signalée pour `chf_export`) : le sens réel
  attendu par SC2000 pour le champ de compensation (intérieur vs extérieur) n'est
  confirmé par aucun exemple disponible — recommandé de tester sur une chute avant
  toute pièce définitive.

  Lancer `CHFCOMP` sans sélection active **arme désormais la boîte de sélection**
  (fenêtre/croisement/clic) au lieu de simplement avertir sans rien faire — nouveau
  flag `S._chfCompPending` calqué sur le patron déjà utilisé par `EXPLODE`/`GROUP`/
  `UNGROUP`/`WBLOCK` (`S.xPending` + `setTool('select')`, curseur en mode `'pick'`
  tant que la sélection est en cours, **Entrée** ré-exécute `CHFCOMP` avec la
  sélection faite, **Échap** annule) : 4 points d'ancrage dans `src/minicad.html`
  (curseur `~L9900`, purge à changement d'outil `~L14104`, gestionnaires Entrée/Échap
  `~L17597` et `~L17701`) plus le nouveau garde en tête de
  `_chfApplyCompensationToSelection()` côté plugin. Vérifié par harness (2 nouveaux
  cas, 72/72 au total) : le flag s'arme et se désarme correctement, `setTool`/le
  message d'avertissement sont bien déclenchés, et la compensation s'applique
  normalement une fois la sélection faite. Le câblage cœur (curseur/Entrée/Échap/
  purge) suit à l'identique un mécanisme déjà éprouvé ailleurs dans le fichier —
  non retesté séparément en harness, seule la logique côté plugin (nouvelle) l'est.

  Fantôme de compensation : **flèches de sens de coupe** le long du pointillé
  (nouvelles fonctions `_chfArrowSamples`/`_chfDrawDirArrow`/`_chfDrawDirectionArrows`,
  appelées depuis `decorateEntity` juste après `drawEntity(ghost)`) — 3 flèches
  réparties sur un contour fermé (cercle : 3 angles à 120° ; polygone/polyligne :
  3 points échantillonnés par index, tangente = segment vers le point suivant),
  jusqu'à 2 sur un contour ouvert. Sens piloté par `e._chfReverse` (case "Inverse"
  du panneau propriétés) : la tangente est basculée de π avant tracé. Réutilise
  `drawArrowHead` et `w2s` du cœur, accessibles depuis un plugin car `function`-
  déclarées (contrairement à `ctx`/`canvasW`/`canvasH`, des `let` de portée module
  — mais résolubles quand même à l'appel, ces fonctions cœur s'exécutant dans leur
  propre closure, celle où ces variables sont visibles). Aucune conversion
  monde→écran ambiante sur le canvas (confirmé via `drawGrips`, qui appelle
  explicitement `w2s()` avant tout `ctx.fillRect` en pixels) : chaque point
  d'ancrage de flèche passe donc lui aussi par `w2s()` avant tracé.

  Vérifié par harness Node headless (2 nouveaux cas, 78/78 au total) : sur cercle
  et sur rectangle (deux chemins de code distincts dans `_chfArrowSamples`), le
  nombre de flèches tracées et surtout — la propriété qui compte vraiment pour la
  fonctionnalité demandée — l'inversion exacte de π de l'angle de chaque flèche
  quand `_chfReverse` bascule. Un angle absolu de référence (échantillon 0 du
  cercle) vérifié à la main en plus. **Non vérifié en navigateur réel** (blocage
  `file://` du connecteur MCP inchangé cette session) : seul le calcul angle/
  position est couvert, pas le rendu visuel (lisibilité, taille, chevauchement sur
  petits contours) — à contrôler visuellement dès que possible.

  **`CHFREV` — icône toolbar pour inverser le sens de coupe** — nouveau bouton dans
  la barre Export laser (`data-tbid="chf-rev-toggle"`, icône double-flèche) qui
  bascule `_chfReverse` de chaque objet supporté de la sélection **individuellement**
  (chacun inverse son propre état courant — comme `MIRROR` bascule chaque objet
  indépendamment — contrairement au select "Sens" du panneau propriétés en mode
  multi-sélection, qui force tous les objets à une même valeur choisie). Types non
  supportés dans la sélection ignorés silencieusement (comptés hors du message).
  Aucune sélection : avertit sans rien faire (pas d'armement de boîte de sélection
  comme `CHFCOMP` — non demandé pour cet outil, comportement par défaut le plus
  courant du cœur). Vérifié par harness Node headless (6 nouveaux cas, **84/84** au
  total) : bascule individuelle vraie/faux sur deux objets aux états initiaux
  opposés, type non supporté laissé intact, décompte correct dans le message,
  sélection vide → avertissement sans effet. `node --check` OK sur les deux copies
  du plugin. **Non vérifié en navigateur réel** (blocage `file://` MCP inchangé).
- **Nouveau plugin `chf_export` — export `.chf` pour découpe laser SC2000** —
  nouvelle commande `EXPORTCHF` (alias `ECHF`) qui exporte tout ou partie du
  dessin (sélection ou dessin entier, blocs `insert` aplatis récursivement,
  profondeur max 5) vers le format `.chf` lu par le logiciel de pilotage
  laser SC2000 (Au3Tech). Format rétro-ingénierié à partir d'un fichier
  d'exemple fourni par l'utilisateur (aucune documentation publique
  disponible) : grammaire de graphes/Gly, règle de chaînage (`dir` de
  parcours), élargissement de bbox par la compensation — tout validé à la
  main contre l'exemple avant implémentation. Trois réglages par objet dans
  le panneau Propriétés (types supportés : ligne, mur, rectangle, cercle,
  arc, polyligne, câble, spline, ellipse) :
  - **Sens** — normal/inversé, select dédié (mono et multi-sélection).
  - **Compensation (mm)** — jeu de coupe/largeur de trait, appliqué à la
    bbox déclarée du graphe (pas aux points stockés) pour les contours
    non-cercle, fidèle au comportement observé sur l'exemple.
  - **Point de départ** — bouton "cliquer sur le contour" (nouvel outil
    `chf_startpoint`, branché dans `handleClick`/Échap comme le point de
    base de `WBLOCK`), proposé uniquement sur les contours fermés (rect,
    cercle, arc/ellipse pleins, polyligne/câble/spline fermé(e)s), avec
    réinitialisation possible vers le défaut auto. Le point est toujours
    re-projeté sur la géométrie courante à l'export (résiste à un
    déplacement/redimensionnement ultérieur de l'objet) et reste fixe sous
    inversion du Sens — seule la direction de parcours change.

  Résolution de contour unifiée (`_chfResolveContour`), partagée par le
  picking et l'algorithme d'export pour garantir leur cohérence géométrique
  — comble au passage un manque de `getEntitySegments` (aucun cas
  cercle/arc, pas de tessellation des bulges polyligne/câble).

  Nouveau hook cœur additif **`pluginExtraPropsHandler(type)` /
  `pluginExtraPropsHandlerMulti(type)`** (à côté de `pluginPropsHandler`,
  inchangé) : contrairement à ce dernier qui *remplace* tout le rendu
  Propriétés d'un type, celui-ci *ajoute* du HTML après le rendu natif ou
  remplacé — nécessaire pour qu'un plugin ajoute quelques lignes (Sens/
  Compensation/Point de départ) sur des types déjà gérés nativement (ligne,
  rect, cercle...) sans avoir à réimplémenter tout leur rendu. Réutilisable
  par tout futur plugin.

  **Réserves non vérifiées sur machine réelle** (absentes de l'unique
  exemple disponible) : le sens `dir=-1` sur un cercle, un point de départ
  non-défaut sur un cercle, et le sens intérieur/extérieur de la
  compensation — premier essai recommandé sur une chute, avec un objet
  simple (sans inversion ni compensation) avant toute pièce définitive.
- **Copier/coller entre onglets MiniCAD** — `Ctrl+C`/`Ctrl+X` déposent
  désormais aussi un export JSON des objets sélectionnés dans le presse-
  papiers du système d'exploitation (`navigator.clipboard.writeText()`), en
  plus du presse-papiers interne (`S.clipboard`, inchangé). Repli silencieux
  si l'API Clipboard est indisponible — le presse-papiers interne suffit
  toujours pour coller dans le même onglet.
  Côté collage, `Ctrl+V` s'appuie sur l'évènement natif `paste` du navigateur
  (accès synchrone à `ev.clipboardData`) plutôt que sur
  `navigator.clipboard.readText()` : cette dernière exige une permission
  dédiée et échouait silencieusement dans plusieurs contextes — notamment le
  fichier local `file://` utilisé pour ouvrir MiniCAD (repli sur le presse-
  papiers interne vide → "Presse-papiers vide" à tort, signalé sur Opera).
  Le nouveau listener `document.addEventListener('paste', ...)` lit
  `ev.clipboardData`, remplace `S.clipboard` si le texte est un export
  MiniCAD reconnu (`__minicad_clipboard`) — permettant de copier dans un
  onglet/fenêtre MiniCAD et coller dans un autre — sinon conserve le presse-
  papiers interne existant. Même garde que pour Ctrl+C/X/V au clavier : un
  champ de dialogue ouvert (renommer un bloc, TEXTE...) autre que `cmdInput`
  garde son collage de texte natif, non intercepté. L'ancien
  `ev.preventDefault()` sur le `keydown` Ctrl+V a été retiré (il supprimait
  l'évènement `paste` avant qu'il ne se déclenche) ; `clipboardPaste()` est
  redevenue synchrone. L'entrée "Coller" du menu Ctrl+clic-droit reste
  toujours active (même presse-papiers interne vide) : un clic sur cette
  entrée ne peut de toute façon jamais déclencher l'évènement `paste` natif
  (seul un vrai Ctrl+V clavier le peut), donc griser l'entrée selon l'état
  du presse-papiers interne serait trompeur et empêcherait de découvrir la
  fonctionnalité dans un onglet neuf. `clipboardPaste()` reste le filet de
  sécurité et avertit ("Presse-papiers vide") si rien n'est réellement
  disponible — le collage cross-onglet nécessite un vrai Ctrl+V, pas un
  clic sur "Coller".
- **Cause réelle du bug Opera identifiée et corrigée** — le diagnostic ajouté
  a montré que `navigator.clipboard` est carrément absent sur cet Opera (pas
  une permission refusée : la branche "API indisponible" s'affichait), donc
  `clipboardCopy()` n'écrivait jamais rien dans le presse-papiers système —
  ce que l'onglet 2 confirmait en lisant un presse-papiers vide via
  Ctrl+V. Cause probable : `navigator.clipboard` exige un contexte
  "sécurisé", et `file://` (utilisé pour ouvrir MiniCAD) n'est pas
  systématiquement traité comme tel selon le navigateur.
  Nouvelle fonction `writeSystemClipboard(text)` : écrit désormais via
  `document.execCommand('copy')` (textarea temporaire hors écran,
  sélectionné puis copié) — API dépréciée mais synchrone et indépendante du
  statut "contexte sécurisé", donc disponible y compris sur ce cas Opera.
  `navigator.clipboard.writeText()` reste tenté en secours si disponible.
  Le côté lecture (`paste` natif) n'a pas besoin de ce changement : il n'a
  jamais été concerné par cette restriction.
- **Menu Ctrl+clic-droit : historique des 5 dernières commandes** — la liste
  "Répéter X" n'affichait que la toute dernière commande ; elle montre
  désormais jusqu'à 5 entrées (la plus récente en gras avec le raccourci
  Entrée), chacune cliquable pour la relancer directement. Nouvel état
  `S.cmdRepeatHistory` (5 entrées max, la plus récente en tête, dédoublonnée
  sur l'entrée immédiatement précédente) alimenté par la nouvelle fonction
  `_pushCmdRepeat(raw)`, appelée aux trois points où `S.lastCmdRaw` était
  auparavant assigné directement (commande `CMD{}` exécutée, commande de
  module, sélection d'un outil via la barre d'outils/`_toolCmdName`) —
  `S.lastCmdRaw` reste alimenté en parallèle pour le clic droit simple.
- **`DEPUIS` (FROM, façon AutoCAD)** — nouvelle entrée "Depuis..." dans le menu
  contextuel Ctrl+clic-droit (`showCanvasContext()`), activée dès qu'un point
  est attendu (`getCursorMode()==='draw'` — dessin en cours, point de base
  MOVE/COPY/ROTATE/SCALE...). Auparavant Ctrl+clic-droit n'ouvrait ce menu
  qu'à l'arrêt (outil `select` idle) ; le raccourci fonctionne désormais aussi
  en pleine saisie de point (`_rightClickAction()` teste `ev.ctrlKey` avant la
  confirmation "Entrée" du clic droit simple). "Depuis" arme la capture d'un
  point de référence (`S._fromArmed`) : le clic suivant le mémorise
  (`S._fromBase`) sans faire avancer la commande — Échap annule cette seule
  sous-étape. Le point réel se donne ensuite au clavier par une coordonnée
  relative/polaire (`@dx,dy`, `dist<angle`, `#x,y`) résolue depuis ce point de
  référence via `parseDistanceInput()` (déjà utilisé pour les points 2+ d'une
  entité) — comblant un manque réel : jusqu'ici, le tout premier point d'une
  entité ne pouvait être saisi qu'en absolu, aucun point de référence
  n'existant encore pour un décalage relatif. Un clic normal (sans taper de
  décalage) ignore la référence, exactement comme AutoCAD. Référence
  consommée une seule fois (remise à `null` à chaque clic normal et à chaque
  changement d'outil via `setTool()`), pour ne jamais fausser une commande
  ultérieure sans rapport. La bulle de saisie dynamique (D/A) reflète elle
  aussi la référence : `getDIMode()` bascule en mode Distance/Angle (au lieu
  de X,Y brut) dès que `S._fromBase` est armé, `updateDynamicInput()` calcule
  ces valeurs par rapport au point de référence, et `confirmDynamicInput()`
  résout le point réel (référence + distance/angle) à la confirmation —
  la mesure affichée part donc bien du point "Depuis", plus de l'origine.
  Un aperçu en pointillés avec la distance live (même style que les repères
  OFFSET/AXIS) est aussi tracé entre la référence et le curseur — quel que
  soit le point concerné (1er point d'une entité, ou un point suivant : ex.
  2ème point d'une LIGNE déjà commencée). Correction d'un deuxième manque :
  la référence n'était utilisée que pour le tout premier point d'une entité —
  armer "Depuis" pour un point suivant (déjà en train de dessiner) retombait
  sur le dernier point réel de l'entité, ignorant la référence choisie
  (`updateDynamicInput()`/`confirmDynamicInput()`/le bloc terminal « SECOND+
  POINT INPUT » ne consultaient pas `S._fromBase`). Les trois font désormais
  systématiquement primer `S._fromBase` sur `S.drawPoints[...]` tant qu'il est
  armé, et Échap peut aussi annuler une référence déjà acquise mais pas
  encore utilisée, sans toucher à la commande en cours.
- **Nom de bloc demandé + renommage propagé** — `BLOCK` sans nom fourni en
  argument ouvre désormais une invite (`prompt()`) au lieu d'auto-nommer
  silencieusement en `Bloc1`/`Bloc2`... (Échap/annuler abandonne la création).
  Collision de nom (bloc déjà existant) auto-suffixée (`_2`, `_3`...) avec
  avertissement, même logique que l'import de bloc depuis un fichier externe.
  Nouvelle fonction `renameBlock(oldName)` : renomme la définition dans
  `S.blocks` et met à jour `blockName` sur toutes les entités `insert` qui la
  référencent (comptage affiché). Accessible via un bouton ✎ à côté de la
  liste déroulante dans la popup `INSERT`, ou directement en éditant le champ
  "Bloc" (désormais un texte modifiable, plus un simple libellé) du panneau
  Propriétés pour une entité `insert` sélectionnée — logique de renommage
  factorisée dans `_renameBlockTo(oldName,newName)`, réutilisée par les deux
  entrées (popup et Propriétés). Collision de nom : refusée avec avertissement,
  le champ Propriétés reprend l'ancien nom. Popup `INSERT` : le champ "Bloc"
  (liste déroulante) et le bouton renommer se grisent automatiquement dès
  qu'un bloc est importé depuis un fichier (`_ibImportedBlocks` non vide) —
  le nom vient du fichier importé, pas d'un choix parmi les blocs du dessin.
- **`WBLOCK`** (alias `WB`/`WBLOC`) — équivalent AutoCAD : écrit une définition
  de bloc dans un fichier `.mcad` externe autonome, réutilisable dans un autre
  dessin via `INSERT` ▸ "Importer depuis un fichier" (même format
  `{app:'MiniCAD', blocks:{...}}` que cet import). `WBLOCK <nom>` écrit
  directement un bloc déjà défini dans le dessin ; `WBLOCK` sans nom et sans
  sélection liste les blocs disponibles et invite à sélectionner des objets ;
  avec une sélection, réutilise le flux `BLOCK` (nom + point de base) puis
  exporte automatiquement le bloc nouvellement créé. Nouvelle fonction
  `wblockSaveToFile(name, def)`, réutilise `saveWithPicker()` (déjà utilisé par
  `SAVE`). Entrée ajoutée au menu Modifier, juste après "Créer un bloc".
- **`WBLOCK` — popup de sélection de la source (façon AutoCAD "Write Block")** —
  `WBLOCK` sans nom d'argument (menu ou terminal vide) ouvre désormais une
  boîte de dialogue (`#wblock-dialog`, `openWblockDialog()`) au lieu d'un flux
  au clavier/`prompt()` : choix de la **source** (liste déroulante) parmi
  "Bloc existant du dessin" (sélectionné dans une liste, écrit directement via
  `wblockSaveToFile`), "Objets sélectionnés" ou "Dessin entier" (nouvelle
  fonction `wblockSaveDrawingToFile(name)`, réutilise `buildSaveData()` —
  export non destructif, ne modifie pas le fichier/handle du dessin ouvert).
  Chaque source est grisée automatiquement si non applicable (aucun bloc /
  dessin vide). Pour "Objets sélectionnés" : deux boutons dédiés dans le
  dialogue, façon boîte AutoCAD "Écrire le bloc" — **Sélectionner des objets**
  (cache le dialogue, bascule sur l'outil sélection standard fenêtre/
  croisement/clic, Entrée valide/Échap annule, même mécanisme que ARRAY) et
  **Point de base** (cache le dialogue, un clic canvas via l'outil dédié
  `wb_basepoint` mémorise le point sans créer le bloc), tous deux réaffichant
  le dialogue avec le compte d'objets et les coordonnées choisies. L'appui sur
  OK crée alors le bloc et lance l'export en un seul geste — plus besoin de
  cliquer un point sur le canvas après avoir fermé le dialogue. Logique de
  création factorisée dans `_createBlockFromEntities(ents, name, bx, by)`,
  réutilisée par le clic canvas classique de `BLOCK` (outil `block_base`) et
  par cette nouvelle confirmation directe. `WBLOCK <nom>` reste un raccourci
  direct sans popup (comme avant).
- **`WBLOCK` — champ "Chemin" avec bouton parcourir** — nouveau champ dans le
  dialogue (bouton 📁, `wbPickPath()`) qui ouvre immédiatement le sélecteur
  natif `showSaveFilePicker` pour choisir la destination **avant** de cliquer
  OK, comme le champ "File name and path" d'AutoCAD ; le handle de fichier
  choisi est conservé (`S._wbFileHandle`) et réutilisé directement par OK, sans
  repasser par un second sélecteur — `saveWithPicker()` accepte désormais un
  handle existant en dernier paramètre et écrit dessus au lieu de rouvrir une
  boîte "Enregistrer sous". Si l'API n'est pas disponible dans le navigateur,
  message d'avertissement expliquant que le fichier sera téléchargé dans le
  dossier de téléchargements par défaut (limite de la sandbox navigateur :
  JavaScript n'a jamais accès au chemin absolu réel, seulement au nom du
  fichier choisi). Champ facultatif : si non renseigné, OK déclenche comme
  avant le sélecteur natif au moment de l'export.

### Corrigé
- **WBLOCK réaffichait le sélecteur de fichier malgré un chemin déjà choisi** —
  `saveWithPicker()` réutilisait le handle de `S._wbFileHandle` mais avalait
  silencieusement toute erreur de `createWritable()` (permission repassée à
  `'prompt'` entre le clic sur « Chemin » et le clic sur OK, notamment après un
  aller-retour par « Sélectionner des objets »/« Point de base ») et retombait
  sans explication sur un nouveau `showSaveFilePicker()` — d'où l'impression
  qu'OK redemandait le chemin. Revalidation explicite de la permission
  (`queryPermission`/`requestPermission`) avant l'écriture, et l'échec éventuel
  est maintenant affiché dans le terminal au lieu d'être masqué.
- **Blocs qui survivaient à "Nouveau dessin"** — `closeDrawing()` (commandes
  `NOUVEAU`/`CLS`/`FERMER`, menu Fichier ▸ Nouveau) remettait à zéro
  `S.entities`/`S.selected`/`S.layers` mais oubliait `S.blocks` : les
  définitions de blocs d'un dessin précédent restaient donc proposées dans la
  popup `INSERT` d'un dessin flambant neuf. Ajout de `S.blocks = {}` au reset.
- **Modules Architecture / Électricité de nouveau visibles** — le panneau
  latéral "Modules" et le compteur de la barre de statut filtraient
  volontairement `architecture` et `electrical` (masqués du frontend, code
  conservé) ; retrait des deux filtres dans `updateUI()`/`updateStatusBar()`
  pour réafficher les quatre modules (Architecture, Électricité, Cotation,
  Annotation).

### Ajouté
- **BLOCK / INSERT** — blocs nommés réutilisables. `BLOCK [nom]` sur une sélection
  crée une définition (`S.blocks[nom]`, géométrie recentrée sur le point de base
  choisi au clic) et la remplace par une première instance (`type:'insert'`).
  `INSERT nom` pose ensuite autant d'instances indépendantes qu'on veut, chacune
  avec sa propre position/angle/échelle. Les instances se déplacent, copient,
  tournent, mettent à l'échelle, s'effacent et s'éclatent (`EXPLODE`) comme
  n'importe quelle entité — réutilisation des chemins génériques existants
  (mêmes branches que `TEXT` pour move/rotate ; une ligne ajoutée dans
  `scaleEntityInPlace`) plutôt que du code dédié partout. `MIRROR` reflète
  aussi bien la position que l'orientation du contenu du bloc (voir entrée
  dédiée ci-dessous). Persistant dans les fichiers `.mcad`
  (`S.blocks`, rétrocompatible). Export DXF : pas de vrais enregistrements
  `BLOCK`/`INSERT` — chaque instance est aplatie en géométrie transformée au
  moment de l'export (`insertWorldEntities()`), ce qui est déjà mieux que
  `GROUP` dont les entités groupées n'étaient jusqu'ici jamais exportées en DXF.
  Accessible aussi via le menu (Modifier ▸ Créer un bloc, Insérer ▸ Insérer un
  bloc) et deux boutons de barre d'outils dédiés, à côté de Grouper/Dégrouper.
- **OSNAP Insertion** — mode d'accrochage dédié au point d'insertion d'un bloc
  (`type:'insert'`), sur le même principe que le mode "Insertion" d'AutoCAD :
  jusqu'ici `findOsnap()` n'avait aucun cas pour `insert`, donc impossible
  d'accrocher précisément une instance de bloc pendant un déplacement par
  poignée. Marqueur dédié (carré + croix diagonale), activé par défaut,
  bascule dans le panneau ACCROCHAGE et dans les Préférences.
- **OSNAP sur le contenu des blocs** — au-delà du point d'insertion, tous les
  modes OSNAP standards (extrémité, milieu, centre, plus proche, intersection,
  perpendiculaire, tangente, quadrant) fonctionnent maintenant aussi sur la
  géométrie *à l'intérieur* d'une instance de bloc, comme dans AutoCAD.
  `findOsnap()` aplatit chaque instance proche du curseur en ses entités
  enfant transformées (`insertWorldEntities()`) et les injecte dans le
  pré-filtre `_nearby`, avec un id synthétique `<idInstance>:<idEnfant>` pour
  ne pas confondre deux instances du même bloc (pertinent pour la logique
  tangente-tangente). Support récursif pour les blocs imbriqués (profondeur
  max 5). Limite connue : une cote associative (DIMASSOC) accrochée sur un
  enfant de bloc ne peut pas se recaler (l'entité hôte n'existe pas dans
  `S.entities`) — se comporte comme un accroché "figé", pas de crash.
  OSNAP Extension/OTRACK reste hors scope (déjà documenté comme défectueux
  au TODO, mécanisme séparé non branché sur `_nearby`).
- **Panneau Propriétés pour BLOCK/INSERT** — sélectionner une instance affiche
  maintenant son nom de bloc, son angle (°, éditable), son échelle (éditable)
  et l'état Miroir (case Oui/Non, éditable), en plus de X/Y déjà couverts par
  le fallback générique.
- **MIRROR sur les blocs** — jusqu'ici `MIRROR` reflétait la position du point
  d'insertion d'une instance mais laissait son contenu inchangé (pas de vraie
  symétrie visuelle). Ajout d'un drapeau `mirror` sur l'entité `insert` :
  `insertWorldEntities()` applique désormais un flip local (`mirrorEntity`
  autour de l'axe Y local) avant échelle/rotation, et `mirrorEntity()` sait
  recalculer l'angle d'une instance (`angle' = 2·angleDroite − angle + π`) et
  inverser son drapeau `mirror` pour tout miroir arbitraire. Formule dérivée
  par composition matricielle (monde = R(angle)·F(mirror)·local + translation)
  et vérifiée numériquement (7 cas variés + double-miroir = identité) avec les
  fonctions réelles du fichier source avant intégration.
- **Fichier ▸ Fermer** (`FERMER`, alias `CLOSE`) — ferme le dessin courant, avec
  confirmation si des modifications ne sont pas sauvegardées.
- **Dialogue INSÉRER UN BLOC** — cliquer Insérer ▸ Insérer un bloc (ou taper
  `INSERT` sans argument) ouvrait un simple message dans le terminal listant
  les blocs disponibles, sans action possible. Ouvre maintenant une popup avec
  une liste déroulante des blocs du dessin courant, plus un champ chemin +
  bouton "…" pour parcourir le disque et importer les blocs d'un autre fichier
  `.mcad`/`.json` (lu côté client via `FileReader`, aucune dépendance réseau).
  Un bloc importé est copié dans `S.blocks` au moment de la validation
  (renommé automatiquement en cas de collision de nom), puis l'insertion se
  déroule normalement (clic pour poser). Le raccourci terminal `INSERT <nom>`
  reste inchangé (toujours direct, sans popup).
- **Preview de bloc pendant INSERT** — après avoir choisi un bloc (dialogue ou
  `INSERT <nom>`), le contenu du bloc s'affiche désormais en pointillé sous le
  curseur pendant qu'on cherche le point d'insertion (respecte l'accroche
  OSNAP/grille active), au lieu de devoir cliquer à l'aveugle. Même principe
  que la preview des bibliothèques (`drawLibPreview`) : entités fantômes
  générées via `insertWorldEntities()` et dessinées à 55% d'opacité, trait
  pointillé.
- **OSNAP Extension : expiration automatique des points acquis** — les points
  de repère acquis par survol (OTRACK, `S.osnapAcquired`) restaient actifs
  indéfiniment tant qu'on ne changeait pas d'outil, ce qui les faisait
  s'accumuler et perturber le tracking pendant une séquence de plusieurs
  clics (ex. plusieurs `LINE` à la suite). Deux correctifs : (1) reset
  systématique de `S.osnapAcquired` à chaque clic (`handleClick`) et à chaque
  validation de saisie dynamique (`confirmDynamicInput`) ; (2) expiration par
  minuteur individuel (3 s par défaut) sur chaque point acquis, via un
  `setTimeout` déclenché à l'acquisition. Durée réglable dans Préférences ▸
  Object snap (`prefs.osnap_ext_timeout`, nouveau champ `S.osnapExtTimeout`,
  0 = jamais expirer, plage 0–30 s).
- **`DIMCONTINUE`** (alias `DCO`/`DIMCONT`) — équivalent AutoCAD : enchaîne des
  cotes depuis le 2e point d'extension d'une cote linéaire/alignée existante,
  en réutilisant automatiquement la même ligne de cote (un seul clic par
  point suivant, Échap pour terminer). Sélection de la cote de départ à trois
  niveaux comme AutoCAD : cote explicitement sélectionnée, sinon dernière cote
  créée (`S._lastDimId`, maintenant renseigné par le flux `DIMLINEAR`/
  `DIMALIGNED`), sinon invite à cliquer une cote existante. Alignement exact
  de la ligne de cote calculé par `_dimContOffsetFor(base, p1, p2)` à partir
  de la ligne de cote réelle de la cote de base (`getDimLinePoints`), et non
  en recopiant naïvement son `offset` (qui ne coïnciderait que par coïncidence
  géométrique). `drawDimPreview()` accepte désormais un offset/orientation
  forcés pour la prévisualisation en direct. Accessible via le menu Cotation,
  un bouton de barre d'outils dédié, ou en tapant `DIMCONTINUE`/`DCO`.
- **`DIMBASELINE`** (alias `DBA`/`DIMBASE`) — équivalent AutoCAD : empile des
  cotes depuis la même origine (1er point d'extension) qu'une cote linéaire/
  alignée existante, chaque nouvelle cote étant décalée d'un cran
  supplémentaire vers l'extérieur pour ne pas chevaucher les précédentes (un
  seul clic par point suivant, Échap pour terminer). Même sélection de la
  cote de départ à trois niveaux que `DIMCONTINUE` (sélection explicite,
  sinon `S._lastDimId`, sinon invite à cliquer). Écart entre cotes empilées
  réglable par style de cotation — nouveau champ `baselineSpacing` (colonne
  "Écart cotes" dans Cotation ▸ Gérer les styles…, par défaut ≈ 2.8×
  `textHeight` selon l'échelle du style, rétrocompatible avec les styles
  sauvegardés avant cette version via `_dimBaselineSpacing()`). Alignement
  calculé par `_dimBaselineOffsetFor(base, p1,
  p2, n)`, qui réutilise `_dimContOffsetFor` sur un clone de la cote de base
  dont l'offset est déjà poussé de `n` crans — même principe de calcul exact
  que `DIMCONTINUE`, pas de décalage recopié à l'aveugle. Accessible via le
  menu Cotation, un bouton de barre d'outils dédié, ou en tapant
  `DIMBASELINE`/`DBA`.

### Corrigé
- **BLOCK/INSERT perdu après F5** — `loadFromLocalStorage()` (restauration
  auto-save au chargement de page) ne restaurait pas `data.blocks`, contrairement
  à `openJSON()` (Ouvrir un fichier) qui le faisait déjà. Après un F5, l'entité
  `insert` survivait mais pointait vers un bloc introuvable → marqueur `?` en
  pointillé (garde-fou prévu pour ce cas) au lieu de la géométrie du bloc.
  Corrigé par l'ajout de `if (data.blocks) S.blocks = data.blocks;` au même
  endroit que dans `openJSON()`.
- **Export DXF : arcs de polyligne (bulge) inversés dès qu'ils dépassent le demi-cercle.**
  Le standard DXF définit `bulge = tan(θ/4)` avec θ l'angle inclus signé, ce qui place le
  centre en `milieu + perp_ccw·((1−b²)/(2b))` : pour un **arc majeur** (`|b| > 1`) ce
  facteur devient négatif et le centre bascule de l'autre côté de la corde.
  `drawPolyArcSegToPath()` place lui le centre en `milieu + signe(b)·perp_ccw·|apothème|`,
  toujours du côté du signe de b, et rattrape le sens au rendu. Les deux conventions
  coïncident pour `|b| ≤ 1` mais donnent des **arcs symétriques par rapport à la corde**
  au-delà : la polyligne exportée s'ouvrait du mauvais côté dans LibreCAD/AutoCAD.
  Corrigé par l'involution `dxfBulge(b) = |b|>1 ? -b : b`, appliquée à l'export **et** à
  l'import. Vérifié par un oracle externe (ezdxf, 0 erreur d'audit) sur 12 bulges positifs
  et négatifs : centres, rayons et apex conformes au calcul standard, aller-retour exact.
  À noter : `openDXF()` utilisant la même convention interne, les aller-retours
  MiniCAD↔MiniCAD paraissaient corrects depuis toujours — un aller-retour maison ne prouve
  rien sur la conformité DXF.

- **Import DXF : tous les arcs de polyligne étaient perdus.** `openDXF()` ne lisait que les
  codes 10/20 des `LWPOLYLINE` et ignorait le code 42 : toute polyligne courbe revenait en
  segments droits. Le 42 n'étant émis que pour les sommets courbes, un tableau indexé par
  code de groupe ne peut pas être aligné positionnellement ; la lecture se fait désormais
  sur le flux de jetons brut, où chaque 10 ouvre un sommet que 20/42 complètent. Ajout d'un
  garde-fou pour qu'une polyligne fermée de 4 sommets **porteuse d'arcs** ne soit plus
  convertie en `rect` (ce qui aplatissait les arcs).

- **Export DXF : hachures non affichées dans LibreCAD/AutoCAD.** `ptsFromEntity()` referme
  déjà le contour en répétant le premier point, et la boucle d'arêtes rebouclait en plus
  via `(i+1)%n` : le contour sortait avec une **arête de longueur nulle** (9 arêtes pour
  8 sommets, 65 pour un cercle), que LibreCAD et AutoCAD considèrent comme un contour
  invalide — la hachure était simplement ignorée. Les points dupliqués sont retirés avant
  l'émission.

- **Ouvrir empilait le nouveau dessin sur l'ancien.** `openDXF()` se contentait de `push`er
  les entités importées sans vider `S.entities` (les formats `.mcad`/JSON remplaçaient
  correctement, seul DXF/DWG était touché). L'ouverture passe désormais par
  `closeDrawing()`, qui vide les entités **et** remet les 4 calques par défaut — sans quoi
  l'import empilait ses calques sur les précédents (doublons « 0 », « 1_-_Construction »…).

- **Axe de cercle inapplicable sur un arc de polyligne.** `applyCircleAxes()` filtrait sur
  `circle`/`arc` uniquement, alors que `findCircleEntity()` gérait déjà les segments d'arc
  des polylignes. Les maths bulge→cercle sont extraites en `_polySegs()` / `_arcSegCircle()`
  (utilisées par les deux chemins, sans duplication) et le filtre accepte `polyline`/`cable`
  via `_polyArcCircles()`.

- **Texte de cote illisible par-dessus une hachure.** Le texte est désormais dessiné par
  `fillDimText()`, qui pose un masque à la couleur du fond du plan de travail derrière lui
  (nouvelle clé `bg` dans `CANVAS_THEMES`).

- **Poignée du texte d'une cote de diamètre mal placée.** Le texte par défaut est stocké au
  centre mais dessiné décalé perpendiculairement au trait ; la poignée reste sur le centre
  et se confondait avec celle du centre. Elle reprend maintenant le même décalage, en
  reproduisant la rotation écran du rendu pour rester correcte à tout angle.

- **Hachure abandonnée à la copie.** `applyCopy()` et le copier/coller ne dupliquaient une
  hachure que si elle était elle-même sélectionnée ; les hachures associées (`sourceId`) à
  une forme copiée sont maintenant reprises et re-liées automatiquement. Si la forme hôte
  n'est pas du voyage, la hachure est figée sur ses points au lieu de pointer dans le vide.

- **Échelle d'une ellipse sans effet.** `scaleEntityInPlace()` ne mettait à l'échelle que
  `r`, jamais `rx`/`ry`.

- **Dialogue TEXTE DE COTE illisible en thème clair.** Couleurs en dur (`#fff`,
  `#ffffff21`, `#e8ecf4`…) remplacées par les variables de thème.


### Corrigé
- **DIMALIGNED : trait d'attache plus long que DIMLINEAR.** Le dépassement du trait
  d'attache au-delà de la ligne de cote utilisait un survol proportionnel fixe de 15 % de
  la distance totale objet→ligne de cote (`ox * 1.15`) au lieu du dépassement fixe `extGap`
  du style de cote, déjà utilisé correctement par DIMLINEAR. Plus la cote était éloignée de
  l'objet, plus l'écart entre les deux types de cote se voyait. Corrigé aux trois endroits
  concernés (rendu canvas, aperçu pendant le tracé, export DXF) pour utiliser `extGap`,
  comme DIMLINEAR. Vérifié : coordonnées exportées conformes au calcul théorique
  (`origin + extOff` → `ligne de cote + extGap`).

- **Export DXF réellement ouvrable dans AutoCAD.** Les fichiers exportés étaient rejetés
  (ou « récupérés » en perdant du contenu). Causes identifiées et corrigées :
  - **Cotes sans bloc de géométrie** — cause principale. En R2000 une `DIMENSION` doit
    référencer (code 2) un **bloc anonyme `*Dn`** contenant sa géométrie dessinée ; sans lui,
    AutoCAD et l'ODA suppriment purement et simplement l'entité. Chaque cote reçoit désormais
    son bloc (lignes d'attache, ligne de cote, flèches `SOLID`, texte `MTEXT`), son
    enregistrement `BLOCK_RECORD`, et le bit 32 dans le code 70.
  - **Styles de cote perdus** — toutes les cotes sortaient en `STANDARD` avec un
    `DIMSTYLE` vide, donc AutoCAD retombait sur ses défauts (texte 0,18 mm) et les cotes
    étaient illisibles. Les 7 styles (`1:1` … `1:100`) sont exportés avec leurs vraies
    valeurs `DIMTXT` / `DIMASZ` / `DIMEXO` / `DIMEXE` / `DIMGAP` / `DIMDEC`.
  - **Textes de cote surchargés perdus** — le code 1 était toujours vide, ce qui demande à
    AutoCAD de *masquer* le texte. Il porte maintenant la surcharge (`<> mm`, préfixes,
    suffixes) ou `<>` par défaut.
  - **`dim_aligned` décalée du mauvais côté** — l'export utilisait `angle + π/2` là où le
    rendu écran (Y inversé) utilise `angle − π/2` : la ligne de cote partait à l'opposé.
  - **Encodage** — pas de `$DWGCODEPAGE` et des accents en UTF-8 dans un fichier AC1015
    (attendu en ANSI) donnaient des textes illisibles. Le fichier est désormais **ASCII pur**,
    les caractères non-ASCII étant échappés en `\U+XXXX` (décodé par AutoCAD).
  - **Calques homonymes** — après assainissement, « Mur 1 » et « Mur_1 » produisaient deux
    enregistrements `LAYER` identiques (fichier refusé). Les noms sont dédoublonnés.
  - **Couleurs** — la couleur du calque était recopiée sur chaque entité, ce qui les figeait
    dans AutoCAD. Les entités sortent en `DUCALQUE` (256), sauf surcharge explicite.

- **Diagnostic à corriger : AutoCAD Web n'ouvre pas les DXF, quels qu'ils soient.**
  Les fichiers exportés étaient testés sur AutoCAD Web, qui refuse le DXF *par conception*
  (Autodesk documente qu'il faut convertir en DWG au préalable, via AutoCAD Desktop). Les
  échecs constatés là-bas ne prouvaient donc rien sur la validité de l'export. Les correctifs
  ci-dessous restent des bugs réels — vérifiés dans le fichier produit — mais aucun d'eux
  n'aurait pu rendre un DXF ouvrable sur AutoCAD Web. **Valider l'export avec un lecteur qui
  gère réellement le DXF** : LibreCAD, QCAD, DraftSight, FreeCAD, AutoCAD Desktop, Autodesk
  Viewer, ou l'ODA File Converter.

- **Codes de groupe flottants sans point décimal.** Dès qu'une coordonnée, un rayon ou un
  angle tombait pile sur un nombre entier, il s'exportait `40\n50` au lieu de `40\n50.0`,
  alors que le format exige un point décimal sur tout code flottant (10-59, 110-159,
  210-239…). Cause : `String(parseFloat(n.toFixed(6)))` efface le `.0` final ; corrigé pour
  conserver au moins une décimale. `ezdxf` acceptait la forme entière, d'où un test qui ne
  voyait rien : `tests/dxf_export_test.py` contrôle désormais explicitement le point décimal.

- **Section `CLASSES` vide.** Le fichier instancie des objets `LAYOUT` (section `OBJECTS`,
  un par onglet Modèle/Présentation) sans déclarer leur classe. `LAYOUT` n'est pas un type
  natif du noyau DXF mais une classe « dérivée », qu'un document généré par `ezdxf` déclare
  systématiquement. Ajout de `CLASS LAYOUT / AcDbLayout / ObjectDBX Classes`.

- **Code de groupe 271 (DIMDEC) dupliqué.** Chaque enregistrement `DIMSTYLE` écrivait deux
  fois de suite le même code 271 (copier-coller resté dans le code) — un enregistrement
  structurellement invalide, présent dans *tous* les fichiers puisque la table `DIMSTYLE`
  (7 styles) est toujours générée, même sans la moindre cote. Ni `ezdxf` ni `libdxfrw`
  (LibreCAD) ne signalent ce genre de doublon en lecture : ils gardent la dernière valeur.
  Ligne dupliquée supprimée ; retiré au passage un code `71` après le marqueur
  `AcDbDimStyleTable`, absent de la structure produite par `ezdxf`. `tests/dxf_export_test.py`
  vérifie désormais qu'aucun code de groupe n'apparaît deux fois dans un même enregistrement
  de table ou d'entité simple (LINE/CIRCLE/ARC/ELLIPSE/TEXT/POINT/XLINE/RAY/DIMSTYLE/LAYER/
  STYLE/APPID/LTYPE/VPORT/CLASS/BLOCK_RECORD) — validé en réintroduisant volontairement le
  bug pour confirmer que le test l'aurait bloqué.

- **`SPLINE` sans point de contrôle ni vecteur nodal.** L'export écrivait `72` (nœuds) = 0,
  `73` (points de contrôle) = 0 et uniquement des points de passage (code 11). Une B-spline
  DXF se définit par ses points de contrôle et son vecteur nodal : sans eux, aucun noyau CAO
  ne peut reconstruire la courbe. La Catmull-Rom de MiniCAD est désormais convertie en
  B-spline cubique clampée — chaque segment Catmull-Rom uniforme de tension 0.5 est
  *exactement* un Bézier cubique (`b1 = p1 + (p2-p0)/6`, `b2 = p2 - (p3-p1)/6`), et la chaîne
  de Béziers s'écrit comme une B-spline de degré 3 à nœuds internes de multiplicité 3. Écart
  mesuré entre la courbe exportée et la courbe affichée : 3·10⁻⁷ unité (arrondi à 6 décimales).
  `ezdxf` annonçait « 0 erreur, 0 correction » sur l'ancienne version ; le test vérifie
  maintenant l'invariant `nb_nœuds == nb_points_de_contrôle + degré + 1`.

- **Entités manquantes à l'export DXF** : les **ellipses** et **arcs d'ellipse** étaient
  dessinés mais jamais écrits dans le fichier. Export en `ELLIPSE` natif, avec bascule du
  grand axe quand `ry > rx` (le DXF impose un ratio ≤ 1) et conversion des paramètres d'arc.

- **Export DWG** : produisait un contenu DXF nommé `.dwg`, qu'AutoCAD refuse toujours. La
  commande signale maintenant que le DWG natif exige un SDK propriétaire et exporte un
  vrai `.dxf` (au lieu de dupliquer un écrivain DXF dégradé, sans cotes ni ellipses).

### Ajouté
- **Déplacement de la vue au glisser-droit** : nouveau réglage Préférences (section Saisie)
  « Déplacement de la vue » → *Molette seule* (défaut) ou *Molette + glisser droit*. Quand il
  est activé, **maintenir le bouton droit et glisser** déplace la vue (modèle et espace papier),
  tandis qu'un **clic droit sans bouger conserve son rôle** (Entrée / répéter la commande /
  menu contextuel via Ctrl) — y compris pendant une commande active. Seuil de 4 px pour
  distinguer clic et glisser ; le menu contextuel est supprimé à la fin d'un glisser-pan.
  Préférence persistée (`rightDragPan`).
- **Cotes vraiment associatives (DIMASSOC)** : à la création d'une cote `dim_linear` /
  `dim_aligned`, si une extrémité est posée sur une accroche-**sommet** (extrémité, milieu,
  centre, quadrant) d'une autre entité, le lien est mémorisé (`assoc.p1` / `assoc.p2`). La
  cote se **recale automatiquement** sur la géométrie hôte après tout étirement, édition par
  poignée, déplacement, échelle ou rotation (`refreshAssocDims`) — y compris quand l'hôte est
  modifié sans que la cote soit sélectionnée. Le lien est remappé à la copie/au collage,
  abandonné au miroir, et la suppression de l'hôte fige simplement la cote (aucun plantage).
  Le recalcul se déclenche aussi depuis le **panneau Propriétés** (X/Y, rayon, et notamment
  le champ **Longueur** d'une ligne) — `refreshAssocDims()` branché dans les `_propChange*`.
  Les accroches *calculées* (intersection / perpendiculaire / tangente) restent non
  associatives, et l'EXPLODE d'un rectangle hôte (→ polyligne) rompt le lien.
  - **Sélection au clic corrigée** : le hitTest d'une cote `dim_linear` / `dim_aligned` ne
    teste plus la *ligne de base* invisible entre les points de définition — seuls la ligne
    de cote, les lignes d'attache et le texte sont cliquables. Sans ce correctif, une cote
    associative (points de définition posés sur la géométrie) captait les clics destinés à
    l'objet coté.
- **ÉTIRER (STRETCH) — cotes linéaires/alignées entraînées** : lors d'un étirement,
  les points de définition d'une cote `dim_linear` / `dim_aligned` pris dans la fenêtre
  croisante se déplacent avec la géométrie ; la valeur affichée, recalculée en direct
  depuis ces points, se met à jour automatiquement. Comportement « non associatif »
  (façon AutoCAD avant `DIMASSOC`) : la cote suit le cas courant (bande croisante sur
  une arête), mais reste un objet indépendant — une fenêtre qui englobe ses deux
  extrémités sans déplacer la géométrie correspondante peut encore la décoller.
  Cotes angulaire/rayon/diamètre/arc : déplacement entier uniquement (valeur figée).
- **JOIN — prise en charge des arcs d'ellipse** : un arc d'ellipse peut désormais être
  joint à des lignes/arcs/polylignes. Comme une polyligne ne stocke que des arcs
  circulaires (bulge), l'arc d'ellipse est échantillonné en segments de droite.
  L'ellipse complète (360°) reste exclue (boucle fermée). Quand un arc d'ellipse est
  détecté, un popup demande la **précision (nombre de segments)** avant de joindre.
- **LISSER (SMOOTH) — lissage de polyligne** : nouvelle commande (alias `SMOOTH`,
  `LISSAGE`) et entrée menu Modifier. Subdivise une polyligne sélectionnée par une
  spline **Catmull-Rom interpolante** — la courbe passe exactement par tous les sommets
  d'origine et ajoute N points par segment (popup « Points / segment »), augmentant la
  précision sans déformer la forme. Gère les polylignes ouvertes et fermées ; les arcs
  (bulge) sont d'abord résolus en points.
- **TUBE — accroche objet quadrant sur les coudes** : les points cardinaux (N/E/S/O)
  des arcs de coude sont désormais accrochables (mode OSNAP quadrant), sur l'axe et
  sur les deux parois (rayons R−tr, R et R+tr) — seuls les cardinaux compris dans la
  plage angulaire de l'arc sont retenus.
- **TUBE — poignées d'étirement des tronçons droits** : une poignée sur l'axe au bout
  de chaque tronçon droit permet de l'étirer (glisser projette le curseur sur l'axe du
  tronçon → nouvelle longueur ; les segments suivants suivent). Longueur minimale 1 mm.
- **GRADISC/GRADARC/GRADRULE — édition dans le panneau Propriétés** : toutes les
  propriétés du dessin (comme dans le popup de création) sont désormais modifiables
  après coup — rayon/longueur/largeur, angle & angle de départ (arc), nombre de
  graduations, label tous les N, taille grad. & texte (en %), sens, position (CX/CY
  ou X/Y) et rotation. Nouveau hook plugin générique `propsHandlers` +
  `pluginPropsHandler()` ; tout le code spécifique grad vit dans `gradrule.js`.
  Au passage, corrige un plantage du panneau sur `grad_disk`/`grad_arc` (le cœur
  lisait `e.r` au lieu de `e.radius`).

### Modifié
- **Icône Zoom étendu** : remplacée par 4 flèches pointant vers les coins
  (icône « ajuster à l'écran » classique), à la place du rectangle barré d'une croix.

### Corrigé
- **Dialogue ÉDITER LE TUBE — boutons illisibles en thème clair** : couleurs codées
  en dur remplacées par des variables de thème (boutons AXE/EXT/INT, séparateur,
  numéros de ligne). Boutons « ✕ Cotes » et « × » de suppression en rouge adaptatif
  (`color-mix` avec `--ink`), « Coter » en accent. Lisibles en thèmes clair et sombre.

## [0.1] — 2026-06-15

### Ajouté
- **GRADISC/GRADARC/GRADRULE — accroche objet (OSNAP)** : nouveaux hook plugin
  `snapHandlers` + `pluginSnapHandler()` dans `findOsnap()`. Points d'accroche :
  centre + 4 quadrants pour `grad_disk` ; centre + extrémités + milieu + quadrants
  dans la plage angulaire pour `grad_arc` ; 4 coins + 4 milieux de côtés pour `grad_ruler`.

### Corrigé
- **Ghost résiduel après déplacement (grip) des entités sélectionnées** : `_drawStaticLayer()`
  excluait désormais les entités dans `S.selected[]` — elles sont toujours redessinées
  en surbrillance par la couche dynamique, ce qui élimine le fantôme résiduel à l'ancienne
  position lors d'un déplacement par poignée.

---

## [0.1] — 2026-06-07

### Ajouté
- **GRADISC/GRADRULE/GRADARC — poignées + transformations** : poignées (grips) sur les
  trois types (déplacement + redimensionnement/orientation) ; le disque et l'arc en avaient
  zéro. MIROIR, ROTATION et ÉCHELLE fonctionnent désormais correctement (taille, position
  ET orientation). Le disque et la règle ont un champ `rotation`, l'arc utilise `startAngle`.
  Nouveaux hooks plugin génériques `gripHandlers` + `transformHandlers` (méthode par points
  de contrôle, réutilise la transformation du cœur) ; aucun code spécifique ajouté au cœur.
- **GRADARC — arc gradué** : nouvelle commande (alias `GA`, `ARCGRADUE`) du plugin
  gradrule. Graduation circulaire partielle avec champ **Angle** (degrés) ; bouton
  d'inversion de sens. Bouton dans la barre « Graduations ». Éclatable et exporté en PDF.
- **GRADISC/GRADRULE/GRADARC — bouton d'inversion de sens** : disque & arc
  horaire ↔ antihoraire ; règle « 0 à gauche » ↔ « 0 à droite » (numérotation miroir).
  Pris en compte au rendu, à l'éclatement et au placement.
- **GRADRULE/GRADISC — éclatement (EXPLODE)** : les disques et règles gradués peuvent
  être éclatés en primitives natives (cercle/rectangle + lignes de graduation + textes),
  fidèles au rendu. Nouveau hook plugin `explodeHandlers` + `pluginExplodeHandler()` dans
  EXPLODE. Les entités éclatées sont prises en compte par l'export PDF.
- **Plugins — hook `hitTestHandlers`** : la détection (sélection) des entités de plugin
  est déléguée au plugin via `pluginHitHandler()`. Le code spécifique aux disques/règles/arcs
  a quitté `minicad.html` pour vivre entièrement dans `gradrule.js` (cœur allégé).
  Disque sélectionnable sur son cercle (avant : centre uniquement).
- **Axes de cercle (`DIMCENTER`)** — trace les axes horizontal et vertical des cercles
  (et arcs) sélectionnés, en trait d'axe (type de ligne `center`). Alias `AXECERCLE`,
  `REPCENTRE`, `CENTERMARK`. Workflow : commande → saisie du **dépassement** (longueur
  dont chaque axe dépasse le rayon) validée par Entrée/clic droit → sélection d'un ou
  plusieurs cercles → Entrée/clic droit pour tracer. Bouton dans la barre d'outils et
  entrée dans le menu Modification. `DIMCENTER 10` pré-règle le dépassement.
- **Thème clair** — commande `THEME` (alias `THM`, `THEME CLAIR|SOMBRE`), bouton dans la
  barre Vue, entrée menu Fichier ; persistance dans les préférences (localStorage)
  - Palette claire type « papier » : variables CSS surchargées via `:root.theme-light`
  - Canvas piloté par thème (`CANVAS_THEMES`/`TC`) : grille, axes, réticule, pickbox,
    élastique, étiquettes de mesure, atelier des présentations, marqueurs OSNAP assombris
  - `dispColor()` : les couleurs d'entités trop claires pour le fond blanc sont
    rabattues vers le noir à teinte constante (contraste ≥ 3:1), à l'écran uniquement —
    le document et l'impression ne changent pas
  - Chrome UI : blancs translucides convertis en `color-mix(in srgb, var(--ink) …)`
    qui s'inversent avec le thème ; badges/onglets sur canvas via `--badge-bg`
- **Contraste** : `--text-dim` passé de #576a80 à #8295ab (≈3:1 → ≈5:1 sur fond panneau)
- **Dialogue Préférences refait** — mise en page professionnelle (sections Apparence /
  Grille / OSNAP / Saisie & curseur / Cotation / Tube, contrôles alignés, unités,
  libellés OSNAP en français, bouton Annuler, confirmation avant réinitialisation),
  entièrement internationalisé (clés `prefs.*` FR/EN)
  - Nouvelles préférences : **thème** (sombre/clair), **taille du pickbox** (px,
    pilote aussi la tolérance de sélection) et **portée de détection OSNAP** (px)
  - Styles de cote listés dynamiquement depuis le document (plus de liste figée)
- **Espace sur poignée active → DÉPLACER l'objet entier** (façon AutoCAD) : après avoir
  saisi une poignée, `Espace` bascule en MOVE de toute la sélection avec la poignée
  comme point de base (clic destination ou distance au clavier) ; sans effet si une
  valeur est déjà tapée dans la saisie dynamique
- **Présentations (espace papier)** — onglets *Objet / Présentation*
  - Feuilles aux formats **A0, A1, A2, A3, A4, A5, Letter** + **personnalisé** (mm)
  - **Fenêtres** (viewports) montrant le dessin à une échelle fixe ; création,
    déplacement, redimensionnement (poignées)
  - **Mode fenêtre active (MSPACE)** : double-clic pour entrer (molette = zoom,
    glisser = pan du modèle), `Échap` / double-clic dehors pour sortir
  - Fenêtres **transparentes** par défaut (option « fond opaque »)
  - **Impression PDF 300 DPI** de la feuille (`Ctrl+P`)
- **Cartouches — modèles `.pcad`**
  - Modèle = JSON réutilisable, **définit le format de papier**
  - **Champs dynamiques** `{{titre}}`, `{{echelle}}`, `{{date}}`, `{{auteur}}`,
    `{{indice}}`, `{{numero}}`, `{{format}}`, `{{page}}` (+ champs libres)
  - Créer (Fichier ▸ Enregistrer comme modèle), utiliser (menu `+`), **modifier**
    (✎ / ouvrir un `.pcad`), **import/export `.pcad`**, bibliothèque locale
  - Dialogue de cartouche **généré dynamiquement** d'après les champs du modèle ;
    champ vide → affiche son libellé
- **Aperçus animés au survol des outils** (curseur + clics + élastique) — 46 outils
  - Fichier externe `animations/tool_anim.js` injecté au build
- **Copier les propriétés** (`MATCHPROP` / `MA`) — pinceau : applique calque, couleur,
  type/épaisseur de ligne, style de texte/cote d'un objet vers d'autres (curseur dédié)
- **Propriétés d'apparence par objet** : couleur, type de ligne, épaisseur (ou « Du calque »)
  — sélection simple et multiple ; respectées à l'écran, en présentation et à l'impression
- **Propriétés calculées** dans le panneau : longueur / périmètre / circonférence + **aire**
  (cercle, rectangle, ellipse, polyligne fermée, polygone) ; totaux en sélection multiple
- **TRIM / EXTEND sur l'ellipse** (cible et limite) ; EXTEND sur l'arc
- **OSNAP sur l'ellipse** : intersection, proche, extrémité/milieu (+ filtre arc visible)
- **Cloud kDrive (Infomaniak)** : ouvrir/enregistrer les `.mcad` sur kDrive via proxy
  (Cloudflare Worker, CORS), navigateur de dossiers (créer/renommer), `Ctrl+S` → kDrive

### Corrigé
- **GRADRULE — texte dédoublé** : la règle graduée n'affiche plus qu'un seul label par
  graduation, centré verticalement. Auparavant deux labels (bord haut + bord bas) qui se
  superposaient dès ~50% de taille de texte.
- **GRADRULE — sélection & bbox** : la règle est dessinée vers le haut (monde y ∈ [y, y+width]) ;
  le `hitTest` et la bbox suivent désormais le rendu (avant : décalés de la hauteur, règle
  difficile à sélectionner). `getEntityBBox` utilise la bbox exacte des entités de plugin.
- **Export PDF — entités sans segments** : la zone imprimée (auto-ajustée) inclut désormais
  les entités qui ne produisent pas de segments (cercle, arc, texte, disque/règle gradué…)
  via `getEntityBBox`, et ignore les calques masqués. Elles n'étaient plus rognées/exclues.
- **Cote angulaire — sélection des lignes recouvertes par une cote** : la pioche des
  2 lignes filtre désormais les entités line-like (`hitTest(..., _isDimAngLineCandidate)`),
  donc une cote angulaire déjà posée (arc, lignes d'attache) n'intercepte plus le clic.
  On peut enchaîner plusieurs cotes angulaires partageant une même ligne sans difficulté.
- **TRIM ne fragmente plus le reste de l'entité** : la coupe se fait uniquement aux
  2 intersections adjacentes au clic (ligne, arc, cercle, ellipse, polyligne ouverte) ;
  cercle et ellipse fermée laissent désormais UN seul arc au lieu de N morceaux
- **TRIM ellipse fermée** : la couture 0/2π n'est plus traitée comme une extrémité
  (l'ellipse complète stocke 0..2π — la détection alignée sur celle du rendu)
- TRIM cercle : les propriétés d'apparence (couleur, type de ligne…) sont conservées
  lors de la conversion en arc ; un cercle exige 2 points de coupe minimum
- **TRIM rect/polygone/polyligne avec une ellipse comme limite** : l'ellipse était
  ignorée comme limite de coupe (« aucune intersection trouvée »)
- Sélection fenêtre (G→D) : bbox serrée (la marge de culling faussait l'inclusion)
- Sélection d'une polyligne en cliquant sur un **arc** (bulge)
- **EXPLODE** : arcs de polyligne qui s'inversaient (sens de bulge)
- Cotes : sélection d'objet (Espace) pour DIMLINEAR/DIMALIGNED ; hit-test des cotes alignées

### Modifié
- Format de sauvegarde `.mcad` : version `0.1`
- README mis à jour (Présentations, propriétés objet/calculées, OSNAP ellipse, cloud kDrive,
  commandes : RECTCENTER, POLYGON, ELLIPSE, ARRAY_POLAR, GROUP/UNGROUP, AREA, MESURER,
  CALC, LIST, LOAD, MATCHPROP…)

---

## [0.09] — 2026-05-30

### Ajouté
- **ARC multi-mode** — commande ARC refaite comme un logiciel de CAO, 4 modes de tracé
  - **3P** (défaut) : 3 clics — P1 départ, P2 milieu, P3 fin (arc par circumcercle)
  - **S,C,E** : taper `C` après P1 — P1 départ → Centre → P3 fin (CCW)
  - **S,C,A** : taper `A` après le centre — angle inclus en degrés au clavier
  - **S,E,R** : taper `E` après P1 — P1 départ → P2 fin → rayon au clavier (négatif = arc majeur)
  - Mots-clés `C`, `E`, `A` interceptés dans la bulle DI avant le parsing de distance
  - Preview live pour chaque mode (rubber-band, arc 3P, arc SCE, corde SER)
  - Poignées grip départ et fin ajoutées (change l'angle de début/fin)
- **Système démo** — démonstration automatique des fonctions dans le navigateur
  - `demo/demo_sequence.js` — séquence indépendante, injectée par le build
  - `build.py --demo` — génère `minicad_demo.html` (minicad.html inchangé)
  - Curseur MiniCAD réel animé (`S.mouseScreen` + `render()` frame par frame)
  - Dot flottant pour naviguer dans la barre d'outils (flash doré sur chaque bouton)
  - Sélection visuelle du style de cote 1:10 dans le panneau latéral
  - Correction FILLET : raccourcissement des deux lignes aux points de tangence
  - Bouton **▶ DÉMO** visible sur `minicad.html` → redirige vers `minicad_demo.html?demo`
  - Bouton **✕ Sortir du mode démo** pendant la séquence
- **Build séparé** — `python3 build.py --demo` écrit dans `minicad_demo.html`, jamais dans `minicad.html`
  - Les bibliothèques sont toujours injectées dans `minicad.html` quelle que soit la commande
  - `BUILD.md` documenté

---

## [0.08] — 2026-05-28

### Ajouté
- **DXF Export — réécriture complète AC1015**
  - Sections requises : HEADER (extents réelles), CLASSES (vide), TABLES, BLOCKS, ENTITIES, OBJECTS
  - Marqueurs `AcDb*` sur toutes les entités (requis DXF R2000)
  - DIMENSION : `dim_linear` → `AcDbRotatedDimension`, `dim_aligned` → `AcDbAlignedDimension`, `dim_angular` → `AcDb2LineAngularDimension`, `dim_radius` → `AcDbRadialDimension`, `dim_diameter` → `AcDbDiametricDimension`
  - LEADER + MTEXT (repère avec texte RTF)
  - Wall → LWPOLYLINE fermée (2 segments + fermeture)
  - Hatch → HATCH AC1015 (boundary path + PATTERN)
  - Tube → lignes (parois) + arcs (coudes)
  - XLINE → RAY (DXF natif)
- **DXF Import — amélioré**
  - SPLINE : priorité aux fit points (code 11/21) sur les control points (10/20)
  - XLINE, RAY : entités importées en tant que `xline`/`ray` MiniCAD
  - DIMENSION : routage vers `dim_linear`, `dim_aligned`, `dim_angular`, `dim_radius`, `dim_diameter` selon le code 70
  - LEADER + MTEXT : import avec nettoyage du RTF (`{\f...}`, `\P`, `\~`)
  - HATCH : reconstruction du contour depuis les `LINE` edges de la boundary path
  - POINT : importé comme `point` MiniCAD
  - Polyline fermée (flag 1) → `closed: true`
- **SPLINE** — outil de dessin (Catmull-Rom), bouton dans la barre d'outils après POLYLINE
- **XLINE** — ligne infinie depuis le centre (dans les deux directions), bouton barre d'outils
- **RAY** — demi-droite depuis le point cliqué vers la souris
- **RAY_REV** — demi-droite inverse (direction opposée)
- **Bibliothèque IPN** — profils IPN 80→600 (SN EN 10365:2017) avec fonction de dessin

### Corrigé
- DXF export : sections BLOCKS et OBJECTS manquantes → rejet par les logiciels de CAO

---

## [0.07] — 2026-05-26

### Ajouté
- **DIVIDE / DIVISER** — divise une entité (ligne, arc, cercle, polyligne) en N segments égaux par des points
  - Commandes : `DIVIDE` / `DIV` / `DIVISER`
  - Sélectionner d'abord l'entité OU cliquer après la commande
  - Bouton barre d'outils
  - Export DXF (entité POINT)
- **POINT / PT** — placement manuel d'un point ; forme configurable (`cross` / `x` / `dot`)
  - Bouton barre d'outils
  - Export DXF (entité POINT)
- **Styles de cote** — remplacement des 3 styles ISO par 7 styles basés sur l'échelle du dessin
  - `1:1` (texte 4 mm) → `1:100` (texte 100 mm) avec flèches et attaches proportionnelles
  - Migration automatique depuis localStorage si anciens styles ISO-25 / ISO-35 / ISO-50 détectés
- **FILLET / CHAMFER sur rectangle** — raccord et chanfrein sur les coins d'un rectangle
  - Conversion automatique rect → polyligne lors du raccord (undo restaure le rectangle)
- **STRETCH amélioré**
  - Cercles et arcs : si le centre est dans la fenêtre croisante → déplacement complet
  - Rectangle de sélection masqué dès la fin de la fenêtre croisante (plus de résidu visuel)
- **LEADER lié au style de cote**
  - Taille de texte, flèche et attache suivent le style de cote actif (`getDimStyle`)
  - Stocke `dimStyle` à la création ; sélecteur dans le panneau Propriétés
  - Texte aligné gauche/droite + ligne d'épaulement selon la direction du repère
  - HitTest couvrant la ligne d'épaulement et la zone du texte
  - Double-clic sur le texte → dialogue d'édition avec taille de police du style

### Corrigé
- **EXPLODE polyligne** — tous les arcs (bulge ≠ 0) sont correctement reconstruits ; auparavant seul le premier arc était conservé
- **TUBELBL suit le tube** — `offsetEntity` déplace maintenant aussi `labelX`/`labelY` du tableau de nomenclature lors de MOVE, COPY, STRETCH et grip
  - Helpers `applyMove` / `applyCopy` créés pour propager le déplacement aux entités liées (`linkedTubeId`)
- **ESC** — ferme les popups (Styles de cotes, Gestionnaire de calques, Éditer tube, Hachures, Impression, Préférences, Réseau) et annule la sélection caoutchouc en cours ; remet le focus dans la barre de commande
- **Focus barre de commande** — ESC hors infobulles DI replace toujours le curseur dans la ligne de commande
- **Sélection sans délai** — hitTest exécuté dès `mousedown` pour feedback immédiat ; sélection caoutchouc démarrée en `mouseup` pour éviter la finalisation instantanée
- **Bulle DI ne capte plus les clics canvas** — `pointer-events: none` sur `#dynamic-input`, `auto` sur `.di-input` uniquement
- **LEADER** — texte positionné gauche/droite selon la direction ; hitTest couvre la zone texte ; double-clic sur le texte ouvre le dialogue d'édition

---

## [0.06] — 2026-05-21

### Ajouté
- **HATCH** — hachures sur contour fermé (polyligne, rectangle, cercle)
  - Patterns : `lines` (lignes parallèles) et `cross` (croisé)
  - Angle et espacement configurables via dialogue
  - Rendu dynamique par algorithme scanline (`computeHatchLines`) — aucun stockage de segments
  - HitTest point-in-polygon, grip centroïde pour déplacement
  - Commandes : `HATCH` / `H` / `HACHURE`
- **Sélection additive** pour MOVE/COPY/ROTATE/SCALE/MIRROR/OFFSET
  - Clic = toggle (ajoute si absent, retire si déjà sélectionné), sans Shift
  - Clic dans le vide = ne vide pas la sélection
  - Curseur `pick` (carré) pendant la sélection
- **OFFSET refactorisé** — workflow identique à MOVE
  - Sélection multiple → Entrée → clic du côté → décale tous en une fois
  - Ghost preview pour tous les objets sélectionnés simultanément
  - Retour automatique en mode sélection après chaque décalage
- **Distance OFFSET par clic canvas** — curseur croix dès la saisie de distance, 2 clics définissent la distance (preview ligne orange avec valeur en direct)
- **Clic droit = Entrée** — fonctionne pour tous les états pending, drawing actif, JOIN, TRIM/EXTEND

### Ajouté (session 2026-05-21 — suite 2)
- **Preview déplacement (move_obj)** — ghost pointillé identique à la preview COPY pendant le déplacement en cours
- **Grip → Espace → Déplacer** — Space intercepté avant tout early-return de keydown ; base point pré-rempli depuis la poignée, pas de demande de point de base
- **OSNAP Extension (partiel)** — infrastructure posée (acquisition, snap, trail pointillé), désactivé par défaut ; non fonctionnel, à terminer (voir TODO)

### Ajouté (session 2026-05-21 suite)
- **FILLET R=0** — raccord en angle vif (sans arc) : raccorde deux lignes/polylignes au point d'intersection
- **FILLET sur arc** — raccord entre ligne et arc de cercle (R=0 et R>0)
  - R=0 : tronque/prolonge les deux entités à leur intersection
  - R>0 : calcule le cercle de raccord tangent à la ligne (dist R) et à l'arc (dist r±R), insère l'arc de raccord
  - Helpers : `circleCircleIntersect`, `trimArcToPt`, `trimEntCorner`, `applyFilletWithArc`
  - `getHitSeg` étendu au type `arc`

### Corrigé (session 2026-05-21 suite)
- **Sélection par clic (hitTest)** — priorité par distance minimale au contour (plus premier-trouvé)
  - Un objet proche du clic bat un objet lointain, peu importe l'ordre de création
  - Hachure : détection sur le contour uniquement (suppression du point-in-polygon)
- **Sélection par fenêtre croisée** (droite→gauche) — géométrie exacte au lieu de bounding box
  - `rect` : intersection avec les 4 bords (Liang-Barsky)
  - `circle` : `circleOutlineCrossesRect` — exclut "boîte dans le cercle sans toucher le contour"
  - `arc` : `arcOutlineCrossesRect` — vérifie la plage angulaire + même correction que cercle
  - `polyline/cable/hatch` : segment par segment
- **Navigation navigateur** — `preventDefault` sur mousedown/mouseup bouton droit empêche le geste "retour"
- **Terminal** — texte sélectionnable et copiable (`user-select:text`)
- **Rubber-band parasite** — flag `_offsetJustApplied` + guard `offsetAwaitDist` dans mouseup

---

## [0.05] — 2026-05-20

### Ajouté
- **Dialogue d'édition tube — colonne L. saisie [REF]**
  - Longueur point-à-point saisie à la création = `straightLen + T_before + T_after` (T = R_ref × tan(φ/2))
  - Varie selon la référence active AXE / EXT / INT
  - Champ éditable : la modification recalcule `straightLen` en soustrayant les tangentes
- **Dialogue d'édition tube — bouton Prévisualiser**
  - Applique les modifications sans fermer le dialogue (identique à Appliquer mais non destructif)
- **Dialogue d'édition tube — longeur développée AXE fixe**
  - Le total affiché en pied de dialogue est toujours l'axe, quelle que soit la référence active
- **Dialogue d'édition tube — sens du coude**
  - Angle toujours positif ; bouton ⟳/⟲ pour inverser le sens
  - Saisie d'un angle négatif → flip automatique du sens + valeur absolue
- **Dialogue d'édition tube — bouton Coter**
  - Crée des `dim_aligned` sur le chemin de référence actif (AXE / EXT / INT)
  - Cotes placées à l'extérieur du tube (côté convexe des coudes)
  - Cotes liées au tube (`linkedTubeId`) : recalculées automatiquement à chaque Appliquer / Prévisualiser
- **JOIN — support des arcs**
  - Un arc peut maintenant être joint avec des lignes et des polylignes
  - Converti en segment bulge (`bulge = tan(dθ/4)`) dans la polyligne résultante
  - Rendu courbe exact via `drawPolyArcSegToPath` (déjà supporté)

### Corrigé
- **JOIN — perte du bulge à la concaténation**
  - `pts.slice(1)` ignorait le bulge stocké sur `pts[0]` → transfert sur le point de jonction dans `allPts`

---

## [0.04] — 2026-05-19

### Ajouté
- **Tableau de nomenclature tube** (commande `TUBELBL` / alias `TUBTAB`)
  - Affiché automatiquement à la fin du tracé TUBE
  - Contenu : en-tête D/R, lignes longueur droite + angle de coude, longueur développée totale
  - Longueur développée = Σ longueurs droites + Σ arcs d'axe (R × angle_rad pour chaque coude)
  - Taille fixe dans le dessin (unités monde × zoom) — suit le zoom comme les cotes et textes
  - Poignée déplacement (carré cyan, coin haut-gauche) via le mécanisme grip standard
  - Poignée redimensionnement (triangle bas-droit) : `e.labelScale` de 0.4× à 8×
  - Clic sur le tableau sélectionne l'entité tube (`hitTest` étendu)
  - `TUBELBL` sur un tube sélectionné bascule l'affichage on/off
- **Correctifs preview TUBE en mode EXT/INT**
  - Le preview multi-tronçons était en biais : les bisectrices miter n'étaient pas recalculées à la jonction entre points confirmés et point souris
  - Fix : `applyTubeRefOffset([...S.tubePoints, [tx,ty]], tr, ref)` — le point souris est inclus pour un bisecteur correct à chaque jonction
- **Correctif DI — distance écrasée lors du Tab**
  - `blur` sur `diDist`/`diAngle` réinitialisait `S.diLocked = false` même lors d'un Tab entre les deux champs DI
  - Fix : `ev.relatedTarget` — on ne déverrouille que si le focus sort des deux champs
- **Correctif terminal TUBE — angle ignorait la contrainte polaire**
  - Saisie d'une distance dans le terminal utilisait `S.mouseWorld` brut sans `applyConstraint`
  - Fix : `applyConstraint` appliqué avant calcul de l'angle de direction
- **Preview DI verrouillée** — quand l'utilisateur a tapé une distance (`diLocked=true`), le preview tube affiche la distance exacte saisie (direction suit la souris)
- **EXTEND amélioré** — mode tout prolonger (analogue au mode tout couper de TRIM) + correction bug « grille comme point de prolongement » (`getExtendTsForLine` : paramètre `s` contraint à [0,1])

### Ajouté (session précédente dans 0.04)
- **Système de préférences utilisateur** (commande `PREFS` / menu Fichier → Préférences…)
  - Dialogue graphique : accrochage & grille, contraintes, tube, style de cote
  - Paramètres mémorisés : SNAP on/off, taille grille, grille visible, OSNAP (on/off + 8 modes), Ortho, Polaire, incrément polaire, Ø tube, R coude, référence tube, style de cote, calques par défaut
  - **Stockage hybride** : `localStorage` (`minicad_user_prefs`) comme cache rapide + bloc `USER_PREFS` encodé dans le HTML pour portabilité inter-ordinateurs
  - Marqueurs `===USER_PREFS_START===` / `===USER_PREFS_END===` dans le script pour remplacement par regex lors d'un export HTML personnalisé
  - Export préférences → fichier `.json` (File System Access API ou téléchargement fallback)
  - Import préférences depuis `.json`
  - Réinitialisation aux valeurs par défaut
  - Auto-sauvegarde silencieuse dans localStorage à chaque toggle (SNAP, OSNAP, ORTHO, POLAR)
  - Chargement des préférences au démarrage (avant `loadFromLocalStorage`)
- **TRIM amélioré** — refonte complète du workflow
  - **Multi-limites** : sélection de plusieurs entités limites (tableau `S.trimCuttingIds[]`), toutes surlignées en orange
  - **Workflow 2 étapes** : étape 1 = sélection limites (clic toggle) → Entrée ou clic droit → étape 2 = coupe ; clic droit en étape 2 = quitter
  - **Mode tout couper** : Entrée ou clic droit sans limite sélectionnée → toutes les entités visibles deviennent limites (comportement CAO)
  - **Entités limites découpables** : une entité peut être à la fois limite et objet à couper (coupée par les autres limites)
  - **Cercle découpable** (`circle`) : découpe → remplace l'entité par un ou plusieurs `arc`
  - **Rectangle découpable** (`rect`) : découpe → converti en polyligne fermée puis découpé normalement
- **Bouton "Télécharger MiniCAD"** sur minicad.org
  - Bouton flottant fixe, coin bas-droit, au-dessus de la statusbar
  - Visible uniquement si `window.location.hostname` est `minicad.org` ou `www.minicad.org`
  - Lien direct `<a download>` vers `minicad.html` — télécharge le fichier servi

### Corrigé
- **Dialogue préférences** — fond transparent (variable CSS `--panel` inexistante) remplacé par `#1a1a2e` opaque
- **DIMRADIUS / DIMDIAMETER** — double-clic pour éditer le texte ne fonctionnait pas
  - `hitTest` calculait la position du texte différemment de `drawEntity` → zone de détection au mauvais endroit
  - Corrigé : position text grip = `cx + r*0.55*cos(a)` pour radius, `cx/cy` pour diameter (identique au rendu)
  - Tolérance agrandie à `tol*6` pour couvrir le texte rotatif

---

## [0.03] — 2026-05-19

### Ajouté
- **Impression avec sélection de zone** (Ctrl+P / menu Fichier / commande `PRINT`)
  - Dialog : format papier (A4/A3/A5/Letter), orientation, échelle (Adapter / 1:1 / 1:2 … 1:100), titre optionnel
  - Sélection de zone par rubber-band (cliquer-glisser orange) via outil `print_window`
  - Sans zone définie : impression de l'étendue de toutes les entités
  - Rendu off-screen sur fond blanc → popup navigateur → `window.print()` automatique
  - Bouton 🖨 dans la toolbar fichier
- **EXPLODE tube** — éclater un tube en lignes (parois) et arcs (coudes)
- **LEADER éditable** — double-clic ouvre la fenêtre de texte pour modifier le texte du repère
- **Outil TUBE** — tube 2 parois + axe trait-point
  - Mode graphique : cliquer les points du tracé (comme polyligne), Entrée/clic-droit/Échap pour terminer
  - Mode formule : `TUBE 1000+90R67+500` ou `TUBE 1000+90+500R67` (global R en fin)
  - Coudes calculés par tangentes : longueurs droites = longueur réelle − T (T = R·tan(φ/2))
  - Rendu : 2 traits pleins (parois) + 1 trait-point [8,3,2,3] (axe)
  - Commandes : `TUBE [formule]`, `TUBED <Ø>` (diamètre), `TUBEBR <R>` (rayon de coude), `TUBREF AXE|EXT|INT`
  - Défauts : Ø 40 mm, R coude 67 mm
  - Bouton dans la toolbar Dessin (icône 2 traits + tirets) + boutons AXE/EXT/INT
  - Entité `tube` : `startX/Y`, `startAngle`, `tubeRadius`, `segments[]`
  - Sélection/déplacement/copie/grip fonctionnels
- **TUBE — Référence de tracé EXT/AXE/INT** (v0.03 finale)
  - `TUBREF AXE` : tracé sur l'axe (défaut)
  - `TUBREF EXT` : tracé sur la paroi extérieure — tube entièrement à l'intérieur du tracé
  - `TUBREF INT` : tracé sur la paroi intérieure — tube entièrement à l'extérieur du tracé
  - `applyTubeRefOffset()` : décalage par point exact avec bisectrice miter (angle quelconque)
  - Détection automatique CW/CCW du tracé pour choisir le bon côté
  - Preview pendant le tracé reflète l'offset EXT/INT
- **TUBE — Bulles Dynamic Input** sur tous les tronçons (pas seulement le premier)
  - `ev.stopPropagation()` empêche le bubble de Enter vers le document après `diDist.blur()`
- **TUBE — OSNAP sur les parois**
  - ENDPOINT : extrémités des parois + axe, entrée et sortie de chaque coude
  - MIDPOINT : milieux de chaque paroi et de l'axe
  - NEAREST : projection sur chaque paroi (axe + wall+ + wall−)
  - PERPENDICULAR : projection perpendiculaire sur chaque paroi
- **DIMRADIUS / DIMDIAMETER redessiné**
  - Texte positionné le long du trait radial (rotation correspondante), plus de queue après la flèche
  - Texte déplaçable via une poignée dédiée (`textWx`, `textWy`)
  - Poignée bord : change l'angle sans déplacer le texte

### Corrigé
- **DIMANGULAR — nouveau workflow** : cliquer ligne 1 → cliquer ligne 2 → choisir le côté au clic
  - Remplacement de l'ancien workflow sommet + 2 rayons (4 clics) par 3 clics
  - `lineIntersect()` : calcul exact de l'intersection des deux droites (vertex automatique)
  - `_dimAngSector()` : parmi les 4 secteurs angulaires, sélection par position souris
  - Surlignage orange de la 1ère ligne pendant la sélection de la 2ème
  - Aperçu live de l'arc et de la valeur d'angle pendant le déplacement de la souris
  - Curseur `pick` (carrée) pendant la sélection des lignes, `draw` pour le placement
  - Correction du bug de sélection : `hitTest()` utilisé directement (au lieu de `entities.find()` qui ignorait le 3ème argument)
- **DIMANGULAR invisible à certains niveaux de zoom** — `getEntityBBox` utilisait `e.cx/e.cy` (undefined pour les cotes angulaires) au lieu de `e.vx/e.vy` → entité culled à tort
- **DIMANGULAR flèches pointaient vers l'extérieur** — inversion des signes ±π/2 pour les deux têtes de flèches
- **TUBE OSNAP manquant après les coudes** — `getTubeSnapPoints` n'ajoutait pas le point de début de chaque tronçon droit (= sortie de coude)
- **TUBE DI Enter bloqué après le premier tronçon** — `ev.stopPropagation()` ajouté aux handlers keydown de `diDist` / `diAngle`

### Connu / À améliorer
- **TUBE preview EXT/INT** — en mode multi-tronçons, le dernier point confirmé peut légèrement se déplacer lors du changement d'angle du tronçon suivant (bisectrice dynamique). La position finale à la validation (Enter) est correcte.

---

## [0.02] — 2026-05-17

### Ajouté
- **Gestionnaire de calques** (fenêtre dédiée style CAO)
  - Panneau gauche simplifié : liste cliquable pour changer de calque actif
  - Bouton "⊞ Gérer les calques…" → dialogue complet avec couleur, nom, visibilité, épaisseur ISO (0.13→1.00 mm), type de ligne (5 types), suppression
  - `refreshLayerManager()` : mise à jour en temps réel sans fermer le dialogue
- **Transfert d'entités entre calques**
  - Sélectionner objets → cliquer un calque dans le panneau → les objets changent de calque
  - Indicateur visuel et curseur crosshair quand une sélection est active
  - Message terminal confirme : `3 entités → calque 1 - Construction`

### Corrigé
- **Grip editing sur cotations** : poignées (flèches + texte) désormais accrochables
  - Hit test utilise les coordonnées brutes avant OSNAP — l'OSNAP voisin ne peut plus dévier le clic
  - Tolérance d'accroche : 8 → 10 px
  - Flag `_gripJustConfirmed` : le `mouseup` après confirmation de grip ne démarre plus une sélection fenêtre parasite

---

## [0.01] — 2026-05-16

### Ajouté
- **Commandes FILLET / CHAMFER** (alias F/RACCORD, CHA/CHANFREIN)
  - Raccord arrondi et chanfrein entre deux lignes/murs
  - Saisie du rayon pendant l'outil : `R` → nouveau rayon, ou taper directement un nombre
  - Saisie des distances chanfrein : `D` → D1 puis D2
  - Boutons dans la barre d'outils "Modifier"
- **Polices ISO** : Share Tech et Oswald dans le dialogue texte
- **Symboles typographiques** : boutons Ø ° ± ² ³ × ≤ ≥ au-dessus du champ texte
- **Prévisualisation texte** en temps réel sur le canvas pendant le paramétrage
- **Double-clic** sur un texte existant → édition (dialogue avec valeurs actuelles)
- **Polylignes** : segments confirmés visibles en couleur pendant le dessin
- **DI auto-focus** : le curseur va automatiquement dans la bulle distance/angle pendant le dessin
- **Barres d'outils Architecture et Électricité** : boutons WALL, DOOR, WINDOW, OUTLET, SWITCH, CABLE

### Corrigé
- Arc de raccord (FILLET) apparaissant du mauvais côté (`trimLineToPt` : comparaison dot1 vs dot2)
- Espace bloqué dans les champs de saisie du dialogue texte
- Angle DI ne se mettant pas à jour pendant le tracé

---

## Versions préliminaires (historique de développement interne)

> Les versions ci-dessous sont les itérations internes de développement antérieures à la mise en place du versionnage public 0.01. Le contenu est conservé à titre d'historique.

### [3.6] — 2026-05-15

#### Ajouté
- **Commande OFFSET** (alias O, DECALER)
  - `OFFSET [distance]` → active l'outil avec la distance donnée (défaut: 10)
  - Cliquer l'objet à décaler (hover blanc, entité sélectionnée orange)
  - Cliquer du côté voulu → entité parallèle créée (ghost en pointillés pendant hover)
  - Mise à jour de la distance en tapant un nombre dans le terminal pendant l'outil
  - Support : ligne, mur, arc, cercle, rectangle, polyligne, câble
  - Mathématique polyligne : offset de chaque segment + recalcul des intersections de coins

---

### [3.5] — 2026-05-14

#### Ajouté
- **Historique de commandes terminal** (↑↓)
  - `↑` rappelle la commande précédente, `↓` avance vers la plus récente / vide le champ
  - Limité à 50 entrées, pas de doublons consécutifs
  - Curseur positionné en fin de champ lors de la navigation

---

### [3.4] — 2025-05-14

#### Modifié
- **Menu Fichier** converti en menu déroulant avec toutes les commandes :
  Nouveau / Ouvrir… (Ctrl+O) / Sauvegarder (Ctrl+S) / Sauvegarder sous… / Exporter DXF
- **Toolbar Fichier** épurée : suppression des boutons DXF, DWG, SVG — ne reste que 📂 et 💾

---

### [3.3] — 2025-05-14

#### Ajouté
- **Auto-save localStorage** — sauvegarde automatique à chaque modification
  - F5 restaure le projet automatiquement au rechargement
  - `beforeunload` sauvegarde aussi les changements de config (calques, modules)
- **File System Access API** (Chrome/Edge) — Ctrl+S écrit dans le même fichier sans télécharger
  - 1er Ctrl+S : dialogue de choix du fichier de destination
  - Appels suivants : écriture silencieuse dans ce fichier
  - Fallback téléchargement pour Firefox/Safari
- **Indicateur d'état** dans la barre de titre : `● NOUVEAU` / `● MODIFIÉ` / `● SAUVEGARDÉ`
- **SAVEAS** force le choix d'un nouveau fichier de destination
- **CLEAR/NOUVEAU** efface aussi la sauvegarde localStorage

#### Corrigé
- OSNAP endpoint désormais détecte les extrémités des arcs

---

### [3.2] — 2025-05-14

#### Ajouté
- **Sélection par fenêtre (rubber-band)**
  - Drag gauche→droite : fenêtre (rectangle cyan plein) — entité doit être entièrement dedans
  - Drag droite→gauche : croisement (rectangle vert pointillé) — entité intersectant suffit
  - Shift+drag pour ajouter à la sélection
  - Message terminal indiquant le mode et le nombre d'objets sélectionnés

---

### [3.1] — 2025-05-14

#### Ajouté
- **Grip editing complet** : poignées bleues sur tous les types d'entités
- **Dynamic Input** type CAO : bulle D/A éditable près du curseur
- **Polaire tracking** (F10) avec incrément configurable (`POLAR [angle]`)
- **Export DXF AC1015** complet avec HEADER + TABLES + entités
- **Import DXF** avec LWPOLYLINE, POLYLINE/VERTEX, SPLINE, ELLIPSE, DIMENSION
- **Export DWG** (DXF renommé .dwg)
- **Toolbars drag & drop** dock/float avec menu contextuel clic-droit
- **Module Cotation** complet : DIMLINEAR, DIMALIGNED, DIMANGULAR, DIMRADIUS, DIMDIAMETER
- **Module Annotation** : TEXT, LEADER

---

### [2.0] — 2025-04-xx — Architecture + Électricité

#### Ajouté
- **Module Architecture** : Mur (épaisseur configurable), Porte (arc+ligne), Fenêtre
- **Module Électricité** : Prise, Interrupteur, Câble (pointillé)
- **Module Cotation** (v1) : DIMLINEAR, DIMALIGNED
- **OSNAP** v1 : endpoint, midpoint, center, nearest, intersection
- **Ortho** (F8)
- Sauvegarde/ouverture JSON natif (.mcad)

---

### [1.0] — 2025-03-xx — Version initiale

#### Ajouté
- Canvas 2D avec zoom molette et pan clic-milieu
- Grille + snap
- Outils de base : Ligne, Rectangle, Cercle, Arc, Polyligne
- Sélection, Déplacer, Copier, Supprimer
- Undo/Redo (50 niveaux)
- 4 calques avec couleur et visibilité
- Terminal de commandes (alias CAO standard)
- Export SVG basique
- Interface dark theme JetBrains Mono

---

## À venir — voir [docs/action.md](../docs/action.md)
