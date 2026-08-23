# Convertisseur DWG → DXF

Petit outil web **séparé de MiniCAD**, qui convertit un fichier `.dwg` en `.dxf`
directement dans le navigateur (WebAssembly, 100% local, aucun envoi réseau).
Le `.dxf` obtenu s'ouvre ensuite normalement dans MiniCAD (📂 Ouvrir).

## Pourquoi un outil à part ?

MiniCAD (`src/minicad.html`) est un fichier HTML autonome, sans dépendance —
c'est une contrainte non négociable du projet (voir `CLAUDE.md`). Or il
n'existe qu'une seule bibliothèque JS sérieuse capable de lire le format DWG
(binaire, propriétaire Autodesk) : [libredwg-web](https://github.com/mlightcad/libredwg-web),
un wrapper WebAssembly de [GNU LibreDWG](https://www.gnu.org/software/libredwg/).
Deux problèmes empêchaient de l'intégrer à `minicad.html` :

- **Licence GPL-3.0** (copyleft) : l'embarquer dans le fichier livré
  obligerait tout MiniCAD à passer sous GPL-3.0.
- **Poids** : le binaire `.wasm` fait ~10 Mo, à l'opposé de l'esprit
  "fichier HTML léger et autonome".

Cet outil reste donc un dossier indépendant, sous sa propre licence GPL-3.0
(voir `LICENSE`), utilisé uniquement en local pour préparer un `.dxf` — il
n'est jamais chargé ni référencé par `minicad.html`.

## Usage

Ouvrir `index.html` dans un navigateur (double-clic, ou un petit serveur
statique type `python -m http.server` si le navigateur bloque les modules ES
en `file://`). Glisser un `.dwg`, télécharger le `.dxf` généré, l'ouvrir dans
MiniCAD.

Versions DWG supportées : environ R13 à AutoCAD 2018 (dépend de LibreDWG).

## Contenu

- `index.html` — l'outil (UI + logique de conversion)
- `lib/dist/libredwg-web.js` — build ESM de libredwg-web
- `lib/wasm/libredwg-web.js` + `.wasm` — moteur LibreDWG compilé en WebAssembly
- `LICENSE` — GPL-3.0 (celle de LibreDWG / libredwg-web)

## Mise à jour de la lib

```
npm install @mlightcad/libredwg-web   # dans un dossier temporaire
cp node_modules/@mlightcad/libredwg-web/dist/libredwg-web.js       lib/dist/
cp node_modules/@mlightcad/libredwg-web/wasm/libredwg-web.js       lib/wasm/
cp node_modules/@mlightcad/libredwg-web/wasm/libredwg-web.wasm     lib/wasm/
```
