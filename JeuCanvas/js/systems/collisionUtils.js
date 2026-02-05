export default class CollisionUtils {

    rectCircleFromCenter(rx, ry, rw, rh, cx, cy, r) {

        // 1) conversion rectangle centre → coin supérieur gauche
        const rectX = rx - rw / 2;
        const rectY = ry - rh / 2;

        // 2) point du rectangle le plus proche du centre du cercle
        let testX = cx;
        let testY = cy;

        if (testX < rectX) testX = rectX;
        if (testX > rectX + rw) testX = rectX + rw;
        if (testY < rectY) testY = rectY;
        if (testY > rectY + rh) testY = rectY + rh;

        // 3) distance cercle → rectangle
        const dx = cx - testX;
        const dy = cy - testY;

        // 4) collision si distance < rayon
        return (dx * dx + dy * dy) < r * r;
    }
}
