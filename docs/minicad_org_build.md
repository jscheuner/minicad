# Génération de minicad_org.html

## Principe

`minicad_org.html` = copie exacte de `minicad.html` avec deux blocs supplémentaires injectés.

## Procédure

```python
with open('minicad.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('</head>', GTM_BLOCK + '\n</head>', 1)
content = content.replace('<body>', '<body>\n' + COOKIE_BLOCK, 1)

with open('minicad_org.html', 'w', encoding='utf-8') as f:
    f.write(content)
```

---

## Bloc 1 — à insérer juste avant `</head>`

```html
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
</script>
```

---

## Bloc 2 — à insérer juste après `<body>`

```html
<!-- Bannière cookies RGPD -->
<div id="cookie-banner" style="display:none;"></div>
<script>
(function(){
  if (!localStorage.getItem('minicad_cookie_consent')) {
    var b = document.getElementById('cookie-banner');
    b.style.display = 'flex';
    b.innerHTML = '<p>Ce site utilise des cookies analytiques (Google Tag Manager) pour mesurer l\'audience. Aucune donnée personnelle identifiable n\'est collectée.</p>'
      + '<div class="cb-btns"><button id="cb-accept">Accepter</button><button id="cb-decline">Refuser</button></div>';
  }
})();
</script>
```

---

## Comportement

| État localStorage | Comportement |
|---|---|
| Pas de valeur (1ère visite) | Bannière affichée |
| `accepted` | GTM chargé immédiatement, pas de bannière |
| `declined` | Rien chargé, pas de bannière |

GTM ID : **GTM-TW3P5FF7**
