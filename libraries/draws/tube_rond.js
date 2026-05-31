// Tube gaz et eau - série moyenne (Gas and water pipe - medium series)
// Paramètres : D (Diamètre extérieur), t (Épaisseur de paroi)
// Point d'insertion : Centre du tube (x, y)

function drawProfileTUBEROND(p, x, y) {
  var api = window.minicadAPI;
  var D = p.D;
  var t = p.t;
  if (!D || !t) return;

  var rExt = D / 2;
  var rInt = rExt - t;
  
  // Cercle extérieur
  api.circle(x, y, rExt);

  // Cercle intérieur
  if (rInt > 0) {
    api.circle(x, y, rInt);
  }
}