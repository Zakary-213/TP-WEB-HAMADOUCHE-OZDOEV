// js/utils/audioManager.js
// Charge et joue les sons de match via BABYLON.AssetsManager.
(function () {
    const state = {
        scene: null,
        assetsManager: null,
        whistleData: null,
        whistleSound: null,
        whistleHtmlAudio: null,
        whistleBlobUrl: null,
        kickData: null,
        kickSound: null,
        kickHtmlAudio: null,
        kickBlobUrl: null,
        goalData: null,
        goalSound: null,
        goalHtmlAudio: null,
        goalBlobUrl: null,
        isLoaded: false,
        isLoading: false,
        pendingPlay: false,
        kickLoaded: false,
        kickLoading: false,
        pendingKickPlay: false,
        goalLoaded: false,
        goalLoading: false,
        pendingGoalPlay: false,
        whistleUrl: "./assets/Sifflet.mp3",
        kickUrl: "./assets/Kick.mp3",
        goalUrl: "./assets/Goal.mp3",
        debug: false,
        unlockHandlersInstalled: false,
        htmlAudioPrimed: false
    };

    function uniqueUrls(urls) {
        const seen = new Set();
        const out = [];

        urls.forEach(function (u) {
            if (typeof u !== "string") return;
            const value = u.trim();
            if (!value) return;
            if (seen.has(value)) return;
            seen.add(value);
            out.push(value);
        });

        return out;
    }

    function buildWhistleCandidates(config) {
        const preferred = (config && typeof config.whistleUrl === "string")
            ? config.whistleUrl
            : state.whistleUrl;

        return uniqueUrls([
            preferred,
            "./assets/Sifflet.mp3",
            "assets/Sifflet.mp3",
            "../assets/Sifflet.mp3",
            "../../assets/Sifflet.mp3",
            "/assets/Sifflet.mp3",
            "/TP-WEB/GamesOnWeb/assets/Sifflet.mp3",
            "/TP-WEB/assets/Sifflet.mp3"
        ]);
    }

    function buildKickCandidates(config) {
        const preferred = (config && typeof config.kickUrl === "string")
            ? config.kickUrl
            : state.kickUrl;

        return uniqueUrls([
            preferred,
            "./assets/Kick.mp3",
            "assets/Kick.mp3",
            "../assets/Kick.mp3",
            "../../assets/Kick.mp3",
            "/assets/Kick.mp3",
            "/TP-WEB/GamesOnWeb/assets/Kick.mp3",
            "/TP-WEB/assets/Kick.mp3"
        ]);
    }

    function buildGoalCandidates(config) {
        const preferred = (config && typeof config.goalUrl === "string")
            ? config.goalUrl
            : state.goalUrl;

        return uniqueUrls([
            preferred,
            "./assets/Goal.mp3",
            "assets/Goal.mp3",
            "../assets/Goal.mp3",
            "../../assets/Goal.mp3",
            "/assets/Goal.mp3",
            "/TP-WEB/GamesOnWeb/assets/Goal.mp3",
            "/TP-WEB/assets/Goal.mp3"
        ]);
    }

    function log() {
        if (!state.debug) return;
        const args = Array.prototype.slice.call(arguments);
        console.log.apply(console, ["[matchAudio]"].concat(args));
    }

    function warn() {
        const args = Array.prototype.slice.call(arguments);
        console.warn.apply(console, ["[matchAudio]"].concat(args));
    }

    function disposeWhistleSound() {
        if (state.whistleSound) {
            state.whistleSound.dispose();
            state.whistleSound = null;
        }

        if (state.whistleHtmlAudio) {
            state.whistleHtmlAudio.pause();
            state.whistleHtmlAudio.src = "";
            state.whistleHtmlAudio = null;
        }

        if (state.whistleBlobUrl) {
            URL.revokeObjectURL(state.whistleBlobUrl);
            state.whistleBlobUrl = null;
        }
    }

    function disposeKickSound() {
        if (state.kickSound) {
            state.kickSound.dispose();
            state.kickSound = null;
        }

        if (state.kickHtmlAudio) {
            state.kickHtmlAudio.pause();
            state.kickHtmlAudio.src = "";
            state.kickHtmlAudio = null;
        }

        if (state.kickBlobUrl) {
            URL.revokeObjectURL(state.kickBlobUrl);
            state.kickBlobUrl = null;
        }
    }

    function disposeGoalSound() {
        if (state.goalSound) {
            state.goalSound.dispose();
            state.goalSound = null;
        }

        if (state.goalHtmlAudio) {
            state.goalHtmlAudio.pause();
            state.goalHtmlAudio.src = "";
            state.goalHtmlAudio = null;
        }

        if (state.goalBlobUrl) {
            URL.revokeObjectURL(state.goalBlobUrl);
            state.goalBlobUrl = null;
        }
    }

    function buildHtmlAudioFallback() {
        const src = state.whistleBlobUrl || state.whistleUrl;
        if (!src) return;

        const audio = new Audio(src);
        audio.preload = "auto";
        audio.volume = 0.9;
        audio.load();
        state.whistleHtmlAudio = audio;
        log("HTMLAudio fallback ready", { src });
    }

    function buildKickHtmlAudioFallback() {
        const src = state.kickBlobUrl || state.kickUrl;
        if (!src) return;

        const audio = new Audio(src);
        audio.preload = "auto";
        audio.volume = 0.85;
        audio.load();
        state.kickHtmlAudio = audio;
        log("Kick HTMLAudio fallback ready", { src });
    }

    function buildGoalHtmlAudioFallback() {
        const src = state.goalBlobUrl || state.goalUrl;
        if (!src) return;

        const audio = new Audio(src);
        audio.preload = "auto";
        audio.volume = 0.8;
        audio.loop = true;
        audio.load();
        state.goalHtmlAudio = audio;
        log("Goal HTMLAudio fallback ready", { src });
    }

    function primeSingleHtmlAudio(audio, label) {
        if (!audio) return;

        const previousMuted = audio.muted;
        audio.muted = true;

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.then === "function") {
            playPromise
                .then(function () {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.muted = previousMuted;
                    log("HTMLAudio primed", label);
                })
                .catch(function (err) {
                    audio.muted = previousMuted;
                    log("HTMLAudio prime skipped", label, err);
                });
        } else {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = previousMuted;
            log("HTMLAudio primed", label);
        }
    }

    function primeHtmlAudioIfNeeded() {
        if (state.htmlAudioPrimed) return;
        state.htmlAudioPrimed = true;

        if (!state.whistleHtmlAudio) buildHtmlAudioFallback();
        if (!state.kickHtmlAudio) buildKickHtmlAudioFallback();

        primeSingleHtmlAudio(state.whistleHtmlAudio, "whistle");
        primeSingleHtmlAudio(state.kickHtmlAudio, "kick");
        primeSingleHtmlAudio(state.goalHtmlAudio, "goal");
    }

    function buildWhistleSound() {
        if (!state.scene || !state.whistleData) return;

        disposeWhistleSound();

        const whistleBlob = new Blob([state.whistleData], { type: "audio/mpeg" });
        state.whistleBlobUrl = URL.createObjectURL(whistleBlob);
        buildHtmlAudioFallback();

        try {
            state.whistleSound = new BABYLON.Sound(
                "matchWhistle",
                state.whistleBlobUrl,
                state.scene,
                function () {
                    log("Whistle sound ready from blob URL");
                },
                {
                    autoplay: false,
                    loop: false,
                    volume: 0.9
                }
            );
            return;
        } catch (e) {
            warn("Blob sound creation failed, fallback to direct URL", e);
        }

        state.whistleSound = new BABYLON.Sound(
            "matchWhistle",
            state.whistleUrl,
            state.scene,
            function () {
                log("Whistle sound ready from direct URL");
            },
            {
                autoplay: false,
                loop: false,
                volume: 0.9
            }
        );
        buildHtmlAudioFallback();
    }

    function buildKickSound() {
        if (!state.scene || !state.kickData) return;

        disposeKickSound();

        const kickBlob = new Blob([state.kickData], { type: "audio/mpeg" });
        state.kickBlobUrl = URL.createObjectURL(kickBlob);
        buildKickHtmlAudioFallback();

        try {
            state.kickSound = new BABYLON.Sound(
                "matchKick",
                state.kickBlobUrl,
                state.scene,
                function () {
                    log("Kick sound ready from blob URL");
                },
                {
                    autoplay: false,
                    loop: false,
                    volume: 0.85
                }
            );
            return;
        } catch (e) {
            warn("Kick blob sound creation failed, fallback to direct URL", e);
        }

        state.kickSound = new BABYLON.Sound(
            "matchKick",
            state.kickUrl,
            state.scene,
            function () {
                log("Kick sound ready from direct URL");
            },
            {
                autoplay: false,
                loop: false,
                volume: 0.85
            }
        );
        buildKickHtmlAudioFallback();
    }

    function buildGoalSound() {
        if (!state.scene || !state.goalData) return;

        disposeGoalSound();

        const goalBlob = new Blob([state.goalData], { type: "audio/mpeg" });
        state.goalBlobUrl = URL.createObjectURL(goalBlob);
        buildGoalHtmlAudioFallback();

        try {
            state.goalSound = new BABYLON.Sound(
                "matchGoal",
                state.goalBlobUrl,
                state.scene,
                function () {
                    log("Goal sound ready from blob URL");
                },
                {
                    autoplay: false,
                    loop: true,
                    volume: 0.8
                }
            );
            return;
        } catch (e) {
            warn("Goal blob sound creation failed, fallback to direct URL", e);
        }

        state.goalSound = new BABYLON.Sound(
            "matchGoal",
            state.goalUrl,
            state.scene,
            function () {
                log("Goal sound ready from direct URL");
            },
            {
                autoplay: false,
                loop: true,
                volume: 0.8
            }
        );
        buildGoalHtmlAudioFallback();
    }

    function resumeAudioContextIfNeeded() {
        const audioContext = BABYLON.Engine.audioEngine && BABYLON.Engine.audioEngine.audioContext;
        if (!audioContext) {
            log("No AudioContext available yet");
            return;
        }

        log("AudioContext state:", audioContext.state);

        if (audioContext.state === "suspended") {
            audioContext.resume()
                .then(function () {
                    log("AudioContext resumed");
                })
                .catch(function (err) {
                    warn("AudioContext resume failed", err);
                });
        }
    }

    function playWhistleWithHtmlAudio() {
        if (!state.whistleHtmlAudio) {
            buildHtmlAudioFallback();
        }

        if (!state.whistleHtmlAudio) {
            warn("HTMLAudio fallback unavailable");
            return false;
        }

        try {
            state.whistleHtmlAudio.pause();
            state.whistleHtmlAudio.currentTime = 0;
        } catch (e) {
            log("HTMLAudio reset skipped", e);
        }

        const playPromise = state.whistleHtmlAudio.play();
        if (playPromise && typeof playPromise.then === "function") {
            playPromise
                .then(function () {
                    log("Whistle played with HTMLAudio fallback");
                })
                .catch(function (err) {
                    warn("HTMLAudio play failed", err);
                    const fallback = new Audio(state.whistleBlobUrl || state.whistleUrl);
                    fallback.volume = 0.9;
                    fallback.play().catch(function (e) {
                        warn("HTMLAudio one-shot fallback failed", e);
                    });
                });
        } else {
            log("Whistle played with HTMLAudio fallback");
        }

        return true;
    }

    function playKickWithHtmlAudio() {
        if (!state.kickHtmlAudio) {
            buildKickHtmlAudioFallback();
        }

        if (!state.kickHtmlAudio) {
            warn("Kick HTMLAudio fallback unavailable");
            return false;
        }

        try {
            state.kickHtmlAudio.pause();
            state.kickHtmlAudio.currentTime = 0;
        } catch (e) {
            log("Kick HTMLAudio reset skipped", e);
        }

        const playPromise = state.kickHtmlAudio.play();
        if (playPromise && typeof playPromise.then === "function") {
            playPromise
                .then(function () {
                    log("Kick played with HTMLAudio fallback");
                })
                .catch(function (err) {
                    warn("Kick HTMLAudio play failed", err);
                    const fallback = new Audio(state.kickBlobUrl || state.kickUrl);
                    fallback.volume = 0.85;
                    fallback.play().catch(function (e) {
                        warn("Kick HTMLAudio one-shot fallback failed", e);
                    });
                });
        } else {
            log("Kick played with HTMLAudio fallback");
        }

        return true;
    }

    function playGoalWithHtmlAudio() {
        if (!state.goalHtmlAudio) {
            buildGoalHtmlAudioFallback();
        }

        if (!state.goalHtmlAudio) {
            warn("Goal HTMLAudio fallback unavailable");
            return false;
        }

        try {
            state.goalHtmlAudio.pause();
            state.goalHtmlAudio.currentTime = 0;
            state.goalHtmlAudio.loop = true;
        } catch (e) {
            log("Goal HTMLAudio reset skipped", e);
        }

        const playPromise = state.goalHtmlAudio.play();
        if (playPromise && typeof playPromise.then === "function") {
            playPromise
                .then(function () {
                    log("Goal played with HTMLAudio fallback");
                })
                .catch(function (err) {
                    warn("Goal HTMLAudio play failed", err);
                });
        } else {
            log("Goal played with HTMLAudio fallback");
        }

        return true;
    }

    function stopGoalWithHtmlAudio() {
        if (!state.goalHtmlAudio) return;
        try {
            state.goalHtmlAudio.pause();
            state.goalHtmlAudio.currentTime = 0;
        } catch (e) {
            log("Goal HTMLAudio stop skipped", e);
        }
    }

    function installAudioUnlockHandlers() {
        if (state.unlockHandlersInstalled) return;
        state.unlockHandlersInstalled = true;

        const unlock = function () {
            resumeAudioContextIfNeeded();
            primeHtmlAudioIfNeeded();
        };

        window.addEventListener("pointerdown", unlock, { passive: true });
        window.addEventListener("keydown", unlock, { passive: true });
        log("Audio unlock handlers installed");
    }

    function playWhistle() {
        if (!state.scene) return false;

        log("playWhistle called", {
            isLoaded: state.isLoaded,
            isLoading: state.isLoading,
            hasSound: !!state.whistleSound,
            hasHtmlAudio: !!state.whistleHtmlAudio,
            pendingPlay: state.pendingPlay
        });

        resumeAudioContextIfNeeded();

        if (!state.isLoaded) {
            state.pendingPlay = true;
            log("Whistle not loaded yet, pendingPlay=true");
            return false;
        }

        if (!state.whistleSound) {
            buildWhistleSound();
        }

        const audioContext = BABYLON.Engine.audioEngine && BABYLON.Engine.audioEngine.audioContext;
        const canUseBabylonSound = !!(audioContext && state.whistleSound);

        if (!canUseBabylonSound) {
            log("Using HTMLAudio fallback because Babylon AudioContext is unavailable");
            return playWhistleWithHtmlAudio();
        }

        if (state.whistleSound.isPlaying) {
            state.whistleSound.stop();
        }

        state.whistleSound.play();
        log("Whistle play requested");
        return true;
    }

    function playKick() {
        if (!state.scene) return false;

        log("playKick called", {
            kickLoaded: state.kickLoaded,
            kickLoading: state.kickLoading,
            hasKickSound: !!state.kickSound,
            hasKickHtmlAudio: !!state.kickHtmlAudio,
            pendingKickPlay: state.pendingKickPlay
        });

        resumeAudioContextIfNeeded();

        if (!state.kickLoaded) {
            state.pendingKickPlay = true;
            log("Kick not loaded yet, pendingKickPlay=true");
            return false;
        }

        if (!state.kickSound) {
            buildKickSound();
        }

        const audioContext = BABYLON.Engine.audioEngine && BABYLON.Engine.audioEngine.audioContext;
        const canUseBabylonSound = !!(audioContext && state.kickSound);

        if (!canUseBabylonSound) {
            log("Using Kick HTMLAudio fallback because Babylon AudioContext is unavailable");
            return playKickWithHtmlAudio();
        }

        if (state.kickSound.isPlaying) {
            state.kickSound.stop();
        }

        state.kickSound.play();
        log("Kick play requested");
        return true;
    }

    function playGoalLoop() {
        if (!state.scene) return false;

        log("playGoalLoop called", {
            goalLoaded: state.goalLoaded,
            goalLoading: state.goalLoading,
            hasGoalSound: !!state.goalSound,
            hasGoalHtmlAudio: !!state.goalHtmlAudio,
            pendingGoalPlay: state.pendingGoalPlay
        });

        resumeAudioContextIfNeeded();

        if (!state.goalLoaded) {
            state.pendingGoalPlay = true;
            log("Goal not loaded yet, pendingGoalPlay=true");
            return false;
        }

        if (!state.goalSound) {
            buildGoalSound();
        }

        const audioContext = BABYLON.Engine.audioEngine && BABYLON.Engine.audioEngine.audioContext;
        const canUseBabylonSound = !!(audioContext && state.goalSound);

        if (!canUseBabylonSound) {
            log("Using Goal HTMLAudio fallback because Babylon AudioContext is unavailable");
            return playGoalWithHtmlAudio();
        }

        if (state.goalSound.isPlaying) {
            state.goalSound.stop();
        }

        state.goalSound.play();
        log("Goal loop play requested");
        return true;
    }

    function stopGoal() {
        if (state.goalSound && state.goalSound.isPlaying) {
            state.goalSound.stop();
        }
        stopGoalWithHtmlAudio();
        log("Goal loop stopped");
    }

    function init(scene, options) {
        if (!scene || state.isLoading || state.isLoaded) return;

        const config = options || {};
        const whistleCandidates = buildWhistleCandidates(config);
        const kickCandidates = buildKickCandidates(config);
        const goalCandidates = buildGoalCandidates(config);
        if (whistleCandidates.length > 0) {
            state.whistleUrl = whistleCandidates[0];
        }
        if (kickCandidates.length > 0) {
            state.kickUrl = kickCandidates[0];
        }
        if (goalCandidates.length > 0) {
            state.goalUrl = goalCandidates[0];
        }
        state.debug = !!config.debug;
        state.kickLoading = true;
        state.goalLoading = true;

        log("init called", {
            whistleUrl: state.whistleUrl,
            whistleCandidates,
            kickUrl: state.kickUrl,
            kickCandidates,
            goalUrl: state.goalUrl,
            goalCandidates,
            debug: state.debug
        });

        state.scene = scene;
        state.isLoading = true;

        installAudioUnlockHandlers();

        function tryLoadCandidate(index) {
            if (index >= whistleCandidates.length) {
                state.isLoading = false;
                warn("Impossible de charger le son de sifflet: aucun chemin valide", whistleCandidates);
                return;
            }

            const candidateUrl = whistleCandidates[index];
            state.whistleUrl = candidateUrl;
            state.assetsManager = new BABYLON.AssetsManager(scene);

            const whistleTask = state.assetsManager.addBinaryFileTask("whistleSoundTask", candidateUrl);
            log("AssetsManager task created", { candidateUrl, attempt: index + 1 });

            whistleTask.onSuccess = function (task) {
                state.whistleData = task.data;
                state.isLoaded = true;
                state.isLoading = false;
                log("Whistle binary loaded", {
                    candidateUrl,
                    bytes: state.whistleData ? state.whistleData.byteLength : 0
                });
                buildWhistleSound();

                if (state.pendingPlay) {
                    state.pendingPlay = false;
                    log("Running deferred whistle play");
                    playWhistle();
                }
            };

            whistleTask.onError = function (task, message, exception) {
                warn("Chargement sifflet échoué", {
                    candidateUrl,
                    message,
                    exception,
                    task
                });
                tryLoadCandidate(index + 1);
            };

            state.assetsManager.onFinish = function () {
                log("AssetsManager load finished", { candidateUrl });
            };

            state.assetsManager.onTaskErrorObservable.add(function (task) {
                warn("AssetsManager task error", task && task.name, candidateUrl);
            });

            log("AssetsManager load start", { candidateUrl });
            state.assetsManager.load();
        }

        function tryLoadKickCandidate(index) {
            if (index >= kickCandidates.length) {
                state.kickLoading = false;
                warn("Impossible de charger le son de kick: aucun chemin valide", kickCandidates);
                return;
            }

            const candidateUrl = kickCandidates[index];
            state.kickUrl = candidateUrl;
            const kickAssetsManager = new BABYLON.AssetsManager(scene);

            const kickTask = kickAssetsManager.addBinaryFileTask("kickSoundTask", candidateUrl);
            log("Kick task created", { candidateUrl, attempt: index + 1 });

            kickTask.onSuccess = function (task) {
                state.kickData = task.data;
                state.kickLoaded = true;
                state.kickLoading = false;
                log("Kick binary loaded", {
                    candidateUrl,
                    bytes: state.kickData ? state.kickData.byteLength : 0
                });
                buildKickSound();

                if (state.pendingKickPlay) {
                    state.pendingKickPlay = false;
                    log("Running deferred kick play");
                    playKick();
                }
            };

            kickTask.onError = function (task, message, exception) {
                warn("Chargement kick échoué", {
                    candidateUrl,
                    message,
                    exception,
                    task
                });
                tryLoadKickCandidate(index + 1);
            };

            kickAssetsManager.onFinish = function () {
                log("Kick assets load finished", { candidateUrl });
            };

            kickAssetsManager.onTaskErrorObservable.add(function (task) {
                warn("Kick task error", task && task.name, candidateUrl);
            });

            log("Kick assets load start", { candidateUrl });
            kickAssetsManager.load();
        }

        function tryLoadGoalCandidate(index) {
            if (index >= goalCandidates.length) {
                state.goalLoading = false;
                warn("Impossible de charger le son de goal: aucun chemin valide", goalCandidates);
                return;
            }

            const candidateUrl = goalCandidates[index];
            state.goalUrl = candidateUrl;
            const goalAssetsManager = new BABYLON.AssetsManager(scene);

            const goalTask = goalAssetsManager.addBinaryFileTask("goalSoundTask", candidateUrl);
            log("Goal task created", { candidateUrl, attempt: index + 1 });

            goalTask.onSuccess = function (task) {
                state.goalData = task.data;
                state.goalLoaded = true;
                state.goalLoading = false;
                log("Goal binary loaded", {
                    candidateUrl,
                    bytes: state.goalData ? state.goalData.byteLength : 0
                });
                buildGoalSound();

                if (state.pendingGoalPlay) {
                    state.pendingGoalPlay = false;
                    log("Running deferred goal play");
                    playGoalLoop();
                }
            };

            goalTask.onError = function (task, message, exception) {
                warn("Chargement goal échoué", {
                    candidateUrl,
                    message,
                    exception,
                    task
                });
                tryLoadGoalCandidate(index + 1);
            };

            goalAssetsManager.onFinish = function () {
                log("Goal assets load finished", { candidateUrl });
            };

            goalAssetsManager.onTaskErrorObservable.add(function (task) {
                warn("Goal task error", task && task.name, candidateUrl);
            });

            log("Goal assets load start", { candidateUrl });
            goalAssetsManager.load();
        }

        tryLoadCandidate(0);
        tryLoadKickCandidate(0);
        tryLoadGoalCandidate(0);
    }

    window.matchAudio = {
        init,
        playWhistle,
        playKick,
        playGoalLoop,
        stopGoal,
        debugPlayWhistle: playWhistle,
        debugPlayKick: playKick,
        debugPlayGoal: playGoalLoop
    };
})();
