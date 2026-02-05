export class Particle {
  constructor({ x, y, vx = 0, vy = 0, life = 40, size = 3, color = 'rgba(255, 200, 80, 1)', shape = 'circle', composite = 'lighter' }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.maxLife = life;
    this.life = life;
    this.size = size;
    this.color = color;
    this.shape = shape; // 'circle' | 'square' | 'star'
    this.composite = composite; // 'source-over' | 'lighter'
  }

  update() {
    // Simple physics + damping
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98;
    this.vy *= 0.98;

    // Gravity-lite for nicer fall
    this.vy += 0.02;

    this.life -= 1;
    return this.life > 0;
  }

  draw(ctx) {
    // Slight flicker for arcade feel
    const alpha = Math.max(0, this.life / this.maxLife) * (0.9 + Math.random() * 0.1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = this.composite;
    ctx.fillStyle = this.color;

    switch (this.shape) {
      case 'square': {
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        break;
      }
      case 'star': {
        const spikes = 5;
        const outerRadius = this.size;
        const innerRadius = this.size * 0.5;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / spikes;
          ctx.lineTo(this.x + Math.cos(angle) * radius, this.y + Math.sin(angle) * radius);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      default: {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

export default class ParticleManager {
  constructor() {
    this.particles = [];
  }

  spawnBurst({ x, y, count = 20, speedMin = 0.8, speedMax = 3.0, sizeMin = 2, sizeMax = 4, baseColor = null, palette = null, shape = 'circle', composite = 'lighter', lifeMin = 35, lifeMax = 60 }) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = sizeMin + Math.random() * (sizeMax - sizeMin);
      const life = lifeMin + Math.floor(Math.random() * (lifeMax - lifeMin));

      // Color selection: palette first, else baseColor or violet neon default
      const violetDefault = ['#9D4EDD', '#C77DFF', '#E0AAFF', '#7B2CBF', '#B5179E', '#7209B7'];
      let color = baseColor || violetDefault[Math.floor(Math.random() * violetDefault.length)];
      if (Array.isArray(palette) && palette.length) {
        color = palette[Math.floor(Math.random() * palette.length)];
      }

      // Randomize shapes if requested
      let chosenShape = shape;
      if (shape === 'mixed') {
        const shapes = ['circle', 'square', 'star'];
        chosenShape = shapes[Math.floor(Math.random() * shapes.length)];
      }

      this.particles.push(new Particle({ x, y, vx, vy, life, size, color, shape: chosenShape, composite }));
    }
  }

  spawnImpact({ x, y, palette = null }) {
    this.spawnBurst({ x, y, count: 14, speedMin: 0.7, speedMax: 2.4, sizeMin: 2, sizeMax: 3.2, palette, shape: 'mixed', composite: 'lighter', lifeMin: 28, lifeMax: 45 });
  }

  spawnExplosion({ x, y, palette = null }) {
    this.spawnBurst({ x, y, count: 50, speedMin: 1.2, speedMax: 4.2, sizeMin: 2.2, sizeMax: 5.5, palette, shape: 'mixed', composite: 'lighter', lifeMin: 35, lifeMax: 65 });
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const alive = this.particles[i].update();
      if (!alive) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
  }
}
