// Profilés en U à ailes parallèles (UPE) — vue de face (section transversale)
// UNE SEULE polyligne fermée avec bulge pour les arcs
// Paramètres : h, b, tw, tf, r1 (congé racine), r2 (congé bout d'aile intérieur)
// Point d'insertion : centre de la boîte englobante
// Âme à gauche, ailes vers la droite

function drawProfileUPE(p, x, y) {
  var api = window.minicadAPI;
  var h = p.h, b = p.b, tw = p.tw, tf = p.tf, r1 = p.r1, r2 = p.r2;
  var BG = Math.tan(Math.PI / 8);     // bulge d'un quart de cercle (90°)

  var xL = x - b / 2;                 // dos de l'âme (gauche)
  var xR = x + b / 2;                 // bouts d'ailes (droite)
  var xW = xL + tw;                   // face intérieure de l'âme
  var yB = y - h / 2;
  var yT = y + h / 2;

  // bulge +BG = r2 orteil (CCW) ; -BG = r1 racine (CW)
  api.polyline([
    [xL, yB              ],           // coin bas-gauche (dos)
    [xR, yB              ],           // face inférieure → coin bas-droit
    [xR, yB + tf - r2, BG],           // → arrondi r2 (orteil bas)
    [xR - r2, yB + tf    ],           // face int. aile basse
    [xW + r1, yB + tf,-BG],           // → congé r1 (racine bas)
    [xW, yB + tf + r1    ],           // face int. âme (montée)
    [xW, yT - tf - r1,-BG],           // → congé r1 (racine haut)
    [xW + r1, yT - tf    ],           // face int. aile haute
    [xR - r2, yT - tf, BG],           // → arrondi r2 (orteil haut)
    [xR, yT - tf + r2    ],           // face droite aile haute
    [xR, yT              ],           // coin haut-droit
    [xL, yT              ],           // face supérieure → coin haut-gauche
    [xL, yB              ]            // dos (fermeture)
  ], true);
}