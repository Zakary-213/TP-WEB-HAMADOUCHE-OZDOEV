// Configuration centralisée de tous les assets (images + sons) du jeu.
// Chaque entrée est lue par le loader (assetLoader.js) pour créer soit
// un objet Image, soit un Howl (pour l'audio).

import { TYPE_VAISSEAU } from '../../entities/types/typeVaisseau.js';

/**
 * Dictionnaire des assets à charger.
 * Clé : identifiant logique de l'asset (string ou valeur de TYPE_VAISSEAU).
 * Valeur :
 *   - url   : chemin relatif vers l'image / le son
 *   - buffer: (audio) true si le son doit être mis en mémoire
 *   - loop  : (audio) true si le son doit boucler
 *   - volume: (audio) volume de base (0.0 → 1.0)
 */
export const assetsToLoadURLs = {
    // Vaisseaux jouables et ennemi
    [TYPE_VAISSEAU.NORMAL]: { url: './assets/img/vaisseaux/normal.png' },
    [TYPE_VAISSEAU.SPLIT]: { url: './assets/img/vaisseaux/split.png' },
    [TYPE_VAISSEAU.PIERCE]: { url: './assets/img/vaisseaux/pierce.png' },
    [TYPE_VAISSEAU.RICOCHET]: { url: './assets/img/vaisseaux/ricochet.png' },
    [TYPE_VAISSEAU.SPREAD]: { url: './assets/img/vaisseaux/spread.png' },
    [TYPE_VAISSEAU.ENEMY]: { url: './assets/img/vaisseaux/enemy.png' },

    // Météorites et variantes
    meteorite: { url: './assets/img/meteorites/meteorite.png' },
    dyna: { url: './assets/img/meteorites/dyna.png' },
    nuage: { url: './assets/img/meteorites/nuage.png' },
    lancer: { url: './assets/img/meteorites/drone.png' },

    // Autres sprites
    enemy: { url: './assets/img/vaisseaux/enemy.png' },
    vie: { url: './assets/img/vie.png' },

    // Gadgets
    eclair: { url: './assets/img/gadgets/eclair.png' },
    bouclier: { url: './assets/img/gadgets/bouclier.png' },
    mirroire: { url: './assets/img/gadgets/portail.png' },
    rafale: { url: './assets/img/gadgets/rafale.png' },

    // Musique et effets sonores
    gameMusic: { url: './assets/audio/ingame.mp3', buffer: true, loop: true, volume: 0.5 },
    explosion: { url: './assets/audio/explosion.wav', buffer: true, loop: false, volume: 0.7 },
    life: { url: './assets/audio/life.wav', buffer: true, loop: false, volume: 1.0 },
    gadget: { url: './assets/audio/gadget.wav', buffer: true, loop: false, volume: 1.0 },
    win: { url: './assets/audio/win.wav', buffer: true, loop: false, volume: 1.0 }
};
