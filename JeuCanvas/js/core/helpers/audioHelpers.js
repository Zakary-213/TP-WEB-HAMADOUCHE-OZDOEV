import { assetsToLoadURLs } from './assetsConfig.js';

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
