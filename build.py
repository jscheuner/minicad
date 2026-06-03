#!/usr/bin/env python3
"""
MiniCAD — Script de build des bibliothèques (+ traductions + démo + déploiement)
==================================================================================
Source : src/minicad.html  (code pur avec marqueurs @@ et {{clés}} i18n)
Outputs: minicad.html (FR), minicad_en.html (EN), minicad_org.html (multilang)

Usage:
    python build.py                    # build FR → minicad.html
    python build.py --lang=en          # build EN → minicad_en.html (en plus)
    python build.py --lang=all         # build toutes les langues disponibles
    python build.py --demo             # + séquence démo injectée
    python build.py --demo --deploy    # + upload sur le serveur (minicad_org multilang)
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
SFTP_PORT     = int(_env.get('SFTP_PORT', 21))
SFTP_USER     = _env.get('SFTP_USER', '')
SFTP_PASSWORD = _env.get('SFTP_PASSWORD', '')
SFTP_REMOTE   = _env.get('SFTP_REMOTE', 'web/index.html')

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
HTML_SRC    = os.path.join(BASE_DIR, 'src', 'minicad.html')   # source (ne jamais écrire ici)
HTML_FILE   = os.path.join(BASE_DIR, 'minicad.html')          # output racine (GitHub download)
DEMO_OUT    = os.path.join(BASE_DIR, 'minicad_demo.html')
ORG_OUT     = os.path.join(BASE_DIR, 'minicad_org.html')
LIB_DIR     = os.path.join(BASE_DIR, 'libraries')
INDEX_FILE  = os.path.join(LIB_DIR, 'index.json')
HATCH_DIR   = os.path.join(BASE_DIR, 'hatches')
HATCH_INDEX  = os.path.join(HATCH_DIR, 'index.json')
DEMO_FILE    = os.path.join(BASE_DIR, 'demo', 'demo_sequence.js')
TRANS_DIR    = os.path.join(BASE_DIR, 'translations')


# ── Traductions ────────────────────────────────────────────────────────────────

def load_all_langs():
    """Charge tous les fichiers JSON de translations/ (sauf _meta)."""
    langs = {}
    if not os.path.isdir(TRANS_DIR):
        return langs
    for fname in sorted(os.listdir(TRANS_DIR)):
        if fname.endswith('.json'):
            code = fname[:-5]
            data = load_json(os.path.join(TRANS_DIR, fname))
            data.pop('_meta', None)
            langs[code] = data
    return langs


def apply_lang_mode_a(html, lang_code):
    """Mode A — substitution directe des {{clés}}, supprime attributs data-i18n*.
    Génère un fichier HTML autonome sans JS de traduction."""
    lang_file = os.path.join(TRANS_DIR, lang_code + '.json')
    if not os.path.exists(lang_file):
        print(f'  ⚠  Traduction manquante : {lang_file}')
        return html
    data = load_json(lang_file)
    data.pop('_meta', None)
    for key, value in data.items():
        html = html.replace('{{' + key + '}}', value)
    # Signaler les clés non résolues
    missing = set(re.findall(r'\{\{([^}]+)\}\}', html))
    if missing:
        print(f'  ⚠  Clés [{lang_code}] sans traduction : {missing}')
    # Supprimer les attributs data-i18n* (inutiles en mode autonome)
    html = re.sub(r'\s+data-i18n(?:-[a-z]+)?="[^"]*"', '', html)
    return html


def apply_lang_mode_b(html, default_lang='fr'):
    """Mode B — injecte toutes les langues + switcher runtime.
    Utilisé pour minicad_org.html (minicad.org)."""
    langs = load_all_langs()
    if not langs:
        print('  ⚠  Aucun fichier de traduction trouvé dans translations/')
        return apply_lang_mode_a(html, default_lang)

    # Remplacer {{clés}} par la langue par défaut (FR) — garder data-i18n
    default_data = langs.get(default_lang, {})
    for key, value in default_data.items():
        html = html.replace('{{' + key + '}}', value)

    # Injecter l'objet TRANSLATIONS + fonction setLang + switcher
    trans_json = json.dumps(langs, ensure_ascii=False, separators=(',', ':'))
    i18n_js = f"""<script id="i18n-runtime">
(function(){{
  var T = {trans_json};
  var _lang = localStorage.getItem('minicad_lang') || '{default_lang}';
  window.setLang = function(lang) {{
    if (!T[lang]) return;
    _lang = lang;
    localStorage.setItem('minicad_lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(function(el) {{
      var v = T[lang][el.dataset.i18n]; if (v) el.textContent = v;
    }});
    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {{
      var v = T[lang][el.dataset.i18nTitle]; if (v) el.title = v;
    }});
    document.querySelectorAll('[data-i18n-name]').forEach(function(el) {{
      var v = T[lang][el.dataset.i18nName]; if (v) el.dataset.name = v;
    }});
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {{
      var v = T[lang][el.dataset.i18nPlaceholder]; if (v) el.placeholder = v;
    }});
    document.querySelectorAll('.lang-btn').forEach(function(btn) {{
      btn.classList.toggle('active', btn.dataset.lang === lang);
    }});
  }};
  document.addEventListener('DOMContentLoaded', function() {{ window.setLang(_lang); }});
}})();
</script>"""
    # Injecter le CSS + les boutons de langue dans la topbar
    lang_codes = list(langs.keys())
    lang_btns = ''.join(
        f'<button class="lang-btn{" active" if c == default_lang else ""}" '
        f'data-lang="{c}" onclick="setLang(\'{c}\')" '
        f'title="Switch to {langs[c].get("_meta", {}).get("name", c.upper()) if "_meta" in langs.get(c, {}) else c.upper()}">'
        f'{c.upper()}</button>'
        for c in lang_codes
    )
    lang_css = """<style>
.lang-switcher{display:flex;align-items:center;gap:3px;margin-left:8px}
.lang-btn{background:transparent;border:1px solid #ffffff22;border-radius:3px;color:#ffffff55;
  font-size:9px;font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:.5px;
  padding:2px 5px;cursor:pointer;transition:all .15s}
.lang-btn:hover{border-color:#ffffff44;color:#ffffff88}
.lang-btn.active{border-color:var(--accent,#00d4ff);color:var(--accent,#00d4ff)}
</style>"""
    lang_widget = f'<div class="lang-switcher" id="lang-switcher">{lang_btns}</div>'
    # Injecter le CSS dans <head>
    html = html.replace('</head>', lang_css + i18n_js + '\n</head>', 1)
    # Injecter les boutons dans la topbar (avant </div> de topbar-right)
    html = html.replace('</div>\n</div>', lang_widget + '\n</div>\n</div>', 1)
    return html

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
    """Upload local_file sur le serveur FTP."""
    from ftplib import FTP, all_errors as FTP_ERRORS
    import socket

    if not SFTP_HOST or not SFTP_USER or not SFTP_PASSWORD:
        sys.exit('Erreur : credentials FTP manquants — créer un fichier .env (voir .env.example)')

    timeout = int(_env.get('SFTP_TIMEOUT', 15))
    remote_dir  = os.path.dirname(SFTP_REMOTE)   # ex: 'web'
    remote_file = os.path.basename(SFTP_REMOTE)  # ex: 'index.html'

    print(f'  → Connexion FTP {SFTP_USER}@{SFTP_HOST}:{SFTP_PORT} …')
    try:
        ftp = FTP()
        ftp.connect(SFTP_HOST, SFTP_PORT, timeout=timeout)
        ftp.login(SFTP_USER, SFTP_PASSWORD)
        if remote_dir:
            ftp.cwd(remote_dir)
        with open(local_file, 'rb') as f:
            ftp.storbinary(f'STOR {remote_file}', f)
        ftp.quit()
        print(f'  ✓ {os.path.basename(local_file)} → {SFTP_REMOTE}  (déployé)')
    except socket.timeout:
        sys.exit(f'Erreur : timeout ({timeout}s) — impossible de joindre {SFTP_HOST}:{SFTP_PORT}')
    except (socket.gaierror, ConnectionRefusedError, OSError) as e:
        sys.exit(f'Erreur réseau : {e}')
    except FTP_ERRORS as e:
        sys.exit(f'Erreur FTP : {e}')


def main():
    with_demo   = '--demo'   in sys.argv
    with_deploy = '--deploy' in sys.argv

    # ── Langue(s) cible(s) ───────────────────────────────
    lang_arg = next((a for a in sys.argv if a.startswith('--lang=')), None)
    if lang_arg:
        lang_val = lang_arg.split('=', 1)[1]
        if lang_val == 'all':
            target_langs = list(load_all_langs().keys())
        else:
            target_langs = lang_val.split(',')
    else:
        target_langs = ['fr']   # défaut : FR uniquement

    # ── Vérifications ────────────────────────────────────
    if not os.path.exists(HTML_SRC):
        sys.exit(f'Erreur : {HTML_SRC} introuvable.\n'
                 f'  Le code source doit être dans src/minicad.html')
    if not os.path.exists(INDEX_FILE):
        sys.exit(f'Erreur : {INDEX_FILE} introuvable.')

    # ── Lire l'index ─────────────────────────────────────
    index = load_json(INDEX_FILE)

    # ── Construire les blocs ──────────────────────────────
    langs_label = '+'.join(target_langs).upper()
    tag = f'📦 MiniCAD build [{langs_label}]' + (' + démo' if with_demo else '')
    print(f'{tag} — injection bibliothèques + hachures + traductions')
    lib_block   = build_lib_js(index)
    hatch_index = load_json(HATCH_INDEX) if os.path.exists(HATCH_INDEX) else []
    hatch_block = build_hatch_js(hatch_index)

    # ── Lire la SOURCE (src/minicad.html — ne jamais écrire ici) ─────────
    with open(HTML_SRC, 'r', encoding='utf-8') as f:
        html_src = f.read()

    # ── Injecter bibliothèques + hachures (commun à tous les outputs) ─────
    html_base = inject_block(html_src, MARKER_BEGIN, MARKER_END, lib_block)
    if HATCH_MARKER_BEGIN in html_base:
        html_base = inject_block(html_base, HATCH_MARKER_BEGIN, HATCH_MARKER_END, hatch_block)

    # ── Génération des outputs par langue (Mode A) ────────────────────────
    for lang in target_langs:
        html_lang = apply_lang_mode_a(clear_demo_block(html_base), lang)
        if lang == 'fr':
            out_path = HTML_FILE          # minicad.html
        else:
            out_path = os.path.join(BASE_DIR, f'minicad_{lang}.html')
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(html_lang)
        print(f'  ✓ [{lang.upper()}] → {os.path.basename(out_path)} ({len(html_lang.splitlines())} lignes)')

    # ── minicad_demo.html (Mode A, FR) + minicad_org.html (Mode B multilang) ──
    if with_demo:
        demo_block = build_demo_js()
        html_with_demo = inject_block(html_base, DEMO_MARKER_BEGIN, DEMO_MARKER_END, demo_block)

        # minicad_demo.html — Mode A FR (téléchargement GitHub avec démo)
        html_demo = apply_lang_mode_a(html_with_demo, 'fr')
        with open(DEMO_OUT, 'w', encoding='utf-8') as f:
            f.write(html_demo)
        print(f'  ✓ [FR+démo] → minicad_demo.html')

        # minicad_org.html — Mode B multilang + GTM (minicad.org)
        html_org_i18n = apply_lang_mode_b(html_with_demo, 'fr')
        html_org = build_org_html(html_org_i18n)
        with open(ORG_OUT, 'w', encoding='utf-8') as f:
            f.write(html_org)
        all_langs = list(load_all_langs().keys())
        print(f'  ✓ [multilang:{",".join(all_langs)}] → minicad_org.html')

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
    all_langs = load_all_langs()
    print(f'  ✓ Traductions disponibles : {", ".join(all_langs.keys())}')
    if with_demo:
        print(f'  ✓ démo injectée → minicad_demo.html')
        print(f'  ✓ GTM + cookies injectés → minicad_org.html')
    if with_deploy:
        print(f'  ✓ déployé sur {SFTP_HOST} → index.html')


if __name__ == '__main__':
    main()
