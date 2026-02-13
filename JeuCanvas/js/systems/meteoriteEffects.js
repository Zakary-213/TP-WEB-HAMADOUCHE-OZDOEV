import { TYPE_METEORITE } from '../entities/types/typeMeteorite.js';

// Retourne le bon asset image pour un type de météorite
export function getMeteoriteImageForType(assets, type) {
    switch (type) {
        case TYPE_METEORITE.DYNAMITE:
            return assets.dyna || assets.meteorite;
        case TYPE_METEORITE.NUAGE:
            return assets.nuage || assets.meteorite;
        case TYPE_METEORITE.LANCER:
            return assets.lancer || assets.meteorite;
        default:
            return assets.meteorite;
    }
}

// Palette de couleurs en fonction du type de météorite
export function getPaletteForMeteorite(type, kind = 'impact') {
    const baseImpact = ['#9D4EDD', '#C77DFF', '#7B2CBF', '#B5179E'];
    const baseExplosion = ['#E0AAFF', '#C77DFF', '#9D4EDD', '#F72585', '#7209B7'];

    const palettes = {
        [TYPE_METEORITE.DYNAMITE]: {
            impact: baseImpact,
            explosion: [...baseExplosion, '#FF1493']
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

    const entry = palettes[type] || palettes[TYPE_METEORITE.NORMAL];
    return (entry && entry[kind]) ? entry[kind] : ['#FFFFFF'];
}

// Helpers pour déclencher les particules en fonction d'une météorite
export function spawnImpactParticles(particles, meteorite) {
    const palette = getPaletteForMeteorite(meteorite.type, 'impact');
    particles.spawnImpact({ x: meteorite.x, y: meteorite.y, palette });
}

export function spawnExplosionParticles(particles, meteorite) {
    const palette = getPaletteForMeteorite(meteorite.type, 'explosion');
    particles.spawnExplosion({ x: meteorite.x, y: meteorite.y, palette });
}
