#!/usr/bin/env python3
"""Vérifie que l'export DXF de src/minicad.html est accepté par AutoCAD.

Extrait `exportDXF()` du source, l'exécute sous Node avec des bouchons minimaux,
puis valide le fichier produit avec ezdxf — dont l'audit applique les mêmes règles
que l'ODA/AutoCAD (c'est lui qui détecte, par exemple, une DIMENSION privée de son
bloc de géométrie, cause historique des fichiers refusés).

Outillage de développement uniquement : le HTML livré reste sans dépendance.

    pip install ezdxf
    python tests/dxf_export_test.py
"""
import json, pathlib, re, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "minicad.html"

# ── Bouchons : seules les fonctions dont dépend exportDXF ──────────────────────
STUBS = r"""
function arcSpan(sa, ea){ let e=ea; while(e<sa-1e-12) e+=Math.PI*2; return e-sa; }
function dimTextGap(ds){ return (ds&&ds.textGap!=null)?ds.textGap:((ds?ds.textHeight:4)*0.3); }
function getDimStyle(e){ const n=(e&&e.dimStyle)||S.currentDimStyle;
  return S.dimStyles.find(d=>d.name===n)||S.dimStyles[0]; }
function dimText(e,v){ const ds=getDimStyle(e); const d=(ds&&ds.decimals!=null)?ds.decimals:1;
  const s=v.toFixed(d); const t=e.text||''; return (!t||t==='<>')?s:t.replace('<>',s); }
function _hatchDef(p){ return {dxfName:'ANSI31', defaultAngle:45, families:[1]}; }
function getHatchPoints(e){ return e.points; }
function termPrint(){}
function currentDrawingBaseName(d){ return d; }
let OUT=null;
async function saveWithPicker(content){ OUT=content; return 'test.dxf'; }
const S = {
  currentDimStyle: '1:10',
  dimStyles: [
    { name:'1:1',  textHeight: 4, arrowSize: 2.5, extGap: 1.5, extOff: 2, textGap: 1, decimals:1 },
    { name:'1:10', textHeight:10, arrowSize: 6.0, extGap: 4.0, extOff:10, textGap: 3, decimals:0 },
    { name:'1:50', textHeight:50, arrowSize:30.0, extGap:20.0, extOff:20, textGap:15, decimals:0 },
  ],
  layers: [], entities: [],
};
"""

# ── Jeux d'essai : un exemplaire de chaque type d'entité + cas limites ─────────
BASE_LAYERS = [
    {"name": "0", "color": "#ffffff", "visible": True},
    {"name": "Murs / béton", "color": "#ff0000", "visible": True},
]

COMPLET = [
    {"type": "line", "layer": 0, "x1": 0, "y1": 0, "x2": 100, "y2": 50},
    {"type": "rect", "layer": 1, "x1": 0, "y1": 0, "x2": 200, "y2": 120},
    {"type": "circle", "layer": 0, "cx": 50, "cy": 50, "r": 25, "color": "#ff0000"},
    {"type": "arc", "layer": 0, "cx": 150, "cy": 50, "r": 30, "startAngle": 0, "endAngle": 1.5708},
    {"type": "ellipse", "layer": 0, "cx": 300, "cy": 80, "rx": 60, "ry": 30, "angle": 0.3},
    {"type": "ellipse", "layer": 0, "cx": 300, "cy": 250, "rx": 20, "ry": 70,
     "angle": 0.2, "startAngle": 0.5, "endAngle": 3.0},          # ry > rx ⇒ bascule du grand axe
    {"type": "polyline", "layer": 0, "points": [[0, 0], [50, 20], [90, -10]], "closed": False},
    {"type": "polyline", "layer": 0, "points": [[0, 200], [50, 220], [90, 190]], "closed": True},
    {"type": "spline", "layer": 0, "points": [[0, 300], [40, 340], [80, 300], [120, 350]], "closed": False},
    {"type": "text", "layer": 0, "x": 10, "y": 400, "size": 12, "content": "Accents éàü — OK"},
    {"type": "point", "layer": 0, "x": 5, "y": 5},
    {"type": "xline", "layer": 0, "x": 0, "y": 0, "dx": 1, "dy": 1},
    {"type": "ray", "layer": 0, "x": 0, "y": 0, "dx": 0, "dy": 1},
    {"type": "wall", "layer": 1, "x1": 0, "y1": 500, "x2": 300, "y2": 500, "thickness": 20},
    {"type": "hatch", "layer": 0, "points": [[400, 0], [500, 0], [500, 100], [400, 100]],
     "pattern": "ANSI31", "angle": 45, "spacing": 10},
    {"type": "leader", "layer": 0, "x1": 0, "y1": 600, "x2": 60, "y2": 640, "text": "Repère éà"},
    {"type": "dim_linear", "layer": 0, "x1": 0, "y1": 0, "x2": 200, "y2": 0, "offset": 30,
     "isHoriz": True, "text": "<> mm (à revoir)", "dimStyle": "1:50", "textOffset": 5},
    {"type": "dim_linear", "layer": 0, "x1": 0, "y1": 0, "x2": 0, "y2": 120, "offset": -40, "isHoriz": False},
    {"type": "dim_aligned", "layer": 0, "x1": 0, "y1": 700, "x2": 150, "y2": 780, "offset": 25},
    {"type": "dim_angular", "layer": 0, "vx": 0, "vy": 900, "x1": 100, "y1": 900,
     "x2": 0, "y2": 1000, "r": 50, "startAngle": 0, "angle": 1.5708},
    {"type": "dim_radius", "layer": 0, "cx": 600, "cy": 100, "r": 40, "angle": 0.5},
    {"type": "dim_diameter", "layer": 0, "cx": 700, "cy": 100, "r": 40, "angle": 0.5},
    {"type": "dim_arc", "layer": 0, "cx": 800, "cy": 100, "r": 50,
     "startAngle": 0, "endAngle": 1.5708, "offset": 10},
    {"type": "cable", "layer": 0, "points": [[0, 1100], [80, 1140], [160, 1100]], "closed": False},
    {"type": "tube", "layer": 0, "startX": 0, "startY": 1200, "startAngle": 0, "tubeRadius": 15,
     "segments": [{"type": "straight", "length": 100},
                  {"type": "bend", "angle": 1.5708, "bendRadius": 40, "side": 1},
                  {"type": "straight", "length": 80}]},
    {"type": "door", "layer": 1, "x": 900, "y": 0},
    {"type": "outlet", "layer": 1, "x": 950, "y": 0},
    {"type": "switch_sym", "layer": 1, "x": 1000, "y": 0},
    {"type": "window_sym", "layer": 1, "x": 1050, "y": 0},
]

CAS = {
    "complet": (BASE_LAYERS, COMPLET),
    "vide": (BASE_LAYERS[:1], []),
    # « Mur 1 » et « Mur_1 » s'assainissent en un même nom : les LAYER doivent être dédoublonnés
    "calques_homonymes": ([{"name": n, "color": "#ffffff", "visible": True}
                           for n in ("0", "Mur 1", "Mur_1", "Mur/1", "", "0")], []),
    "geometrie_degeneree": (BASE_LAYERS[:1], [
        {"type": "line", "layer": 0, "x1": 0, "y1": 0, "x2": 0, "y2": 0},
        {"type": "polyline", "layer": 0, "points": [], "closed": False},
        {"type": "ellipse", "layer": 0, "cx": 0, "cy": 0, "rx": 0, "ry": 5},
        {"type": "dim_radius", "layer": 0, "cx": 0, "cy": 0, "r": 0.0001, "angle": 0},
        {"type": "dim_angular", "layer": 0, "vx": 0, "vy": 0, "x1": 10, "y1": 0,
         "x2": 0, "y2": 10, "r": 0, "startAngle": 0, "angle": -1.0},
        {"type": "circle", "layer": 9, "cx": 0, "cy": 0, "r": 5},   # index de calque hors bornes
    ]),
}

# Codes de groupe DXF à valeur flottante (norme ODA) : DOIVENT contenir un point
# décimal, sans quoi AutoCAD (surtout AutoCAD Web) affiche « Invalid or Incomplete
# dxf input » et rejette le fichier entier — alors qu'ezdxf.readfile()/recover(),
# eux, acceptent silencieusement "50" comme "50.0" (str→float lenient). C'est ce
# qui avait laissé passer le bug : `parseFloat(n.toFixed(6))` puis String() efface
# le ".0" dès que la valeur est un entier.
CODES_FLOTTANTS = set(range(10, 60)) | set(range(110, 160)) | set(range(210, 240)) | set(range(460, 470))


# Enregistrements de table à schéma plat (aucune boucle de sommets, une seule sous-classe
# hors AcDbSymbolTableRecord) : un code de groupe n'y apparaît jamais deux fois. Le bug DIMDEC
# (271 écrit deux fois de suite dans chaque DIMSTYLE) prouve que ni ezdxf ni LibreCAD ne
# détectent ce genre de doublon — ils gardent simplement la dernière valeur lue.
TABLE_RECORD_TYPES = {
    "DIMSTYLE", "LAYER", "STYLE", "APPID", "LTYPE", "VPORT", "CLASS", "BLOCK_RECORD",
    # Entités simples : un seul point/valeur par champ, aucune boucle de sommets
    # (contrairement à LWPOLYLINE/SPLINE/HATCH) ni sous-classes composites à champs
    # qui se chevauchent (contrairement à DIMENSION/LAYOUT) — un doublon y est
    # toujours un bug.
    "LINE", "CIRCLE", "ARC", "ELLIPSE", "POINT", "XLINE", "RAY", "TEXT",
}


def verifier_codes_dupliques(texte):
    lignes = texte.splitlines()
    erreurs = []
    i, n = 0, len(lignes)
    while i < n:
        if lignes[i].strip() == '0' and i + 1 < n and lignes[i + 1].strip() in TABLE_RECORD_TYPES:
            rtype = lignes[i + 1].strip()
            j = i + 2
            vus = {}
            while j < n and lignes[j].strip() != '0':
                code = lignes[j].strip()
                if code.isdigit():
                    vus[code] = vus.get(code, 0) + 1
                j += 2
            for code, cnt in vus.items():
                if cnt > 1 and code != '100':   # 100 = marqueur de sous-classe, répété par nature
                    erreurs.append(f"{rtype}: code {code} répété {cnt}× dans un même enregistrement")
            i = j
        else:
            i += 2
    return erreurs


def verifier_splines(texte):
    """72/73 doivent annoncer le nombre réel de nœuds (40) et de points de contrôle (10).

    MiniCAD écrivait des SPLINE avec 72=0, 73=0 et seulement des points de passage
    (code 11) : une entité que ni ezdxf ni libdxfrw ne signalent, mais qu'aucun noyau
    CAO ne sait reconstruire — il faut des points de contrôle et un vecteur nodal.
    Invariant B-spline : nb_nœuds == nb_points_de_contrôle + degré + 1.
    """
    lignes = texte.splitlines()
    erreurs = []
    for i in range(0, len(lignes) - 1, 2):
        if lignes[i].strip() != '0' or lignes[i + 1].strip() != 'SPLINE':
            continue
        j, champs, n40, n10 = i + 2, {}, 0, 0
        while j + 1 < len(lignes) and lignes[j].strip() != '0':
            code = lignes[j].strip()
            if code == '40':    n40 += 1
            elif code == '10':  n10 += 1
            elif code in ('71', '72', '73'): champs[code] = int(lignes[j + 1])
            j += 2
        deg = champs.get('71', 3)
        if champs.get('73', 0) != n10:
            erreurs.append(f"SPLINE: code 73 = {champs.get('73')} mais {n10} points de contrôle écrits")
        if champs.get('72', 0) != n40:
            erreurs.append(f"SPLINE: code 72 = {champs.get('72')} mais {n40} nœuds écrits")
        if n10 < deg + 1:
            erreurs.append(f"SPLINE: {n10} points de contrôle pour un degré {deg} (minimum {deg + 1})")
        elif n40 != n10 + deg + 1:
            erreurs.append(f"SPLINE: {n40} nœuds pour {n10} points de contrôle de degré {deg} "
                           f"(attendu {n10 + deg + 1})")
    return erreurs


def verifier_points_decimaux(texte):
    lignes = texte.splitlines()
    erreurs = []
    i = 0
    while i + 1 < len(lignes):
        code, valeur = lignes[i].strip(), lignes[i + 1]
        if code.isdigit() and int(code) in CODES_FLOTTANTS:
            v = valeur.strip()
            if v and '.' not in v and 'e' not in v.lower():
                erreurs.append(f"code {code} = {valeur!r} sans point décimal (ligne {i + 2})")
        i += 2
    return erreurs


# Types dessinables qui doivent tous se retrouver dans le DXF (hors symboles/bloc).
ATTENDUS = {
    "LINE", "LWPOLYLINE", "CIRCLE", "ARC", "ELLIPSE", "SPLINE",
    "TEXT", "MTEXT", "POINT", "XLINE", "RAY", "HATCH", "LEADER", "DIMENSION",
}


def extraire_export():
    """Isole exportDXF() + ses aides du HTML source."""
    src = SRC.read_text(encoding="utf-8")
    debut = src.index("// ===== DXF EXPORT =====")
    fin = src.index("function downloadBlob")
    bloc = src[debut:fin]
    # exportDWG ne fait que déléguer, et référence des symboles absents des bouchons
    bloc = re.sub(r"async function exportDWG\(\) \{.*?\n\}\n", "", bloc, flags=re.S)
    return bloc


def main():
    try:
        import ezdxf
        from ezdxf import recover
    except ImportError:
        sys.exit("ezdxf manquant :  pip install ezdxf")

    js = STUBS + extraire_export()
    echecs = []

    with tempfile.TemporaryDirectory() as tmp:
        tmp = pathlib.Path(tmp)
        for nom, (layers, entities) in CAS.items():
            runner = tmp / f"{nom}.js"
            dxf_out = tmp / f"{nom}.dxf"
            runner.write_text(
                js
                + f"\nS.layers = {json.dumps(layers)};\nS.entities = {json.dumps(entities)};\n"
                + f"exportDXF().then(() => require('fs').writeFileSync({str(dxf_out)!r}, OUT, 'latin1'));\n",
                encoding="utf-8")
            r = subprocess.run(["node", str(runner)], capture_output=True, text=True)
            if r.returncode != 0:
                echecs.append(f"{nom}: exportDXF a levé une exception\n{r.stderr.strip()}")
                continue

            octets = dxf_out.read_bytes()
            if any(b > 127 for b in octets):
                echecs.append(f"{nom}: le fichier n'est pas en ASCII pur "
                              f"(AC1015 n'est pas de l'UTF-8 — échapper en \\U+XXXX)")

            texte = octets.decode('latin1')
            for err in verifier_points_decimaux(texte):
                echecs.append(f"{nom}: {err}")
            for err in verifier_codes_dupliques(texte):
                echecs.append(f"{nom}: {err}")
            for err in verifier_splines(texte):
                echecs.append(f"{nom}: {err}")

            try:                                  # lecture stricte : aucune réparation tolérée
                ezdxf.readfile(dxf_out)
            except Exception as ex:
                echecs.append(f"{nom}: lecture stricte impossible — {type(ex).__name__}: {ex}")
                continue

            doc, audit = recover.readfile(dxf_out)
            for e in audit.errors:
                echecs.append(f"{nom}: ERREUR d'audit {e.code} — {e.message}")
            for e in audit.fixes:
                # Toute « réparation » est un rejet côté AutoCAD : on la traite en échec.
                echecs.append(f"{nom}: audit a dû corriger {e.code} — {e.message}")

            msp = doc.modelspace()
            if nom == "complet":
                presents = {ent.dxftype() for ent in msp}
                manquants = ATTENDUS - presents
                if manquants:
                    echecs.append(f"{nom}: types absents de l'export — {sorted(manquants)}")
                # Chaque cote doit pointer vers un bloc de géométrie non vide
                for d in (e for e in msp if e.dxftype() == "DIMENSION"):
                    blk = d.dxf.get("geometry")
                    if not blk or blk not in doc.blocks:
                        echecs.append(f"{nom}: DIMENSION sans bloc de géométrie ({blk!r})")
                    elif len(list(doc.blocks.get(blk))) == 0:
                        echecs.append(f"{nom}: bloc de cote {blk} vide")
                # Les styles de cote doivent porter de vraies valeurs
                for st in doc.dimstyles:
                    if st.dxf.name.lower() == "standard":
                        continue
                    if not st.dxf.get("dimtxt"):
                        echecs.append(f"{nom}: DIMSTYLE {st.dxf.name} sans DIMTXT")
                noms = [l.dxf.name.upper() for l in doc.layers]
                if len(noms) != len(set(noms)):
                    echecs.append(f"{nom}: noms de calque en double — {noms}")
            print(f"  {'✗' if echecs else '✓'} {nom:22} "
                  f"{len(list(msp))} entités, {len(audit.errors)} erreur(s), {len(audit.fixes)} correction(s)")

    if echecs:
        print("\nÉCHEC :")
        for e in echecs:
            print("  -", e)
        sys.exit(1)
    print("\n✓ Export DXF conforme AC1015 (R2000) — accepté sans réparation.")


if __name__ == "__main__":
    main()
