export default class Bullet {
    constructor(char) {
        this.x = char.x;
        this.y = char.y;
        this.angle = char.angle;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = 'yellow';
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);
        ctx.fillRect(-5, -1, 10, 2);
        ctx.restore();
    }

  
    move() {
        this.x += 10 * Math.cos(this.angle);
        this.y += 10 * Math.sin(this.angle);
    }

    estHorsCanvas(canvasWidth, canvasHeight) {
        return this.x < 0 || this.x > canvasWidth || this.y < 0 || this.y > canvasHeight;
    }

}