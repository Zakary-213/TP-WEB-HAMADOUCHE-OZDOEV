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
    const keybindBtns = document.querySelectorAll(".settings-keybind-btn[data-action]");
    const gamepadBtns = document.querySelectorAll(".settings-gamepad-btn[data-gamepad-action]");
    const TPS_BASE_RADIUS = 70;  // radius de base de la caméra TPS
    const THIRD_BASE_RADIUS = 60;  // radius de base de la caméra 3e personne
    let keybinds = {};
    let gamepadBinds = {};
    let listeningAction = null;
    let listeningActionP2 = null;
    let listeningGamepadAction = null;
    let lastNavAt = 0;
    let lastSubmitPressed = false;


    // ── Helpers caméra ─────────────────────────────────────────────
    function getActiveCamLabel() {
        var cams = window.gameCameras;
        var scene = window.gameScene;
        if (!cams || !scene) return null;
        if (scene.activeCamera === cams.tpsCamera)          return "tps";
        if (scene.activeCamera === cams.thirdPersonCamera) return "third";
        if (scene.activeCamera === cams.broadcastCamera)    return "broadcast";
        if (scene.activeCamera === cams.fpvCamera)          return "fpv";
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

    function formatKeyLabel(value) {
        if (!value) return "-";
        if (value === "Space") return "Space";
        if (value === "Shift") return "Shift";
        // Touches spéciales
        const SPECIAL = {
            "arrowup": "↑",
            "arrowdown": "↓",
            "arrowleft": "←",
            "arrowright": "→",
            "enter": "Entrée",
            "rshift": "Shift►",
            "shiftright": "Shift►",
            "numpaddecimal": "Num .",
            "numpad4": "Num 4",
            "numpad6": "Num 6"
        };
        const lc = value.toLowerCase();
        if (SPECIAL[lc]) return SPECIAL[lc];
        if (value.length === 1) return value.toUpperCase();
        return value;
    }

    function syncKeybindButtons() {
        keybindBtns.forEach(function (btn) {
            const action = btn.dataset.action;
            btn.textContent = formatKeyLabel(keybinds[action]);
        });
    }

    const keybindP2Btns = document.querySelectorAll(".settings-keybind-btn[data-action-p2]");
    let player2Binds = {};

    function syncKeybindP2Buttons() {
        keybindP2Btns.forEach(function (btn) {
            const action = btn.dataset.actionP2;
            btn.textContent = formatKeyLabel(player2Binds[action]);
        });
    }

    function formatGamepadLabel(value) {
        var map = {
            0: "X",
            1: "O",
            2: "Carre",
            3: "Triangle",
            4: "L1",
            5: "R1",
            6: "L2",
            7: "R2",
            8: "Share",
            9: "Options",
            10: "L3",
            11: "R3",
            12: "Haut",
            13: "Bas",
            14: "Gauche",
            15: "Droite"
        };
        if (!Number.isInteger(value)) return "-";
        return map[value] || ("Btn" + value);
    }

    function syncGamepadButtons() {
        gamepadBtns.forEach(function (btn) {
            const action = btn.dataset.gamepadAction;
            btn.textContent = formatGamepadLabel(gamepadBinds[action]);
        });
    }

    function setListeningButton(nextAction) {
        keybindBtns.forEach(function (btn) {
            btn.classList.toggle("is-listening", btn.dataset.action === nextAction);
            if (btn.dataset.action === nextAction) {
                btn.textContent = "Appuie...";
            }
        });
    }

    function setListeningP2Button(nextAction) {
        keybindP2Btns.forEach(function (btn) {
            const act = btn.dataset.actionP2;
            btn.classList.toggle("is-listening", act === nextAction);
            if (act === nextAction) {
                btn.textContent = "Appuie...";
            }
        });
    }

    function setListeningGamepadButton(nextAction) {
        gamepadBtns.forEach(function (btn) {
            btn.classList.toggle("is-listening", btn.dataset.gamepadAction === nextAction);
            if (btn.dataset.gamepadAction === nextAction) {
                btn.textContent = "Appuie...";
            }
        });
    }

    function captureKey(event) {
        if (!listeningAction) return;
        event.preventDefault();

        if (event.key === "Escape") {
            listeningAction = null;
            setListeningButton(null);
            syncKeybindButtons();
            return;
        }

        let value = null;
        if (event.key === "Shift") {
            value = "Shift";
        } else if (event.code === "Space") {
            value = "Space";
        } else if (event.key && event.key.length === 1) {
            value = event.key.toLowerCase();
        } else if (event.key) {
            value = event.key;
        }

        if (!value) return;

        var inputBindings = window.inputBindings;
        if (!inputBindings || typeof inputBindings.setBinding !== "function") return;

        var result = inputBindings.setBinding(listeningAction, value);
        if (!result.ok) {
            var currentAction = listeningAction;
            setListeningButton(null);
            listeningAction = null;
            if (currentAction) {
                var btn = document.querySelector(
                    '.settings-keybind-btn[data-action="' + currentAction + '"]'
                );
                if (btn) {
                    btn.textContent = "Deja pris";
                    window.setTimeout(function () {
                        syncKeybindButtons();
                    }, 800);
                }
            }
            return;
        }

        if (typeof inputBindings.getBindings === "function") {
            keybinds = inputBindings.getBindings();
        }

        listeningAction = null;
        setListeningButton(null);
        syncKeybindButtons();
    }

    function captureKeyP2(event) {
        if (!listeningActionP2) return;
        event.preventDefault();

        if (event.key === "Escape") {
            listeningActionP2 = null;
            setListeningP2Button(null);
            syncKeybindP2Buttons();
            return;
        }

        // Préférer event.code pour les touches spéciales (flèches, Enter, Numpad...)
        let value = null;
        if (event.code && event.code !== "" && event.code !== "Unidentified") {
            // Cas particuliers simples basés sur event.key
            if (event.key === "Shift") {
                value = event.code; // "ShiftLeft" ou "ShiftRight"
            } else if (event.code === "Space") {
                value = "Space";
            } else {
                value = event.code; // "ArrowUp", "Enter", "KeyZ", "Numpad4"...
            }
        } else if (event.key && event.key.length === 1) {
            value = event.key.toLowerCase();
        } else if (event.key) {
            value = event.key;
        }

        if (!value) return;

        var inputBindings = window.inputBindings;
        if (!inputBindings || typeof inputBindings.setPlayer2Binding !== "function") return;

        var result = inputBindings.setPlayer2Binding(listeningActionP2, value);
        if (!result.ok) {
            var currentAction = listeningActionP2;
            setListeningP2Button(null);
            listeningActionP2 = null;
            if (currentAction) {
                var btn = document.querySelector(
                    '.settings-keybind-btn[data-action-p2="' + currentAction + '"]'
                );
                if (btn) {
                    btn.textContent = "Déjà pris";
                    window.setTimeout(function () { syncKeybindP2Buttons(); }, 800);
                }
            }
            return;
        }

        if (typeof inputBindings.getPlayer2Bindings === "function") {
            player2Binds = inputBindings.getPlayer2Bindings();
        }

        listeningActionP2 = null;
        setListeningP2Button(null);
        syncKeybindP2Buttons();
    }

    function captureGamepadBinding() {
        if (!listeningGamepadAction) return;
        var pads = (navigator.getGamepads && navigator.getGamepads()) || [];
        var pad = pads.find(function (p) { return p && p.connected; }) || null;
        if (!pad || !pad.buttons) return;

        var pressedIndex = -1;
        for (var i = 0; i < pad.buttons.length; i += 1) {
            if (pad.buttons[i] && pad.buttons[i].pressed) {
                pressedIndex = i;
                break;
            }
        }
        if (pressedIndex < 0) return;

        var inputBindings = window.inputBindings;
        if (!inputBindings || typeof inputBindings.setGamepadBinding !== "function") return;

        var result = inputBindings.setGamepadBinding(listeningGamepadAction, pressedIndex);
        if (!result.ok) {
            var currentAction = listeningGamepadAction;
            setListeningGamepadButton(null);
            listeningGamepadAction = null;
            if (currentAction) {
                var btn = document.querySelector(
                    '.settings-gamepad-btn[data-gamepad-action="' + currentAction + '"]'
                );
                if (btn) {
                    btn.textContent = "Deja pris";
                    window.setTimeout(function () {
                        syncGamepadButtons();
                    }, 800);
                }
            }
            return;
        }

        if (typeof inputBindings.getGamepadBindings === "function") {
            gamepadBinds = inputBindings.getGamepadBindings();
        }

        listeningGamepadAction = null;
        setListeningGamepadButton(null);
        syncGamepadButtons();
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
        if (cams && cams.thirdPersonCamera) {
            cams.thirdPersonCamera.radius = THIRD_BASE_RADIUS - offset;
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
        } else if (camLabel === "third" && cams.thirdPersonCamera) {
            scene.activeCamera = cams.thirdPersonCamera;
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
        syncKeybindButtons();
        syncKeybindP2Buttons();
        syncGamepadButtons();
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

    function isSettingsOpen() {
        return isOpen && overlay && overlay.getAttribute("aria-hidden") !== "true";
    }

    function getFocusableElements() {
        if (!overlay) return [];
        return Array.prototype.slice.call(
            overlay.querySelectorAll(
                "button.settings-option-btn, button.settings-keybind-btn, button.settings-gamepad-btn, #settings-close-btn, #settings-resume-btn"
            )
        );
    }

    function getFocusIndex(list) {
        var active = document.activeElement;
        var idx = list.indexOf(active);
        return idx >= 0 ? idx : 0;
    }

    function focusAt(list, index) {
        if (!list.length) return;
        var i = index % list.length;
        if (i < 0) i += list.length;
        list[i].focus();
    }

    function moveFocus(list, delta) {
        focusAt(list, getFocusIndex(list) + delta);
    }

    function handleSettingsNavKey(e) {
        if (!isSettingsOpen() || listeningAction || listeningGamepadAction) return;
        var list = getFocusableElements();
        if (!list.length) return;

        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            moveFocus(list, -1);
        } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            moveFocus(list, 1);
        } else if (e.key === "Enter" || e.key === " ") {
            var active = document.activeElement;
            if (active && typeof active.click === "function") {
                e.preventDefault();
                active.click();
            }
        }
    }

    function getNavInputFromGamepad(pad) {
        if (!pad) return null;
        var axes = pad.axes || [];
        var deadzone = 0.4;
        var axX = axes.length > 0 ? axes[0] : 0;
        var axY = axes.length > 1 ? axes[1] : 0;

        if (Math.abs(axY) > Math.abs(axX)) {
            if (axY > deadzone) return "down";
            if (axY < -deadzone) return "up";
        } else {
            if (axX > deadzone) return "right";
            if (axX < -deadzone) return "left";
        }

        var btns = pad.buttons || [];
        if (btns[12] && btns[12].pressed) return "up";
        if (btns[13] && btns[13].pressed) return "down";
        if (btns[14] && btns[14].pressed) return "left";
        if (btns[15] && btns[15].pressed) return "right";

        return null;
    }

    function pollSettingsGamepad() {
        if (isSettingsOpen() && !listeningAction) {
            var list = getFocusableElements();
            if (list.length) {
                var pads = (navigator.getGamepads && navigator.getGamepads()) || [];
                var pad = pads.find(function (p) { return p && p.connected; }) || null;
                var nav = getNavInputFromGamepad(pad);
                var now = performance.now();
                if (nav && now - lastNavAt > 180) {
                    lastNavAt = now;
                    if (nav === "left" || nav === "up") moveFocus(list, -1);
                    if (nav === "right" || nav === "down") moveFocus(list, 1);
                }
                var submit = pad && pad.buttons && pad.buttons[0] && pad.buttons[0].pressed;
                if (submit && !lastSubmitPressed) {
                    var active = document.activeElement;
                    if (active && typeof active.click === "function") {
                        active.click();
                    }
                }
                lastSubmitPressed = !!submit;
            }
        }
        if (isSettingsOpen()) {
            captureGamepadBinding();
        }
        window.requestAnimationFrame(pollSettingsGamepad);
    }

    // ── Touche Échap ───────────────────────────────────────────────
    window.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            e.preventDefault();
            toggle();
        }
    });

    window.addEventListener("keydown", handleSettingsNavKey, true);

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

    keybindBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            listeningAction = btn.dataset.action;
            setListeningButton(listeningAction);
            listeningActionP2 = null;
            setListeningP2Button(null);
            listeningGamepadAction = null;
            setListeningGamepadButton(null);
        });
    });

    keybindP2Btns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            listeningActionP2 = btn.dataset.actionP2;
            setListeningP2Button(listeningActionP2);
            listeningAction = null;
            setListeningButton(null);
            listeningGamepadAction = null;
            setListeningGamepadButton(null);
        });
    });

    gamepadBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            listeningGamepadAction = btn.dataset.gamepadAction;
            setListeningGamepadButton(listeningGamepadAction);
            listeningAction = null;
            setListeningButton(null);
        });
    });

    window.addEventListener("keydown", captureKey, true);
    window.addEventListener("keydown", captureKeyP2, true);
    pollSettingsGamepad();

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
            if (cams && cams.thirdPersonCamera) {
                cams.thirdPersonCamera.radius = THIRD_BASE_RADIUS - offset;
            }
        });
    }

    if (window.inputBindings && typeof window.inputBindings.getBindings === "function") {
        keybinds = window.inputBindings.getBindings();
    }
    if (window.inputBindings && typeof window.inputBindings.getPlayer2Bindings === "function") {
        player2Binds = window.inputBindings.getPlayer2Bindings();
    }
    if (window.inputBindings && typeof window.inputBindings.getGamepadBindings === "function") {
        gamepadBinds = window.inputBindings.getGamepadBindings();
    }
    syncKeybindButtons();
    syncKeybindP2Buttons();
    syncGamepadButtons();

    // ── API publique ───────────────────────────────────────────────
    window.settingsMenu = { open: open, close: close, toggle: toggle };
})();
