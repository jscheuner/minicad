function drawProfileIPN(p, x, y) {
  var api = window.minicadAPI;

  var hh  = p.h / 2;
  var bh  = p.b / 2;
  var twh = p.tw / 2;
  var tf  = p.tf;
  var r1  = p.r1;
  var r2  = p.r2;

  var m  = 0.14;  // pente standard IPN 14%
  var s1 = Math.sqrt(1 + m * m);

  // Constante de la face intérieure supérieure : y = m*x + c
  var c = hh - tf - m * (twh + bh) / 2;

  // Ordonnées des centres des arcs (quadrant supérieur droit)
  var cy1 = c + m * twh + r1 * (m - s1);   // centre r1 (sous la face intérieure)
  var cy2 = c + m * bh  + r2 * (s1 - m);   // centre r2 (au-dessus de la face intérieure)

  // Facteur géométrique commun
  var k = 1 - m / s1;   // ≈ 0.8614

  // Points de tangence (quadrant supérieur droit)
  var r1_ame   = [twh,              cy1];
  var r1_face  = [twh + r1 * k,     cy1 + r1 / s1];
  var r2_face  = [bh  - r2 * k,     cy2 - r2 / s1];
  var r2_chant = [bh,               cy2];

  // Bulge pour arc de 82° (= π/2 - atan(m))
  var angle_arc = Math.PI / 2 - Math.atan(m);
  var bg = Math.tan(angle_arc / 4);   // ≈ 0.3746

  api.polyline([
    // ── Aile inférieure ──

    // 1  Coin bas-gauche
    [x - bh, y - hh],

    // 2  Coin bas-droit
    [x + bh, y - hh],

    // 3  Chant aile inférieure droite (montée jusqu'au congé r2)
    [x + bh, y - cy2,               +bg],   // arc r2 bas-droit (CCW)

    // 4  Arc r2 bas-droit → face intérieure inférieure
    [x + bh - r2 * k, y - cy2 + r2 / s1],

    // 5  Face intérieure aile inférieure droite (inclinée, vers l'âme)
    [x + twh + r1 * k, y - cy1 - r1 / s1,  -bg],   // arc r1 bas-droit (CW)

    // 6  Arc r1 bas-droit → âme
    [x + twh, y - cy1],

    // ── Âme ──

    // 7  Âme droite (montée jusqu'au congé r1 haut)
    [x + twh, y + cy1,              -bg],   // arc r1 haut-droit (CW)

    // 8  Arc r1 haut-droit → face intérieure supérieure
    [x + twh + r1 * k, y + cy1 + r1 / s1],

    // ── Aile supérieure ──

    // 9  Face intérieure aile supérieure droite (inclinée, vers le bord)
    [x + bh - r2 * k, y + cy2 - r2 / s1,  +bg],   // arc r2 haut-droit (CCW)

    // 10 Arc r2 haut-droit → chant
    [x + bh, y + cy2],

    // 11 Chant aile supérieure droite (montée)
    [x + bh, y + hh],

    // 12 Coin haut-gauche
    [x - bh, y + hh],

    // 13 Chant aile supérieure gauche (descente jusqu'au congé r2)
    [x - bh, y + cy2,               +bg],   // arc r2 haut-gauche (CCW)

    // 14 Arc r2 haut-gauche → face intérieure supérieure
    [x - bh + r2 * k, y + cy2 - r2 / s1],

    // 15 Face intérieure aile supérieure gauche (inclinée, vers l'âme)
    [x - twh - r1 * k, y + cy1 + r1 / s1,  -bg],   // arc r1 haut-gauche (CW)

    // 16 Arc r1 haut-gauche → âme
    [x - twh, y + cy1],

    // ── Âme gauche ──

    // 17 Âme gauche (descente jusqu'au congé r1 bas)
    [x - twh, y - cy1,              -bg],   // arc r1 bas-gauche (CW)

    // 18 Arc r1 bas-gauche → face intérieure inférieure
    [x - twh - r1 * k, y - cy1 - r1 / s1],

    // 19 Face intérieure aile inférieure gauche (inclinée, vers le bord)
    [x - bh + r2 * k, y - cy2 + r2 / s1,  +bg],   // arc r2 bas-gauche (CCW)

    // 20 Arc r2 bas-gauche → chant
    [x - bh, y - cy2],

    // 21 Fermeture
    [x - bh, y - hh]

  ], true);
}