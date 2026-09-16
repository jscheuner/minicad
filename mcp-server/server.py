"""Serveur MCP pour piloter MiniCAD en direct dans un navigateur visible.

Ne fait AUCUNE modification a src/minicad.html : c'est un outil externe qui
pilote une instance de l'app via Chrome DevTools Protocol, en tapant des
commandes dans son terminal integre (meme mecanisme qu'un usage manuel).

Lancement (stdio, via un client MCP type Claude Code) :
    python3 server.py
"""
import asyncio
import base64
import json
import tempfile

from mcp.server.fastmcp import FastMCP, Image

from cdp_bridge import MiniCADSession

mcp = FastMCP("minicad")

_session: MiniCADSession | None = None
_lock = asyncio.Lock()


async def _get_session() -> MiniCADSession:
    global _session
    async with _lock:
        if _session is None:
            _session = MiniCADSession()
        await _session.ensure_started()
        return _session


@mcp.tool()
async def minicad_command(commands: list[str]) -> str:
    """Envoie une ou plusieurs commandes au terminal MiniCAD, comme si un humain les tapait.

    Chaque element de `commands` correspond a une ligne tapee dans le terminal
    de MiniCAD suivie d'Entree (alias CAO : RECT, L, CIRCLE, coordonnees
    "X,Y", distances "150", polaire "100<45", etc.).

    Exemple pour une plaque 100x100mm : ["RECT", "0,0", "100,100"]
    """
    session = await _get_session()
    results = []
    async with _lock:
        for cmd in commands:
            tool_state = await session.send_command(cmd)
            results.append(f"> {cmd}  (tool={tool_state})")
    return "\n".join(results)


@mcp.tool()
async def minicad_click(x: float, y: float) -> str:
    """Simule un clic sur le canvas en coordonnees monde (mm), pour les etapes que le
    terminal ne peut pas piloter par du texte.

    Necessaire pour :
    - Le 3e clic (placement/offset) de DIMLINEAR / DIMALIGNED, apres avoir tape les
      deux premiers points via minicad_command.
    - DIMRADIUS / DIMDIAMETER : 1er clic sur le trace du cercle/arc (tolerance
      ~12px ecran — viser un point exact sur la circonference), 2e clic pour
      placer le texte.
    - Le placement de DOOR, OUTLET, WINDOW, SWITCH (modules arch/elec).
    - Le point de base ET le point de destination de MOVE, COPY, ROTATE, SCALE,
      MIRROR (apres minicad_select) : ces outils ne sont PAS dans la liste des
      outils "tapables" au clavier, contrairement aux outils de dessin — verifie
      empiriquement (taper "0,0" ne fait rien tant que S.tool n'est pas dans cette
      liste). Utiliser minicad_click pour ces deux points, pas minicad_command.

    Exemple cote lineaire entre (0,0) et (100,0), ligne de cote placee 20mm au-dessus :
        minicad_command(["LOAD dim", "DIMLINEAR", "0,0", "100,0"])
        minicad_click(50, 20)

    Exemple deplacer une entite deja selectionnee de (0,0) vers (50,50) :
        minicad_command(["MOVE"])
        minicad_click(0, 0)
        minicad_click(50, 50)
    """
    session = await _get_session()
    async with _lock:
        tool_state = await session.click_world(x, y)
    return f"clic ({x},{y})  (tool={tool_state})"


@mcp.tool()
async def minicad_text(x: float, y: float, content: str, size: float | None = None) -> str:
    """Place un texte (module annot) au point (x,y) en coordonnees monde (mm).

    Charge le module et active l'outil TEXTE au besoin, puis remplit et confirme la
    boite de dialogue de saisie (l'outil TEXTE n'accepte pas de contenu tape dans le
    terminal, seulement un clic d'insertion suivi d'un dialogue).

    Exemple : minicad_text(10, 10, "Plaque 100x100")
    """
    session = await _get_session()
    async with _lock:
        await session.send_command("LOAD annot")
        await session.send_command("TEXT")
        await session.place_text(x, y, content, size)
    return f"texte {content!r} place en ({x},{y})"


@mcp.tool()
async def minicad_select(ids: list[int]) -> str:
    """Selectionne des entites par id (equivalent d'un clic/fenetre de selection).

    Necessaire avant d'invoquer au terminal les commandes qui exigent une selection
    prealable : MOVE, COPY, ROTATE, SCALE, MIRROR, ARRAY, ARRAY_POLAR, DIVIDE,
    EXPLODE, SMOOTH... Utiliser minicad_entities() pour retrouver les ids. Une fois
    la commande invoquee (ex: minicad_command(["MOVE"])), le(s) point(s) suivant(s)
    (base, destination) se donnent via minicad_click — pas minicad_command, ces
    outils ne sont pas pilotables par coordonnees tapees.

    Exemple : deplacer le rectangle #1 de (0,0) vers (50,50) :
        minicad_select([1])
        minicad_command(["MOVE"])
        minicad_click(0, 0)
        minicad_click(50, 50)
    """
    session = await _get_session()
    async with _lock:
        selected = await session.select_entities(ids)
    return f"selection: {selected}"


@mcp.tool()
async def minicad_selection() -> str:
    """Retourne la selection actuelle dans MiniCAD (S.selected), en lecture seule.

    Reflete aussi bien une selection faite au clavier/souris par un humain dans
    la fenetre visible qu'un minicad_select() precedent — utile pour verifier ce
    que l'utilisateur a selectionne manuellement avant d'appliquer une commande
    de modification (MOVE, ROTATE...), sans deviner via minicad_entities() +
    une capture d'ecran.
    """
    session = await _get_session()
    async with _lock:
        ids = await session.get_selection()
    return json.dumps(ids)


@mcp.tool()
async def minicad_entities() -> str:
    """Liste les entites du dessin (id, type, calque, geometrie clef) en JSON.

    Utiliser pour retrouver les ids a passer a minicad_select(), sans avoir a
    deviner les coordonnees a partir d'une capture d'ecran.
    """
    session = await _get_session()
    async with _lock:
        entities = await session.list_entities()
    return json.dumps(entities, ensure_ascii=False)


@mcp.tool()
async def minicad_eval(js: str):
    """Execute du JavaScript arbitraire dans la page MiniCAD (echappement pour tout
    ce qui n'est couvert par aucun autre outil).

    MiniCAD n'a pas d'API : tout vit dans l'etat global `S{}` et des fonctions
    globales (`render()`, `pushUndo()`, `S.entities`, `S.selected`...). Quelques
    outils ouvrent une vraie boite de dialogue HTML (pas juste un clic) et n'ont pas
    de fonction de confirmation globale documentee ailleurs — il faut remplir les
    champs puis cliquer le bouton OK :

    - ARRAY (reseau rectangulaire) apres minicad_select(ids) + minicad_command(["ARRAY"]) :
        document.getElementById('ar-cols').value=3;
        document.getElementById('ar-rows').value=2;
        document.getElementById('ar-dx').value=50;
        document.getElementById('ar-dy').value=30;
        confirmArray();
    - ARRAY_POLAR apres minicad_select(ids) + minicad_command(["ARRAY_POLAR"]) :
        document.getElementById('par-count').value=6;
        document.getElementById('par-angle').value=360;
        document.getElementById('par-cx').value=0;
        document.getElementById('par-cy').value=0;
        confirmPolarArray();
    - HATCH apres minicad_click(x,y) sur un contour ferme (ouvre le dialogue) :
        document.querySelector('.hpat-tile[data-pid="ANSI31"]').click();
        document.getElementById('h-spacing').value=10;
        document.getElementById('h-ok').click();
    - STRETCH (fenetre croisante) : la fenetre elle-meme n'est pilotable que par un
      vrai drag souris (mousedown+move+up), impossible a simuler proprement. Appeler
      d'abord minicad_command(["STRETCH"]) (met S.tool='stretch', reinitialise
      S.stretchRect/S.stretchStep=0 — PAS besoin de minicad_select avant, STRETCH ne
      lit pas S.selected), PUIS court-circuiter la fenetre en assignant directement
      S.stretchRect et en passant S.stretchStep a 1 :
        minicad_command(["STRETCH"]);
        S.stretchRect={minX:0,minY:0,maxX:100,maxY:100}; S.stretchStep=1;
      puis enchainer avec deux minicad_click(x,y) (point de base, puis destination) —
      c'est seulement APRES cette assignation qu'il ne faut plus rappeler
      minicad_command(["STRETCH"]) (ca reinitialiserait stretchRect/stretchStep).

    Retourne la valeur de retour de l'expression (via returnByValue).
    """
    session = await _get_session()
    async with _lock:
        return await session.evaluate(js)


@mcp.tool()
async def minicad_screenshot() -> Image:
    """Capture une image PNG de l'etat actuel du canvas MiniCAD, pour verification visuelle."""
    session = await _get_session()
    async with _lock:
        png_b64 = await session.screenshot_png_base64()
    data = base64.b64decode(png_b64)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        f.write(data)
        path = f.name
    return Image(path=path)


if __name__ == "__main__":
    mcp.run()
