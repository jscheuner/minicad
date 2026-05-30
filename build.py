#!/usr/bin/env python3
"""
MiniCAD — Script de build des bibliothèques (+ démo optionnelle)
=================================================================
Lit les fichiers dans libraries/ et injecte le bloc généré
entre les marqueurs @@LIB_BEGIN / @@LIB_END dans minicad.html.

Usage:
    python build.py            # build normal (sans démo)
    python build.py --demo     # build avec séquence démo injectée

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
DEMO_FILE   = os.path.join(BASE_DIR, 'demo', 'demo_sequence.js')

MARKER_BEGIN      = '// @@LIB_BEGIN'
MARKER_END        = '// @@LIB_END'
DEMO_MARKER_BEGIN = '// @@DEMO_BEGIN'
DEMO_MARKER_END   = '// @@DEMO_END'


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


def build_demo_js():
    """Construit le bloc JS de démo à injecter."""
    if not os.path.exists(DEMO_FILE):
        sys.exit(f'Erreur : {DEMO_FILE} introuvable.')
    with open(DEMO_FILE, 'r', encoding='utf-8') as f:
        src = f.read().strip()
    return (
        f'{DEMO_MARKER_BEGIN} — Généré par build.py --demo — ne pas éditer directement\n'
        f'// Éditer demo/demo_sequence.js puis relancer build.py --demo\n'
        f'{src}\n'
        f'{DEMO_MARKER_END}'
    )


def inject_block(html, marker_begin, marker_end, block):
    """Remplace le contenu entre deux marqueurs."""
    pattern = re.compile(
        re.escape(marker_begin) + r'.*?' + re.escape(marker_end),
        re.DOTALL
    )
    if not pattern.search(html):
        sys.exit(
            f'Erreur : marqueurs introuvables dans {HTML_FILE}\n'
            f'Attendu : {marker_begin} … {marker_end}'
        )
    return pattern.sub(lambda _: block, html)


def clear_demo_block(html):
    """Remet le bloc démo à vide (build normal sans --demo)."""
    pattern = re.compile(
        re.escape(DEMO_MARKER_BEGIN) + r'.*?' + re.escape(DEMO_MARKER_END),
        re.DOTALL
    )
    if pattern.search(html):
        empty = f'{DEMO_MARKER_BEGIN}\n{DEMO_MARKER_END}'
        return pattern.sub(lambda _: empty, html)
    return html


def main():
    with_demo = '--demo' in sys.argv

    # ── Vérifications ────────────────────────────────────
    if not os.path.exists(HTML_FILE):
        sys.exit(f'Erreur : {HTML_FILE} introuvable.')
    if not os.path.exists(INDEX_FILE):
        sys.exit(f'Erreur : {INDEX_FILE} introuvable.')

    # ── Lire l'index ─────────────────────────────────────
    index = load_json(INDEX_FILE)

    # ── Construire le bloc bibliothèques ─────────────────
    tag = '📦 MiniCAD build' + (' + démo' if with_demo else '')
    print(f'{tag} — injection bibliothèques')
    lib_block = build_lib_js(index)

    # ── Lire le HTML ──────────────────────────────────────
    with open(HTML_FILE, 'r', encoding='utf-8') as f:
        html = f.read()

    # ── Injecter bibliothèques ───────────────────────────
    html = inject_block(html, MARKER_BEGIN, MARKER_END, lib_block)

    # ── Injecter / vider démo ────────────────────────────
    if with_demo:
        demo_block = build_demo_js()
        html = inject_block(html, DEMO_MARKER_BEGIN, DEMO_MARKER_END, demo_block)
    else:
        html = clear_demo_block(html)

    with open(HTML_FILE, 'w', encoding='utf-8') as f:
        f.write(html)

    # ── Résumé ────────────────────────────────────────────
    n_cats  = len(index['categories'])
    n_fams  = sum(len(c.get('families', [])) for c in index['categories'])
    n_data  = sum(
        1 for c in index['categories']
        for f in c.get('families', [])
        if f.get('data')
    )
    print(f'  ✓ {n_cats} catégories, {n_fams} familles, {n_data} avec données')
    if with_demo:
        print(f'  ✓ démo injectée (demo/demo_sequence.js)')
    print(f'  ✓ minicad.html mis à jour')


if __name__ == '__main__':
    main()
