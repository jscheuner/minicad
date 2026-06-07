# MiniCAD — Contexte projet pour Claude Code

Logiciel de dessin technique 2D **dans un seul fichier HTML autonome**, façon CAO 2D.
Le fichier final n'a aucune dépendance et aucun serveur : on l'ouvre et on dessine.

## Branche et fichier de travail

- **On développe sur la branche `dev`.**
- **Le fichier source est `src/minicad.html`** (~14 500 lignes, sans données injectées).
- Les fichiers livrés (`minicad.html`, `minicad_en.html`, `minicad_demo.html`, `minicad_org.html`)
  sont **générés par `build.py`** — ne jamais les éditer directement.
- Toute modification se fait dans `src/minicad.html` puis on rebuild.

## Contrainte fondamentale (NON négociable)

**Le fichier livré reste un unique HTML autonome.** Pas de framework, pas de
fichier JS/CSS externe à l'exécution, aucune dépendance au runtime.
JavaScript vanilla + rendu Canvas 2D uniquement.
Toute solution qui ajoute une dépendance au fichier final est à rejeter.

## Pipeline de build

```
python build.py                    # FR → minicad.html (défaut)
python build.py --lang=en          # EN → minicad_en.html (en plus de FR)
python build.py --lang=all         # toutes les langues disponibles
python build.py --demo             # + minicad_demo.html (FR) + minicad_org.html (multilang)
python build.py --demo --deploy    # + upload FTP vers minicad.org
```

**Fichiers sources lus par build.py :**
- `src/minicad.html` — code source avec marqueurs `@@` et placeholders `{{clé}}`
- `libraries/` + `hatches/` + `demo/` — données injectées
- `translations/fr.json`, `translations/en.json` — traductions

**Fichiers générés (ne pas éditer) :**
- `minicad.html` — FR autonome, téléchargeable depuis GitHub
- `minicad_en.html` — EN autonome
- `minicad_demo.html` — FR avec séquence démo
- `minicad_org.html` — multilang FR+EN + GTM + switcher runtime (minicad.org)

### Marqueurs dans `src/minicad.html`

```
// @@LIB_BEGIN … // @@LIB_END        → données bibliothèques (MINICAD_LIB)
// @@HATCH_BEGIN … // @@HATCH_END    → patterns hachures (MINICAD_HATCHES)
// @@DEMO_BEGIN … // @@DEMO_END      → séquence démo
```

## Internationalisation (i18n)

- `src/minicad.html` contient des placeholders `{{clé}}` dans le HTML et des backticks `` `{{clé}}` `` dans le JS.
- `translations/fr.json` — référence française (source de vérité)
- `translations/en.json` — traduction anglaise
- Attributs HTML annotés : `data-i18n="clé"`, `data-i18n-title="clé"`, `data-i18n-placeholder="clé"`

**Mode A** (fichiers GitHub) : build.py substitue directement `{{clé}}` → valeur, retire les `data-i18n*`.  
**Mode B** (minicad.org) : garde les `data-i18n*`, injecte `TRANSLATIONS` + `window.setLang()` runtime.

**Règle critique** : les valeurs de traduction utilisées dans des contextes JS (dict `_helpFR`)
doivent être dans des **backticks** `` `{{clé}}` `` — jamais entre `'...'` pour éviter
les apostrophes qui cassent le parsing JS.

**`_ht(key)`** dans `showHelp()` — lookup runtime (Mode B) ou fallback du dict `_helpFR` (Mode A).

**`safeEvalMath(str)`** — évaluateur d'expressions (`105.3+35`, `2250/2`) sécurisé
(regex blanche : chiffres + opérateurs seulement). Utilisé dans les champs numériques
des dialogs (`.ar-input`) et dans `confirmDynamicInput`.

## Architecture interne de `src/minicad.html`

- `CSS` — thème sombre, barres d'outils, dialogues
- `HTML` — canvas + sidebar + terminal
- JavaScript :
  - **État global `S{}`** — zoom, pan, calques, outil actif, historique
  - **Moteur de rendu** — `drawEntity()` → canvas 2D (staticCanvas + mainCanvas)
  - **OSNAP** — `findOsnap()`, 9 modes (extrémité, milieu, centre, intersection,
    perpendiculaire, tangente, plus proche, quadrant, extension)
  - **Commandes `CMD{}`** — objets exécutables, alias CAO standard (LINE/L, RECT/R…)
  - **Saisie dynamique** — bulles D/A près du curseur (Tab pour basculer Distance/Angle)
  - **Grip editing** — poignées sur toutes les entités
  - **Sélection** — clic, fenêtre (G→D), croisement (D→G)
  - **Outils de modification** — offset, mirror, fillet, chamfer, join, trim, extend
  - **Import/Export** — DXF AC1015 (R2000), SVG, JSON `.mcad`
  - **Modules métier** — arch, elec, dim, annot (chargés à la demande via `LOAD`)

### Outils de dessin disponibles

LINE, XLINE, RAY, RECT, RECTCENTER, CIRCLE, ARC, POLYLINE, POLYGON, ELLIPSE,
SPLINE, WALL, CABLE, TUBE, LEADER, TEXT, HATCH, POINT

### Outils de modification

MOVE, COPY, ROTATE, SCALE, MIRROR, OFFSET, TRIM, EXTEND, FILLET, CHAMFER,
JOIN, STRETCH, EXPLODE, ARRAY (rect), ARRAY_POLAR, DIVIDE

### Outils de mesure / utilitaires

MESURER (ME), DIST (DI), AREA, CALC (calculatrice popup)

## Performance OSNAP

`findOsnap()` est optimisée pour ne pas lagger :
- **`_osnapCache`** — résultat mis en cache ; skip si mouvement < 1.5px écran ET même nEntities
- **`_nearby`** — pré-filtre bbox une seule fois ; inner loop intersection = O(k²) pas O(n×m)
- **`segsOf(e)`** — cache segments par frame dans une Map locale
- **Rejet rapide cercle×cercle** — `d² vs (r1+r2)²` avant `circleCircleIntersect`
- **Paires sans doublons** — index j > i, chaque paire traitée une seule fois
- **Arc bbox serrée** — `getEntityBBox('arc')` couvre la portion d'arc, pas le cercle entier

## Conventions

- Respecter les alias de commandes style CAO existants.
- Les coordonnées acceptent : `100<45`, `@50,30`, `#x,y`, et expressions `105.3+35`.
- Persistance : auto-save localStorage + File System Access API (Ctrl+S).
- Voir `docs/methode.md` pour les conventions de développement détaillées.

## Points de vigilance

- **Géométrie** : une erreur de signe ou d'angle (fillet, chamfer, bulge d'arc,
  tangentes) passe souvent les tests visuels mais casse l'export DXF. Vérifier les maths.
- **DXF AC1015** : format sensible aux edge cases (bulge, calques, unités).
- **Ne rien casser** lors d'un refactor : c'est un seul gros fichier, tester
  les scénarios de `tests/scenarios.md`.
- **OSNAP sur les arcs** : `angleInArc(a, sa, ea)` normalise les angles avec `while(ang<sa) ang+=2π`.
  Attention à la convention : les arcs sont dessinés avec `-endAngle` / `-startAngle` sur le canvas
  (Y inversé), mais stockés en coordonnées monde.

## Documentation de référence (à lire au besoin)

- `docs/besoin.md` — analyse du besoin
- `docs/etude.md` — architecture, modèle de données
- `docs/methode.md` — conventions de développement
- `docs/action.md` — roadmap
- `docs/documentation.md` — API interne, format `.mcad`
- `suivi/CHANGELOG.md` — historique des versions
- `suivi/TODO.md` — tâches priorisées
- `tests/scenarios.md` — scénarios de recette

## Workflow attendu

1. Travailler sur la branche `dev`, dans `src/minicad.html` uniquement.
2. Après modification : `python build.py` pour rebuilder `minicad.html` (test local).
3. Pour tester EN : `python build.py --lang=en`.
4. Pour déployer : `python build.py --demo --deploy`.
5. Committer sur `dev` — merger dans `main` uniquement quand une phase est stable et testée.
6. Mettre à jour `suivi/CHANGELOG.md` et `suivi/TODO.md` après une fonctionnalité.
