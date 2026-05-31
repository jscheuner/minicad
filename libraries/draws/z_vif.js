// Acier à Z Vif (Z-Stahl scharfkantig)
// Paramètres : h (hauteur), b (largeur bride), d (épaisseur âme), t (épaisseur bride)
// Géométrie : Angles droits (vifs)
// Point d'insertion : Centroïde

function drawProfileZ_VIF(p, x, y) {
  var api = window.minicadAPI;
  var h = p.h, b = p.b, d = p.d, t = p.t;
  
  if (!h || !b || !d || !t) return;

  var half_h = h / 2;
  var half_b = b / 2;
  var half_d = d / 2;

  // Contour fermé (sens horaire) - Angles vifs
  var L = [
    [ half_b,      -half_h],       // 1. Extérieur coin haut droit
    [ half_b,      -half_h + t],   // 2. Intérieur coin haut droit (sous bride)
    [ half_d,      -half_h + t],   // 3. Jonction âme/bride haut (intérieur)
    [ half_d,       half_h],       // 4. Bas âme droite
    [-half_d,       half_h],       // 5. Bas âme gauche
    [-half_b,       half_h],       // 6. Extérieur coin bas gauche
    [-half_b,       half_h - t],   // 7. Intérieur coin bas gauche (dessus bride)
    [-half_d,       half_h - t],   // 8. Jonction âme/bride bas (intérieur)
    [-half_d,      -half_h],       // 9. Haut âme gauche
    [ half_b,      -half_h]        // 10. Fermeture (via haut bride) -> Correction: [half_d, -half_h] puis [half_b, -half_h]
  ];
  
  // Correction fermeture : Le point 9 est à [-half_d, -half_h].
  // Le point 1 est à [half_b, -half_h].
  // Il manque le segment supérieur de l'âme et de la bride.
  // On ajoute un point intermédiaire [half_d, -half_h] pour respecter la géométrie ?
  // Non, le polyline relie 9 à 1 directement. Cela traverse l'âme.
  // Il faut ajouter [half_d, -half_h] avant de fermer.
  
  // Liste corrigée :
  var L_correct = [
    [ half_b,      -half_h],       // 1. Ext Haut Droit
    [ half_b,      -half_h + t],   // 2. Int Haut Droit
    [ half_d,      -half_h + t],   // 3. Jonction Haut
    [ half_d,       half_h],       // 4. Bas Droit
    [-half_d,       half_h],       // 5. Bas Gauche
    [-half_b,       half_h],       // 6. Ext Bas Gauche
    [-half_b,       half_h - t],   // 7. Int Bas Gauche
    [-half_d,       half_h - t],   // 8. Jonction Bas
    [-half_d,      -half_h],       // 9. Haut Gauche
    [ half_d,      -half_h],       // 10. Haut Droite (début bride)
    [ half_b,      -half_h]        // 11. Fermeture
  ];

  // Calcul du centroïde (Shoelace)
  var A = 0, Cu = 0, Cv = 0;
  for (var i = 0; i < L_correct.length - 1; i++) {
    var p0 = L_correct[i], p1 = L_correct[i + 1];
    var cr = p0[0] * p1[1] - p1[0] * p0[1];
    A  += cr;
    Cu += (p0[0] + p1[0]) * cr;
    Cv += (p0[1] + p1[1]) * cr;
  }
  A *= 0.5;
  if (Math.abs(A) < 1e-6) return;

  var gu = Cu / (6 * A);
  var gv = Cv / (6 * A);

  api.polyline(L_correct.map(q => [x + q[0] - gu, y + q[1] - gv]), true);
}