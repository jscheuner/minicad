![MiniCAD](logo/minicad-osnap-evide-logo.svg)


> ⚠️ **PROGRAMME EN DÉVELOPPEMENT — UTILISATION À VOS RISQUES**
>
> MiniCAD est un projet en cours de développement actif.  
> Des **bugs, comportements inattendus ou pertes de données** peuvent survenir à tout moment.  
> **Ne pas utiliser pour des travaux critiques sans vérification indépendante des résultats.**  
> Sauvegardez régulièrement vos fichiers (`.mcad`). Les formats et fonctionnalités peuvent évoluer sans préavis.

---

**Logiciel de dessin technique 2D dans un seul fichier HTML.**  
Aucune dépendance, aucun serveur, aucune installation — ouvrir `minicad.html` et dessiner.

Interface: commandes texte, OSNAP, saisie dynamique, cotations, import/export DXF.

---

## Version en ligne

**[minicad.org](https://minicad.org)** — accès direct dans le navigateur, sans installation.  
Même fichier, même fonctionnalités — idéal pour tester ou utiliser depuis n'importe quel poste.

**[Facebook — Minicad](https://www.facebook.com/people/Minicad/61590182956168/)** — suivre l'actualité du projet.

---

## Démarrage rapide

1. Aller sur **[minicad.org](https://minicad.org)** — ou —
2. Télécharger [`minicad.html`](minicad.html) et l'ouvrir dans Chrome, Firefox ou Edge
3. Commencer à dessiner

Aucun npm, aucun build, aucune connexion internet requise (version locale).

---

## Fonctionnalités

### Outils de dessin

| Commande | Alias | Description |
|----------|-------|-------------|
| `LINE` | `L` | Ligne |
| `RECT` | `R`, `REC` | Rectangle |
| `RECTCENTER` | `RC`, `RECTCENTRE` | Rectangle par le centre |
| `POLYGON` | `POL`, `POLYGONE` | Polygone régulier (inscrit / circonscrit) |
| `CIRCLE` | `C` | Cercle |
| `ELLIPSE` | `EL` | Ellipse ou arc elliptique |
| `ARC` | `A` | Arc (centre, rayon, angles) |
| `POLYLINE` | `PL` | Polyligne (segments droits + arcs, bulge DXF) |
| `SPLINE` | `SPL` | Spline Catmull-Rom (C = clore) |
| `XLINE` | `XL` | Ligne infinie (construction, 2 directions) |
| `RAY` | — | Demi-droite depuis un point |
| `RAY_REV` | — | Demi-droite inverse |
| `HATCH` | `H` | Hachures sur contour fermé (lignes ou croisé) |
| `POINT` | `PT` | Point de construction |
| `WALL [ép]` | — | Mur (épaisseur configurable, défaut 20) |
| `DOOR [l]` | — | Porte (largeur, défaut 80) |
| `WINDOW [l]` | — | Fenêtre (largeur, défaut 120) |
| `OUTLET` | — | Prise électrique |
| `SWITCH` | — | Interrupteur |
| `CABLE` | — | Câble (polyligne électrique) |
| `TUBE [formule]` | — | Tube 2 parois + axe trait-point (ex : `1000+90R67+500`) |
| `TEXT` | `T` | Texte libre |
| `LEADER [texte]` | — | Repère avec flèche et annotation |
| `DIMLINEAR` | — | Cote linéaire horizontale / verticale |
| `DIMALIGNED` | `DIMPAR` | Cote parallèle à la droite mesurée |
| `DIMANGULAR` | `DIMANG` | Cote angulaire (2 lignes + arc) |
| `DIMRADIUS` | `DIMRAD` | Cote de rayon (cliquer un cercle/arc) |
| `DIMDIAMETER` | `DIMDIA` | Cote de diamètre (cliquer un cercle/arc) |

### Modification

| Commande | Alias | Description |
|----------|-------|-------------|
| `ERASE` | `E` | Supprimer la sélection |
| `MOVE` | `M` | Déplacer |
| `COPY` | `CO` | Copier |
| `ROTATE` | `RO` | Pivoter avec point de base |
| `SCALE` | `SC` | Mise à l'échelle avec point de base |
| `MIRROR` | `MI` | Symétrie axiale |
| `OFFSET` | `O` | Décaler parallèle (`OFFSET [dist]`) |
| `TRIM` | `TR` | Couper au croisement |
| `EXTEND` | `EX` | Prolonger jusqu'à une limite |
| `STRETCH` | `ET` | Étirer (fenêtre croisante) |
| `FILLET` | `F` | Raccord arrondi entre deux segments |
| `CHAMFER` | `CHA` | Chanfrein entre deux segments |
| `JOIN` | `J` | Fusionner des lignes en polyligne |
| `ARRAY` | `AR` | Réseau rectangulaire (dialogue) |
| `ARRAY_POLAR` | `APO`, `RÉSEAU POLAIRE` | Réseau polaire (copies en cercle) |
| `EXPLODE` | `X` | Éclater un bloc/polyligne en primitives |
| `GROUP` | `GR`, `GROUPE` | Grouper des entités en un bloc |
| `UNGROUP` | `DÉGROUPER` | Dégrouper |
| `DIVIDE` | `DIV` | Diviser en N segments égaux (points) |
| `TUBED [Ø]` | — | Diamètre du tube actif (défaut 40) |
| `TUBEBR [R]` | — | Rayon de coude tube (défaut 67) |
| `TUBREF` | — | Référence tracé : `AXE` / `EXT` / `INT` |
| `TUBELBL` | — | Afficher/masquer la nomenclature tube |

Grip editing sur toutes les entités : cliquer un objet sélectionné pour déplacer ses extrémités.

### Mesure et utilitaires

| Commande | Alias | Description |
|----------|-------|-------------|
| `DIST` | `DI` | Mesurer une distance entre deux points |
| `MESURER` | `ME`, `RÈGLE` | Mesure visuelle réutilisable entre deux points |
| `AREA` | `AIRE`, `SURFACE` | Surface et périmètre d'un contour |
| `CALC` | `CALCULATRICE` | Calculatrice flottante |
| `LIST` | `LS` | Lister les objets du dessin |
| `LOAD` / `UNLOAD` | `MODULE` | Charger / décharger un module (`arch`, `elec`, `dim`, `annot`) |

### Précision

| Mode | Touche | Description |
|------|--------|-------------|
| **OSNAP** | `F4` | 8 modes : extrémité, milieu, centre, intersection, perpendiculaire, tangente, proche, quadrant |
| **Ortho** | `F8` | Contraint à 0° / 90° |
| **Polaire** | `F10` | Snap angulaire (`POLAR [angle]`) |
| **Saisie dynamique** | — | Bulle D / A éditable, `Tab` pour basculer |
| **Snap de grille** | `F3` | Grille configurable (`GRID [n]`) |

Formats de saisie : `100<45` (dist. + angle), `@50,30` (relatif), `#x,y` (absolu).

### Cotation et annotation

Intégrés directement (pas besoin de `LOAD`) : `DIMLINEAR`, `DIMALIGNED`, `DIMANGULAR`, `DIMRADIUS`, `DIMDIAMETER`, `TEXT`, `LEADER`.  
Styles configurables : `DIMSTYLE [nom]`.

### Bibliothèque de profilés

Profilés de charpente insérables depuis le panneau ou via la commande `ipe 160`, `upn 200`, etc.

> ⚠️ Les données dimensionnelles sont en cours de vérification — voir [libraries/README.md](libraries/README.md).

| Famille | Norme | Tailles disponibles |
|---------|-------|---------------------|
| IPE | SN EN 10365:2017 | 80 → 600 |
| IPN | SN EN 10365:2017 | 80 → 600 |
| HEA | SN EN 10365:2017 | 100 → 1000 |
| HEB | SN EN 10365:2017 | 100 → 1000 |
| UPE | SN EN 10365:2017 | 80 → 400 |
| UPN | SN EN 10365:2017 | 50 → 400 |

### Calques et organisation

- Calques avec couleur, visibilité et type de ligne
- Sélection par clic, fenêtre (gauche→droite) ou croisement (droite→gauche)
- `Shift+clic` pour sélection additive, `Ctrl+A` pour tout sélectionner

### Fichiers

| Format | Import | Export |
|--------|:------:|:------:|
| `.mcad` (JSON natif MiniCAD) | ✓ | ✓ |
| `.dxf` (AC1015 / R2000) | ✓ | ✓ |
| `.svg` | — | ✓ |
| `.pdf` | — | ✓ |
| `.pcad` (modèle de cartouche) | ✓ | ✓ |

- **Auto-save** localStorage — restauration automatique au rechargement
- **File System Access API** (Chrome/Edge) — `Ctrl+S` écrit dans le fichier ouvert directement

---

## Présentations (espace papier)

On sépare le **dessin** (espace *Objet*, à l'échelle réelle) des **feuilles à imprimer** (espace *Présentation*). Des **onglets** en bas du canevas (`Objet │ Présentation 1 │ +`) permettent de basculer.

### Feuilles et fenêtres

- **Formats** : A0, A1, A2, A3, A4, A5, Letter, ou **personnalisé** (largeur × hauteur en mm).
- **Fenêtres** (*viewports*) : zones qui affichent le dessin à une **échelle fixe** (1:50, 1:100…).
  - Clic gauche : sélectionner ; glisser : déplacer ; **poignées** : redimensionner.
  - **Double-clic dans une fenêtre** → on « entre » dedans (bordure verte) : la **molette zoome** et le **glisser déplace** le modèle dans la fenêtre. `Échap` ou double-clic dehors pour sortir.
  - **Clic droit** → propriétés : échelle, centre, **fond opaque** (sinon transparent, on voit à travers), verrouillage.
  - Bouton **« + Fenêtre »** pour en ajouter.
- **Navigation feuille** : molette = zoom, glisser (ou clic du milieu) = déplacement.

### Cartouches (modèles `.pcad`)

Un **cartouche** (cadre + bloc de titre) est un **modèle réutilisable** au format `.pcad` (JSON) qui **définit aussi le format de papier**.

**Créer un modèle :** dans l'espace Objet, dessiner le cadre et le bloc de titre. Dans les textes, insérer des **champs dynamiques** entre doubles accolades :

`{{titre}}` · `{{auteur}}` · `{{date}}` · `{{indice}}` · `{{numero}}` · `{{echelle}}` · `{{format}}` · `{{page}}` (et tout champ libre, ex. `{{client}}`).

Puis **Fichier ▸ Enregistrer comme modèle de cartouche…** (choix du format, nom) → ajout à la bibliothèque locale et/ou export `.pcad`.

**Utiliser un modèle :** clic (ou clic droit) sur l'onglet **`+`** → menu **Vierge** (page + cadre seul) / **Depuis un modèle** / **Importer un `.pcad`…**. Le modèle impose son format papier et crée une fenêtre cadrée sur le dessin.

**Remplir le cartouche :** bouton **« Cartouche »** → le dialogue liste automatiquement les champs `{{…}}` présents dans le modèle. Un champ laissé vide affiche son libellé (ex. « Titre »), et `date`/`echelle`/`format`/`page` se remplissent automatiquement.

**Modifier / gérer un modèle :** icône ✎ dans le menu `+` (ou Fichier ▸ Ouvrir un modèle `.pcad` à modifier) pour le recharger dans le dessin ; icône ✕ pour supprimer un modèle de la bibliothèque.

> La bibliothèque de modèles est stockée dans le navigateur (localStorage) ; le cartouche d'une présentation, lui, est enregistré **dans le `.mcad`**.

### Impression

En espace Présentation, **`Ctrl+P`** (ou le bouton **« Imprimer PDF »**) exporte la **feuille entière** (fenêtres à l'échelle + cartouche) en **PDF 300 DPI**.

---

## Interface

```
┌─────────────────────────────────────────────┐
│  [Fichier] [Modifier▼]   Calques   OSNAP    │  ← Barres d'outils (dock/float)
├─────────────────────────────────────────────┤
│                                             │
│              Canvas 2D                      │  ← Zoom molette / Pan clic-milieu
│                                             │
├─────────────────────────────────────────────┤
│  > _                       X: 120.0 Y: 85.0 │  ← Terminal de commandes
└─────────────────────────────────────────────┘
```

Les barres d'outils sont **déplaçables** (drag & drop dock/float, clic-droit pour masquer/réinitialiser).

### Curseurs

Le curseur change de forme selon l'action attendue. Trois curseurs, à désigner toujours par ces noms :

| Nom | Apparence | Quand |
|-----|-----------|-------|
| **Réticule** | Grande croix de visée pleine (lignes traversant tout l'écran), sans carré | Désigner un point : outils de dessin (ligne, cercle, cote…), décalage, copier, déplacer un point… |
| **Pickbox** | Petit carré seul, sans lignes | Sélectionner des objets : ajuster, prolonger, raccord, chanfrein, joindre, hachure, grouper, dégrouper… |
| **Réticule + pickbox** | Croix (avec un espace au centre) **et** petit carré | Outil Sélection au repos (curseur par défaut) |

*(noms internes du code : `Réticule`=`draw`, `Pickbox`=`pick`, `Réticule + pickbox`=`idle`)*

---

## Raccourcis clavier

| Touche | Action |
|--------|--------|
| `L` | Ligne |
| `R` | Rectangle |
| `C` | Cercle |
| `PL` (terminal) | Polyligne |
| `V` | Mode sélection |
| `F` | FILLET (raccord) |
| `O` (terminal) | OFFSET |
| `J` | JOIN (fusionner) |
| `F3` | Snap grille ON/OFF |
| `F4` | OSNAP ON/OFF |
| `F8` | Ortho ON/OFF |
| `F10` | Polaire ON/OFF |
| `Tab` | Basculer champs D/A (saisie dynamique) |
| `↑` / `↓` | Historique des commandes terminal |
| `Ctrl+Z` / `Ctrl+Y` | Annuler / Refaire (50 niveaux) |
| `Ctrl+S` | Sauvegarder |
| `Ctrl+O` | Ouvrir |
| `Ctrl+A` | Tout sélectionner |
| `Delete` | Supprimer la sélection |
| `Echap` | Annuler l'outil en cours |

---

## Commandes terminales

Taper dans le champ en bas de l'interface (insensible à la casse) :

| Commande | Description |
|----------|-------------|
| `LINE` / `L` | Ligne |
| `RECT` / `R` | Rectangle |
| `RECTCENTER` / `RC` | Rectangle par le centre |
| `POLYGON` / `POL` | Polygone régulier |
| `CIRCLE` / `C` | Cercle |
| `ELLIPSE` / `EL` | Ellipse |
| `ARC` / `A` | Arc |
| `PL` | Polyligne |
| `SPL` | Spline |
| `XL` | Ligne infinie |
| `RAY` / `RAY_REV` | Demi-droite / inverse |
| `H` | Hachures |
| `PT` | Point |
| `WALL [ép]` | Mur |
| `DOOR [l]` | Porte |
| `WINDOW [l]` | Fenêtre |
| `OUTLET` / `SWITCH` | Prise / Interrupteur |
| `CABLE` | Câble |
| `TEXT` / `T` | Texte |
| `LEADER [texte]` | Repère |
| `TUBE [formule]` | Tube (ex : `TUBE 1000+90R67+500`) |
| `TUBED [Ø]` / `TUBEBR [R]` | Diamètre / rayon de coude tube |
| `TUBREF AXE\|EXT\|INT` | Référence tracé tube |
| `TUBELBL` | Nomenclature tube |
| `DIMLINEAR` | Cote linéaire H/V |
| `DIMALIGNED` / `DIMPAR` | Cote parallèle |
| `DIMANGULAR` / `DIMANG` | Cote angulaire |
| `DIMRADIUS` / `DIMRAD` | Cote rayon |
| `DIMDIAMETER` / `DIMDIA` | Cote diamètre |
| `DIMSTYLE [nom]` / `DS` | Gérer les styles de cotes |
| `ERASE` / `E` | Supprimer |
| `MOVE` / `M` | Déplacer |
| `COPY` / `CO` | Copier |
| `ROTATE` / `RO` | Pivoter |
| `SCALE` / `SC` | Mise à l'échelle |
| `MIRROR` / `MI` | Miroir |
| `OFFSET` / `O` | Décalage parallèle |
| `TRIM` / `TR` | Couper |
| `EXTEND` / `EX` | Prolonger |
| `STRETCH` / `ET` | Étirer |
| `FILLET` / `F [r]` | Raccord arrondi |
| `CHAMFER` / `CHA [d1] [d2]` | Chanfrein |
| `JOIN` / `J` | Fusionner en polyligne |
| `ARRAY` / `AR` | Réseau rectangulaire |
| `ARRAY_POLAR` / `APO` | Réseau polaire |
| `EXPLODE` / `X` | Éclater |
| `GROUP` / `GR` · `UNGROUP` / `DÉGROUPER` | Grouper / dégrouper |
| `DIVIDE` / `DIV` | Diviser en N points |
| `DIST` / `DI` | Mesurer distance |
| `PREVIOUS` / `PREV` | Resélectionner la dernière sélection |
| `MESURER` / `ME` | Mesure visuelle réutilisable |
| `AREA` / `AIRE` | Surface et périmètre |
| `CALC` / `CALCULATRICE` | Calculatrice |
| `LIST` / `LS` | Lister les objets |
| `LOAD` / `UNLOAD` | Charger / décharger un module |
| `UNDO` / `U` | Annuler |
| `REDO` | Refaire |
| `ZOOM` / `Z [E\|n]` | Zoom étendue ou facteur |
| `PAN` / `P` | Panoramique |
| `LAYER` / `LA [n]` | Calque |
| `COLOR [#hex]` | Couleur du calque |
| `POLAR [angle]` | Incrément polaire |
| `OSNAP [mode]` | Mode OSNAP |
| `GRID [n]` | Taille de la grille |
| `AI` / `OLLAMA` | Assistant IA |
| `SAVE` | Sauvegarder |
| `SAVEAS [nom]` | Sauvegarder sous |
| `OPEN` | Ouvrir |
| `EXPORT DXF\|SVG` | Exporter |
| `PRINT` / `PDF` | Imprimer / export PDF |
| `CLEAR` / `NOUVEAU` | Effacer tout |
| `PREFS` | Préférences |
| `HELP` / `?` | Aide |

---

## Architecture technique

```
minicad.html   (~20 000 lignes, un seul fichier autonome — généré par build.py)
│
├── CSS         dark theme, barres d'outils, dialogues
├── HTML        canvas + sidebar + terminal + onglets de présentation
└── JavaScript
    ├── État global S{}           zoom, pan, calques, outil actif, historique…
    ├── Moteur de rendu           drawEntity() → canvas 2D
    ├── OSNAP engine              findOsnap(), 8 modes
    ├── Commandes CMD{}           objets exécutables, alias courants
    ├── Saisie dynamique          Dynamic Input (bulles D/A)
    ├── Grip editing              poignées bleues sur toutes les entités
    ├── Sélection                 clic, fenêtre, croisement
    ├── Outils de modification    offset, mirror, fillet, chamfer, trim, extend…
    ├── Présentations             espace papier, fenêtres à l'échelle, cartouches .pcad
    ├── Import/Export             DXF AC1015, SVG, PDF, JSON .mcad
    ├── Bibliothèques             profilés injectés via build.py
    └── Assistant IA              Ollama local (insertion depuis langage naturel)
```

**Contrainte fondamentale :** le fichier livré reste un **unique HTML autonome**. Pas de npm, pas de bundler, pas de framework.
Le développement se fait dans `src/minicad.html` ; `python build.py` génère les fichiers livrés (`minicad.html`, `minicad_en.html`, etc.).

---

## Structure du dépôt

```
minicad/
├── minicad.html          # Application livrée FR (GÉNÉRÉE — ne pas éditer)
├── minicad_en.html       # Version EN générée
├── build.py              # Génère les fichiers livrés depuis src/
├── src/
│   └── minicad.html      # SOURCE de développement (marqueurs @@ + i18n {{clé}})
├── translations/         # fr.json, en.json
├── libraries/            # Profilés (IPE, HEA…) injectés au build
├── hatches/              # Motifs de hachures injectés au build
├── animations/           # Aperçus animés des outils (tool_anim.js)
├── README.md
├── docs/                 # besoin, etude, methode, action, documentation
├── suivi/                # CHANGELOG.md, TODO.md, plan_presentations.md
└── tests/                # scenarios.md
```

---

## Compatibilité

| Navigateur | Support |
|------------|---------|
| Chrome / Edge 89+ | ✓ Complet (File System Access API) |
| Firefox | ✓ (sauvegarde par téléchargement) |
| Safari | ✓ (sauvegarde par téléchargement) |

---

## Version

**v0.1** — Voir [suivi/CHANGELOG.md](suivi/CHANGELOG.md) pour l'historique complet.

---

## Soutenir le projet

[![Liberapay](https://img.shields.io/badge/Liberapay-soutenir-f6c915?logo=liberapay&logoColor=black)](https://liberapay.com/MiniCAD/)

**[liberapay.com/MiniCAD](https://liberapay.com/MiniCAD/)**

---

## Contact

**[hello@minicad.org](mailto:hello@minicad.org)**

---

## Licence

MIT
