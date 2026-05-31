// Acier à Z Normal (Z-Stahl Normalprofile)
// Géométrie : 2 arrondis intérieurs uniquement (congés âme/bride)
function drawProfileZ_NORMAL(p, x, y) {
  var api = window.minicadAPI;
  var h = p.h, b = p.b, d = p.d, t = p.t;
  if (!h || !b || !d || !t) return;

  var BG = Math.tan(Math.PI / 8); // bulge pour 90° (CCW)
  var r = d * 0.6;                // rayon intérieur (racine)

  var xL = x - b / 2;
  var xR = x + b / 2;
  var xWL = x - d / 2;
  var xWR = x + d / 2;
  var yB = y - h / 2;
  var yT = y + h / 2;

  api.polyline([
    [xWL, yT],                      // Haut-Gauche (Extérieur âme)
    [xR, yT],                       // Haut-Droit (Extérieur bride haute)
    [xR, yT - t],                   // Bas-Droit (Bout bride haute)
    [xWR + r, yT - t, BG],          // → Congé intérieur haut
    [xWR, yT - t - r],              // Face int. âme (descente)
    [xWR, yB],                      // Bas-Droit (Extérieur âme)
    [xL, yB],                       // Bas-Gauche (Extérieur bride basse)
    [xL, yB + t],                   // Haut-Gauche (Bout bride basse)
    [xWL - r, yB + t, BG],          // → Congé intérieur bas
    [xWL, yB + t + r],              // Face int. âme (montée)
    [xWL, yT]                       // Fermeture
  ], true);
}