import { TYPE_VAISSEAU } from '../../entities/types/typeVaisseau.js';

export const assetsToLoadURLs = {
    [TYPE_VAISSEAU.NORMAL]: { url: './assets/img/vaisseaux/NORMAL.png' },
    [TYPE_VAISSEAU.SPLIT]: { url: './assets/img/vaisseaux/SPLIT.png' },
    [TYPE_VAISSEAU.PIERCE]: { url: './assets/img/vaisseaux/PIERCE.png' },
    [TYPE_VAISSEAU.RICOCHET]: { url: './assets/img/vaisseaux/RICOCHET.png' },
    [TYPE_VAISSEAU.SPREAD]: { url: './assets/img/vaisseaux/SPREAD.png' },
    [TYPE_VAISSEAU.ENEMY]: { url: './assets/img/vaisseaux/ENEMY.png' },
    meteorite: { url: './assets/img/meteorites/meteorite.png' },
    dyna: { url: './assets/img/meteorites/dyna.png' },
    nuage: { url: './assets/img/meteorites/nuage.png' },
    lancer: { url: './assets/img/meteorites/drone.png' },
    enemy: { url: './assets/img/vaisseaux/ENEMY.png' },
    vie: { url: './assets/img/vie.png' },
    eclair: { url: './assets/img/gadgets/eclair.png' },
    bouclier: { url: './assets/img/gadgets/bouclier.png' },
    mirroire: { url: './assets/img/gadgets/portail.png' },
    rafale: { url: './assets/img/gadgets/rafale.png' },
    gameMusic: { url: './assets/audio/ingame.mp3', buffer: true, loop: true, volume: 0.5 },
    explosion: { url: './assets/audio/explosion.wav', buffer: true, loop: false, volume: 0.7 },
    life: { url: './assets/audio/life.wav', buffer: true, loop: false, volume: 1.0 },
    gadget: { url: './assets/audio/gadget.wav', buffer: true, loop: false, volume: 1.0 },
    win: { url: './assets/audio/win.wav', buffer: true, loop: false, volume: 1.0 }
};
