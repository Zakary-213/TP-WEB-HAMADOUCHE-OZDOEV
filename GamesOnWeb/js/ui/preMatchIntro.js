// js/ui/preMatchIntro.js
// Intro caméra simple: vue large du stade puis transition vers la caméra de match.

(function () {
    let hideTextTimer = null;
    let removeTextTimer = null;
    let introSkipBtn = null;
    let introState = null;

    function ensureIntroSkipButton() {
        if (introSkipBtn) return;
        introSkipBtn = document.getElementById("intro-skip-btn");
        if (!introSkipBtn) {
            introSkipBtn = document.createElement("button");
            introSkipBtn.id   = "intro-skip-btn";
            introSkipBtn.type = "button";
            introSkipBtn.textContent = "Passer l'intro";
            document.body.appendChild(introSkipBtn);
        }
    }

    function setIntroSkipVisible(visible) {
        if (!introSkipBtn) return;
        introSkipBtn.classList.toggle("replay-skip-btn--show", !!visible);
    }

    function clearTournamentOverlayTimers() {
        if (hideTextTimer) {
            window.clearTimeout(hideTextTimer);
            hideTextTimer = null;
        }
        if (removeTextTimer) {
            window.clearTimeout(removeTextTimer);
            removeTextTimer = null;
        }
    }

    function hideTournamentOverlayImmediate() {
        const tournamentOverlay = document.getElementById("pre-match-tournament-overlay");
        if (!tournamentOverlay) return;

        tournamentOverlay.classList.remove("pre-match-tournament--show", "pre-match-tournament--hide");
        tournamentOverlay.style.display = "none";
        tournamentOverlay.style.opacity = "0";
    }

    function showTournamentOverlayBanner(tournamentLabel, options) {
        const config = options || {};
        const durationMs = Number.isFinite(config.durationMs) ? config.durationMs : 1400;
        const showDelayMs = Number.isFinite(config.showDelayMs) ? config.showDelayMs : 0;
        const textAnimationDurationMs = Number.isFinite(config.textAnimationDurationMs)
            ? config.textAnimationDurationMs
            : 3600;
        const forceFinaleLike = !!config.forceFinaleLike;
        const visibleWindow = Number.isFinite(config.visibleWindowMs)
            ? config.visibleWindowMs
            : Math.max(800, durationMs - showDelayMs - 900);

        const tournamentOverlay = document.getElementById("pre-match-tournament-overlay");
        const tournamentHead = document.getElementById("pre-match-tournament-head");
        const tournamentTail = document.getElementById("pre-match-tournament-tail");
        const tournamentTailText = document.getElementById("pre-match-tournament-tail-text");

        if (!tournamentOverlay || !tournamentHead || !tournamentTail || !tournamentTailText) {
            if (typeof config.onComplete === "function") config.onComplete();
            return;
        }

        clearTournamentOverlayTimers();

        const normalizedLabel = String(tournamentLabel || "Replay")
            .toUpperCase()
            .replace(/-/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        let headText = "";
        let tailText = "";

        if (forceFinaleLike || normalizedLabel === "FINALE" || normalizedLabel === "REPLAY") {
            headText = "";
            tailText = normalizedLabel;
        } else if (normalizedLabel.includes("DEMI") && normalizedLabel.includes("FINALE")) {
            headText = "DEMI";
            tailText = "FINALE";
        } else {
            const words = normalizedLabel.split(" ").filter(Boolean);
            headText = words[0] || "HUITIEME";
            tailText = words.slice(1).join(" ") || "DE FINALE";
        }

        tournamentHead.textContent = headText;
        tournamentTailText.textContent = tailText;
        tournamentHead.style.display = headText ? "inline-block" : "none";
        tournamentTail.style.marginLeft = headText ? "10px" : "0";

        hideTextTimer = window.setTimeout(function () {
            tournamentOverlay.style.display = "block";
            tournamentOverlay.style.visibility = "hidden";
            tournamentOverlay.style.setProperty("--pre-match-text-duration", `${textAnimationDurationMs}ms`);
            const revealWidth = Math.max(1, Math.ceil(tournamentTailText.getBoundingClientRect().width));
            tournamentTail.style.setProperty("--reveal-width", `${revealWidth}px`);
            tournamentTail.style.setProperty("--slide-start", `${-revealWidth}px`);
            tournamentOverlay.style.visibility = "visible";

            tournamentOverlay.classList.remove("pre-match-tournament--show", "pre-match-tournament--hide");
            void tournamentOverlay.offsetWidth;
            tournamentOverlay.classList.add("pre-match-tournament--show");

            removeTextTimer = window.setTimeout(function () {
                tournamentOverlay.classList.remove("pre-match-tournament--show");
                tournamentOverlay.classList.add("pre-match-tournament--hide");

                window.setTimeout(function () {
                    hideTournamentOverlayImmediate();
                    clearTournamentOverlayTimers();
                    if (typeof config.onComplete === "function") config.onComplete();
                }, 560);
            }, visibleWindow);
        }, showDelayMs);
    }

    function startPreMatchIntro(scene, cameras, enabledOrOptions, maybeOptions) {
        const enabled = typeof enabledOrOptions === "boolean" ? enabledOrOptions : true;
        const config = (typeof enabledOrOptions === "object" && enabledOrOptions !== null)
            ? enabledOrOptions
            : (maybeOptions || {});
        const durationMs = Number.isFinite(config.durationMs) ? config.durationMs : 5000;
        const rotationTurns = Number.isFinite(config.rotationTurns) ? config.rotationTurns : 1;
        const tournamentLabel = typeof config.tournamentLabel === "string" && config.tournamentLabel.trim().length > 0
            ? config.tournamentLabel.trim()
            : "Huitieme de finale";

        if (!scene || !cameras) {
            clearTournamentOverlayTimers();
            hideTournamentOverlayImmediate();
            if (typeof config.onComplete === "function") config.onComplete();
            return;
        }

        const introCamera = cameras.broadcastCamera || cameras.tpsCamera;
        const finalCamera = cameras.broadcastCamera || cameras.tpsCamera || introCamera;

        if (!introCamera) {
            clearTournamentOverlayTimers();
            hideTournamentOverlayImmediate();
            if (typeof config.onComplete === "function") config.onComplete();
            return;
        }

        if (!enabled) {
            scene.activeCamera = finalCamera;
            clearTournamentOverlayTimers();
            hideTournamentOverlayImmediate();
            introState = null;
            if (typeof config.onComplete === "function") config.onComplete();
            return;
        }

        const fps = 60;
        const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));

        const fromAlpha = Number.isFinite(config.fromAlpha) ? config.fromAlpha : (-Math.PI / 2 - 0.4);
        const toAlpha = fromAlpha + (Math.PI * 2 * rotationTurns);
        const fromBeta = Number.isFinite(config.fromBeta) ? config.fromBeta : 0.45;
        const toBeta = Number.isFinite(config.toBeta) ? config.toBeta : 0.75;
        const fromRadius = Number.isFinite(config.fromRadius) ? config.fromRadius : 210;
        const toRadius = Number.isFinite(config.toRadius) ? config.toRadius : 95;

        introCamera.alpha = fromAlpha;
        introCamera.beta = fromBeta;
        introCamera.radius = fromRadius;

        if (cameras.cameraTargetNode) {
            cameras.cameraTargetNode.position.set(0, 0, 0);
            introCamera.lockedTarget = cameras.cameraTargetNode;
        } else {
            introCamera.setTarget(BABYLON.Vector3.Zero());
        }

        scene.activeCamera = introCamera;
        const showDelay = Math.min(2000, Math.max(0, durationMs - 900));
        showTournamentOverlayBanner(tournamentLabel, {
            durationMs,
            showDelayMs: showDelay,
            visibleWindowMs: Math.max(800, durationMs - showDelay - 900)
        });

        const easing = new BABYLON.CubicEase();
        easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);

        function buildAnim(name, property, from, to) {
            const anim = new BABYLON.Animation(
                name,
                property,
                fps,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            anim.setKeys([
                { frame: 0, value: from },
                { frame: totalFrames, value: to }
            ]);
            anim.setEasingFunction(easing);
            return anim;
        }

        const animations = [
            buildAnim("preMatchAlpha", "alpha", fromAlpha, toAlpha),
            buildAnim("preMatchBeta", "beta", fromBeta, toBeta),
            buildAnim("preMatchRadius", "radius", fromRadius, toRadius)
        ];

        scene.beginDirectAnimation(introCamera, animations, 0, totalFrames, false, 1, function () {
            // Normalise l'alpha à -π/2 pour éviter que cameraRuntime lerpe à travers un tour complet
            introCamera.alpha  = -Math.PI / 2;
            introCamera.beta   = toBeta;
            introCamera.radius = toRadius;
            scene.activeCamera = finalCamera;
            clearTournamentOverlayTimers();
            hideTournamentOverlayImmediate();
            setIntroSkipVisible(false);
            introState = null;
            if (typeof config.onComplete === "function") {
                config.onComplete();
            }
        });

        // ─── Bouton SKIP INTRO (même style que skip replay) ─────────
        ensureIntroSkipButton();

        // Remplace le listener précédent (clone = nouveau élément sans listener parasite)
        const fresh = introSkipBtn.cloneNode(true);
        introSkipBtn.parentNode.replaceChild(fresh, introSkipBtn);
        introSkipBtn = fresh;

        introSkipBtn.addEventListener("click", function () {
            if (introState && typeof introState.skip === "function") {
                introState.skip();
            }
        });

        setIntroSkipVisible(true);

        introState = {
            skip: function () {
                if (!scene || !introCamera) return;
                scene.stopAnimation(introCamera);
                // Normalise l'alpha à -π/2 (valeur de référence de cameraRuntime) — évite le tour parasite
                introCamera.alpha  = -Math.PI / 2;
                introCamera.beta   = toBeta;
                introCamera.radius = toRadius;
                scene.activeCamera = finalCamera;
                clearTournamentOverlayTimers();
                hideTournamentOverlayImmediate();
                setIntroSkipVisible(false);
                introState = null;
                if (typeof config.onComplete === "function") {
                    config.onComplete();
                }
            }
        };
    }

    window.startPreMatchIntro = startPreMatchIntro;
    window.showTournamentOverlayBanner = showTournamentOverlayBanner;
    window.hideTournamentOverlayBanner = hideTournamentOverlayImmediate;
    window.skipPreMatchIntro = function () {
        if (introState && typeof introState.skip === "function") {
            introState.skip();
            return true;
        }
        return false;
    };
})();

const ENABLE_PRE_MATCH_INTRO = true;
const PRE_MATCH_INTRO_DURATION_MS = 10000;
const PRE_MATCH_INTRO_TURNS = 1; // 0.5 tour = 180°
const TOURNAMENT_INTRO_LABEL_BY_STAGE = {
    huitieme: "Huitieme de finale",
    quart: "Quart de finale",
    demi: "Demi-finale",
    finale: "Finale"
};

export function launchPreMatchIntro(params) {
    const scene = params.scene;
    const cameras = params.cameras;
    const mode = params.mode;
    const tournamentStage = params.tournamentStage;
    const cameraRuntime = params.cameraRuntime;
    const getActivePlayer = params.getActivePlayer;
    const setIntroPlaying = params.setIntroPlaying;
    const onIntroComplete = params.onIntroComplete;

    const tournamentIntroLabel = mode === "versus"
        ? "MODE 1VS1"
        : (TOURNAMENT_INTRO_LABEL_BY_STAGE[tournamentStage] || "Huitieme de finale");

    const finishIntro = () => {
        const activePlayer = typeof getActivePlayer === "function" ? getActivePlayer() : null;
        if (cameraRuntime && typeof cameraRuntime.syncTargetToActivePlayer === "function") {
            cameraRuntime.syncTargetToActivePlayer(activePlayer);
        } else if (cameras && cameras.cameraTargetNode && activePlayer && activePlayer.position) {
            cameras.cameraTargetNode.position.copyFrom(activePlayer.position);
        }

        if (typeof setIntroPlaying === "function") {
            setIntroPlaying(false);
        }
        if (cameras) cameras.allowManualSwitch = true;

        if (window.matchAudio && typeof window.matchAudio.playWhistle === "function") {
            window.matchAudio.playWhistle();
        }
        if (window.gameScoreboard && typeof window.gameScoreboard.startTimer === "function") {
            window.gameScoreboard.startTimer();
        }
        if (typeof onIntroComplete === "function") {
            onIntroComplete();
        }
    };

    if (typeof window.startPreMatchIntro === "function") {
        window.startPreMatchIntro(scene, cameras, ENABLE_PRE_MATCH_INTRO, {
            durationMs: PRE_MATCH_INTRO_DURATION_MS,
            rotationTurns: PRE_MATCH_INTRO_TURNS,
            tournamentLabel: tournamentIntroLabel,
            fromBeta: 0.45,
            toBeta: 0.75,
            fromRadius: 220,
            toRadius: 100,
            onComplete: finishIntro
        });
    } else {
        finishIntro();
    }
}
