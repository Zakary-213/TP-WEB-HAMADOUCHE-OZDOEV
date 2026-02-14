async function loadAssets(assetsToLoadURLs) {
    // Charge les sons, les sprite sheets etc.
    // puis retourne tous les assets chargés
    let result = await loadAssetsUsingHowlerAndNoXhr(assetsToLoadURLs);
    return result;
}

// ============================
// BUFFER LOADER for loading multiple files asynchronously
// ============================
function isImage(url) {
    return (url.match(/\.(jpeg|jpg|gif|png)$/) != null);
}

function isAudio(url) {
    return (url.match(/\.(mp3|ogg|wav)$/) != null);
}

async function loadAssetsUsingHowlerAndNoXhr(assetsToBeLoaded) {
    // Dictionnaire des assets effectivement chargés
    const assetsLoaded = {};
    let loadedAssets = 0;
    let imageCount = 0;

    return new Promise((resolve) => {
        // Compter uniquement les images pour savoir quand la phase de chargement est terminée
        for (const name in assetsToBeLoaded) {
            const url = assetsToBeLoaded[name].url;
            if (isImage(url)) {
                imageCount++;
            }
        }

        for (const name in assetsToBeLoaded) {
            const url = assetsToBeLoaded[name].url;
            const assetConfig = assetsToBeLoaded[name];
			
            if (isImage(url)) {
                assetsLoaded[name] = new Image();

                assetsLoaded[name].onload = function () {
                    if (++loadedAssets >= imageCount) {
                        return resolve(assetsLoaded);
                    }
                };
                assetsLoaded[name].onerror = function () {
                    console.error("Error loading image: " + url);
                    if (++loadedAssets >= imageCount) {
                        return resolve(assetsLoaded);
                    }
                };
                // démarrer le chargement asynchrone
                assetsLoaded[name].src = url;
            } else if (isAudio(url)) {
                // Asset audio chargé via Howler, sans démarrage automatique
                assetsLoaded[name] = new Howl({
                    src: [url],
                    format: ['mp3', 'wav'],
                    buffer: assetConfig.buffer,
                    loop: assetConfig.loop,
                    autoplay: false,
                    volume: assetConfig.volume,
                    html5: true,
                    preload: 'auto',
                    onerror: function (errorCode) {
                        console.error("Error loading audio " + name + " from " + url + " - Code: " + errorCode);
                        const errorMessages = {
                            1: "UNINITIALIZED",
                            2: "UNSUPPORTED",
                            3: "LOAD_ERROR",
                            4: "DECODE_ERROR"
                        };
                        console.error("Error message: " + errorMessages[errorCode]);
                    }
                });
            } else {
                console.warn("Unknown asset type: " + url);
            } // if

        } // for

        // S'il n'y a aucune image (imageCount === 0), on peut résoudre tout de suite
        if (imageCount === 0) {
            resolve(assetsLoaded);
        }
    }); // promise
} // function

export { loadAssets };
