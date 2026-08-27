# TODO — MiniCAD

Tâches classées par priorité. Cocher quand terminé, déplacer en CHANGELOG.

---

## 🔴 Priorité haute (prochaine session)

- [x] **Export DXF compatible AutoCAD** ✅ — blocs de géométrie `*Dn` des cotes, styles de
      cote réels, ellipses, encodage ASCII, calques dédoublonnés.
      Non-régression : `python tests/dxf_export_test.py` (nécessite `pip install ezdxf`).
- [x] **4.3 — Menu contextuel** clic-droit canvas (Couper/Copier/Coller/Propriétés) ✅
- [ ] **3.4 — Commande EXTEND** *(multi-limites fait, mode tout prolonger fait — vérifier cas limites)*
- [x] **5.2 — Commande AREA** (surface d'un polygone) ✅

---

## 🟡 Priorité moyenne

- [x] **Connexion cloud kDrive (Infomaniak)** — ouvrir/enregistrer les `.mcad` sur kDrive ✅ (MVP)
  - CORS bloqué → proxy **Cloudflare Worker** ; auth par token API (scope Drive)
  - Ouvrir/enregistrer, navigateur (créer/renommer dossier), `Ctrl+S` → kDrive
  - Plan : [plan_cloud_kdrive.md](plan_cloud_kdrive.md). À faire plus tard : OAuth2 PKCE, conflits d'édition

- [ ] **Présentations (espace papier)** — onglets Objet/Présentation, fenêtres à l'échelle, cartouche, impression PDF
  - Plan détaillé Phase 1 : voir [plan_presentations.md](plan_presentations.md) (≈ 600–700 lignes)
  - En cours : étape 1 (données + persistance) + étape 2 (onglets + feuille)

- [x] **Cotes vraiment associatives (DIMASSOC)** ✅ — lien capturé à la création via accroche
  OSNAP-sommet (extrémité/milieu/centre/quadrant) ; recalcul auto après stretch/grip/move/
  scale/rotate (`refreshAssocDims`). Remap à la copie/collage, abandon au miroir, hôte
  supprimé = cote figée (pas de crash). Limites connues : accroches *calculées*
  (intersection/perp/tangente) non associatives ; EXPLODE de l'hôte (rect→polyligne) rompt
  le lien ; déplacer une cote associative seule la recale sur l'hôte (régler l'offset par poignée).

- [ ] **OSNAP Extension** — prolongement de ligne/polyligne (EXT comme un logiciel de CAO)
  - Acquisition du point d'extrémité au survol (marqueur "+")
  - Ligne pointillée sur le prolongement, snap au croisement
  - Implémenté partiellement (v0.06) — ne fonctionne pas correctement, à reprendre

- [ ] **HATCH V2 — Détection de frontière multi-entités**
  - Clic dans une zone délimitée par plusieurs lignes/arcs qui se croisent (pas une entité fermée unique)
  - Lancer de rayons depuis le point cliqué → trouver les intersections les plus proches → reconstruire le contour fermé
  - Similaire au "Pick Points" de CAO

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
  - Concept CAO : espace papier + espace modèle
  - Plusieurs vues du dessin sur une même feuille, chacune avec sa propre échelle et calques
  - Cadres de fenêtres paramétrables (position, taille, échelle, rotation)

---

## 🟢 Priorité basse / Futur

- [ ] **REFEDIT — Éditer un bloc** en place (double-clic pour entrer dans le bloc)
- [ ] **4.5 — Zoom fenêtre** (sélection zone)
- [ ] **4.7 — Sélection par type** (SEL LINE etc.)

---

## ✅ Terminé (résumé)

- ✅ **Amorce : angle exporté relatif au sens de parcours (réserve #4 refermée)** — retour
  terrain (2026-08-27, captures MiniCAD + SC2000) : *« ok côté minicad c'est bon […] par contre
  si j'exporte le chf et que je l'importe les amorces changent d'angle »*. Preuve croisée :
  `laser_6mm.chf` (produit **par le SC2000**, 38 graphes de formes différentes) écrit
  `90.000000` sur les 38 — impossible avec un angle absolu ; `export_corrigé.chf` (validé
  machine) écrit `90.000000` sur ses trous ; notre ancien export écrivait l'absolu (180) et
  coupait faux. Une **première** correction (`absolu − parcours`) était encore fausse — cercle
  juste, rectangles faux au second retour terrain — car calée sur un seul échantillon à 90°, où
  3 des 8 conventions coïncident. Formule exacte par **élimination croisée** sur 4 contraintes
  physiques (amorces activées/**désactivées** du fichier natif + le seul échantillon non-90°,
  20.074123°, du fichier validé machine) : **`angle écrit = parcours − absolu + 180`**, soit
  l'angle *entre le trait d'amorce et le contour* (90° = perpendiculaire — d'où le défaut
  universel), point d'amorçage à gauche du parcours. Implémentée dans `_chfExportLeadAngle`
  (normalisé `[0,360[`), consommée par `_chfBuildGuideCurve` seul ; `_chfTravelTangent` honore
  `_chfReverse` **aussi sur un cercle** (`_chfCircleStart().dir`). Aperçu MiniCAD strictement
  intact comme demandé. Headless 159/159, dont l'invariant aller-retour `parcours − écrit + 180
  == absolu prévisualisé`. ⚠ Sur un cercle les deux formules coïncident toujours : ne jamais
  valider cette convention sur un cercle seul. ⚠ Signe (CCW positif) = hypothèse ; miroir = un signe.
- ✅ **Amorce : choix de l'angle supprimé, direction 100 % calculée par le plugin** — retour
  terrain (2 captures, 2026-08-27) : *« les amorces intérieur (trous) doivent aller en
  direction du centre. et dans tout les cas l'amorce ne doit pas être par dessus un trait de
  la pièce. enlève le choix de l'angle. c'est au plugin de trouver la meilleure solution »*.
  Cause racine : sur un coin de polygone, la perpendiculaire à une arête est colinéaire avec
  l'arête voisine. Corrigé par bissectrice extérieure au sommet (perpendiculaire seulement en
  milieu d'arête) + contrôle anti-collision qui pivote par pas de 10° (±80°) jusqu'à dégager
  le segment de tous les contours du dessin. Champs Angle (toolbar + propriétés simple/multi),
  `_chfPropLeadAngleMulti` et `_chfLeadManual` supprimés ; `CHFSTART`/`CHFSTARTAUTO` ne
  fixent plus que la longueur. `_chfAutoLeadAngle` devient la seule source de vérité, partagée
  par l'aperçu et l'export → plus de divergence possible. Vérifié headless (153/153).
  ⚠ Change l'angle exporté : à re-tester sur chute avant une pièce définitive.
- ✅ **Détection auto extérieur/trou par imbrication abandonnée (CHFCOMP/CHFSTARTAUTO) — valeur/
  angle toolbar désormais appliqués uniformément** — retour terrain réel SC2000 (2026-08-27) :
  *« le décalage contre l'intérieur des trous n'était pas sur l'export »* + *« le sens des
  amorces ne correspond pas au dessin, l'angle a l'air de changer »*. Un premier correctif
  (profondeur d'imbrication `_chfNestDepth` calculée sur tout `S.entities` plutôt que la seule
  sélection) s'est révélé insuffisant : il supposait la détection auto extérieur/trou
  globalement correcte, seulement mal comparée. Comparaison fine du fichier que l'utilisateur a
  corrigé à la main, **redécoupé sur le SC2000 et confirmé bon** (`export_corrigé.chf`), contre
  `export.chf` : le fichier validé utilise la MÊME compensation signée et le MÊME angle d'amorce
  brut pour le carré extérieur ET ses 4 trous — la détection auto elle-même était fausse, pas
  seulement sa portée. `CHFCOMP`/`CHFSTARTAUTO` simplifiées en conséquence : valeur/angle
  toolbar appliqués tels quels, uniformément, à toute la sélection, sans aucune détection
  extérieur/trou — suppression du code devenu mort (`_chfNestDepth`, `_chfRepPoint`,
  `_chfPointInContour`, `_chfHoleCenter`) et du sélecteur toolbar Alterné/Binaire.
  **Rend obsolètes les entrées ci-dessous décrivant l'ancien mécanisme d'imbrication/
  Alterné-Binaire** (conservées comme historique de la conception, pas comme comportement
  actuel). Vérifié headless (123/123). Détail complet dans `suivi/CHANGELOG.md` et
  `src/plugins/chf_export.md` (réserve #3) — y compris la réserve restant ouverte sur le mapping
  exact du bloc `<GuideCurve Para>`.
- ✅ **CHFCOMP : sens de l'aperçu pointillé de nouveau sensible à l'imbrication — le fichier
  exporté reste uniforme** — même jour (2026-08-27), suite immédiate de l'entrée ci-dessus :
  l'utilisateur a signalé que « la compensation se fait toujours vers l'extérieur » y compris
  sur les trous ; clarifié après question explicite que c'était l'**aperçu MiniCAD**, pas un
  nouveau test machine contredisant `export_corrigé.chf`. `_chfNestDepth`/`_chfRepPoint`/
  `_chfPointInContour`/`_chfIsHole` et le sélecteur toolbar Alterné/Binaire (`chf-comp-mode`)
  sont donc réintroduits, mais **cloisonnés à `decorateEntity`** (choix du point de référence du
  fantôme) — `_chfApplyCompensationToSelection` ne les appelle jamais, la valeur écrite dans le
  fichier reste la même pour tous les objets. **Nuance l'entrée ci-dessus** : elle reste exacte
  pour le fichier exporté et pour `CHFSTARTAUTO` (toujours sans auto-centrage), mais plus pour le
  sélecteur toolbar Alterné/Binaire ni pour le sens du fantôme `CHFCOMP`, qui redeviennent actifs
  — au rendu seulement. Vérifié headless : 136/136 (13 nouveaux tests dont un scénario carré + 4
  trous répliquant le cas terrain). Détail dans `suivi/CHANGELOG.md` et `src/plugins/chf_export.md`
  (réserve #3).
- ✅ **Amorce : direction de l'aperçu auto-calculée sur contour fermé, export inchangé** — même
  jour (2026-08-27), troisième retour (capture d'écran) : un trou dont le repère de percée
  pointait hors de lui-même au lieu de vers son centre, et un coin de plaque dont le segment
  d'amorce suivait exactement un bord. `_chfLeadInGeom` ignore désormais `_chfLeadAngle` sur tout
  contour fermé et calcule la direction via une nouvelle `_chfEntryOutwardAngle` (perpendiculaire
  à la tangente au point d'entrée, signée par la même détection d'imbrication `_chfNestDepth`/
  `_chfIsHole` que `CHFCOMP` ci-dessus — extérieur s'écarte du contour, trou plonge vers son
  centre). Contour ouvert (ligne, mur...) : comportement inchangé, angle brut toujours utilisé.
  **Portée volontairement limitée au plugin/aperçu** (consigne explicite de l'utilisateur, export
  repris plus tard) : `_chfLeadAngle`, `_chfStartAutoApply`/`CHFSTARTAUTO` et
  `_chfBuildGuideCurve` (export) restent strictement inchangés — un objet fermé peut donc
  temporairement montrer un aperçu qui diverge de l'angle réellement exporté, attendu pour
  l'instant. Vérifié headless : 144/144 (8 nouveaux tests). Détail dans `suivi/CHANGELOG.md` et
  `src/plugins/chf_export.md` (section « Amorce : direction automatique », réserve #3).
- ✅ **Amorce : le picking manuel `CHFSTART` (2ᵉ clic) ne semblait plus tenir compte du point
  cliqué — corrigé** — même jour (2026-08-27), quatrième retour : l'entrée ci-dessus ignorait
  `_chfLeadAngle` sur tout contour fermé sans exception, ce qui écrasait silencieusement l'angle
  posé par le 2ᵉ clic du picking manuel (toujours sur contour fermé en pratique). Corrigé :
  `_chfLeadInGeom` n'invoque l'auto-calcul que si `_chfLeadAngle` n'a **jamais** été fixé
  (`== null`) — valeur par défaut, plus jamais une correction d'une valeur déjà posée par clic,
  saisie ou `CHFSTARTAUTO`. `_chfLeadAngle`/`_chfStartAutoApply`/`_chfBuildGuideCurve` (export)
  inchangés. Vérifié headless : 145/145. Détail dans `suivi/CHANGELOG.md` et
  `src/plugins/chf_export.md`.
- ✅ **`CHFSTART` interactif + `CHFSTARTAUTO` pour le plugin CHF_EXPORT** — `CHFSTART`
  s'adapte désormais à l'état de la sélection : rien sélectionné → arme la boîte de
  sélection (`S._chfStartPending`, patron `EXPLODE`/`GROUP`/`CHFCOMP`) ; objet valide
  sélectionné → picking du point de départ (1 clic) enchaîne automatiquement sur un 2ᵉ
  clic qui trace longueur/angle de l'amorce à la souris (nouvel outil `chf_leadvector`).
  Nouvelle commande **`CHFSTARTAUTO`** (+ bouton toolbar) : applique en lot
  `_chfLeadLength`/`_chfLeadAngle` à toute la sélection depuis deux nouveaux champs
  toolbar (`chf-start-length`/`chf-start-angle`, défauts **5 mm / 90°**), sans poser de
  point de départ explicite (reste "Auto (défaut)", calculé à l'export). **Bug latent
  découvert et corrigé** (indépendant de cette fonctionnalité mais révélé par elle) :
  `cmdInput` a son propre gestionnaire `keydown` local qui s'exécute avant le
  gestionnaire global `document` (bulle DOM, `cmdInput` a le focus la plupart du temps
  via `smartFocus()`) — un état pending/tool non listé dans les DEUX gestionnaires voit
  son Échap/Entrée absorbé silencieusement par le bloc générique du gestionnaire local
  avant d'atteindre le bon handler. Un premier correctif ajouté uniquement côté global
  passait 28/28 sur une suite basée sur des appels directs mais échouait avec de vrais
  événements clavier — corrigé en ajoutant aussi les 4 nouveaux cas dans la chaîne du
  gestionnaire local. Vérifié par 28 assertions d'état (appels directs) **+ 4 scénarios
  avec de vrais événements souris/clavier simulés via CDP** (ce second passage a
  spécifiquement révélé le bug ci-dessus) + capture d'écran (toolbar rendue
  correctement). Non testé sur machine SC2000 réelle (réserve déjà connue sur le bloc
  `<GuideCurve Para>`, voir entrée `CHFSTART` ci-dessous).
- ✅ **Amorce : repère carré+croix + détection auto trou/extérieur pour `CHFSTARTAUTO`** —
  la prévisualisation de l'amorce affiche un repère carré+croix au point de percée
  (extrémité opposée à la flèche, qui pointe vers l'entrée dans le contour). `CHFSTARTAUTO`
  détecte maintenant trou vs extérieur pour chaque objet rond/rectangulaire de la sélection
  en réutilisant tel quel le mécanisme d'imbrication de `CHFCOMP` (`_chfNestDepth` + même
  sélecteur toolbar Alterné/Binaire, désormais partagé) : un trou pointe automatiquement son
  amorce vers son propre centre, un objet extérieur (ou d'un autre type) garde l'angle
  toolbar. Vérifié par test headless (5 objets dont un cas à double imbrication qui bascule
  correctement entre les deux modes) + capture d'écran recadrée confirmant le rendu du repère
  et le sens des flèches vers le centre des deux trous.
- ✅ **CHFCOMP — Compensation auto (extérieur/intérieur) pour le plugin CHF_EXPORT** —
  nouvel outil dans la barre Export laser : sélectionner des objets, régler un décalage
  (mm) dans un champ toolbar dédié, appliquer — le sens (agrandir/rétrécir) est
  déterminé automatiquement par la profondeur d'imbrication au sein de la sélection
  (cercle : test de distance ; sinon `pointInPolygon`), avec un sélecteur **Alterné**
  (parité, correct dès 3 niveaux — ex. anneau + moyeu) / **Binaire** (extérieur
  seulement si non imbriqué), "Alterné" par défaut — les deux modes proposés à la
  demande explicite de l'utilisateur plutôt que de trancher à sa place. Contours
  ouverts ignorés (comptés dans le message terminal). Ré-exécuter **remplace** la
  compensation, jamais de cumul. `_chfCompensation` devient une valeur signée
  (positif=extérieur, négatif=intérieur) sans changement requis côté export (déjà
  traité comme tel). Prévisualisation pointillée du contour compensé, recalculée à
  chaque rendu (jamais stockée) via `computeOffsetGeom` déjà existant (point de
  référence fixé loin à l'extérieur de la bbox ⇒ signe interne toujours +1, donc le
  signe de `_chfCompensation` seul pilote agrandir/rétrécir). Nouveau hook cœur additif
  **`pluginDecorateEntity(e, ctx)`** (2 points d'appel `drawEntity()`, couches
  statique+dynamique ; contrairement à `pluginExtraPropsHandler`, appelle TOUS les
  plugins ayant un handler `decorateEntity` ; `ctx` passé en paramètre explicite,
  jamais lu comme variable globale) — réutilisable par de futurs plugins. Vérifié
  headless (harness étendu, 66/66 checks dont 19 nouveaux) : divergence Alterné/Binaire
  sur un cas à 3 niveaux, contour ouvert ignoré avec décompte correct, remplacement
  idempotent, signe du fantôme de prévisualisation, imbrication via `pointInPolygon`
  sur des rectangles (pas seulement le raccourci cercle natif). **Réserve inchangée** :
  le sens réel attendu par SC2000 pour la compensation (intérieur/extérieur) n'est
  confirmé par aucun exemple disponible — recommandé de tester sur une chute avant
  toute pièce définitive. Lancer `CHFCOMP` sans sélection arme désormais la boîte de
  sélection (`S._chfCompPending`, patron `EXPLODE`/`GROUP`/`UNGROUP`/`WBLOCK` : curseur
  `'pick'`, Entrée réapplique, Échap annule) au lieu de juste avertir sans rien faire —
  vérifié headless (72/72, 2 nouveaux cas côté plugin ; câblage cœur curseur/Entrée/
  Échap/purge non retesté séparément, identique à un mécanisme déjà éprouvé ailleurs).
  Fantôme pointillé : **flèches de sens de coupe** (`_chfArrowSamples`/
  `_chfDrawDirArrow`/`_chfDrawDirectionArrows`, appelées depuis `decorateEntity` après
  `drawEntity(ghost)`) — 3 flèches sur contour fermé (cercle : 3×120° ; polygone : 3
  points échantillonnés, tangente vers le point suivant), ≤2 sur contour ouvert ; sens
  piloté par `e._chfReverse` (tangente basculée de π). Réutilise `drawArrowHead`/`w2s`
  du cœur (accessibles depuis un plugin car `function`-déclarées ; résolubles à
  l'appel même si leur corps lit `ctx`/`canvasW`/`canvasH`, des `let` de portée module,
  car elles s'exécutent dans leur propre closure). Pas de transform canvas ambiante
  (confirmé via `drawGrips`) : chaque point de flèche passe par `w2s()`. Vérifié
  headless (78/78, 2 nouveaux cas) : nombre de flèches + inversion exacte de π de
  l'angle quand `_chfReverse` bascule, sur cercle et rectangle. **Non vérifié en
  navigateur réel** (blocage `file://` MCP inchangé) : calcul angle/position couvert,
  pas le rendu visuel (lisibilité/taille/chevauchement) — à contrôler dès que possible.
  **`CHFREV`** — icône toolbar (`chf-rev-toggle`) qui bascule `_chfReverse` de chaque
  objet supporté de la sélection **individuellement** (comme `MIRROR`, pas une valeur
  forcée commune comme le select "Sens" en multi-sélection) ; types non supportés
  ignorés (décompte hors message) ; sélection vide → avertit sans armer de boîte de
  sélection (non demandé pour cet outil). Vérifié headless (84/84, 6 nouveaux cas).
  **`CHFSTART`** — amorce de départ (départ hors-pièce puis entrée dans la pièce) :
  nouveaux champs `_chfLeadLength` (mm)/`_chfLeadAngle` (°, monde, 0°=+X CCW+),
  réglables au panneau propriétés (mono + multi-sélection, zéro câblage cœur — le
  mécanisme générique `_propChange` gère déjà n'importe quel champ) et via un nouveau
  bouton toolbar (`chf-start-pick`) qui raccourcit vers le picking manuel déjà
  existant du point de départ. Prévisualisation pointillée (`_chfDrawLeadInPreview`) :
  segment du point d'entrée réel (`_chfEntryPoint`, réutilise `_chfCircleStart`/
  `_chfOrderContourPoints` — même source que l'export, ne peut pas diverger) vers un
  point extérieur décalé longueur/angle, flèche pointant vers l'entrée.
  `decorateEntity` restructuré en deux blocs indépendants (fantôme compensation +
  amorce peuvent coexister). Export : bloc `<GuideCurve Para>` du `.chf` (jusqu'ici
  constant, jamais exploré) construit dynamiquement par `_chfBuildGuideCurve(e)`,
  longueur 0 → comportement inchangé. **RÉSERVE FORTE** (plus incertaine que les 3
  autres réserves du plugin) : mapping des 5 champs du bloc basé sur un **seul point
  de donnée** (un seul graphe de l'exemple d'origine, jamais recoupé sur plusieurs
  graphes ni sur machine réelle) — à tester en priorité sur une chute. Vérifié
  headless (**118/118**, 34 nouveaux cas). **Non vérifié en navigateur réel.**
- ✅ **Plugin CHF_EXPORT — export découpe laser SC2000** (`src/plugins/chf_export.js`, commande
  `EXPORTCHF`/`ECHF`) — format `.chf` rétro-ingénierié (aucune doc publique) à partir d'un fichier
  d'exemple fourni par l'utilisateur (`laser_6mm.chf`, 38 graphes), recoupé avec le manuel SC2000
  V1.00. Trois réglages par objet dans le panneau propriétés (`line, wall, rect, circle, arc,
  polyline, cable, spline, ellipse`) : **Sens** (normal/inversé), **Compensation** (mm), **Point
  de départ** (auto par défaut, ou repositionnable en cliquant sur le contour — contours fermés
  uniquement). Résolution de contour unifiée (`_chfResolveContour`) partagée entre le picking et
  l'export ; tessellation arcs/ellipses par tolérance de corde 0.1mm (cohérent avec la constante
  observée dans l'exemple). Nouveau hook cœur additif `pluginExtraPropsHandler[Multi]` (sœur de
  `pluginPropsHandler`, qui remplace au lieu d'ajouter) — réutilisable par de futurs plugins.
  Vérification algorithmique poussée en headless (harness Node exécutant le vrai code du plugin
  + les vraies fonctions géométriques du cœur extraites de `src/minicad.html`, 47 contrôles) :
  reproduit **exactement** les valeurs numériques de l'exemple (longueur totale, bbox, point de
  départ/fin, code craft) sur les graphes cercle et rectangle-à-encoche ; invariant de chaînage
  dir vérifié y compris avec point de départ manuel mi-segment. **Non vérifié sur machine réelle**
  (aucun logiciel/machine SC2000 disponible) : sens `dir=-1` sur un cercle (l'exemple n'a que des
  cercles `dir=1`), point de départ non-défaut sur un cercle, et le sens (intérieur/extérieur) de
  la compensation. Recommandé : premier essai réel sur une chute, pièce simple, avant toute pièce
  définitive. **Test UI en direct impossible cette session** : le connecteur MCP (`mcp-server/`)
  fonctionne, mais le chargement de *tous* les plugins échoue dans la session live actuelle
  (`Failed to fetch`, y compris pour `gradrule` déjà existant) — probablement le fichier ouvert en
  `file://` plutôt que servi en `http://`, ce qui bloque `fetch()` d'un fichier sibling dans
  Chromium. Pré-existant, sans rapport avec ce plugin — à investiguer séparément.
- ✅ **BLOCK / INSERT** — définitions de blocs nommées et réutilisables (`S.blocks`), entité `insert` (position/angle/échelle propres par instance). `BLOCK [nom]` sur une sélection + point de base ; `INSERT nom` pour poser une nouvelle instance, ou `INSERT` sans argument pour ouvrir une popup (liste des blocs du dessin + import de blocs depuis un autre fichier `.mcad`/`.json` via sélecteur de fichier). MOVE/COPY/ROTATE/SCALE/MIRROR/ERASE/EXPLODE et grips fonctionnent nativement (mêmes chemins génériques que TEXT, MIRROR avec un drapeau `mirror` dédié qui flip aussi le contenu du bloc — pas seulement la position de l'instance). Persistant en `.mcad`. Accessible via menu (Modifier/Insérer) et barre d'outils, en plus du terminal. Export DXF : pas de vrai `BLOCK`/`INSERT` DXF — chaque instance est aplatie en géométrie transformée à l'export (amélioration par rapport à GROUP, qui n'a toujours aucun export DXF). `REFEDIT` reste à faire (ligne ci-dessus). `BLOCK` sans nom fourni demande le nom via `prompt()` (annulable) plutôt que d'auto-nommer ; collision de nom auto-suffixée (`_2`, `_3`...). Renommage d'un bloc (`renameBlock()`, bouton ✎ dans la popup INSERT) : propage le nouveau nom à toutes les entités `insert` qui le référencent. `WBLOCK [nom]` (alias `WB`/`WBLOC`) : écrit un bloc dans un fichier `.mcad` externe autonome, réutilisable dans un autre dessin (réciproque de l'import de bloc depuis un fichier de la popup INSERT).
- ✅ **OSNAP Insertion** — mode dédié au point d'insertion des blocs (`e.type==='insert'`), sur le modèle d'AutoCAD (Insertion ≠ Extrémité). Corrige l'imprécision du déplacement par poignée d'une instance de bloc, qui ne pouvait jusqu'ici s'accrocher à rien.
- ✅ **OSNAP sur le contenu des blocs** — tous les modes standards (extrémité/milieu/centre/plus proche/intersection/perpendiculaire/tangente/quadrant) fonctionnent aussi sur la géométrie interne d'une instance de bloc (pas seulement son point d'insertion), via aplatissement dans `findOsnap()`. Récursif (blocs imbriqués). Limite connue : DIMASSOC ne peut pas s'accrocher/suivre un enfant de bloc (id synthétique, pas d'entité réelle correspondante).
- ✅ **Bulge DXF conforme au standard** — arcs majeurs (`|b|>1`) exportés/importés du bon côté de la corde (`dxfBulge()`), validé par ezdxf
- ✅ **Import DXF : arcs de polyligne préservés** — lecture du code 42 sur le flux brut (`LWPOLYLINE`)
- ✅ **Fichier ▸ Fermer** (`FERMER`) — et fermeture du dessin courant avant toute ouverture (calques remis à zéro)
- ✅ **Axe de cercle sur arc de polyligne** — `_polyArcCircles()`, mêmes maths bulge→cercle que l'accroche
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
- ✅ Terminal de commandes type CAO
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
