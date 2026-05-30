# Bibliothèques MiniCAD

> ⚠️ **DONNÉES EN COURS DE VÉRIFICATION — UTILISATION À VOS RISQUES**
>
> Les données dimensionnelles contenues dans ces bibliothèques (profilés, tubes, visserie…)  
> sont en cours de saisie et de contrôle.  
> **Des erreurs de valeurs peuvent exister** (cotes, rayons de congé, épaisseurs).  
> Vérifiez systématiquement les dimensions critiques par rapport aux normes officielles  
> avant tout usage en bureau d'études ou en production.

---

## Structure

```
libraries/
├── index.json          # Catalogue des familles disponibles
├── ipe.json            # Profilés IPE  (SN EN 10365:2017)
├── ipn.json            # Profilés IPN  (SN EN 10365:2017)
├── hea.json            # Profilés HEA  (SN EN 10365:2017)
├── heb.json            # Profilés HEB  (SN EN 10365:2017)
├── upe.json            # Profilés UPE  (SN EN 10365:2017)
├── upn.json            # Profilés UPN  (SN EN 10365:2017)
└── draws/
    ├── ipe.js          # Fonction de dessin profilés I (IPE, HEA, HEB)
    ├── ipn.js          # Fonction de dessin profilé IPN
    └── upe.js          # Fonction de dessin profilé UPE/UPN
```

## Ajouter une famille

1. Créer `nom.json` avec la structure `{ family, standard, unit, params, notes, data }`
2. Créer (ou réutiliser) un script de dessin dans `draws/`
3. Référencer dans `index.json`
4. Lancer `python3 build.py` pour injecter dans `minicad.html`

## Normes de référence

| Famille | Norme |
|---------|-------|
| IPE, IPN, HEA, HEB, UPE, UPN | SN EN 10365:2017 |
