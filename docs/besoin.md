# B — Analyse du Besoin

## 1. Bête à cornes

```
                   ┌──────────────┐
                   │  Utilisateur │
                   │  (dessinateur│
                   │  technique)  │
                   └──────┬───────┘
                          │ a besoin de
                          ▼
              ┌───────────────────────┐
              │         MiniCAD       │
              │  (outil de dessin 2D) │
              └───────────┬───────────┘
                          │ pour
                          ▼
              ┌───────────────────────┐
              │  Produire des plans   │
              │  techniques 2D        │
              │  (archi, elec, méca,  │
              │   tuyauterie)         │
              └───────────────────────┘
```

**À quoi ça sert ?** Permettre à un dessinateur de créer et éditer des plans techniques 2D directement dans un navigateur, sans installation, sans serveur, avec des outils proches des logiciels de CAO.

**À qui ça sert ?** Étudiants en techno/BTS, techniciens, architectes en déplacement, tuyauteurs, toute personne qui a besoin d'un outil de dessin léger.

**Sur quoi ça agit ?** Un dessin technique (fichier `.mcad`, `.dxf`, `.dwg`, `.svg`).

---

## 2. Expressions fonctionnelles du besoin

### Fonctions de service principales (FP)

| ID | Fonction | Critère | Niveau |
|----|----------|---------|--------|
| FP1 | Dessiner des primitives géométriques | Types supportés | Ligne, Rect, Cercle, Arc, Polyligne, Tube |
| FP2 | Annoter un dessin | Types d'annotation | Texte, Repère, Cotation (5 types) |
| FP3 | Modifier les objets dessinés | Opérations | Déplacer, Copier, Supprimer, Grip-edit, TRIM, OFFSET, ROTATE, SCALE, MIRROR |
| FP4 | Organiser les objets par calques | Nombre de calques | Min. 4, extensible, avec épaisseur ISO et type de ligne |
| FP5 | Importer/Exporter des fichiers CAO | Formats | DXF, DWG, SVG, JSON natif |
| FP6 | Naviguer dans le dessin | Zoom, Pan | Molette + drag |
| FP7 | Imprimer un dessin | Paramètres | Format, orientation, échelle, sélection de zone |

### Fonctions de service complémentaires (FC)

| ID | Fonction | Critère |
|----|----------|---------|
| FC1 | Accrochage géométrique (OSNAP) | 7 modes (extrémité, milieu, centre…) + sur parois de tube |
| FC2 | Contrainte de direction (Ortho/Polaire) | F8 / F10, incrément configurable |
| FC3 | Saisie dynamique près du curseur | Distance + Angle éditables (Tab), tous tronçons TUBE |
| FC4 | Annuler / Refaire | Historique 50 états |
| FC5 | Fonctionner sans serveur | Fichier HTML unique |
| FC6 | Charger des modules métier optionnels | arch, elec, dim, annot, tube |
| FC7 | Tracer des réseaux de tuyauterie | Outil TUBE avec coudes, référence EXT/AXE/INT |

### Fonctions contraintes (FC)

| ID | Contrainte |
|----|-----------|
| C1 | Fonctionne dans tout navigateur moderne |
| C2 | Aucune dépendance externe (pas de npm, pas d'API) |
| C3 | Interface francophone |
| C4 | Un seul fichier source HTML |

---

## 3. Diagramme des interactions (Pieuvre)

```
          Dessinateur
              │ FP1, FP2, FP3, FP4, FP7
              ▼
    ┌─────────────────┐
    │                 │──── FC5 ──→ Navigateur web
    │    MiniCAD      │
    │   v0.03         │──── FP5 ──→ Fichiers CAO (.dxf .mcad .svg)
    └─────────────────┘
              │
          FC1, FC2, FC3
              ▼
         Géométrie
       (accrochages)
```

---

## 4. Cahier des charges fonctionnel (résumé)

- **Performance :** Rendu fluide jusqu'à ~2000 entités
- **Précision :** Coordonnées en virgule flottante (double précision)
- **Interopérabilité :** Lecture/écriture DXF AC1015 (R2000)
- **UX :** Comportement proche d'CAO 2D (commandes texte, raccourcis clavier identiques)
- **Autonomie :** Fonctionne hors ligne, un seul fichier
- **Tuyauterie :** Outil TUBE avec coudes par tangentes, référence EXT/AXE/INT, OSNAP sur parois
