/**
 * @module meteoriteEffects
 * @description Centralise les effets visuels liés aux météorites.
 * Gère la sélection des images, les palettes de couleurs pour les systèmes de particules
 * et les déclencheurs d'effets (impacts et explosions).
 */

import { TYPE_METEORITE } from '../entities/types/typeMeteorite.js';

/**
 * Retourne la ressource graphique (Image) correspondant au type de météorite.
 * @param {Object} assets - L'objet contenant toutes les images préchargées.
 * @param {string} type - Le type de météorite (issu de TYPE_METEORITE).
 * @returns {HTMLImageElement} L'asset image correspondant ou une image par défaut.
 */
export function getMeteoriteImageForType(assets, type) {
    switch (type) {
        case TYPE_METEORITE.DYNAMITE:
            return assets.dyna ?? assets.meteorite;
        case TYPE_METEORITE.NUAGE:
            return assets.nuage ?? assets.meteorite;
        case TYPE_METEORITE.LANCER:
            return assets.lancer ?? assets.meteorite;
        default:
            return assets.meteorite;
    }
}

/**
 * Récupère une palette de couleurs spécifique pour les particules.
 * @param {string} type - Le type de la météorite.
 * @param {string} [kind='impact'] - Le type d'effet ('impact' ou 'explosion').
 * @returns {string[]} Un tableau de codes couleurs hexadécimaux.
 */
export function getPaletteForMeteorite(type, kind = 'impact') {
    // Palettes de base partagées (Nuances de violet et magenta)
    const baseImpact = ['#9D4EDD', '#C77DFF', '#7B2CBF', '#B5179E'];
    const baseExplosion = ['#E0AAFF', '#C77DFF', '#9D4EDD', '#F72585', '#7209B7'];

    /** * Mapping des thèmes colorimétriques par type d'entité.
     * Permet de distinguer visuellement la dangerosité ou la nature de l'objet.
     */
    const palettes = {
        [TYPE_METEORITE.DYNAMITE]: {
            impact: baseImpact,
            explosion: [...baseExplosion, '#FF1493'] // Ajout d'un rose vif pour l'aspect explosif
        },
        [TYPE_METEORITE.NORMAL]: {
            impact: baseImpact,
            explosion: baseExplosion
        },
        [TYPE_METEORITE.ECLATS]: {
            impact: ['#C77DFF', '#A06CD5', '#E0AAFF'],
            explosion: ['#E0AAFF', '#C77DFF', '#9D4EDD']
        },
        [TYPE_METEORITE.COSTAUD]: {
            impact: ['#7B2CBF', '#7209B7', '#9D4EDD'],
            explosion: ['#B5179E', '#9D4EDD', '#7209B7']
        },
        [TYPE_METEORITE.NUAGE]: {
            impact: ['#8A2BE2', '#7B2CBF', '#6C63FF'],
            explosion: ['#957FEF', '#B197FC', '#6C63FF']
        }
    };

    const entry = palettes[type] ?? palettes[TYPE_METEORITE.NORMAL];
    return entry[kind] ?? ['#FFFFFF'];
}

/**
 * Déclenche un jet de particules d'impact (lorsqu'un projectile touche la météorite).
 * @param {ParticleSystem} particles - Le gestionnaire de particules.
 * @param {Meteorite} meteorite - L'instance de la météorite touchée.
 */
export function spawnImpactParticles(particles, meteorite) {
    const palette = getPaletteForMeteorite(meteorite.type, 'impact');
    particles.spawnImpact({ 
        x: meteorite.x, 
        y: meteorite.y, 
        palette 
    });
}

/**
 * Déclenche un effet d'explosion massif (lors de la destruction totale).
 * @param {ParticleSystem} particles - Le gestionnaire de particules.
 * @param {Meteorite} meteorite - L'instance de la météorite détruite.
 */
export function spawnExplosionParticles(particles, meteorite) {
    const palette = getPaletteForMeteorite(meteorite.type, 'explosion');
    particles.spawnExplosion({ 
        x: meteorite.x, 
        y: meteorite.y, 
        palette 
    });
}