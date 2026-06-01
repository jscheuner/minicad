#!/usr/bin/env python3
"""
MiniCAD — Script de build des bibliothèques (+ démo optionnelle + déploiement)
===============================================================================
Lit les fichiers dans libraries/ et injecte le bloc généré
entre les marqueurs @@LIB_BEGIN / @@LIB_END dans minicad.html.

Usage:
    python build.py                    # build normal (sans démo)
    python build.py --demo             # build avec séquence démo injectée
    python build.py --demo --deploy    # build + upload index.html sur le serveur

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

# ── Paramètres SFTP (lus depuis .env) ────────────────────────────────────────
def _load_env():
    env = {}
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if not os.path.exists(env_path):
        return env
    with open(env_path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                env[k.strip()] = v.strip()
    return env

_env = _load_env()
SFTP_HOST     = _env.get('SFTP_HOST', '')
SFTP_PORT     = int(_env.get('SFTP_PORT', 22))
SFTP_USER     = _env.get('SFTP_USER', '')
SFTP_PASSWORD = _env.get('SFTP_PASSWORD', '')
SFTP_REMOTE   = _env.get('SFTP_REMOTE', 'web/index.html')

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
HTML_FILE   = os.path.join(BASE_DIR, 'minicad.html')
DEMO_OUT    = os.path.join(BASE_DIR, 'minicad_demo.html')
ORG_OUT     = os.path.join(BASE_DIR, 'minicad_org.html')
LIB_DIR     = os.path.join(BASE_DIR, 'libraries')
INDEX_FILE  = os.path.join(LIB_DIR, 'index.json')
HATCH_DIR   = os.path.join(BASE_DIR, 'hatches')
HATCH_INDEX = os.path.join(HATCH_DIR, 'index.json')
DEMO_FILE   = os.path.join(BASE_DIR, 'demo', 'demo_sequence.js')

GTM_BLOCK = """\
<!-- Cookie Consent + Google Tag Manager (chargé après consentement) -->
<style>
  #cookie-banner {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 99999;
    background: #16213e; border-top: 1px solid #00d4ff44;
    padding: 14px 24px; display: flex; align-items: center; gap: 16px;
    flex-wrap: wrap; font-family: 'IBM Plex Sans', sans-serif; font-size: 13px;
    color: #a0b4c8; box-shadow: 0 -4px 24px #00000066;
  }
  #cookie-banner p { margin: 0; flex: 1; min-width: 200px; line-height: 1.5; }
  #cookie-banner a { color: #00d4ff; text-decoration: underline; }
  #cookie-banner .cb-btns { display: flex; gap: 10px; flex-shrink: 0; }
  #cookie-banner button {
    padding: 7px 18px; border-radius: 4px; border: 1px solid;
    cursor: pointer; font-size: 13px; font-family: inherit; transition: opacity .2s;
  }
  #cookie-banner button:hover { opacity: .8; }
  #cb-accept {
    background: #00d4ff22; color: #00d4ff; border-color: #00d4ff88;
  }
  #cb-decline {
    background: transparent; color: #607080; border-color: #607080;
  }
</style>
<script>
(function(){
  var GTM_ID = 'GTM-TW3P5FF7';
  var CONSENT_KEY = 'minicad_cookie_consent';

  function loadGTM() {
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer',GTM_ID);
    var ns=document.createElement('noscript');
    var ifr=document.createElement('iframe');
    ifr.src='https://www.googletagmanager.com/ns.html?id='+GTM_ID;
    ifr.height='0'; ifr.width='0';
    ifr.style.cssText='display:none;visibility:hidden';
    ns.appendChild(ifr);
    document.body.insertBefore(ns, document.body.firstChild);
  }

  function hideBanner() {
    var b=document.getElementById('cookie-banner');
    if(b) b.remove();
  }

  function accept() {
    localStorage.setItem(CONSENT_KEY,'accepted');
    hideBanner(); loadGTM();
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY,'declined');
    hideBanner();
  }

  var consent = localStorage.getItem(CONSENT_KEY);
  if (consent === 'accepted') {
    document.addEventListener('DOMContentLoaded', loadGTM);
  } else if (!consent) {
    document.addEventListener('DOMContentLoaded', function() {
      var banner = document.getElementById('cookie-banner');
      if (!banner) return;
      document.getElementById('cb-accept').onclick = accept;
      document.getElementById('cb-decline').onclick = decline;
    });
  }
})();
</script>"""

COOKIE_BLOCK = """\
<!-- Bannière cookies RGPD -->
<div id="cookie-banner" style="display:none;"></div>
<script>
(function(){
  if (!localStorage.getItem('minicad_cookie_consent')) {
    var b = document.getElementById('cookie-banner');
    b.style.display = 'flex';
    b.innerHTML = '<p>Ce site utilise des cookies analytiques (Google Tag Manager) pour mesurer l\\'audience. Aucune donnée personnelle identifiable n\\'est collectée.</p>'
      + '<div class="cb-btns"><button id="cb-accept">Accepter</button><button id="cb-decline">Refuser</button></div>';
  }
})();
</script>"""

MARKER_BEGIN       = '// @@LIB_BEGIN'
MARKER_END         = '// @@LIB_END'
HATCH_MARKER_BEGIN = '// @@HATCH_BEGIN'
HATCH_MARKER_END   = '// @@HATCH_END'
DEMO_MARKER_BEGIN  = '// @@DEMO_BEGIN'
DEMO_MARKER_END    = '// @@DEMO_END'


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
            fam_standard = ''
            fam_family = ''
            if fam.get('data'):
                data_path = os.path.join(LIB_DIR, fam['data'])
                if os.path.exists(data_path):
                    raw = load_json(data_path)
                    fam_standard = raw.get('standard', '')
                    fam_family   = raw.get('family', '')
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
                f'        {{ name: {fam_name}, draw: {draw_fn},'
                f' standard: {json.dumps(fam_standard)}, family: {json.dumps(fam_family)},'
                f' data: {data_js} }}'
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


def build_hatch_js(index):
    """Construit le bloc JS MINICAD_HATCHES à partir de hatches/index.json."""
    patterns = []
    for name in index:
        path = os.path.join(HATCH_DIR, name + '.json')
        if os.path.exists(path):
            pat = load_json(path)
            patterns.append(json.dumps(pat, ensure_ascii=False))
        else:
            print(f'  ⚠  Pattern hachure introuvable : {path}')
    pats_js = ',\n  '.join(patterns)
    return (
        f'{HATCH_MARKER_BEGIN} — Généré par build.py — ne pas éditer directement\n'
        f'// Éditer les fichiers dans hatches/ puis relancer build.py\n'
        f'const MINICAD_HATCHES = [\n  {pats_js}\n];\n'
        f'{HATCH_MARKER_END}'
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


def build_org_html(html):
    """Injecte GTM + cookie banner dans le HTML pour générer minicad_org.html."""
    html = html.replace('</head>', GTM_BLOCK + '\n</head>', 1)
    html = html.replace('<body>', '<body>\n' + COOKIE_BLOCK, 1)
    return html


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


def deploy_sftp(local_file):
    """Upload local_file sur le serveur SFTP en tant qu'index.html."""
    try:
        import paramiko
    except ImportError:
        sys.exit('Erreur : paramiko non installé — pip install paramiko')

    if not SFTP_HOST or not SFTP_USER or not SFTP_PASSWORD:
        sys.exit('Erreur : credentials SFTP manquants — créer un fichier .env (voir .env.example)')
    print(f'  → Connexion SFTP {SFTP_USER}@{SFTP_HOST}:{SFTP_PORT} …')
    transport = paramiko.Transport((SFTP_HOST, SFTP_PORT))
    try:
        transport.connect(username=SFTP_USER, password=SFTP_PASSWORD)
        sftp = paramiko.SFTPClient.from_transport(transport)

        # Supprimer l'index.html existant (ignorer si absent)
        try:
            sftp.remove(SFTP_REMOTE)
            print(f'  ✓ index.html existant supprimé')
        except FileNotFoundError:
            pass

        # Uploader le nouveau fichier
        sftp.put(local_file, SFTP_REMOTE)
        print(f'  ✓ {os.path.basename(local_file)} → {SFTP_REMOTE}  (déployé)')

        sftp.close()
    finally:
        transport.close()


def main():
    with_demo  = '--demo'   in sys.argv
    with_deploy = '--deploy' in sys.argv

    # ── Vérifications ────────────────────────────────────
    if not os.path.exists(HTML_FILE):
        sys.exit(f'Erreur : {HTML_FILE} introuvable.')
    if not os.path.exists(INDEX_FILE):
        sys.exit(f'Erreur : {INDEX_FILE} introuvable.')

    # ── Lire l'index ─────────────────────────────────────
    index = load_json(INDEX_FILE)

    # ── Construire les blocs ──────────────────────────────
    tag = '📦 MiniCAD build' + (' + démo' if with_demo else '')
    print(f'{tag} — injection bibliothèques + hachures')
    lib_block   = build_lib_js(index)
    hatch_index = load_json(HATCH_INDEX) if os.path.exists(HATCH_INDEX) else []
    hatch_block = build_hatch_js(hatch_index)

    # ── Lire le HTML ──────────────────────────────────────
    with open(HTML_FILE, 'r', encoding='utf-8') as f:
        html = f.read()

    # ── Injecter bibliothèques ───────────────────────────
    html = inject_block(html, MARKER_BEGIN, MARKER_END, lib_block)

    # ── Injecter hachures ────────────────────────────────
    if HATCH_MARKER_BEGIN in html:
        html = inject_block(html, HATCH_MARKER_BEGIN, HATCH_MARKER_END, hatch_block)

    # ── minicad.html : toujours mis à jour (libs, bloc démo vide) ────────
    html_dev = clear_demo_block(html)
    with open(HTML_FILE, 'w', encoding='utf-8') as f:
        f.write(html_dev)

    # ── minicad_demo.html + minicad_org.html : uniquement avec --demo ───────
    if with_demo:
        demo_block = build_demo_js()
        html_demo  = inject_block(html, DEMO_MARKER_BEGIN, DEMO_MARKER_END, demo_block)
        with open(DEMO_OUT, 'w', encoding='utf-8') as f:
            f.write(html_demo)

        html_org = build_org_html(html_demo)   # basé sur minicad_demo.html (avec démo)
        with open(ORG_OUT, 'w', encoding='utf-8') as f:
            f.write(html_org)

    # ── Déploiement SFTP ─────────────────────────────────
    if with_deploy:
        if not with_demo:
            sys.exit('Erreur : --deploy nécessite --demo (minicad_org.html doit exister).')
        deploy_sftp(ORG_OUT)

    # ── Résumé ────────────────────────────────────────────
    n_cats  = len(index['categories'])
    n_fams  = sum(len(c.get('families', [])) for c in index['categories'])
    n_data  = sum(
        1 for c in index['categories']
        for f in c.get('families', [])
        if f.get('data')
    )
    print(f'  ✓ {n_cats} catégories, {n_fams} familles, {n_data} avec données')
    print(f'  ✓ {len(hatch_index)} patterns de hachure')
    print(f'  ✓ minicad.html mis à jour')
    if with_demo:
        print(f'  ✓ démo injectée → minicad_demo.html')
        print(f'  ✓ GTM + cookies injectés → minicad_org.html')
    if with_deploy:
        print(f'  ✓ déployé sur {SFTP_HOST} → index.html')


if __name__ == '__main__':
    main()
