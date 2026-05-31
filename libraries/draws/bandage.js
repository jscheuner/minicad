// Bandage à champs arrondis (Abgerundete Radreifen) — section : rectangle à coins arrondis
// Paramètres : B (largeur totale), d (épaisseur), b1 (rayon des coins)
// Point d'insertion : centroïde (= centre)
// UNE SEULE polyligne fermée : 4 droites + 4 arcs via bulge
function drawProfileBANDAGE(p, x, y) {
    var api = window.minicadAPI;
    var Bh = p.B / 2;
    var dh = p.d / 2;
    var r = p.b1;

    // Bulge pour un quart de cercle (90°) : tan(π/8) ≈ 0.4142
    // Signe + = CCW mathématique = CW visuel après inversion Y canvas
    var bg = Math.tan(Math.PI / 8);

    // Polyligne unique fermée
    // Le bulge est placé sur le point DE DÉPART de l'arc
    api.polyline([
        // 1. Bas chant droit → LIGNE vers haut chant droit
        [x + Bh, y - dh + r],

        // 2. Haut chant droit → ARC coin haut-droit
        [x + Bh, y + dh - r, bg],

        // 3. Fin arc HD → LIGNE face supérieure
        [x + Bh - r, y + dh],

        // 4. Fin face sup → ARC coin haut-gauche
        [x - Bh + r, y + dh, bg],

        // 5. Fin arc HG → LIGNE chant gauche
        [x - Bh, y + dh - r],

        // 6. Bas chant gauche → ARC coin bas-gauche
        [x - Bh, y - dh + r, bg],

        // 7. Fin arc BG → LIGNE face inférieure
        [x - Bh + r, y - dh],

        // 8. Fin face inf → ARC coin bas-droit
        [x + Bh - r, y - dh, bg],

        // 9. Retour explicite au point 1 (sans bulge = ligne droite de raccord si nécessaire, 
        //    mais ici c'est la fin de l'arc précédent grâce au bulge du point 8)
        [x + Bh, y - dh + r]
    ], true);
}