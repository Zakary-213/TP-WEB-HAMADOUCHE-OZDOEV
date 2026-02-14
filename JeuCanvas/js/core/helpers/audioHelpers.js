// Helpers pour gérer le volume de la musique et des effets sonores
// à partir des sliders d'options. Ces fonctions utilisent la
// configuration définie dans assetsConfig.js pour appliquer un
// volume relatif à chaque son.

import { assetsToLoadURLs } from './assetsConfig.js';

/**
 * Applique le volume de la musique principale (gameMusic)
 * en fonction d'une valeur de slider comprise entre 0 et 100.
 *
 * @param {number} value - Pourcentage de volume (0 → 100).
 * @param {Object} loadedAssets - Dictionnaire des Howl chargés.
 */
export function applyMusicVolume(value, loadedAssets) {
    if (!loadedAssets) return;

    const sound = loadedAssets.gameMusic;
    if (sound && typeof sound.volume === 'function') {
        const baseVolume =
            assetsToLoadURLs.gameMusic && typeof assetsToLoadURLs.gameMusic.volume === 'number'
                ? assetsToLoadURLs.gameMusic.volume
                : 1.0;
        sound.volume(baseVolume * (value / 100));
    }
}

/**
 * Applique le volume global des effets sonores (explosion, life, gadget, win)
 * en gardant leurs volumes de base définis dans assetsConfig.js.
 *
 * @param {number} value - Pourcentage de volume (0 → 100).
 * @param {Object} loadedAssets - Dictionnaire des Howl chargés.
 */
export function applySfxVolume(value, loadedAssets) {
    if (!loadedAssets) return;

    const factor = value / 100;
    const keys = ['explosion', 'life', 'gadget', 'win'];

    for (const key of keys) {
        const sound = loadedAssets[key];
        if (sound && typeof sound.volume === 'function') {
            const baseVolume =
                assetsToLoadURLs[key] && typeof assetsToLoadURLs[key].volume === 'number'
                    ? assetsToLoadURLs[key].volume
                    : 1.0;
            sound.volume(baseVolume * factor);
        }
    }
}
