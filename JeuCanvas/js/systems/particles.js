/**
 * @module Particle
 * @description Système de particules pour les effets visuels (explosions, impacts, traînées).
 * Gère la physique individuelle des particules et leur cycle de vie (fading, damping, gravité).
 */

/**
 * @class Particle
 * @description Représente un grain visuel unique avec sa propre physique et forme.
 */
export class Particle {
  /**
   * @param {Object} params - Propriétés de la particule.
   * @param {number} params.x - Position X initiale.
   * @param {number} params.y - Position Y initiale.
   * @param {number} [params.vx=0] - Vélocité horizontale.
   * @param {number} [params.vy=0] - Vélocité verticale.
   * @param {number} [params.life=40] - Durée de vie en frames.
   * @param {number} [params.size=3] - Taille ou rayon.
   * @param {string} [params.color] - Couleur CSS.
   * @param {string} [params.shape='circle'] - Forme : 'circle' | 'square' | 'star'.
   * @param {string} [params.composite='lighter'] - Mode de fusion (GlobalCompositeOperation).
   */
  constructor({ x, y, vx = 0, vy = 0, life = 40, size = 3, color = 'rgba(255, 200, 80, 1)', shape = 'circle', composite = 'lighter' }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.maxLife = life;
    this.life = life;
    this.size = size;
    this.color = color;
    this.shape = shape; 
    this.composite = composite; 
  }

  /**
   * Met à jour la physique de la particule.
   * @returns {boolean} True si la particule est encore vivante.
   */
  update() {
    // Physique de base : mouvement + friction (amortissement)
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98; // Friction air 2%
    this.vy *= 0.98;

    // "Gravity-lite" pour un effet de retombée élégante
    this.vy += 0.02;

    this.life -= 1;
    return this.life > 0;
  }

  /**
   * Rendu de la particule selon sa forme.
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    ctx.save();
    
    /**
     * Calcul de l'opacité (Alpha) :
     * Décroissance linéaire basée sur la vie + léger scintillement aléatoire (flicker).
     */
    const alpha = Math.max(0, this.life / this.maxLife) * (0.9 + Math.random() * 0.1);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = this.composite;
    ctx.fillStyle = this.color;

    switch (this.shape) {
      case 'square': {
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        break;
      }
      case 'star': {
        this._drawStar(ctx);
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

  /**
   * Dessine une forme d'étoile à 5 branches.
   * @private
   */
  _drawStar(ctx) {
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
  }
}

/**
 * @class ParticleManager
 * @description Chef d'orchestre des particules. Gère les groupes, les bursts et le nettoyage.
 */
export default class ParticleManager {
  constructor() {
    /** @type {Particle[]} Liste active des particules */
    this.particles = [];
  }

  /**
   * Crée un jet de particules radial.
   * @param {Object} params 
   * @param {number} params.x - Point d'origine X.
   * @param {number} params.y - Point d'origine Y.
   * @param {number} [params.count=20] - Nombre de particules à créer.
   * @param {string[]} [params.palette] - Liste de couleurs possibles.
   * @param {string} [params.shape='circle'] - 'circle', 'square', 'star' ou 'mixed'.
   */
  spawnBurst({ x, y, count = 20, speedMin = 0.8, speedMax = 3.0, sizeMin = 2, sizeMax = 4, baseColor = null, palette = null, shape = 'circle', composite = 'lighter', lifeMin = 35, lifeMax = 60 }) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      
      // Conversion coordonées polaires (angle, vitesse) vers cartésiennes (vx, vy)
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      const size = sizeMin + Math.random() * (sizeMax - sizeMin);
      const life = lifeMin + Math.floor(Math.random() * (lifeMax - lifeMin));

      // Gestion de la couleur (Palette > BaseColor > Default Violet)
      const violetDefault = ['#9D4EDD', '#C77DFF', '#E0AAFF', '#7B2CBF', '#B5179E', '#7209B7'];
      let color = baseColor || violetDefault[Math.floor(Math.random() * violetDefault.length)];
      if (Array.isArray(palette) && palette.length) {
        color = palette[Math.floor(Math.random() * palette.length)];
      }

      // Gestion des formes mixtes
      let chosenShape = shape;
      if (shape === 'mixed') {
        const shapes = ['circle', 'square', 'star'];
        chosenShape = shapes[Math.floor(Math.random() * shapes.length)];
      }

      this.particles.push(new Particle({ x, y, vx, vy, life, size, color, shape: chosenShape, composite }));
    }
  }

  /** Effet rapide pour un impact de projectile */
  spawnImpact({ x, y, palette = null }) {
    this.spawnBurst({ x, y, count: 14, speedMin: 0.7, speedMax: 2.4, sizeMin: 2, sizeMax: 3.2, palette, shape: 'mixed', composite: 'lighter', lifeMin: 28, lifeMax: 45 });
  }

  /** Effet massif pour la destruction d'une météorite ou d'un ennemi */
  spawnExplosion({ x, y, palette = null }) {
    this.spawnBurst({ x, y, count: 50, speedMin: 1.2, speedMax: 4.2, sizeMin: 2.2, sizeMax: 5.5, palette, shape: 'mixed', composite: 'lighter', lifeMin: 35, lifeMax: 65 });
  }

  /**
   * Met à jour toutes les particules et supprime les mortes.
   */
  update() {
    // Parcours inverse pour suppression sécurisée (splice)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const alive = this.particles[i].update();
      if (!alive) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Dessine l'ensemble du système de particules.
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    // Le save/restore global évite que le globalCompositeOperation 'lighter' ne bave sur le reste du HUD
    ctx.save();
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
    ctx.restore();
  }
}