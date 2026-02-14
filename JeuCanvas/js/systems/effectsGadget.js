/**
 * @module effectsGadget
 * @description Gère les effets temporaires des bonus (Power-ups) sur le vaisseau.
 * Inclut la logique de modification des statistiques et le rendu des jauges de durée sur le canvas.
 */

/**
 * Applique l'effet Éclair : augmente la vitesse de déplacement du vaisseau.
 * @param {Vaisseau} vaisseau - Le vaisseau cible.
 * @param {Object} [options={}] - Paramètres de l'effet.
 * @param {number} [options.speedDelta=2] - Valeur à ajouter à la vitesse.
 * @param {number} [options.durationMs=10000] - Durée de l'effet en ms.
 * @returns {Object} Un jeton contenant l'horodatage de fin.
 */
export function applyEclairEffect(vaisseau, options = {}) {
    const speedDelta = options.speedDelta ?? 2;
    const durationMs = options.durationMs ?? 10000;

    // Application du bonus de vitesse
    const currentSpeed = vaisseau.vitesse ?? 0;
    vaisseau.vitesse = currentSpeed + speedDelta;

    const now = performance.now();
    const endAt = now + durationMs;
    
    // Propriétés utilisées par drawEclairBar
    vaisseau.eclairDuration = durationMs;
    vaisseau.eclairEndAt = endAt;

    // Planification de la fin de l'effet
    setTimeout(() => {
        const cur = vaisseau.vitesse ?? 0;
        vaisseau.vitesse = Math.max(0, cur - speedDelta);
        
        // Sécurité : on ne reset que si un autre bonus n'a pas écrasé celui-ci
        if (vaisseau.eclairEndAt === endAt) {
            vaisseau.eclairEndAt = null;
        }
    }, durationMs);

    return { token: endAt };
}

/**
 * Applique l'effet Rafale : réduit drastiquement le délai entre les tirs.
 * @param {Vaisseau} vaisseau - Le vaisseau cible.
 * @param {Object} [options={}] - Paramètres de l'effet.
 * @param {number} [options.durationMs=10000] - Durée de l'effet.
 * @param {number} [options.newDelay=10] - Nouveau délai entre les projectiles (ms).
 * @returns {Object} Jeton de fin.
 */
export function applyRafaleEffect(vaisseau, options = {}) {
    const durationMs = options.durationMs ?? 10000;
    const newDelay = options.newDelay ?? 10; 

    // Sauvegarde du délai original pour le restaurer plus tard
    const previousDelay = vaisseau.delayMinBetweenBullets ?? 200;

    vaisseau.delayMinBetweenBullets = newDelay;

    const now = performance.now();
    const endAt = now + durationMs;
    vaisseau.rafaleDuration = durationMs;
    vaisseau.rafaleEndAt = endAt;

    setTimeout(() => {
        // Restauration du délai si le jeton correspond (évite les bugs de superposition)
        if (vaisseau.rafaleEndAt === endAt) {
            vaisseau.delayMinBetweenBullets = previousDelay;
            vaisseau.rafaleEndAt = null;
        }
    }, durationMs);

    return { token: endAt };
}

/**
 * Dessine une barre de progression jaune (Éclair) au-dessus du vaisseau.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Vaisseau} vaisseau 
 */
export function drawEclairBar(ctx, vaisseau) {
    const now = performance.now();
    
    if (vaisseau.eclairEndAt && vaisseau.eclairDuration) {
        const remaining = vaisseau.eclairEndAt - now;
        
        if (remaining > 0) {
            const frac = Math.max(0, Math.min(1, remaining / vaisseau.eclairDuration));
            const barW = 60;
            const barH = 6;
            const offsetY = 12;
            const x = vaisseau.x - barW / 2;
            const y = vaisseau.y - (vaisseau.hauteur / 2) - offsetY - barH;

            ctx.save();
            // Fond de la barre
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(x, y, barW, barH);
            
            // Jauge remplie (Or)
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(x, y, barW * frac, barH);
            
            // Bordure
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, barW, barH);
            ctx.restore();
        }
    }
}

/**
 * Dessine une barre de progression violette (Rafale) au-dessus du vaisseau.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Vaisseau} vaisseau 
 */
export function drawRafaleBar(ctx, vaisseau) {
    const now = performance.now();
    
    if (vaisseau.rafaleEndAt && vaisseau.rafaleDuration) {
        const remaining = vaisseau.rafaleEndAt - now;
        
        if (remaining > 0) {
            const frac = Math.max(0, Math.min(1, remaining / vaisseau.rafaleDuration));
            const barW = 60;
            const barH = 6;
            const offsetY = 4; // Placée sous la barre Éclair si les deux sont actives
            const x = vaisseau.x - barW / 2;
            const y = vaisseau.y - (vaisseau.hauteur / 2) - offsetY;

            ctx.save();
            ctx.fillStyle = 'rgba(50, 0, 80, 0.7)'; // Violet sombre
            ctx.fillRect(x, y, barW, barH);
            
            ctx.fillStyle = '#C77DFF'; // Violet vif
            ctx.fillRect(x, y, barW * frac, barH);
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, barW, barH);
            ctx.restore();
        }
    }
}

/**
 * Affiche une bulle protectrice translucide autour du vaisseau si le bouclier est actif.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Vaisseau} vaisseau 
 */
export function drawShieldBubble(ctx, vaisseau) {
    const shieldHP = vaisseau.shieldHP ?? 0;
    
    if (shieldHP > 0) {
        ctx.save();
        const radius = Math.max(vaisseau.largeur, vaisseau.hauteur) * 0.65;
        
        ctx.strokeStyle = 'rgba(80, 160, 255, 0.9)'; // Bleu électrique
        ctx.fillStyle = 'rgba(80, 160, 255, 0.15)';   // Halo léger
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.arc(vaisseau.x, vaisseau.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}