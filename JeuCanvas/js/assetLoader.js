async function loadAssets(assetsToLoadURLs) {
    // Charge les sons, les sprite sheets etc.
    // puis retourne tous les assets chargés
    let result = await loadAssetsUsingHowlerAndNoXhr(assetsToLoadURLs);
    console.log("loadAssets - Tous les assets sont chargés");
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
    var assetsLoaded = {};
    var loadedAssets = 0;
    var numberOfAssetsToLoad = 0;
    var imageCount = 0;
    var musicPlayed = {}; // Flag global pour éviter de jouer plusieurs fois

    return new Promise((resolve) => {
        // get num of assets to load
        for (var name in assetsToBeLoaded) {
            numberOfAssetsToLoad++;
            if (isImage(assetsToBeLoaded[name].url)) {
                imageCount++;
            }
        }

        for (name in assetsToBeLoaded) {
            var url = assetsToBeLoaded[name].url;
            
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
                // will start async loading
                assetsLoaded[name].src = url;
            } else if (isAudio(url)) {
                // We assume the asset is an audio file
                musicPlayed[name] = false; // Initialiser le flag pour cet audio
                
                assetsLoaded[name] = new Howl({
                    src: [url],
                    format: ['mp3'],
                    buffer: assetsToBeLoaded[name].buffer,
                    loop: assetsToBeLoaded[name].loop,
                    autoplay: false,
                    volume: assetsToBeLoaded[name].volume,
                    html5: true,
                    preload: 'auto',
                    onload: function () {
                        // Jouer la musique si c'est la musique de jeu (une seule fois)
                        if (name === 'gameMusic' && !musicPlayed[name]) {
                            musicPlayed[name] = true;
                            assetsLoaded[name].play();
                        }
                    },
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
                }); // End of howler.js callback
                
                // Fallback timeout: si la musique ne charge pas après 2 secondes, force quand même (une seule fois)
                setTimeout(() => {
                    if (name === 'gameMusic' && !musicPlayed[name]) {
                        musicPlayed[name] = true;
                        assetsLoaded[name].play();
                    }
                }, 2000);
            } else {
                console.warn("Unknown asset type: " + url);
            } // if

        } // for
    }); // promise
} // function

export { loadAssets };
