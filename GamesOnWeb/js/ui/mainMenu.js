// js/ui/mainMenu.js
// Menu principal: preview video on hover/focus, with optional close action.

(function () {
    "use strict";

    var menu = document.getElementById("main-menu");
    if (!menu) return;

    var tiles = menu.querySelectorAll(".menu-tile[data-preview]");
    var tournamentTile = menu.querySelector(".menu-tile[data-preview='tournament']");
    var versusTile = menu.querySelector(".menu-tile[data-preview='versus']");
    var settingsTile = menu.querySelector(".menu-tile--settings");
    var previewFrames = menu.querySelectorAll(".menu-preview-frame");
    var closeButtons = menu.querySelectorAll("[data-menu-action='close']");
    var focusable = Array.prototype.slice.call(menu.querySelectorAll(".menu-tile"));
    var lastNavAt = 0;
    var lastSubmitPressed = false;

    var versusOverlay = document.getElementById("versus-controls-overlay");
    var versusCloseBtn = document.getElementById("versus-controls-close-btn");
    var versusConfirmBtn = document.getElementById("versus-controls-confirm-btn");
    var versusKeyBtns = document.querySelectorAll(".settings-keybind-btn[data-action-p2]");
    var versusSkinOverlay = document.getElementById("versus-skin-overlay");
    var versusSkinCloseBtn = document.getElementById("versus-skin-close-btn");
    var versusSkinPrevBtn = document.getElementById("versus-skin-prev-btn");
    var versusSkinNextBtn = document.getElementById("versus-skin-next-btn");
    var versusSkinConfirmBtn = document.getElementById("versus-skin-confirm-btn");
    var versusSkinCanvas = document.getElementById("versus-skin-canvas");
    var versusSkinName = document.getElementById("versus-skin-name");
    var versusSkinDesc = document.getElementById("versus-skin-desc");
    var versusSkinIndicators = document.getElementById("versus-skin-indicators");
    var listeningP2Action = null;
    var p2Binds = {};
    var p2SkinIndex = 0;
    var P2_SKIN_STORAGE_KEY = "gow-player2-skin-ui";
    var P2_SKIN_MESH_STORAGE_KEY = "gow-player2-skin-mesh-index";

    var skinPreviewEngine = null;
    var skinPreviewScene = null;
    var skinPreviewCamera = null;
    var skinPreviewSpinRoot = null;
    var skinPreviewPoseRoot = null;
    var skinPreviewMeshes = [];
    var skinPreviewLoaded = false;
    var skinPreviewLoading = false;
    var skinPreviewRenderLoopStarted = false;
    var p2Skins = [
        {
            id: "huitieme",
            meshIndex: 2,
            name: "Huitième",
            description: "Skin des huitièmes de finale."
        },
        {
            id: "quart",
            meshIndex: 5,
            name: "Quart",
            description: "Skin des quarts de finale."
        },
        {
            id: "demi",
            meshIndex: 4,
            name: "Demi-finale",
            description: "Skin des demi-finales."
        },
        {
            id: "finale",
            meshIndex: 3,
            name: "Finale",
            description: "Skin de la grande finale."
        }
    ];

    function findP2SkinIndexById(id) {
        if (!id) return -1;
        return p2Skins.findIndex(function (s) { return s.id === id; });
    }

    function loadSavedP2SkinSelection() {
        var savedId = window.localStorage.getItem(P2_SKIN_STORAGE_KEY);
        var found = findP2SkinIndexById(savedId);
        p2SkinIndex = found >= 0 ? found : 0;
    }

    function ensureSkinPreviewReady() {
        if (!versusSkinCanvas || !window.BABYLON) return;
        if (skinPreviewScene) return;

        skinPreviewEngine = new BABYLON.Engine(versusSkinCanvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true
        });

        skinPreviewScene = new BABYLON.Scene(skinPreviewEngine);
        skinPreviewScene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

        // Lumière ambiante principale — douce et légèrement froide
        var ambientLight = new BABYLON.HemisphericLight("p2SkinAmbient", new BABYLON.Vector3(0, 1, 0), skinPreviewScene);
        ambientLight.intensity = 0.55;
        ambientLight.groundColor = new BABYLON.Color3(0.05, 0.08, 0.18);
        ambientLight.diffuse = new BABYLON.Color3(0.95, 0.92, 1.0);

        // Lumière principale frontale — éclaire le corps de face
        var frontLight = new BABYLON.DirectionalLight("p2SkinFront", new BABYLON.Vector3(0.3, -0.6, 1), skinPreviewScene);
        frontLight.position = new BABYLON.Vector3(0, 12, -12);
        frontLight.intensity = 1.1;
        frontLight.diffuse = new BABYLON.Color3(1.0, 0.97, 0.92);

        // Rim light latérale — donne du volume
        var rimLight = new BABYLON.DirectionalLight("p2SkinRim", new BABYLON.Vector3(-1, -0.2, 0.2), skinPreviewScene);
        rimLight.position = new BABYLON.Vector3(-10, 6, 0);
        rimLight.intensity = 0.7;
        rimLight.diffuse = new BABYLON.Color3(0.5, 0.72, 1.0);

        // Lumière de sol bleutée — ambiance stade
        var groundLight = new BABYLON.PointLight("p2SkinGround", new BABYLON.Vector3(0, -2, 0), skinPreviewScene);
        groundLight.intensity = 0.18;
        groundLight.diffuse = new BABYLON.Color3(0.3, 0.5, 1.0);

        // Caméra — proche, centrée sur le milieu du corps, angle 3/4
        skinPreviewCamera = new BABYLON.ArcRotateCamera(
            "p2SkinPreviewCamera",
            -Math.PI / 2,
            1.05,
            8,
            new BABYLON.Vector3(0, 5.5, 0),
            skinPreviewScene
        );
        skinPreviewCamera.attachControl(versusSkinCanvas, false);
        skinPreviewCamera.lowerRadiusLimit = 5;
        skinPreviewCamera.upperRadiusLimit = 14;
        skinPreviewCamera.lowerBetaLimit = 0.5;
        skinPreviewCamera.upperBetaLimit = 1.4;
        skinPreviewCamera.panningSensibility = 0;
        skinPreviewCamera.wheelPrecision = 100;
        skinPreviewCamera.minZ = 0.1;

        skinPreviewSpinRoot = new BABYLON.TransformNode("p2SkinPreviewSpinRoot", skinPreviewScene);
        skinPreviewPoseRoot = new BABYLON.TransformNode("p2SkinPreviewPoseRoot", skinPreviewScene);
        skinPreviewPoseRoot.parent = skinPreviewSpinRoot;
        skinPreviewPoseRoot.rotation.x = -Math.PI / 2;

        if (!skinPreviewRenderLoopStarted) {
            skinPreviewRenderLoopStarted = true;
            skinPreviewEngine.runRenderLoop(function () {
                if (skinPreviewScene && isVersusSkinOpen()) {
                    if (skinPreviewSpinRoot) {
                        skinPreviewSpinRoot.rotation.y += 0.009;
                    }
                    skinPreviewScene.render();
                }
            });
        }

        window.addEventListener("resize", function () {
            if (skinPreviewEngine) skinPreviewEngine.resize();
        });
    }


    function loadSkinPreviewMeshes() {
        if (!skinPreviewScene || skinPreviewLoaded || skinPreviewLoading || !window.BABYLON) return;
        skinPreviewLoading = true;

        BABYLON.SceneLoader.ImportMesh(
            "",
            "textures/",
            "cricketers_pack_low_poly.glb",
            skinPreviewScene,
            function (meshes) {
                skinPreviewLoading = false;
                skinPreviewLoaded = true;

                skinPreviewMeshes = meshes
                    .map(function (m, idx) { return { mesh: m, sourceIndex: idx }; })
                    .filter(function (entry) {
                        return entry.mesh && entry.mesh.getTotalVertices && entry.mesh.getTotalVertices() > 0;
                    });

                if (!skinPreviewMeshes.length) return;

                skinPreviewMeshes.forEach(function (entry, index) {
                    var mesh = entry.mesh;
                    mesh.parent = skinPreviewPoseRoot;
                    mesh.scaling = new BABYLON.Vector3(8, 8, 8);
                    mesh.position = BABYLON.Vector3.Zero();
                    mesh.rotation = BABYLON.Vector3.Zero();
                    mesh.setEnabled(index === 0);
                });

                // Centrage X/Z en espace local du mesh (identique à createPlayer)
                // IMPORTANT : poseRoot.rotation.x = -PI/2 donc son axe Y local = axe Z monde.
                // On NE TOUCHE PAS mesh.position.y ici (ça déplacerait selon Z monde).
                // On centre uniquement X et Z locaux sous poseRoot.
                skinPreviewMeshes.forEach(function (entry) {
                    var mesh = entry.mesh;
                    mesh.computeWorldMatrix(true);
                    var centerLocal = mesh.getBoundingInfo().boundingBox.center;
                    mesh.position.x = -centerLocal.x * 8;
                    mesh.position.z = -centerLocal.z * 8;
                });

                // Décalage vertical : on relève poseRoot en espace monde (spinRoot ne fait que
                // tourner autour de Y donc poseRoot.position.y = Y monde).
                // On prend le premier mesh pour calculer le bas du personnage en Y monde.
                var refMesh = skinPreviewMeshes[0] && skinPreviewMeshes[0].mesh;
                if (refMesh) {
                    refMesh.computeWorldMatrix(true);
                    var wBbox = refMesh.getBoundingInfo().boundingBox;
                    var minYWorld = wBbox.minimumWorld.y;
                    // Remonter poseRoot pour que les pieds touchent y=0
                    skinPreviewPoseRoot.position.y = -minYWorld;
                }

                renderP2Skin();
            },
            null,
            function () {
                skinPreviewLoading = false;
            }
        );
    }

    function updateSkinPreviewMesh() {
        if (!skinPreviewLoaded || !skinPreviewMeshes.length) return;
        var skin = p2Skins[p2SkinIndex] || p2Skins[0];
        if (!skin) return;

        var meshIndex = typeof skin.meshIndex === "number" ? skin.meshIndex : 0;
        var found = false;
        skinPreviewMeshes.forEach(function (entry) {
            var isSelected = entry.sourceIndex === meshIndex;
            entry.mesh.setEnabled(isSelected);
            if (isSelected) found = true;
        });

        if (!found && skinPreviewMeshes[0] && skinPreviewMeshes[0].mesh) {
            skinPreviewMeshes[0].mesh.setEnabled(true);
        }
    }

    function formatKeyLabel(value) {
        if (!value) return "-";
        if (value === "Space") return "Space";
        if (value === "Shift") return "Shift";
        const SPECIAL = {
            "arrowup": "↑",
            "arrowdown": "↓",
            "arrowleft": "←",
            "arrowright": "→",
            "enter": "Entrée",
            "rshift": "Shift►",
            "shiftright": "Shift►",
            "shiftleft": "Shift◄",
            "numpaddecimal": "Num .",
            "numpad4": "Num 4",
            "numpad6": "Num 6"
        };
        const lc = value.toLowerCase();
        if (SPECIAL[lc]) return SPECIAL[lc];
        if (value.length === 1) return value.toUpperCase();
        // Touches de type "KeyZ" -> afficher juste "Z"
        if (/^Key[A-Za-z]$/.test(value)) return value[3].toUpperCase();
        if (/^Digit[0-9]$/.test(value)) return value[5];
        return value;
    }

    function syncP2Buttons() {
        versusKeyBtns.forEach(function (btn) {
            var action = btn.dataset.actionP2;
            btn.textContent = formatKeyLabel(p2Binds[action]);
        });
    }

    function setListeningP2Button(nextAction) {
        versusKeyBtns.forEach(function (btn) {
            var active = btn.dataset.actionP2 === nextAction;
            btn.classList.toggle("is-listening", active);
            if (active) btn.textContent = "Appuie...";
        });
    }

    function refreshP2Bindings() {
        if (window.inputBindings && typeof window.inputBindings.getPlayer2Bindings === "function") {
            p2Binds = window.inputBindings.getPlayer2Bindings();
        } else if (window.inputBindings && typeof window.inputBindings.getBindings === "function") {
            p2Binds = window.inputBindings.getBindings();
        } else {
            p2Binds = {};
        }
        syncP2Buttons();
    }

    function openVersusControls() {
        if (!versusOverlay) return;
        refreshP2Bindings();
        loadSavedP2SkinSelection();
        listeningP2Action = null;
        setListeningP2Button(null);
        versusOverlay.classList.add("settings-overlay--open");
        versusOverlay.setAttribute("aria-hidden", "false");
    }

    function closeVersusControls() {
        if (!versusOverlay) return;
        listeningP2Action = null;
        setListeningP2Button(null);
        versusOverlay.classList.remove("settings-overlay--open");
        versusOverlay.setAttribute("aria-hidden", "true");
    }

    function isVersusSkinOpen() {
        return !!versusSkinOverlay && versusSkinOverlay.getAttribute("aria-hidden") === "false";
    }

    function renderP2SkinIndicators() {
        if (!versusSkinIndicators) return;
        var html = "";
        for (var i = 0; i < p2Skins.length; i += 1) {
            var activeClass = i === p2SkinIndex ? " is-active" : "";
            html += '<span class="versus-skin-dot' + activeClass + '"></span>';
        }
        versusSkinIndicators.innerHTML = html;
    }

    function renderP2Skin() {
        var skin = p2Skins[p2SkinIndex] || p2Skins[0];
        if (!skin) return;
        if (versusSkinName) versusSkinName.textContent = skin.name;
        if (versusSkinDesc) versusSkinDesc.textContent = skin.description;
        updateSkinPreviewMesh();
        renderP2SkinIndicators();
    }

    function changeP2Skin(delta) {
        if (!p2Skins.length) return;
        p2SkinIndex = (p2SkinIndex + delta + p2Skins.length) % p2Skins.length;
        renderP2Skin();
    }

    function openVersusSkinCarousel() {
        if (!versusSkinOverlay) return;
        ensureSkinPreviewReady();
        loadSkinPreviewMeshes();
        renderP2Skin();
        versusSkinOverlay.classList.add("settings-overlay--open");
        versusSkinOverlay.setAttribute("aria-hidden", "false");
        if (skinPreviewEngine) skinPreviewEngine.resize();
    }

    function closeVersusSkinCarousel() {
        if (!versusSkinOverlay) return;
        versusSkinOverlay.classList.remove("settings-overlay--open");
        versusSkinOverlay.setAttribute("aria-hidden", "true");
    }

    function captureP2Key(event) {
        if (!listeningP2Action) return;
        event.preventDefault();

        if (event.key === "Escape") {
            listeningP2Action = null;
            setListeningP2Button(null);
            syncP2Buttons();
            return;
        }

        // Préférer event.code pour capturer les touches spéciales (flèches, Entrée, Numpad...)
        var value = null;
        if (event.code && event.code !== "" && event.code !== "Unidentified") {
            if (event.code === "Space") {
                value = "Space";
            } else {
                value = event.code; // "ArrowUp", "ShiftRight", "Enter", "KeyZ", "Numpad4"...
            }
        } else if (event.key && event.key.length === 1) {
            value = event.key.toLowerCase();
        } else if (event.key) {
            value = event.key;
        }

        if (!value || !window.inputBindings || typeof window.inputBindings.setPlayer2Binding !== "function") return;

        var result = window.inputBindings.setPlayer2Binding(listeningP2Action, value);
        if (!result.ok) {
            var currentAction = listeningP2Action;
            listeningP2Action = null;
            setListeningP2Button(null);
            var btn = document.querySelector('.settings-keybind-btn[data-action-p2="' + currentAction + '"]');
            if (btn) {
                btn.textContent = "Déjà pris";
                window.setTimeout(function () { refreshP2Bindings(); }, 700);
            }
            return;
        }

        listeningP2Action = null;
        setListeningP2Button(null);
        refreshP2Bindings();
    }

    function setActivePreview(key) {
        previewFrames.forEach(function (frame) {
            var isTarget = frame.dataset.preview === key;
            frame.classList.toggle("is-active", isTarget);

            if (isTarget && (key === "tournament" || key === "versus")) {
                var tail = frame.querySelector(".pre-match-tournament-tail");
                var tailText = frame.querySelector(".pre-match-tournament-tail span");
                if (tail && tailText) {
                    var revealWidth = Math.max(1, Math.ceil(tailText.getBoundingClientRect().width));
                    tail.style.setProperty("--reveal-width", revealWidth + "px");
                    tail.style.setProperty("--slide-start", -revealWidth + "px");
                }
            }

            var video = frame.querySelector(".menu-preview-video");
            if (!video) return;

            if (isTarget) {
                var dataSrc = video.getAttribute("data-src");
                if (dataSrc && !video.src) {
                    video.src = dataSrc;
                }
                if (video.src) {
                    video.play().catch(function () { /* autoplay may be blocked */ });
                }
            } else {
                if (!video.paused) video.pause();
                video.currentTime = 0;
            }
        });
    }

    function resetPreview() {
        setActivePreview("idle");
    }

    function isMenuVisible() {
        return !menu.classList.contains("is-hidden") && menu.getAttribute("aria-hidden") !== "true";
    }

    function getFocusIndex() {
        var active = document.activeElement;
        var idx = focusable.indexOf(active);
        return idx >= 0 ? idx : 0;
    }

    function focusAt(index) {
        if (!focusable.length) return;
        var i = index % focusable.length;
        if (i < 0) i += focusable.length;
        focusable[i].focus();
    }

    function moveFocus(delta) {
        focusAt(getFocusIndex() + delta);
    }

    function handleMenuNavKey(e) {
        if (!isMenuVisible()) return;
        if (isVersusSkinOpen()) return;
        if (versusOverlay && versusOverlay.getAttribute("aria-hidden") === "false") return;
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            moveFocus(-1);
        } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            moveFocus(1);
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

    function pollMenuGamepad() {
        if (isMenuVisible()) {
            var pads = (navigator.getGamepads && navigator.getGamepads()) || [];
            var pad = pads.find(function (p) { return p && p.connected; }) || null;
            var nav = getNavInputFromGamepad(pad);
            var now = performance.now();
            if (nav && now - lastNavAt > 180) {
                lastNavAt = now;
                if (nav === "left" || nav === "up") moveFocus(-1);
                if (nav === "right" || nav === "down") moveFocus(1);
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
        window.requestAnimationFrame(pollMenuGamepad);
    }

    tiles.forEach(function (tile) {
        var key = tile.dataset.preview;
        tile.addEventListener("mouseenter", function () { setActivePreview(key); });
        tile.addEventListener("focus", function () { setActivePreview(key); });
        tile.addEventListener("mouseleave", resetPreview);
        tile.addEventListener("blur", resetPreview);
    });

    window.addEventListener("keydown", handleMenuNavKey, true);
    pollMenuGamepad();

    if (settingsTile) {
        settingsTile.addEventListener("mouseenter", function () {
            setActivePreview("__none__");
        });
        settingsTile.addEventListener("focus", function () {
            setActivePreview("__none__");
        });
        settingsTile.addEventListener("mouseleave", resetPreview);
        settingsTile.addEventListener("blur", resetPreview);

        settingsTile.addEventListener("click", function () {
            if (window.settingsMenu && typeof window.settingsMenu.open === "function") {
                window.settingsMenu.open();
            }
        });
    }

    if (tournamentTile) {
        tournamentTile.addEventListener("click", function () {
            menu.classList.add("is-hidden");
            menu.setAttribute("aria-hidden", "true");
            if (typeof window.startTournamentMatch === "function") {
                window.startTournamentMatch();
            }
        });
    }

    if (versusTile) {
        versusTile.addEventListener("click", function () {
            openVersusControls();
        });
    }

    versusKeyBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            listeningP2Action = btn.dataset.actionP2;
            setListeningP2Button(listeningP2Action);
        });
    });

    if (versusCloseBtn) {
        versusCloseBtn.addEventListener("click", closeVersusControls);
    }

    if (versusConfirmBtn) {
        versusConfirmBtn.addEventListener("click", function () {
            closeVersusControls();
            openVersusSkinCarousel();
        });
    }

    if (versusSkinCloseBtn) {
        versusSkinCloseBtn.addEventListener("click", function () {
            closeVersusSkinCarousel();
            openVersusControls();
        });
    }

    if (versusSkinPrevBtn) {
        versusSkinPrevBtn.addEventListener("click", function () {
            changeP2Skin(-1);
        });
    }

    if (versusSkinNextBtn) {
        versusSkinNextBtn.addEventListener("click", function () {
            changeP2Skin(1);
        });
    }

    if (versusSkinConfirmBtn) {
        versusSkinConfirmBtn.addEventListener("click", function () {
            var skin = p2Skins[p2SkinIndex];
            if (skin) {
                window.localStorage.setItem(P2_SKIN_STORAGE_KEY, skin.id);
                window.localStorage.setItem(P2_SKIN_MESH_STORAGE_KEY, String(skin.meshIndex));
            }
            closeVersusSkinCarousel();
            menu.classList.add("is-hidden");
            menu.setAttribute("aria-hidden", "true");
            if (typeof window.startVersusMatch === "function") {
                window.startVersusMatch();
            } else if (typeof window.startTournamentMatch === "function") {
                // fallback temporaire tant que le mode 1v1 dédié n'est pas branché
                window.startTournamentMatch();
            }
        });
    }

    window.addEventListener("keydown", function (e) {
        if (isVersusSkinOpen()) {
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                changeP2Skin(-1);
                return;
            }
            if (e.key === "ArrowRight") {
                e.preventDefault();
                changeP2Skin(1);
                return;
            }
            if (e.key === "Enter") {
                e.preventDefault();
                if (versusSkinConfirmBtn) versusSkinConfirmBtn.click();
                return;
            }
            if (e.key === "Escape") {
                e.preventDefault();
                closeVersusSkinCarousel();
                openVersusControls();
                return;
            }
        }

        if (!versusOverlay || versusOverlay.getAttribute("aria-hidden") === "true") return;
        if (listeningP2Action) {
            captureP2Key(e);
            return;
        }
        if (e.key === "Escape") {
            e.preventDefault();
            closeVersusControls();
        }
    }, true);

    closeButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            closeVersusSkinCarousel();
            closeVersusControls();
            menu.classList.add("is-hidden");
            menu.setAttribute("aria-hidden", "true");
        });
    });

    loadSavedP2SkinSelection();
    resetPreview();
})();
