# Emplacements du numéro de version — MiniCAD

À chaque bump de version, modifier **exactement ces 3 lignes** dans `minicad.html` :

| Ligne | Emplacement | Exemple |
|-------|-------------|---------|
| ~6 | `<title>` | `<title>MiniCAD v0.05</title>` |
| ~882 | Topbar logo | `<div class="topbar-logo">MiniCAD <span>v0.05</span></div>` |
| ~8871 | Métadonnées export `.mcad` | `version: '0.05', app: 'MiniCAD',` |

## Recherche rapide

```bash
grep -n "v0\.\|version.*0\." minicad.html | grep -v "oklch\|color\|rgb\|scale\|var\|calc\|border\|margin\|padding\|font\|flex\|width\|height\|rem\|em\|px\|deg\|rad\|%\|snap\|grid\|zoom"
```

## Fichiers de suivi à mettre à jour

- `suivi/CHANGELOG.md` — ajouter une section `## [0.XX] — YYYY-MM-DD — Version courante`, retirer "Version courante" de la précédente
- `suivi/journal.md` — ajouter l'entrée de session
- `suivi/TODO.md` — déplacer les tâches terminées dans la section ✅
- `docs/action.md` — mettre à jour "Terminé en dernière session" et "Prochaine session"
