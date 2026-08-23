"""Pont CDP (Chrome DevTools Protocol) vers une instance MiniCAD ouverte dans Chromium.

MiniCAD n'a ni serveur ni API : tout l'etat (S, executeCommand, render...) vit dans
la page. On pilote donc directement le terminal de commandes de l'app via
`executeCommand(...)`, exactement comme le ferait un humain qui tape dans le
terminal integre — meme parsing, memes alias, meme rendu.
"""
import asyncio
import json
import os
import subprocess
import tempfile
import time
import urllib.request

import websockets

BROWSER_BINARIES = {
    "chromium": "/usr/bin/chromium",
    "opera": "/usr/bin/opera",
}
DEBUG_PORT = int(os.environ.get("MINICAD_DEBUG_PORT", "9333"))
DEFAULT_HTML_PATH = os.environ.get(
    "MINICAD_HTML_PATH",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "minicad.html")),
)


def _default_browser_bin() -> str:
    browser = os.environ.get("MINICAD_BROWSER", "chromium").lower()
    if browser not in BROWSER_BINARIES:
        raise ValueError(f"MINICAD_BROWSER inconnu: {browser!r} (attendu: chromium, opera)")
    return os.environ.get("MINICAD_BROWSER_BIN", BROWSER_BINARIES[browser])


class MiniCADSession:
    def __init__(self, port: int = DEBUG_PORT, html_path: str = DEFAULT_HTML_PATH):
        self.port = port
        self.html_path = html_path
        self.browser_bin = _default_browser_bin()
        self.ws = None
        self._msg_id = 0
        self.proc = None

    def _debug_port_alive(self) -> bool:
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json/version", timeout=0.5)
            return True
        except Exception:
            return False

    def _launch_browser(self):
        if not os.path.isfile(self.html_path):
            raise FileNotFoundError(f"minicad.html introuvable: {self.html_path}")
        profile_dir = tempfile.mkdtemp(prefix="minicad-mcp-")
        url = f"file://{self.html_path}"
        self.proc = subprocess.Popen(
            [
                self.browser_bin,
                f"--remote-debugging-port={self.port}",
                f"--user-data-dir={profile_dir}",
                "--no-first-run",
                "--no-default-browser-check",
                url,
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    async def _wait_for_port(self, timeout: float = 15.0):
        deadline = time.time() + timeout
        while time.time() < deadline:
            if self._debug_port_alive():
                return
            await asyncio.sleep(0.2)
        raise RuntimeError("Chromium n'a pas demarre (port de debug injoignable)")

    def _list_targets(self):
        with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json") as r:
            return json.loads(r.read())

    def _open_tab(self):
        """Ouvre un nouvel onglet minicad.html dans l'instance deja lancee (via l'API HTTP DevTools)."""
        url = f"file://{self.html_path}"
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}/json/new?{url}", method="PUT")
        urllib.request.urlopen(req, timeout=2)

    async def _find_page_target(self, timeout: float = 10.0, open_tab_if_missing: bool = False):
        deadline = time.time() + timeout
        opened = False
        while time.time() < deadline:
            targets = self._list_targets()
            page = next(
                (t for t in targets if t.get("type") == "page" and "minicad" in t.get("url", "")),
                None,
            )
            if page:
                return page
            if open_tab_if_missing and not opened:
                # Instance deja lancee (ex: navigateur ouvert manuellement avec le debug port)
                # mais aucun onglet MiniCAD trouve -> on en ouvre un dans cette meme fenetre.
                self._open_tab()
                opened = True
            await asyncio.sleep(0.3)
        raise RuntimeError("Onglet MiniCAD introuvable via CDP")

    async def ensure_started(self):
        if self.ws is not None:
            return
        already_running = self._debug_port_alive()
        if not already_running:
            self._launch_browser()
            await self._wait_for_port()
        page = await self._find_page_target(open_tab_if_missing=already_running)
        self.ws = await websockets.connect(page["webSocketDebuggerUrl"], max_size=None)
        await self._rpc("Runtime.enable")
        await self._rpc("Page.enable")
        await self._wait_for_app_ready()

    async def _wait_for_app_ready(self, timeout: float = 15.0):
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                ready = await self.evaluate(
                    "document.readyState==='complete' && typeof executeCommand==='function'"
                )
                if ready:
                    return
            except RuntimeError:
                pass
            await asyncio.sleep(0.2)
        raise RuntimeError("MiniCAD ne s'est pas initialise a temps dans la page")

    async def _rpc(self, method: str, params: dict | None = None) -> dict:
        self._msg_id += 1
        mid = self._msg_id
        await self.ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
        while True:
            raw = await self.ws.recv()
            msg = json.loads(raw)
            if msg.get("id") == mid:
                return msg

    async def evaluate(self, expr: str):
        msg = await self._rpc(
            "Runtime.evaluate",
            {"expression": expr, "returnByValue": True, "awaitPromise": True},
        )
        result = msg.get("result", {})
        if "exceptionDetails" in result:
            detail = result["exceptionDetails"]
            text = detail.get("exception", {}).get("description") or detail.get("text")
            raise RuntimeError(f"Erreur JS MiniCAD: {text}")
        return result.get("result", {}).get("value")

    async def send_command(self, cmd: str):
        """Simule la saisie d'une commande dans le terminal de MiniCAD (equivalent taper + Entree)."""
        expr = f"(function(){{ executeCommand({json.dumps(cmd)}); return (typeof S!=='undefined' && S.tool) || null; }})()"
        return await self.evaluate(expr)

    async def click_world(self, x: float, y: float):
        """Simule un clic canvas en coordonnees monde (mm), via handleClick directement.

        Necessaire pour les etapes que le terminal ne sait pas piloter par du texte :
        3e clic (placement/offset) de DIMLINEAR/DIMALIGNED, ou placement de
        DOOR/OUTLET/WINDOW/SWITCH (modules arch/elec) — ces outils ne sont pas dans
        `drawingTools` et n'acceptent donc pas de coordonnees tapees au clavier.
        """
        expr = (
            f"(function(){{ handleClick({x},{y},{{shiftKey:false}},{x},{y}); "
            f"return (typeof S!=='undefined' && S.tool) || null; }})()"
        )
        return await self.evaluate(expr)

    async def place_text(self, x: float, y: float, content: str, size: float | None = None):
        """Place un texte (module annot) : clic d'insertion + remplissage + confirmation du dialogue.

        L'outil TEXT n'est pas dans `drawingTools` : le clic ouvre la boite de dialogue
        `showTextDialog()` au lieu de creer directement l'entite ; on doit donc remplir
        le champ et appeler `confirmTextDialog()` nous-memes, comme le ferait un humain
        qui tape le texte puis clique OK.
        """
        await self.click_world(x, y)
        size_js = f"document.getElementById('td-size').value={size};" if size is not None else ""
        expr = (
            f"(function(){{ "
            f"document.getElementById('td-content').value={json.dumps(content)};"
            f"{size_js}"
            f"confirmTextDialog();"
            f"return true; }})()"
        )
        return await self.evaluate(expr)

    async def select_entities(self, ids: list[int]):
        """Definit directement la selection (S.selected) par id d'entite.

        Les outils "verbe-nom" de MiniCAD (MOVE, COPY, ROTATE, SCALE, MIRROR, ARRAY,
        ARRAY_POLAR, DIVIDE, EXPLODE...) exigent une selection non vide *avant* d'etre
        invoques au terminal. `S.selected` est un simple tableau d'ids (verifie en
        lisant le code source) : l'assigner directement est plus fiable que de simuler
        un clic ou une fenetre de selection a la souris.
        """
        expr = f"(function(){{ S.selected={json.dumps(ids)}; render(); return S.selected; }})()"
        return await self.evaluate(expr)

    async def get_selection(self):
        """Lit S.selected sans le modifier — reflete aussi une selection faite a la
        souris par un humain dans la fenetre visible, pas seulement select_entities().
        """
        return await self.evaluate("S.selected")

    async def list_entities(self):
        """Liste les entites du dessin (id, type, calque + geometrie clef) en JSON.

        Sert a retrouver les ids a passer a select_entities() sans deviner ni
        s'appuyer uniquement sur une capture d'ecran.
        """
        expr = (
            "S.entities.map(e => ({"
            "id: e.id, type: e.type, layer: e.layer,"
            "x: e.x, y: e.y, cx: e.cx, cy: e.cy, r: e.r,"
            "x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2,"
            "width: e.width, height: e.height, text: e.text || e.content"
            "}))"
        )
        return await self.evaluate(expr)

    async def screenshot_png_base64(self) -> str:
        msg = await self._rpc("Page.captureScreenshot", {"format": "png"})
        return msg["result"]["data"]

    async def close(self):
        if self.ws is not None:
            await self.ws.close()
            self.ws = None
