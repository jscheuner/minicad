#!/usr/bin/env python3
"""
MiniCAD — Script de build des bibliothèques
============================================
Lit les fichiers dans libraries/ et injecte le bloc généré
entre les marqueurs @@LIB_BEGIN / @@LIB_END dans minicad.html.

Usage:
    python build.py

Ajouter une famille :
  1. Créer libraries/<nom>.json  (copier ipe.json comme modèle)
  2. Créer libraries/draws/<nom>.js  avec la fonction de dessin
  3. Ajouter l'entrée dans libraries/index.json
  4. Relancer python build.py
"""

import json
import os
import re
import sys

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
HTML_FILE   = os.path.join(BASE_DIR, 'minicad.html')
LIB_DIR     = os.path.join(BASE_DIR, 'libraries')
INDEX_FILE  = os.path.join(LIB_DIR, 'index.json')

MARKER_BEGIN = '// @@LIB_BEGIN'
MARKER_END   = '// @@LIB_END'


def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_text(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read().strip()


def build_lib_js(index):
    """Construit le bloc JS à injecter à partir de l'index et des fichiers source."""

    scripts_done = set()   # scripts déjà inclus (éviter les doublons)
    draw_blocks  = []      # fonctions JS collectées
    cat_entries  = []      # entrées JS pour MINICAD_LIB

    for cat in index['categories']:
        fam_entries = []

        for fam in cat.get('families', []):
            # ── Charger les données ──────────────────────────
            data_js = 'null'
            if fam.get('data'):
                data_path = os.path.join(LIB_DIR, fam['data'])
                if os.path.exists(data_path):
                    raw = load_json(data_path)
                    # Sérialiser chaque taille sur une ligne pour lisibilité
                    lines = [f'        {json.dumps(k)}: {json.dumps(v)}'
                             for k, v in raw['data'].items()]
                    data_js = '{\n' + ',\n'.join(lines) + '\n      }'
                else:
                    print(f'  ⚠  Fichier introuvable : {data_path}')

            # ── Charger le script de dessin ──────────────────
            script = fam.get('script')
            if script and script not in scripts_done:
                script_path = os.path.join(LIB_DIR, script)
                if os.path.exists(script_path):
                    draw_blocks.append(load_text(script_path))
                    scripts_done.add(script)
                else:
                    print(f'  ⚠  Script introuvable : {script_path}')

            draw_fn = json.dumps(fam.get('draw', ''))
            fam_name = json.dumps(fam['name'])
            fam_entries.append(
                f'        {{ name: {fam_name}, draw: {draw_fn}, data: {data_js} }}'
            )

        cat_name = json.dumps(cat['name'])
        fams_js  = ',\n'.join(fam_entries) if fam_entries else ''
        cat_entries.append(
            f'    {{\n      name: {cat_name},\n      families: [\n{fams_js}\n      ]\n    }}'
        )

    cats_js = ',\n'.join(cat_entries)
    draws_js = '\n\n'.join(draw_blocks)

    return (
        f'{MARKER_BEGIN} — Généré par build.py — ne pas éditer directement\n'
        f'// Éditer les fichiers dans libraries/ puis relancer build.py\n'
        f'const MINICAD_LIB = {{\n'
        f'  categories: [\n{cats_js}\n  ]\n'
        f'}};\n'
        f'{draws_js}\n'
        f'{MARKER_END}'
    )


def main():
    # ── Vérifications ────────────────────────────────────
    if not os.path.exists(HTML_FILE):
        sys.exit(f'Erreur : {HTML_FILE} introuvable.')
    if not os.path.exists(INDEX_FILE):
        sys.exit(f'Erreur : {INDEX_FILE} introuvable.')

    # ── Lire l'index ─────────────────────────────────────
    index = load_json(INDEX_FILE)

    # ── Construire le bloc JS ─────────────────────────────
    print('📦 MiniCAD build — injection bibliothèques')
    injected = build_lib_js(index)

    # ── Lire le HTML ──────────────────────────────────────
    with open(HTML_FILE, 'r', encoding='utf-8') as f:
        html = f.read()

    # ── Vérifier la présence des marqueurs ───────────────
    pattern = re.compile(
        re.escape(MARKER_BEGIN) + r'.*?' + re.escape(MARKER_END),
        re.DOTALL
    )
    if not pattern.search(html):
        sys.exit(
            f'Erreur : marqueurs introuvables dans {HTML_FILE}\n'
            f'Attendu : {MARKER_BEGIN} … {MARKER_END}'
        )

    # ── Injecter ──────────────────────────────────────────
    new_html = pattern.sub(lambda _: injected, html)

    with open(HTML_FILE, 'w', encoding='utf-8') as f:
        f.write(new_html)

    # ── Résumé ────────────────────────────────────────────
    n_cats  = len(index['categories'])
    n_fams  = sum(len(c.get('families', [])) for c in index['categories'])
    n_data  = sum(
        1 for c in index['categories']
        for f in c.get('families', [])
        if f.get('data')
    )
    print(f'  ✓ {n_cats} catégories, {n_fams} familles, {n_data} avec données')
    print(f'  ✓ minicad.html mis à jour')


if __name__ == '__main__':
    main()
