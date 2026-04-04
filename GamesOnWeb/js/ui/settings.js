// js/ui/settings.js
// Menu Paramètres — Échap pour ouvrir / fermer
// Pause gameplay + switch caméra depuis le panneau

(function () {
    "use strict";

    let isOpen = false;

    const overlay    = document.getElementById("settings-overlay");
    const closeBtn   = document.getElementById("settings-close-btn");
    const resumeBtn  = document.getElementById("settings-resume-btn");
    const soundSlider  = document.getElementById("set-sound-vol");
    const soundVal     = document.getElementById("set-sound-vol-val");
    const musicSlider  = document.getElementById("set-music-vol");
    const musicVal     = document.getElementById("set-music-vol-val");
    const camBtns    = document.querySelectorAll(".settings-option-btn[data-cam]");
    const TPS_BASE_RADIUS = 70;  // radius de base de la caméra TPS


    // ── Helpers caméra ─────────────────────────────────────────────
    function getActiveCamLabel() {
        var cams = window.gameCameras;
        var scene = window.gameScene;
        if (!cams || !scene) return null;
        if (scene.activeCamera === cams.tpsCamera)       return "tps";
        if (scene.activeCamera === cams.broadcastCamera) return "broadcast";
        if (scene.activeCamera === cams.fpvCamera)       return "fpv";
        return null;
    }

    function syncCamButtons() {
        var current = getActiveCamLabel();
        camBtns.forEach(function (btn) {
            var active = btn.dataset.cam === current ||
                         (current === null && btn.dataset.cam === "broadcast");
            btn.classList.toggle("active", active);
        });
    }

    // ── Appliquer le zoom actuel à la caméra active ────────────────
    function applyCurrentZoom() {
        var slider = document.getElementById("set-cam-zoom");
        if (!slider) return;
        var offset = Number(slider.value);
        if (window.cameraRuntime && typeof window.cameraRuntime.setZoomOffset === "function") {
            window.cameraRuntime.setZoomOffset(offset);
        }
        var cams = window.gameCameras;
        if (cams && cams.tpsCamera) {
            cams.tpsCamera.radius = TPS_BASE_RADIUS - offset;
        }
    }

    function switchCamera(camLabel) {
        var cams  = window.gameCameras;
        var scene = window.gameScene;
        if (!cams || !scene) return;

        if (camLabel === "broadcast" && cams.broadcastCamera) {
            scene.activeCamera = cams.broadcastCamera;
        } else if (camLabel === "tps" && cams.tpsCamera) {
            scene.activeCamera = cams.tpsCamera;
        } else if (camLabel === "fpv" && cams.fpvCamera) {
            scene.activeCamera = cams.fpvCamera;
            var ap = typeof window.getActivePlayer === "function" ? window.getActivePlayer() : null;
            if (window.cameraRuntime && typeof window.cameraRuntime.handleCameraToggle === "function") {
                if (ap) window.cameraRuntime.handleCameraToggle(ap);
            } else if (typeof cams.alignFpvToDirection === "function") {
                if (ap && ap.facingDirection) cams.alignFpvToDirection(ap.facingDirection);
            }
        }
        // Réappliquer le zoom — évite le reset du radius après changement de caméra
        applyCurrentZoom();
        syncCamButtons();
    }

    // ── Ouverture ──────────────────────────────────────────────────
    function open() {
        if (!overlay) return;
        // Bloqué pendant l'intro d'avant-match
        if (typeof window.isIntroPlaying === "function" && window.isIntroPlaying()) return;
        isOpen = true;
        syncCamButtons();
        overlay.classList.add("settings-overlay--open");
        overlay.setAttribute("aria-hidden", "false");
        if (typeof window.setGameplayPaused === "function") {
            window.setGameplayPaused(true);
        }
    }

    // ── Fermeture ──────────────────────────────────────────────────
    function close() {
        if (!overlay) return;
        isOpen = false;
        overlay.classList.remove("settings-overlay--open");
        overlay.setAttribute("aria-hidden", "true");

        // Ne reprend le gameplay que si le match n'est pas terminé
        var matchEnded = typeof window.isMatchEnded === "function" && window.isMatchEnded();
        if (!matchEnded && typeof window.setGameplayPaused === "function") {
            window.setGameplayPaused(false);
        }
    }

    function toggle() { isOpen ? close() : open(); }

    // ── Touche Échap ───────────────────────────────────────────────
    window.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            e.preventDefault();
            toggle();
        }
    });

    // ── Boutons ────────────────────────────────────────────────────
    if (closeBtn)  closeBtn.addEventListener("click", close);
    if (resumeBtn) resumeBtn.addEventListener("click", close);
    if (overlay)   overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close();
    });

    // ── Boutons caméra ─────────────────────────────────────────────
    camBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            switchCamera(btn.dataset.cam);
        });
    });

    // ── Sliders volume ─────────────────────────────────────────────
    function syncSlider(slider, display, audioMethod) {
        if (!slider || !display) return;
        slider.addEventListener("input", function () {
            display.textContent = slider.value + "%";
            var vol = Number(slider.value) / 100;
            if (window.matchAudio && typeof window.matchAudio[audioMethod] === "function") {
                window.matchAudio[audioMethod](vol);
            }
        });
    }

    syncSlider(soundSlider, soundVal, "setVolume");
    syncSlider(musicSlider, musicVal, "setMusicVolume");

    // ── Slider zoom caméra ─────────────────────────────────────────
    var zoomSlider = document.getElementById("set-cam-zoom");
    var zoomVal    = document.getElementById("set-cam-zoom-val");

    if (zoomSlider && zoomVal) {
        zoomSlider.addEventListener("input", function () {
            var offset = Number(zoomSlider.value);
            zoomVal.textContent = offset === 0 ? "Base" : "+" + offset;

            // Broadcast camera : via cameraRuntime
            if (window.cameraRuntime && typeof window.cameraRuntime.setZoomOffset === "function") {
                window.cameraRuntime.setZoomOffset(offset);
            }

            // TPS camera : ajustement direct du radius
            var cams = window.gameCameras;
            if (cams && cams.tpsCamera) {
                cams.tpsCamera.radius = TPS_BASE_RADIUS - offset;
            }
        });
    }

    // ── API publique ───────────────────────────────────────────────
    window.settingsMenu = { open: open, close: close, toggle: toggle };
})();
