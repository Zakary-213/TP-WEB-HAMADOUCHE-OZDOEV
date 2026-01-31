export default class Bullet {
    constructor(char) {
        this.x = char.x;
        this.y = char.y;
        this.angle = char.angle;
        this.speed = 10;
        this.bounces = 0;
        this.hasSplit = false;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = 'yellow';
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);
        ctx.fillRect(-5, -1, 10, 2);
        ctx.restore();
    }

  
    /*
    move() {
        this.x += 10 * Math.cos(this.angle);
        this.y += 10 * Math.sin(this.angle);
    }
    */

    move(canvasWidth, canvasHeight) {
        // Déplacement normal
        this.x += this.speed * Math.cos(this.angle);
        this.y += this.speed * Math.sin(this.angle);

        if (this.bounces > 0) {

            // Mur gauche ou droit alors inversion horizontale
            if (this.x <= 0 || this.x >= canvasWidth) {
                this.angle = Math.PI - this.angle;
                this.bounces--;
            }

            // Mur haut ou bas alors inversion verticale
            if (this.y <= 0 || this.y >= canvasHeight) {
                this.angle = -this.angle;
                this.bounces--;
            }
        }
    }


    estHorsCanvas(canvasWidth, canvasHeight) {
        return this.x < 0 || this.x > canvasWidth || this.y < 0 || this.y > canvasHeight;
    }

}