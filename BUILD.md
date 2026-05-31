# MiniCAD — Guide de build

## Commandes

```bash
# Build normal (développement) → minicad.html
python3 build.py

# Build démo (publication minicad.org) → minicad_demo.html
python3 build.py --demo
```

## Ce que fait le build

| Commande | Fichier de sortie | Démo injectée |
|----------|-------------------|:-------------:|
| `python3 build.py` | `minicad.html` | non |
| `python3 build.py --demo` | `minicad_demo.html` | oui |

`minicad.html` n'est **jamais modifié** par `--demo` — il reste propre pour le développement.

## Activer la démo

Ouvrir `minicad_demo.html` dans le navigateur. Le bouton **▶ DÉMO** en haut à droite est toujours visible ; cliquer lance la séquence automatique.

```
minicad_demo.html        ← bouton visible, clic → démarre
minicad_demo.html?demo   ← démarre automatiquement au chargement
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
