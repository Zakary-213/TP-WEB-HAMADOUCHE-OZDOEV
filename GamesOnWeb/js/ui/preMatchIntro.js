// js/ui/preMatchIntro.js
// Intro caméra simple: vue large du stade puis transition vers la caméra de match.

(function () {
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

        const tournamentOverlay = document.getElementById("pre-match-tournament-overlay");
        const tournamentHead = document.getElementById("pre-match-tournament-head");
        const tournamentTail = document.getElementById("pre-match-tournament-tail");
        const tournamentTailText = document.getElementById("pre-match-tournament-tail-text");
        let hideTextTimer = null;
        let removeTextTimer = null;

        function clearTextTimers() {
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
            if (!tournamentOverlay) return;
            tournamentOverlay.classList.remove("pre-match-tournament--show", "pre-match-tournament--hide");
            tournamentOverlay.style.display = "none";
            tournamentOverlay.style.opacity = "0";
        }

        function showTournamentOverlayAnimated() {
            if (!tournamentOverlay || !tournamentHead || !tournamentTail || !tournamentTailText) return;

            clearTextTimers();

            const normalizedLabel = tournamentLabel
                .toUpperCase()
                .replace(/-/g, " ")
                .replace(/\s+/g, " ")
                .trim();

            let headText = "";
            let tailText = "";

            if (normalizedLabel === "FINALE") {
                // Cas finale: on affiche uniquement "FINALE" en bleu.
                headText = "";
                tailText = "FINALE";
            } else if (normalizedLabel.includes("DEMI") && normalizedLabel.includes("FINALE")) {
                // Cas demi-finale: "DEMI" en blanc + "FINALE" en bleu.
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

            const showDelay = Math.min(2000, Math.max(0, durationMs - 900));
            hideTextTimer = window.setTimeout(function () {
                if (!tournamentOverlay) return;

                // Mesure dynamique pour l'animation reveal / slide.
                tournamentOverlay.style.display = "block";
                tournamentOverlay.style.visibility = "hidden";
                const revealWidth = Math.max(1, Math.ceil(tournamentTailText.getBoundingClientRect().width));
                tournamentTail.style.setProperty("--reveal-width", `${revealWidth}px`);
                tournamentTail.style.setProperty("--slide-start", `${-revealWidth}px`);
                tournamentOverlay.style.visibility = "visible";

                tournamentOverlay.classList.remove("pre-match-tournament--show", "pre-match-tournament--hide");
                void tournamentOverlay.offsetWidth;
                tournamentOverlay.classList.add("pre-match-tournament--show");

                const visibleWindow = Math.max(800, durationMs - showDelay - 900);
                removeTextTimer = window.setTimeout(function () {
                    if (!tournamentOverlay) return;
                    tournamentOverlay.classList.remove("pre-match-tournament--show");
                    tournamentOverlay.classList.add("pre-match-tournament--hide");

                    window.setTimeout(function () {
                        hideTournamentOverlayImmediate();
                        clearTextTimers();
                    }, 560);
                }, visibleWindow);
            }, showDelay);
        }

        if (!scene || !cameras) {
            clearTextTimers();
            hideTournamentOverlayImmediate();
            if (typeof config.onComplete === "function") config.onComplete();
            return;
        }

        const introCamera = cameras.broadcastCamera || cameras.tpsCamera;
        const finalCamera = cameras.broadcastCamera || cameras.tpsCamera || introCamera;

        if (!introCamera) {
            clearTextTimers();
            hideTournamentOverlayImmediate();
            if (typeof config.onComplete === "function") config.onComplete();
            return;
        }

        if (!enabled) {
            scene.activeCamera = finalCamera;
            clearTextTimers();
            hideTournamentOverlayImmediate();
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
    showTournamentOverlayAnimated();

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
            scene.activeCamera = finalCamera;
            clearTextTimers();
            hideTournamentOverlayImmediate();
            if (typeof config.onComplete === "function") {
                config.onComplete();
            }
        });
    }

    window.startPreMatchIntro = startPreMatchIntro;
})();
