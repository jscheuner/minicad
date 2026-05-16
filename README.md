# MiniCAD

**Logiciel de dessin technique 2D dans un seul fichier HTML.**  
Aucune dépendance, aucun serveur, aucune installation — ouvrir `minicad.html` et dessiner.

Interface inspirée d'AutoCAD LT : commandes texte, OSNAP, saisie dynamique, cotations, import/export DXF.

---

## Démarrage rapide

1. Télécharger [`minicad.html`](minicad.html)
2. Ouvrir dans Chrome, Firefox ou Edge
3. Commencer à dessiner

Aucun npm, aucun build, aucune connexion internet requise.

---

## Fonctionnalités

### Outils de dessin
- Ligne, Rectangle, Cercle, Arc
- Polyligne (avec segments droits **et** arcs — bulge compatible DXF)
- Mur (épaisseur configurable), Porte, Fenêtre
- Prise électrique, Interrupteur, Câble

### Modification
| Commande | Description |
|----------|-------------|
| `MOVE` / `COPY` | Déplacer / Copier la sélection |
| `ERASE` | Supprimer |
| `OFFSET` | Décaler parallèle (O) |
| `MIRROR` | Symétrie axiale (MI) |
| `FILLET` | Raccord arrondi entre deux segments (F) |
| `CHAMFER` | Chanfrein entre deux segments (CHA) |
| `JOIN` | Fusionner des lignes en une polyligne (J) |
| `TRIM` | *(à venir)* |
| `ROTATE` | *(à venir)* |

Grip editing sur toutes les entités : cliquer un objet sélectionné pour déplacer ses extrémités.

### Précision
- **OSNAP** — 7 modes : extrémité, milieu, centre, intersection, perpendiculaire, tangente, plus proche
- **Ortho** (F8) — contraint à 0°/90°
- **Polaire** (F10) — snap angulaire configurable (`POLAR [angle]`)
- **Saisie dynamique** — bulle D/A éditable près du curseur (Tab pour basculer Distance ↔ Angle)
- **Snap de grille** (F3)
- **Saisie précise** : `100<45`, `@50,30`, `#x,y`, coordonnées relatives/absolues

### Cotation (module `dim`)
- DIMLINEAR — cote linéaire horizontale/verticale
- DIMALIGNED — cote parallèle à la droite mesurée
- DIMANGULAR — cote angulaire
- DIMRADIUS / DIMDIAMETER — rayon et diamètre
- Texte, Repère (module `annot`)

### Calques et organisation
- Calques avec couleur et visibilité
- Sélection par clic, par fenêtre (gauche→droite) ou par croisement (droite→gauche)
- Sélection Shift pour accumuler, Ctrl+A pour tout sélectionner

### Fichiers
| Format | Import | Export |
|--------|:------:|:------:|
| `.mcad` (JSON natif) | ✓ | ✓ |
| `.dxf` AC1015 (AutoCAD 2000) | ✓ | ✓ |

- **Auto-save** localStorage — restauration automatique au rechargement (F5)
- **File System Access API** (Chrome/Edge) — `Ctrl+S` écrit dans le même fichier sans télécharger

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

## Commandes terminales (style AutoCAD)

Taper dans le champ en bas de l'interface :

```
LINE / L          Ligne
RECT / R          Rectangle
CIRCLE / C        Cercle
ARC               Arc
PL                Polyligne
WALL [ep]         Mur (épaisseur)
OFFSET [dist]     Décalage
MIRROR / MI       Miroir
FILLET / F [r]    Raccord arrondi
CHAMFER / CHA     Chanfrein (ECART/EC pour distances asymétriques)
JOIN / J          Fusionner en polyligne
MOVE / M          Déplacer
COPY              Copier
ERASE / E         Supprimer
UNDO / U          Annuler
REDO              Refaire
ZOOM [facteur]    Zoom
POLAR [angle]     Incrément polaire
OSNAP [mode]      Activer un mode OSNAP
DIMLINEAR         Cote linéaire
DIMALIGNED        Cote parallèle
DIMANGULAR        Cote angulaire
DIMRADIUS         Cote rayon
DIMDIAMETER       Cote diamètre
LOAD arch         Charger module Architecture
LOAD elec         Charger module Électricité
LOAD dim          Charger module Cotation
LOAD annot        Charger module Annotation
SAVE / Ctrl+S     Sauvegarder
SAVEAS            Sauvegarder sous…
OPEN / Ctrl+O     Ouvrir
EXPORT DXF        Exporter en DXF
EXPORT SVG        Exporter en SVG
CLEAR / NOUVEAU   Effacer le dessin
```

---

## Architecture technique

```
minicad.html   (~5 000 lignes, un seul fichier)
│
├── CSS         dark theme, barres d'outils, dialogue texte
├── HTML        canvas + sidebar + terminal
└── JavaScript
    ├── État global S{}           zoom, pan, calques, outil actif, historique…
    ├── Moteur de rendu           drawEntity() → canvas 2D
    ├── OSNAP engine              findOsnap(), 7 modes
    ├── Commandes CMD{}           objets exécutables, alias AutoCAD
    ├── Saisie dynamique          Dynamic Input (bulles D/A)
    ├── Grip editing              poignées bleues sur toutes les entités
    ├── Sélection                 clic, fenêtre, croisement
    ├── Outils de modification    offset, mirror, fillet, chamfer, join
    ├── Import/Export             DXF AC1015, SVG, JSON .mcad
    └── Modules métier            arch, elec, dim, annot (chargés à la demande)
```

**Contrainte fondamentale :** tout reste dans un seul fichier HTML. Pas de npm, pas de bundler, pas de framework.

---

## Structure du dépôt

```
minicad/
├── minicad.html          # Application complète (source unique)
├── README.md
├── docs/
│   ├── besoin.md         # Analyse du besoin (fonctions de service)
│   ├── etude.md          # Architecture technique, modèle de données
│   ├── methode.md        # Conventions de développement
│   ├── action.md         # Roadmap
│   └── documentation.md  # API interne, format .mcad
├── suivi/
│   ├── CHANGELOG.md      # Historique des versions
│   └── TODO.md           # Tâches priorisées
└── tests/
    └── scenarios.md      # Scénarios de recette
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

**v0.01** — Voir [suivi/CHANGELOG.md](suivi/CHANGELOG.md) pour l'historique complet.

---

## Licence

MIT
