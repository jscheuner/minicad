# CHANGELOG — MiniCAD

Format : `[version] — YYYY-MM-DD — Description`

---

## [0.1] — 2026-06-07 — Version courante

### Ajouté
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
