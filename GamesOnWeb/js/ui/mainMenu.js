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
    var versusSkinIndicators = document.getElementById("versus-skin-indicators");
    var versusSkinBackBtn = document.getElementById("versus-skin-back-btn");
    var skinList = document.getElementById("skinList");
    var stageBg = document.getElementById("stageBg");
    var stageGlow = document.getElementById("stageGlow");
    var skinHeaderMode = document.getElementById("skinHeaderMode");
    var skinHeaderStep = document.getElementById("skinHeaderStep");
    var skinPlayerBadge = document.getElementById("skinPlayerBadge");
    var playerNum = document.getElementById("playerNum");
    var ratingVal = document.getElementById("ratingVal");
    var playerName = document.getElementById("playerName");
    var playerPos = document.getElementById("playerPos");
    var statBars = document.getElementById("statBars");
    var skinDescText = document.getElementById("skinDescText");
    var unlockPill = document.getElementById("unlockPill");
    var statMini = {
        s1: document.getElementById("s1"),
        s2: document.getElementById("s2"),
        s3: document.getElementById("s3"),
        s4: document.getElementById("s4")
    };
    var listeningP2Action = null;
    var p2Binds = {};
    var p1SkinIndex = 0;
    var p2SkinIndex = 0;
    var currentSkinPlayer = 2;
    var P1_SKIN_STORAGE_KEY = "gow-player1-skin-ui";
    var P1_SKIN_MESH_STORAGE_KEY = "gow-player1-skin-mesh-index";
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
            id: "skin0", meshIndex: 1, name: "PARIS", sub: "",
            pos: "Joueur du dimanche", num: "1", color: "#b3b3b3", color2: "#808080",
            bgFrom: "rgba(179,179,179,0.12)", bgTo: "rgba(60,60,60,0.05)",
            glowColor: "rgba(179,179,179,0.35)",
            desc: "Paris, capitale du foot moderne : ambitions europeennes et style offensif.",
            tier: "DEBUTANT", tierBg: "rgba(179,179,179,0.12)", tierCol: "#b3b3b3",
            unlockBg: "transparent", unlockCol: "#b3b3b3", unlockText: "Disponible"
        },
        {
            id: "skin1", meshIndex: 2, name: "LYON", sub: "",
            pos: "Ailier prometteur", num: "2", color: "#42f5aa", color2: "#20bd7d",
            bgFrom: "rgba(66,245,170,0.12)", bgTo: "rgba(20,90,50,0.05)",
            glowColor: "rgba(66,245,170,0.35)",
            desc: "Lyon, formateur historique : jeu propre, talents maison, rigueur.",
            tier: "AMATEUR", tierBg: "rgba(66,245,170,0.12)", tierCol: "#42f5aa",
            unlockBg: "transparent", unlockCol: "#42f5aa", unlockText: "Disponible"
        },
        {
            id: "huitieme", meshIndex: 9, name: "MARSEILLE", sub: "",
            pos: "Milieu central", num: "3", color: "#00aaff", color2: "#0066cc",
            bgFrom: "rgba(0,140,255,0.12)", bgTo: "rgba(0,60,140,0.05)",
            glowColor: "rgba(0,170,255,0.35)",
            desc: "Marseille, ferveur populaire : intensite, volume de jeu et passion.",
            tier: "CLASSIQUE", tierBg: "rgba(0,170,255,0.12)", tierCol: "#00aaff",
            unlockBg: "rgba(0,170,255,0.12)", unlockCol: "#00aaff", unlockText: "Disponible"
        },
        {
            id: "finale", meshIndex: 4, name: "BORDEAUX", sub: "",
            pos: "Icone du tournoi", num: "4", color: "#f5c842", color2: "#c49a00",
            bgFrom: "rgba(245,200,66,0.14)", bgTo: "rgba(120,90,0,0.05)",
            glowColor: "rgba(245,200,66,0.45)",
            desc: "Bordeaux, tradition technique : patience, maitrise et jeu a plat.",
            tier: "LEGENDE", tierBg: "rgba(245,200,66,0.15)", tierCol: "#f5c842",
            unlockBg: "rgba(245,200,66,0.14)", unlockCol: "#f5c842", unlockText: "Disponible"
        },
        {
            id: "demi", meshIndex: 5, name: "LILLE", sub: "",
            pos: "Attaquant centre", num: "5", color: "#ff6b35", color2: "#cc4400",
            bgFrom: "rgba(255,90,30,0.12)", bgTo: "rgba(100,30,0,0.05)",
            glowColor: "rgba(255,100,40,0.38)",
            desc: "Lille, collectif solide : pressing, transitions rapides et audace.",
            tier: "ELITE", tierBg: "rgba(255,107,53,0.12)", tierCol: "#ff6b35",
            unlockBg: "rgba(255,107,53,0.12)", unlockCol: "#ff6b35", unlockText: "Disponible"
        },
        {
            id: "quart", meshIndex: 6, name: "NANTES", sub: "",
            pos: "La pieuvre", num: "6", color: "#7fff00", color2: "#4db800",
            bgFrom: "rgba(100,255,0,0.10)", bgTo: "rgba(40,100,0,0.04)",
            glowColor: "rgba(127,255,0,0.32)",
            desc: "Nantes, identite de jeu : passes courtes et mouvement permanent.",
            tier: "AVANCE", tierBg: "rgba(127,255,0,0.12)", tierCol: "#7fff00",
            unlockBg: "rgba(127,255,0,0.12)", unlockCol: "#7fff00", unlockText: "Disponible"
        },
        {
            id: "skin6", meshIndex: 7, name: "TOULOUSE", sub: "",
            pos: "Capitaine", num: "7", color: "#d942f5", color2: "#951fb0",
            bgFrom: "rgba(217,66,245,0.12)", bgTo: "rgba(100,20,130,0.05)",
            glowColor: "rgba(217,66,245,0.35)",
            desc: "Toulouse, club combatif : intensite, cohesion et jeu direct.",
            tier: "RARE", tierBg: "rgba(217,66,245,0.12)", tierCol: "#d942f5",
            unlockBg: "rgba(217,66,245,0.12)", unlockCol: "#d942f5", unlockText: "Disponible"
        },
        {
            id: "skin7", meshIndex: 8, name: "RENNES", sub: "",
            pos: "Machine à buts", num: "8", color: "#42dcf5", color2: "#199ec2",
            bgFrom: "rgba(66,220,245,0.12)", bgTo: "rgba(20,100,120,0.05)",
            glowColor: "rgba(66,220,245,0.35)",
            desc: "Rennes, jeunesse ambitieuse : rythme, percussions et creation.",
            tier: "EPIC", tierBg: "rgba(66,220,245,0.12)", tierCol: "#42dcf5",
            unlockBg: "rgba(66,220,245,0.12)", unlockCol: "#42dcf5", unlockText: "Disponible"
        },
        {
            id: "skin8", meshIndex: 3, name: "NICE", sub: "",
            pos: "Dieu du stade", num: "9", color: "#e8b01e", color2: "#ba8b11",
            bgFrom: "rgba(232,176,30,0.12)", bgTo: "rgba(120,90,10,0.05)",
            glowColor: "rgba(232,176,30,0.35)",
            desc: "Nice, bloc compact : discipline, transitions propres et efficacite.",
            tier: "MYTHIQUE", tierBg: "rgba(232,176,30,0.12)", tierCol: "#e8b01e",
            unlockBg: "rgba(232,176,30,0.12)", unlockCol: "#e8b01e", unlockText: "Disponible"
        },
        {
            id: "skin9", meshIndex: 10, name: "STRASBOURG", sub: "",
            pos: "Furtif", num: "10", color: "#ed4245", color2: "#b01f21",
            bgFrom: "rgba(237,66,69,0.12)", bgTo: "rgba(120,20,20,0.05)",
            glowColor: "rgba(237,66,69,0.35)",
            desc: "Strasbourg, energie populaire : intensite, rythme et impact.",
            tier: "SOMBRE", tierBg: "rgba(237,66,69,0.12)", tierCol: "#ed4245",
            unlockBg: "rgba(237,66,69,0.12)", unlockCol: "#ed4245", unlockText: "Disponible"
        }
    ];

    function findP2SkinIndexById(id) {
        if (!id) return -1;
        return p2Skins.findIndex(function (s) { return s.id === id; });
    }

    function loadSavedP1SkinSelection() {
        var savedId = window.localStorage.getItem(P1_SKIN_STORAGE_KEY);
        var found = findP2SkinIndexById(savedId);
        p1SkinIndex = found >= 0 ? found : 0;
    }

    function loadSavedP2SkinSelection() {
        var savedId = window.localStorage.getItem(P2_SKIN_STORAGE_KEY);
        var found = findP2SkinIndexById(savedId);
        p2SkinIndex = found >= 0 ? found : 0;
    }

    function getActiveSkinIndex() {
        return currentSkinPlayer === 1 ? p1SkinIndex : p2SkinIndex;
    }

    function setActiveSkinIndex(nextIndex) {
        if (currentSkinPlayer === 1) {
            p1SkinIndex = nextIndex;
        } else {
            p2SkinIndex = nextIndex;
        }
    }

    function updateSkinHeader() {
        var isP1 = currentSkinPlayer === 1;
        if (skinHeaderMode) skinHeaderMode.textContent = isP1 ? "Selection du skin joueur 1" : "Selection du skin joueur 2";
        if (skinHeaderStep) skinHeaderStep.textContent = isP1 ? "ETAPE 2 / 3" : "ETAPE 3 / 3";
        if (skinPlayerBadge) skinPlayerBadge.textContent = isP1 ? "P1" : "P2";
        if (versusSkinCanvas) {
            versusSkinCanvas.setAttribute("aria-label", isP1 ? "Apercu 3D du skin joueur 1" : "Apercu 3D du skin joueur 2");
        }
        if (versusSkinBackBtn) {
            versusSkinBackBtn.textContent = isP1 ? "← Retour aux controles" : "← Retour au skin joueur 1";
        }
    }

    function isSkinBlockedForPlayer(index) {
        return currentSkinPlayer === 2 && index === p1SkinIndex;
    }

    function findNextAvailableIndex(startIndex, direction) {
        if (!p2Skins.length) return -1;
        var dir = direction >= 0 ? 1 : -1;
        for (var i = 0; i < p2Skins.length; i += 1) {
            var candidate = (startIndex + dir * i + p2Skins.length) % p2Skins.length;
            if (!isSkinBlockedForPlayer(candidate)) return candidate;
        }
        return -1;
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

        // Caméra — distance augmentée pour bien voir le personnage dans le cadre
            skinPreviewCamera = new BABYLON.ArcRotateCamera(
            "p2SkinPreviewCamera",
            -Math.PI / 2,
            1.4,
            3.9,
            new BABYLON.Vector3(0, 2.8, 0),
            skinPreviewScene
        );
        skinPreviewCamera.attachControl(versusSkinCanvas, false);
        skinPreviewCamera.lowerRadiusLimit = 1.4;
        skinPreviewCamera.upperRadiusLimit = 12;
        skinPreviewCamera.lowerBetaLimit = 0.95;
        skinPreviewCamera.upperBetaLimit = 1.55;
        skinPreviewCamera.panningSensibility = 0;
        skinPreviewCamera.wheelPrecision = 20;
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
                    mesh.scaling = new BABYLON.Vector3(1, 1, 1);
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
                    var centerWorld = mesh.getBoundingInfo().boundingBox.centerWorld.clone();
                    var invPose = skinPreviewPoseRoot.getWorldMatrix().clone();
                    invPose.invert();
                    var centerLocal = BABYLON.Vector3.TransformCoordinates(centerWorld, invPose);
                    mesh.position.x = -centerLocal.x;
                    mesh.position.z = -centerLocal.z;
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

    function getResolvedSkinPreviewEntry(skin, skinIndex) {
        if (!skinPreviewMeshes.length) return null;

        var selectedEntry = null;
        if (skin && typeof skin.meshIndex === "number") {
            selectedEntry = skinPreviewMeshes.find(function (entry) {
                return entry.sourceIndex === skin.meshIndex;
            }) || null;
        }

        if (!selectedEntry && typeof skinIndex === "number" && skinIndex >= 0 && skinIndex < skinPreviewMeshes.length) {
            selectedEntry = skinPreviewMeshes[skinIndex];
        }

        return selectedEntry || skinPreviewMeshes[0] || null;
    }

    function focusSkinPreviewMesh(selectedMesh) {
        if (!selectedMesh || !skinPreviewCamera || !window.BABYLON) return;

        selectedMesh.computeWorldMatrix(true);

        var bbox = selectedMesh.getBoundingInfo().boundingBox;
        var min = bbox.minimumWorld;
        var max = bbox.maximumWorld;
        var center = bbox.centerWorld.clone();

        var width = Math.max(0.1, max.x - min.x);
        var height = Math.max(0.1, max.y - min.y);
        var depth = Math.max(0.1, max.z - min.z);
        var largestSize = Math.max(width, height, depth);

        skinPreviewCamera.target = new BABYLON.Vector3(center.x, min.y + height * 0.48, center.z);
        skinPreviewCamera.radius = BABYLON.Scalar.Clamp(largestSize * 0.62, 2.8, 4.1);
    }

    function updateSkinPreviewMesh() {
        if (!skinPreviewLoaded || !skinPreviewMeshes.length) return;
        var skin = p2Skins[getActiveSkinIndex()] || p2Skins[0];
        if (!skin) return;

        skinPreviewMeshes.forEach(function (entry) {
            entry.mesh.setEnabled(false);
        });

        var selectedEntry = getResolvedSkinPreviewEntry(skin, getActiveSkinIndex());
        var selectedMesh = selectedEntry && selectedEntry.mesh ? selectedEntry.mesh : null;
        if (selectedMesh) {
            selectedMesh.setEnabled(true);
        }

        focusSkinPreviewMesh(selectedMesh);
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
        loadSavedP1SkinSelection();
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

    function renderStatBars(stats, skin) {
        if (!stats) return "";
        var keys = Object.keys(stats);
        return keys.map(function (k) {
            var v = stats[k];
            return (
                '<div class="stat-bar-row">' +
                    '<div class="stat-bar-header">' +
                        '<span class="stat-bar-name">' + k + '</span>' +
                        '<span class="stat-bar-num" style="color:' + skin.color + '">' + v + '</span>' +
                    '</div>' +
                    '<div class="stat-bar-track">' +
                        '<div class="stat-bar-fill" style="width:' + v + '%;background:linear-gradient(90deg,' + skin.color2 + ',' + skin.color + ')"></div>' +
                    '</div>' +
                '</div>'
            );
        }).join("");
    }

    function renderSkinDots() {
        if (!versusSkinIndicators) return;
        var html = "";
        for (var i = 0; i < p2Skins.length; i += 1) {
            var activeIndex = getActiveSkinIndex();
            var isBlocked = isSkinBlockedForPlayer(i);
            var activeClass = i === activeIndex ? " is-active" : "";
            var blockedClass = isBlocked ? " is-disabled" : "";
            var activeStyle = i === activeIndex ? ' style="background:' + p2Skins[i].color + '"' : "";
            html += '<button class="skin-dot' + activeClass + blockedClass + '" type="button" data-index="' + i + '" aria-label="Skin ' + (i + 1) + '"' + (isBlocked ? ' aria-disabled="true"' : "") + activeStyle + '></button>';
        }
        versusSkinIndicators.innerHTML = html;
    }

    function renderSkinList() {
        if (!skinList) return;
        var html = "";
        var activeIndex = getActiveSkinIndex();
        for (var i = 0; i < p2Skins.length; i += 1) {
            var skin = p2Skins[i];
            var isBlocked = isSkinBlockedForPlayer(i);
            var activeClass = i === activeIndex ? " active" : "";
            var blockedClass = isBlocked ? " is-disabled" : "";
            html += (
                '<button class="skin-option' + activeClass + blockedClass + '" type="button" data-index="' + i + '"' + (isBlocked ? ' disabled aria-disabled="true"' : "") + '>' +
                    '<div class="skin-option-badge" style="background:' + skin.tierBg + ';color:' + skin.color + '">' + skin.num + '</div>' +
                    '<div class="skin-option-info">' +
                        '<div class="skin-option-name">' + skin.name + '</div>' +
                        (isBlocked ? '<div class="skin-option-lock">Indisponible</div>' : "") +
                    '</div>' +
                    '<div class="skin-option-check"></div>' +
                '</button>'
            );
        }
        skinList.innerHTML = html;
    }

    function applySkinTheme(skin) {
        if (!skin) return;
        if (stageBg) stageBg.style.background = 'linear-gradient(180deg,' + skin.bgFrom + ' 0%,' + skin.bgTo + ' 100%)';
        if (stageGlow) stageGlow.style.background = skin.glowColor;

        if (playerNum) playerNum.textContent = skin.num;

        if (playerName) {
            playerName.textContent = skin.name;
            playerName.style.color = skin.color;
        }
        if (playerPos) playerPos.textContent = skin.pos;

        if (unlockPill) {
            unlockPill.textContent = skin.unlockText;
            unlockPill.style.background = skin.unlockBg;
            unlockPill.style.color = skin.unlockCol;
            unlockPill.style.border = '1px solid ' + skin.unlockCol + '40';
        }

        if (skinDescText) skinDescText.textContent = skin.desc;

        if (versusSkinConfirmBtn) {
            versusSkinConfirmBtn.style.background = 'linear-gradient(135deg,' + skin.color2 + ',' + skin.color + ')';
            versusSkinConfirmBtn.style.boxShadow = '0 8px 30px ' + skin.glowColor;
        }
    }

    function renderP2Skin() {
        var skin = p2Skins[getActiveSkinIndex()] || p2Skins[0];
        if (!skin) return;
        applySkinTheme(skin);
        updateSkinPreviewMesh();
        renderSkinList();
        renderSkinDots();
    }

    function changeP2Skin(delta) {
        if (!p2Skins.length) return;
        var startIndex = (getActiveSkinIndex() + delta + p2Skins.length) % p2Skins.length;
        var nextIndex = currentSkinPlayer === 2 ? findNextAvailableIndex(startIndex, delta) : startIndex;
        if (nextIndex >= 0) setActiveSkinIndex(nextIndex);
        renderP2Skin();
    }

    function openVersusSkinCarousel() {
        if (!versusSkinOverlay) return;
        currentSkinPlayer = 1;
        loadSavedP1SkinSelection();
        updateSkinHeader();
        ensureSkinPreviewReady();
        loadSkinPreviewMeshes();
        renderP2Skin();
        versusSkinOverlay.classList.add("settings-overlay--open");
        versusSkinOverlay.setAttribute("aria-hidden", "false");
        if (skinPreviewEngine) skinPreviewEngine.resize();
    }

    function switchToPlayer2Skin() {
        currentSkinPlayer = 2;
        loadSavedP2SkinSelection();
        if (isSkinBlockedForPlayer(p2SkinIndex)) {
            var fallbackIndex = findNextAvailableIndex(p2SkinIndex, 1);
            if (fallbackIndex >= 0) p2SkinIndex = fallbackIndex;
        }
        updateSkinHeader();
        renderP2Skin();
        if (skinPreviewEngine) skinPreviewEngine.resize();
    }

    function goToPreviousSkinStep() {
        if (currentSkinPlayer === 2) {
            currentSkinPlayer = 1;
            updateSkinHeader();
            renderP2Skin();
            return;
        }
        closeVersusSkinCarousel();
        openVersusControls();
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
            goToPreviousSkinStep();
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

    if (skinList) {
        skinList.addEventListener("click", function (event) {
            var btn = event.target && event.target.closest ? event.target.closest(".skin-option") : null;
            if (!btn || !btn.dataset || typeof btn.dataset.index === "undefined") return;
            var nextIndex = Number.parseInt(btn.dataset.index, 10);
            if (currentSkinPlayer === 2 && isSkinBlockedForPlayer(nextIndex)) return;
            if (!Number.isNaN(nextIndex)) {
                setActiveSkinIndex(nextIndex);
                renderP2Skin();
            }
        });
    }

    if (versusSkinIndicators) {
        versusSkinIndicators.addEventListener("click", function (event) {
            var btn = event.target && event.target.closest ? event.target.closest(".skin-dot") : null;
            if (!btn || !btn.dataset || typeof btn.dataset.index === "undefined") return;
            var nextIndex = Number.parseInt(btn.dataset.index, 10);
            if (currentSkinPlayer === 2 && isSkinBlockedForPlayer(nextIndex)) return;
            if (!Number.isNaN(nextIndex)) {
                setActiveSkinIndex(nextIndex);
                renderP2Skin();
            }
        });
    }

    if (versusSkinBackBtn) {
        versusSkinBackBtn.addEventListener("click", function () {
            goToPreviousSkinStep();
        });
    }

    if (versusSkinConfirmBtn) {
        versusSkinConfirmBtn.addEventListener("click", function () {
            var skin = p2Skins[getActiveSkinIndex()];
            if (skin) {
                var selectedEntry = getResolvedSkinPreviewEntry(skin, getActiveSkinIndex());
                var resolvedMeshIndex = selectedEntry ? selectedEntry.sourceIndex : skin.meshIndex;
                if (currentSkinPlayer === 1) {
                    window.localStorage.setItem(P1_SKIN_STORAGE_KEY, skin.id);
                    window.localStorage.setItem(P1_SKIN_MESH_STORAGE_KEY, String(resolvedMeshIndex));
                    switchToPlayer2Skin();
                    return;
                }
                window.localStorage.setItem(P2_SKIN_STORAGE_KEY, skin.id);
                window.localStorage.setItem(P2_SKIN_MESH_STORAGE_KEY, String(resolvedMeshIndex));
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
                goToPreviousSkinStep();
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

    loadSavedP1SkinSelection();
    loadSavedP2SkinSelection();
    resetPreview();
})();
