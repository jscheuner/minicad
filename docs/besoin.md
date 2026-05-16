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
              │  (archi, elec, méca)  │
              └───────────────────────┘
```

**À quoi ça sert ?** Permettre à un dessinateur de créer et éditer des plans techniques 2D directement dans un navigateur, sans installation, sans serveur, avec des outils proches d'AutoCAD.

**À qui ça sert ?** Étudiants en techno/BTS, techniciens, architectes en déplacement, toute personne qui a besoin d'un outil de dessin léger.

**Sur quoi ça agit ?** Un dessin technique (fichier `.mcad`, `.dxf`, `.dwg`, `.svg`).

---

## 2. Expressions fonctionnelles du besoin

### Fonctions de service principales (FP)

| ID | Fonction | Critère | Niveau |
|----|----------|---------|--------|
| FP1 | Dessiner des primitives géométriques | Types supportés | Ligne, Rect, Cercle, Arc, Polyligne |
| FP2 | Annoter un dessin | Types d'annotation | Texte, Repère, Cotation |
| FP3 | Modifier les objets dessinés | Opérations | Déplacer, Copier, Supprimer, Grip-edit |
| FP4 | Organiser les objets par calques | Nombre de calques | Min. 4, extensible |
| FP5 | Importer/Exporter des fichiers CAO | Formats | DXF, DWG, SVG, JSON natif |
| FP6 | Naviguer dans le dessin | Zoom, Pan | Molette + drag |

### Fonctions de service complémentaires (FC)

| ID | Fonction | Critère |
|----|----------|---------|
| FC1 | Accrochage géométrique (OSNAP) | 7 modes (extrémité, milieu, centre…) |
| FC2 | Contrainte de direction (Ortho/Polaire) | F8 / F10, incrément configurable |
| FC3 | Saisie dynamique près du curseur | Distance + Angle éditables (Tab) |
| FC4 | Annuler / Refaire | Historique 50 états |
| FC5 | Fonctionner sans serveur | Fichier HTML unique |
| FC6 | Charger des modules métier optionnels | arch, elec, dim, annot |

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
              │ FP1, FP2, FP3, FP4
              ▼
    ┌─────────────────┐
    │                 │──── FC5 ──→ Navigateur web
    │    MiniCAD      │
    │                 │──── FP5 ──→ Fichiers CAO (.dxf .mcad .svg)
    └─────────────────┘
              │
          FC1, FC2
              ▼
         Géométrie
       (accrochages)
```

---

## 4. Cahier des charges fonctionnel (résumé)

- **Performance :** Rendu fluide jusqu'à ~2000 entités
- **Précision :** Coordonnées en virgule flottante (double précision)
- **Interopérabilité :** Lecture/écriture DXF AC1015 (AutoCAD 2000)
- **UX :** Comportement proche d'AutoCAD LT (commandes texte, raccourcis clavier identiques)
- **Autonomie :** Fonctionne hors ligne, un seul fichier
