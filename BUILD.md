# MiniCAD — Guide de build

## Commandes

```bash
# Build normal (développement)
python3 build.py

# Build avec séquence démo injectée (publication minicad.org)
python3 build.py --demo
```

## Ce que fait le build

- Lit `libraries/index.json`
- Injecte les données JSON + fonctions de dessin JS entre les marqueurs `@@LIB_BEGIN` / `@@LIB_END` dans `minicad.html`
- Avec `--demo` : injecte aussi `demo/demo_sequence.js` entre `@@DEMO_BEGIN` / `@@DEMO_END`
- Sans `--demo` : vide le bloc démo (pour garder `minicad.html` léger en dev)

## Activer la démo

Après un build `--demo`, ouvrir dans le navigateur :

```
minicad.html?demo
```

## Ajouter une famille de profilés

1. Créer `libraries/<nom>.json` (copier `ipe.json` comme modèle)
2. Créer `libraries/draws/<nom>.js` avec la fonction `drawProfile<Nom>(p, x, y)`
3. Ajouter l'entrée dans `libraries/index.json`
4. Lancer `python3 build.py`

## Structure des marqueurs dans `minicad.html`

```
// @@LIB_BEGIN   ← généré par build.py, ne pas éditer
...
// @@LIB_END

// @@DEMO_BEGIN  ← généré par build.py --demo, ne pas éditer
...
// @@DEMO_END
```

## Après modification de `minicad.html`

Copier vers `minicad_org.html` (sauvegarde de référence) :

```bash
cp minicad.html minicad_org.html
```
