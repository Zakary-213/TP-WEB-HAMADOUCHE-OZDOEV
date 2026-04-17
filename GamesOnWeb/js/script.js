import { gamepadState, getActiveGamepad, getPrimaryStick, setupGamepadNotifications } from "./input/gamepadManager.js";
import { launchPreMatchIntro } from "./ui/preMatchIntro.js";
import { checkGoalScored } from "./game/goalDetection.js";
import { updateBallPhysics } from "./game/ballPhysics.js";
import { updatePlayerMovement } from "./game/playerMovement.js";
import { setupTeams } from "./game/teamSetup.js";
import { getVersusScoreboardLabels, getVersusTeamLabels } from "./utils/teamLabels.js";
import { saveScoreToDB } from "./score/matchResult.js";

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

setupGamepadNotifications();

const TOURNAMENT_STAGES = ["huitieme", "quart", "demi", "finale"];
let currentTournamentStage = TOURNAMENT_STAGES[0];

function getNextTournamentStage(stage) {
    const idx = TOURNAMENT_STAGES.indexOf(stage);
    if (idx < 0 || idx >= TOURNAMENT_STAGES.length - 1) return null;
    return TOURNAMENT_STAGES[idx + 1];
}

function setGameCanvasVisible(visible) {
    if (!canvas) return;
    canvas.style.display = visible ? "block" : "none";
}

// Crée un indicateur visuel (petite flèche) au-dessus d'un joueur sélectionné
function createSelectionIndicator(scene, playerNode, options = {}) {
    const suffix = options.suffix || "";
    const color = options.color || new BABYLON.Color3(1, 0.9, 0.2);

    const root = new BABYLON.TransformNode("selectionIndicatorRoot" + suffix, scene);
        // Hauteur suffisante pour être bien au-dessus de la tête, même avec les skins les plus grands
        root.position = new BABYLON.Vector3(0, 10, 0);

    const arrow = BABYLON.MeshBuilder.CreateCylinder("selectionArrow" + suffix, {
            height: 1.6,
            diameterTop: 0,
            diameterBottom: 0.9,
            tessellation: 4
        }, scene);
        arrow.parent = root;

    const mat = new BABYLON.StandardMaterial("selectionArrowMat" + suffix, scene);
    mat.emissiveColor = color;
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        arrow.material = mat;

        if (playerNode) {
            root.parent = playerNode;
        }
        return root;
}

// Place les deux équipes en lignes pour l'intro de match
function placeTeamsForIntro(myTeam, opponentTeam) {
    const placeTeamLine = (team, side) => {
        if (!team || !team.players) return;

        const lineX = -5 * side; // proche de la ligne médiane côté équipe
        const baseZ = -12;
        const spacingZ = 6;

        team.players.forEach((p, index) => {
            if (!p || !p.position) return;

            p.position.x = lineX;
            p.position.y = 0;
            p.position.z = baseZ + spacingZ * index;

            if (p.model) {
                // Orientation vers le centre du terrain
                p.model.rotation.y = side === 1 ? Math.PI / 2 : -Math.PI / 2;
                p.model.rotation.z = 0;
            }
        });
    };

    // Équipe de gauche (side = 1) et de droite (side = -1)
    placeTeamLine(myTeam, 1);
    placeTeamLine(opponentTeam, -1);
}

const createScene = function (gameMode) {

    const mode = gameMode === "versus" ? "versus" : "tournament";

    // VARIABLES 
    let chargeStart = 0;
    let isCharging = false;

    const maxChargeTime = 1000; // 1 seconde max
    const maxForce = 25;

    const scene = new BABYLON.Scene(engine);


    if (window.matchAudio && typeof window.matchAudio.init === "function") {
        window.matchAudio.init(scene, {
            whistleUrl: "./assets/Sifflet.mp3",
            kickUrl: "./assets/Kick.mp3",
            goalUrl: "./assets/Goal.mp3",
            debug: true
        });
    }

    scene.collisionsEnabled = true;

    // Light (ambiance plus douce)
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.45;

    // --- Environnement (espace autour du stade) ---
    createEnvironment(scene); // Defined in js/structure/environnement.js

    // --- TOURNAMENT STATE ---
    const tournamentStage = currentTournamentStage;
    const isVersusMode = mode === "versus";

    // --- Structure ---

    createField(scene); 

    let tribune;
    switch(tournamentStage) {
        case "huitieme": tribune = new TribuneHuitieme(scene); break;
        case "quart": tribune = new TribuneQuart(scene); break;
        case "demi": tribune = new TribuneDemi(scene); break;
        case "finale": tribune = new TribuneFinale(scene); break;
        default: tribune = new TribuneHuitieme(scene); break;
    }
    tribune.create();

    
    // --- Objects ---
    const leftGoal = createGoal(scene, new BABYLON.Vector3(-50, 0, 0), Math.PI / 2);
    const rightGoal = createGoal(scene, new BABYLON.Vector3(50, 0, 0), -Math.PI / 2);

    // Liste des poteaux (pour les rebonds de la balle)
    const goalPosts = [
        leftGoal.leftPost,
        leftGoal.rightPost,
        rightGoal.leftPost,
        rightGoal.rightPost
    ];

    // Ball
    const ball = createBall(scene);
    ball.checkCollisions = true;
    ball.ellipsoid = new BABYLON.Vector3(0.55, 0.55, 0.55);

    ball.isOutAnimationPlaying = false;
    ball.outAnimationFinished = false;
    ball.outVelocity = new BABYLON.Vector3(0, 0, 0);
    ball.isOutOfPlay = false;
    ball.outTimer = 0;
    ball.outFallDelay = 0;

    ball.pushLockUntil = 0;
    ball.ignorePlayerCollisionUntil = 0;
    ball.lastKicker = null;
    ball.lastTouchTeam = null;

    ball.outDecision = null;
    ball.outExitPosition = null;

    ball.restartLocked = false;
    ball.restartTaker = null;

    // Panneaux de score 3D style stade
    createScoreboard3D(scene);

    // Jauge de tir
    const kickGauge = createKickGauge(scene);
    window.kickGauge = kickGauge;
    drawGaugeColors(kickGauge);

    const teams = setupTeams(scene, mode, tournamentStage);
    const myTeam = teams.myTeam;
    const scoreboardLabels = mode === "versus" ? getVersusScoreboardLabels() : { left: "YOU", right: "IA" };
    const versusTeamLabels = mode === "versus" ? getVersusTeamLabels() : null;

    if (window.gameScoreboard && typeof window.gameScoreboard.updateTeamLabels === "function") {
        window.gameScoreboard.updateTeamLabels(scoreboardLabels.left, scoreboardLabels.right);
    }

    if (window.scoreBoard3D && typeof window.scoreBoard3D.setTeamLabels === "function") {
        window.scoreBoard3D.setTeamLabels(scoreboardLabels.left, scoreboardLabels.right);
    }

    // Pour l'instant, le "joueur actif" est le premier attaquant (index 3)
    let activePlayer = myTeam.players[3]; 
    const basePlayer = activePlayer;
    myTeam.activePlayer = activePlayer;

    // Indicateur de sélection (flèche) au-dessus du joueur actif (J1)
    const selectionIndicator = createSelectionIndicator(scene, activePlayer, {
        suffix: "_p1",
        color: new BABYLON.Color3(1, 0.9, 0.2)
    });

    // Indicateur de sélection du joueur actif J2 (mode 1v1) : rouge
    let player2SelectionIndicator = null;

    const opponentTeam = teams.opponentTeam;
    if (isVersusMode) {
        opponentTeam.activePlayer = opponentTeam.players[3] || opponentTeam.players[0] || null;

        player2SelectionIndicator = createSelectionIndicator(scene, opponentTeam.activePlayer || null, {
            suffix: "_p2",
            color: new BABYLON.Color3(1, 0.2, 0.2)
        });
    }

    const tackleController = new TackleController();
    let player2Controller = null;


    const HALF_TIME_SECONDS = 20;
    const HALF_TIME_PAUSE_SECONDS = 10;

    const goalTimes = {
        player: [],
        opponent: []
    };

    const formatMatchClock = (totalSeconds) => {
        const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
        const minutes = Math.floor(safeSeconds / 60);
        const seconds = safeSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    let gameplayPaused = false;
    let preMatchIntroPlaying = true;

    const setGameplayPaused = (v) => {
        gameplayPaused = !!v;
    };

    const resetTeamStamina = (team) => {
        if (!team || !team.players) return;
        team.players.forEach(p => {
            if (!p) return;
            const max = p.maxStamina || 1;
            p.stamina = max;
        });
    };

    let matchFlow = null;

    // Cameras Setup (TPS et FPS gérées dans cameras.js)
    const cameras = setupCameras(scene, canvas, activePlayer);
    if (isVersusMode && cameras && cameras.broadcastCamera) {
        scene.activeCamera = cameras.broadcastCamera;
    }
    const cameraRuntime = (window.createCameraRuntimeController && typeof window.createCameraRuntimeController === "function")
        ? window.createCameraRuntimeController({ scene, cameras, myTeam, selectionIndicator, ball, tournamentStage })
        : null;

    // ── Exposition globale pour settings.js (pause + caméra) ──────
    window.setGameplayPaused  = setGameplayPaused;
    window.gameCameras        = cameras;
    window.gameScene          = scene;
    window.getActivePlayer    = () => activePlayer;
    window.cameraRuntime      = cameraRuntime;
    window.isIntroPlaying     = () => preMatchIntroPlaying;
    window.isVersusMode       = () => isVersusMode;
    window.isMatchEnded       = () => matchFlow && typeof matchFlow.getStage === "function" && matchFlow.getStage() === 3;

    const goalReplay = window.createGoalReplayController({
        scene,
        ball,
        myTeam,
        opponentTeam,
        cameras,
        maxReplayTimeMs: 5000,
        replayFrameStepMs: 1000 / 60,
        onReplayEnd: ({ playerScored, aiScored }) => {
            scene.stopAnimation(ball);
            ball.position = new BABYLON.Vector3(0, 0.65, 0);
            ball.rotation = new BABYLON.Vector3(0, 0, 0);

            if (ball.velocity) {
                ball.velocity.set(0, 0, 0);
            }

            if (playerScored) {
                window.gameScoreboard.playerScored();
                goalTimes.player.push(formatMatchClock(window.gameScoreboard?.matchTime));
            } else if (aiScored) {
                window.gameScoreboard.aiScored();
                goalTimes.opponent.push(formatMatchClock(window.gameScoreboard?.matchTime));
            }

            if (myTeam && myTeam.resetPositions) myTeam.resetPositions();
            if (opponentTeam && opponentTeam.resetPositions) opponentTeam.resetPositions();

            resetTeamStamina(myTeam);
            resetTeamStamina(opponentTeam);

            activePlayer = myTeam.players[3];
            myTeam.activePlayer = myTeam.players[3];

            if (selectionIndicator && activePlayer) {
                selectionIndicator.parent = activePlayer;
            }

            if (cameras?.fpvCamera) {
                cameras.fpvCamera.parent = activePlayer;
            }

            if (cameraRuntime && typeof cameraRuntime.syncTargetToActivePlayer === "function") {
                cameraRuntime.syncTargetToActivePlayer(activePlayer);
            } else if (cameras?.cameraTargetNode && activePlayer?.position) {
                cameras.cameraTargetNode.position.copyFrom(activePlayer.position);
            }

            if (window.matchAudio && typeof window.matchAudio.playWhistle === "function") {
                window.matchAudio.playWhistle();
            }
        }
    });
    window.goalReplayController = goalReplay;

    // Seance de tirs au but (declenchee automatiquement par matchFlow en cas de nul)
    if (window.createPenaltyShootout) {
        window.penaltyShootout = window.createPenaltyShootout({
            scene,
            ball,
            myTeam,
            opponentTeam,
            cameras,
            kickFn: kick,
            kickGauge,
            hideKickGauge,
            setGameplayPaused,
            onShootoutEnd: function (winner) {
                const matchEndOverlay = document.getElementById("match-end-overlay");
                const matchEndResultEl = document.getElementById("match-end-result");
                const matchEndScoreEl = document.getElementById("match-end-score");

                if (matchEndOverlay) {
                    matchEndOverlay.style.display = "block";
                    matchEndOverlay.classList.remove("match-end--you", "match-end--ai", "match-end--draw");
                }

                if (matchEndResultEl) {
                    matchEndResultEl.textContent =
                        winner === "player" ? "Victoire aux tirs au but !" :
                        winner === "ai" ? "Defaite aux tirs au but" :
                        "Egalite parfaite";
                }

                if (matchEndScoreEl && window.gameScoreboard && typeof window.gameScoreboard.getScorelineText === "function") {
                    matchEndScoreEl.textContent = window.gameScoreboard.getScorelineText();
                }

                if (matchEndOverlay) {
                    matchEndOverlay.classList.add(
                        winner === "player" ? "match-end--you" :
                        winner === "ai" ? "match-end--ai" :
                        "match-end--draw"
                    );
                }
            }
        });
    } else {
        window.penaltyShootout = null;
    }

    if (isVersusMode && window.Player2Controller) {
        player2Controller = new window.Player2Controller({
            scene,
            team: opponentTeam,
            opponentTeam: myTeam,
            ball,
            tackleController,
            // Bloque J2 uniquement pendant intro / pause / replay, pas pendant le jeu normal
            isBlocked: () => preMatchIntroPlaying || gameplayPaused || goalReplay.isReplayActive(),
            computeMoveAxes: (inputP2) => {
                if (cameraRuntime && typeof cameraRuntime.computeMoveAxes === "function") {
                    return cameraRuntime.computeMoveAxes(inputP2);
                }
                let mx = 0;
                let mz = 0;
                if (inputP2.forward) mx += 1;
                if (inputP2.backward) mx -= 1;
                if (inputP2.left) mz += 1;
                if (inputP2.right) mz -= 1;
                return { moveX: mx, moveZ: mz };
            },
            isMovementLocked: (player) => isRestartTaker(player),
            onShoot: ({ player, direction, force }) => {
                if (isRestartWaitingKick() && isRestartTaker(player)) {
                    takeRestartKick(ball, direction, force);
                } else {
                    kick(scene, ball, player, direction, force, opponentTeam);
                }
            }
        });
    }

    // Branche la gestion mi-temps / fin du match (affichage + pause/reprise)
    if (window.createMatchFlow) {
        const setActivePlayerFn = (p) => {
            activePlayer = p;
            myTeam.activePlayer = p;
            if (selectionIndicator && p) {
                selectionIndicator.parent = p;
            }
        };

        matchFlow = window.createMatchFlow({
            halfSeconds: HALF_TIME_SECONDS,
            halftimePauseSeconds: HALF_TIME_PAUSE_SECONDS,
            mode,
            tournamentStage,
            setGameplayPaused,
            myTeam,
            opponentTeam,
            cameras,
            ball,
            basePlayer,
            setActivePlayerFn,
            onContinueTournament: function () {
                const nextStage = getNextTournamentStage(currentTournamentStage);
                if (!nextStage) {
                    quitGame();
                    return;
                }
                currentTournamentStage = nextStage;
                startGame("tournament");
            },
            onQuitMatch: function () {
                quitGame();
            },
            saveScoreToDB: saveScoreToDB,
            getGoalTimeline: function () {
                return {
                    minuteButs: [...goalTimes.player],
                    minuteButsAdversaire: [...goalTimes.opponent]
                };
            },
            getTeamLabels: function () {
                return {
                    left: versusTeamLabels?.leftName || scoreboardLabels?.left || 'YOU',
                    right: versusTeamLabels?.rightName || scoreboardLabels?.right || 'IA'
                };
            }
        });
        activeMatchFlow = matchFlow;
    }

    // Input & Variables de base
    const input = {
        forward:false,
        backward:false,
        left:false,
        right:false,
        sprint:false
    };

    const inputController = window.createInputController({
        isBlocked: function () { return preMatchIntroPlaying; },
        onPress: function (action, event) {
            if (action === "forward") input.forward = true;
            if (action === "backward") input.backward = true;
            if (action === "left") input.left = true;
            if (action === "right") input.right = true;
            if (action === "sprint") input.sprint = true;

            if (action === "shoot" && !isCharging) {
                chargeStart = Date.now();
                isCharging = true;
            }

            if (action === "switchLeft") {
                if (isRestartWaitingKick()) return;

                const p = myTeam.getPlayerOnSide("left");
                myTeam.switchPlayerSmooth(p, cameras, scene, 180);
                activePlayer = myTeam.activePlayer;
                if (selectionIndicator && activePlayer) {
                    selectionIndicator.parent = activePlayer;
                }
            }

            if (action === "switchRight") {
                if (isRestartWaitingKick()) return;

                const p = myTeam.getPlayerOnSide("right");
                myTeam.switchPlayerSmooth(p, cameras, scene, 180);
                activePlayer = myTeam.activePlayer;
                if (selectionIndicator && activePlayer) {
                    selectionIndicator.parent = activePlayer;
                }
            }

            if (action === "tackle") {
                const binds = window.inputBindings ? window.inputBindings.getBindings() : {};
                tackleController.handleKeyDown(event, {
                    activePlayer,
                    playerFacing,
                    ball,
                    opponentTeam,
                    team: myTeam,
                    tackleKey: binds.tackle
                });
            }
        },
        onRelease: function (action, event) {
            if (action === "forward") input.forward = false;
            if (action === "backward") input.backward = false;
            if (action === "left") input.left = false;
            if (action === "right") input.right = false;
            if (action === "sprint") input.sprint = false;

            if (action === "shoot" && isCharging) {
                const force = computeKickPower(kickGauge);

                hideKickGauge(kickGauge);

                if (window.penaltyShootout && window.penaltyShootout.isActive()) {
                    window.penaltyShootout.handlePlayerRelease(force, lastDirection);
                    isCharging = false;
                    return;
                }

                if (isRestartWaitingKick()) {
                    takeRestartKick(ball, lastDirection, force);
                } else {
                    kick(scene, ball, activePlayer, lastDirection, force, myTeam);
                }

                isCharging = false;
            }
        }
    });

    // Vitesse de marche de base
    const baseSpeed = 0.07;
    // Multiplicateur de sprint (un peu plus rapide aussi)
    const SPRINT_MULTIPLIER = 1.8;
    const STAMINA_DRAIN_RATE = 0.35; // par seconde en sprint
    const STAMINA_REGEN_RATE = 0.25; // par seconde en marche/repos

    let lastDirection = new BABYLON.Vector3(1,0,0);
    let playerFacing = new BABYLON.Vector3(1,0,0);

    let previousPlayerPosition = activePlayer.position.clone();
    let playerMoveVelocity = new BABYLON.Vector3(0, 0, 0);

    let lastKickTime = 0;
    const kickCooldown = 300;

    let goalEmergencyUntil = 0;
    let lastGoalEmergencySwitch = 0;

    function getTeamGoalkeeper(team) {
        return team?.players?.find(p => p && p.role === "GK") || null;
    }

    function getClosestPlayerFromTeamToBall(team, ball) {
        if (!team?.players || !ball?.position) return null;

        let closest = null;
        let bestDist = Infinity;

        team.players.forEach(player => {
            if (!player || !player.position) return;

            const dist = BABYLON.Vector3.Distance(player.position, ball.position);
            if (dist < bestDist) {
                bestDist = dist;
                closest = player;
            }
        });

        return closest;
    }

    function switchInstantToGoalkeeper() {
        const gk = getTeamGoalkeeper(myTeam);
        if (!gk) return false;

        if (myTeam.activePlayer !== gk) {
            myTeam.switchPlayer(gk, cameras);

            if (cameras?.cameraTargetNode) {
                cameras.cameraTargetNode.position.copyFrom(gk.position);
            }

            if (selectionIndicator) {
                selectionIndicator.parent = gk;
            }
        }

        activePlayer = myTeam.activePlayer;

        if (cameraRuntime && typeof cameraRuntime.syncTargetToActivePlayer === "function") {
            cameraRuntime.syncTargetToActivePlayer(gk);
        }

        myTeam.lockAutoSwitch(900);
        myTeam.goalEmergencyModeUntil = performance.now() + 1400;
        goalEmergencyUntil = performance.now() + 1400;
        lastGoalEmergencySwitch = performance.now();
        return true;
    }

    function isDangerOnMyGoal() {
        const gk = getTeamGoalkeeper(myTeam);
        if (!gk || !ball?.position) return false;

        const myGoalX = gk.homePosition ? gk.homePosition.x : gk.position.x;
        const isLeftGoal = myGoalX < 0;

        const boxDepth = 18;
        const boxHalfWidth = 16;
        const warningLine = 26;

        const inMyBox = isLeftGoal
            ? (ball.position.x <= myGoalX + boxDepth && Math.abs(ball.position.z) <= boxHalfWidth)
            : (ball.position.x >= myGoalX - boxDepth && Math.abs(ball.position.z) <= boxHalfWidth);

        const inDangerZone = isLeftGoal
            ? ball.position.x <= warningLine * -1
            : ball.position.x >= warningLine;

        let ballTowardGoal = false;
        if (ball.velocity) {
            const vx = ball.velocity.x || 0;
            ballTowardGoal = isLeftGoal ? vx < -0.08 : vx > 0.08;
        }

        const closestOpponent = getClosestPlayerFromTeamToBall(opponentTeam, ball);
        const closestMate = getClosestPlayerFromTeamToBall(myTeam, ball);

        const oppDist = closestOpponent
            ? BABYLON.Vector3.Distance(closestOpponent.position, ball.position)
            : Infinity;

        const mateDist = closestMate
            ? BABYLON.Vector3.Distance(closestMate.position, ball.position)
            : Infinity;

        const opponentLikelyHasBall =
            ball.lastTouchTeam === opponentTeam ||
            oppDist < 3.2 ||
            oppDist + 0.8 < mateDist;

        const shooterNearBall =
            closestOpponent &&
            closestOpponent.position &&
            BABYLON.Vector3.Distance(closestOpponent.position, ball.position) < 4.5;

        const activeFarFromGK =
            myTeam.activePlayer &&
            myTeam.activePlayer !== gk &&
            BABYLON.Vector3.Distance(myTeam.activePlayer.position, gk.position) > 14;

        // déclenchement fort = dans la surface
        if (inMyBox && opponentLikelyHasBall && activeFarFromGK) {
            return true;
        }

        // déclenchement moyen = l'action avance vers le but + l'adversaire contrôle
        if (inDangerZone && opponentLikelyHasBall && ballTowardGoal && activeFarFromGK) {
            return true;
        }

        // déclenchement anticipation tir
        if (inDangerZone && shooterNearBall && opponentLikelyHasBall && activeFarFromGK) {
            return true;
        }

        return false;
    }

    function handleGoalEmergencySwitch() {
        const now = performance.now();
        const gk = getTeamGoalkeeper(myTeam);

        if (isRestartWaitingKick()) return false;

        // Si on est déjà en mode urgence GK
        if (gk && myTeam.activePlayer === gk) {
            if (shouldKeepGoalkeeperEmergency()) {
                myTeam.goalEmergencyModeUntil = now + 200;
                goalEmergencyUntil = now + 200;
                return true;
            }

            // danger terminé -> on libère le mode urgence
            myTeam.goalEmergencyModeUntil = 0;
            goalEmergencyUntil = 0;
            return false;
        }

        if (now < goalEmergencyUntil) return true;
        if (now - lastGoalEmergencySwitch < 500) return false;

        if (isDangerOnMyGoal()) {
            return switchInstantToGoalkeeper();
        }

        return false;
    }

    function shouldKeepGoalkeeperEmergency() {
        const gk = getTeamGoalkeeper(myTeam);
        if (!gk || !ball?.position) return false;
        if (myTeam.activePlayer !== gk) return false;

        const myGoalX = gk.homePosition ? gk.homePosition.x : gk.position.x;
        const isLeftGoal = myGoalX < 0;

        const boxDepth = 20;
        const boxHalfWidth = 18;
        const warningLine = 30;

        const inMyBox = isLeftGoal
            ? (ball.position.x <= myGoalX + boxDepth && Math.abs(ball.position.z) <= boxHalfWidth)
            : (ball.position.x >= myGoalX - boxDepth && Math.abs(ball.position.z) <= boxHalfWidth);

        const inDangerZone = isLeftGoal
            ? ball.position.x <= -warningLine
            : ball.position.x >= warningLine;

        const closestOpponent = getClosestPlayerFromTeamToBall(opponentTeam, ball);
        const closestMate = getClosestPlayerFromTeamToBall(myTeam, ball);

        const oppDist = closestOpponent
            ? BABYLON.Vector3.Distance(closestOpponent.position, ball.position)
            : Infinity;

        const mateDist = closestMate
            ? BABYLON.Vector3.Distance(closestMate.position, ball.position)
            : Infinity;

        const opponentStillThreatening =
            ball.lastTouchTeam === opponentTeam ||
            oppDist < 3.2 ||
            oppDist + 0.8 < mateDist;

        let ballTowardGoal = false;
        if (ball.velocity) {
            const vx = ball.velocity.x || 0;
            ballTowardGoal = isLeftGoal ? vx < -0.05 : vx > 0.05;
        }

        return (inMyBox && opponentStillThreatening) || (inDangerZone && (opponentStillThreatening || ballTowardGoal));
    }

    
    scene.onBeforeRenderObservable.add(()=>{
        // ── GESTION DU SKIP MANETTE AVEC PRIORITÉ HAUTE ──
        const gpSkip = getActiveGamepad();
        if (gpSkip && gpSkip.buttons) {
            const gamepadBinds = window.inputBindings && typeof window.inputBindings.getGamepadBindings === "function"
                ? window.inputBindings.getGamepadBindings()
                : { shoot: 0, options: 9 };
            const shootPressed = !!(gpSkip.buttons[gamepadBinds.shoot] && gpSkip.buttons[gamepadBinds.shoot].pressed);
            const optionsPressed = !!(gpSkip.buttons[gamepadBinds.options] && gpSkip.buttons[gamepadBinds.options].pressed);
            const canSkip = shootPressed || optionsPressed;

            const replayActive = goalReplay && typeof goalReplay.isReplayActive === "function"
                ? goalReplay.isReplayActive()
                : false;

            if (preMatchIntroPlaying || replayActive) {
                if (canSkip && !gamepadState.lastSkipPressed) {
                    if (replayActive && typeof goalReplay.skipReplay === "function") {
                        goalReplay.skipReplay();
                    } else if (preMatchIntroPlaying && typeof window.skipPreMatchIntro === "function") {
                        window.skipPreMatchIntro();
                    }
                }
                gamepadState.lastSkipPressed = canSkip;
            }
        }

        if (preMatchIntroPlaying || gameplayPaused) {
            // On fige le gameplay à la mi-temps (10 secondes)
            return;
        }

        const now = performance.now();
        goalReplay.captureFrame(now);

        if (goalReplay.update(now)) {
            // Pendant l'intro replay et le replay lui-meme, on masque la jauge de tir.
            hideKickGauge(kickGauge);
            if (selectionIndicator) selectionIndicator.setEnabled(false);
            if (player2SelectionIndicator) player2SelectionIndicator.setEnabled(false);
            return;
        }

        let emergencyGoalSwitchTriggered = false;

        if (!isRestartWaitingKick()) {
            emergencyGoalSwitchTriggered = handleGoalEmergencySwitch();

            if (!emergencyGoalSwitchTriggered) {
                myTeam.autoSwitch(ball, cameras);
            }
        }

        activePlayer = myTeam.activePlayer;

        // Si l'auto-switch a changé de joueur actif, on recolle la flèche dessus
        if (selectionIndicator && activePlayer && selectionIndicator.parent !== activePlayer) {
            selectionIndicator.parent = activePlayer;
        }

        if (player2SelectionIndicator) {
            const p2Active = opponentTeam && opponentTeam.activePlayer ? opponentTeam.activePlayer : null;
            if (p2Active && player2SelectionIndicator.parent !== p2Active) {
                player2SelectionIndicator.parent = p2Active;
            }
        }

        if (isRestartWaitingKick() && restartState.position) {
            ball.position.x = restartState.position.x;
            ball.position.y = 0.75;
            ball.position.z = restartState.position.z;

            if (ball.velocity) {
                ball.velocity.set(0, 0, 0);
            }
        }

        if (isRestartWaitingKick()) {
            enforceRestartClearance(ball, myTeam, opponentTeam);
            applyRestartTeamSpacing(myTeam, 7.0);
            applyRestartTeamSpacing(opponentTeam, 7.0);
        }

        updateAIRestart(ball);

        if (cameraRuntime && typeof cameraRuntime.update === "function") {
            cameraRuntime.update(activePlayer, ball, playerMoveVelocity, gameplayPaused);
        } else {
            myTeam.players.forEach(player => {
                player.isInFpv = false;
            });

            if (scene.activeCamera === cameras.fpvCamera) {
                activePlayer.isInFpv = true;
            }

            if (selectionIndicator) {
                const showIndicator = scene.activeCamera !== cameras.fpvCamera;
                selectionIndicator.setEnabled(showIndicator);

                const staminaForIndicator = activePlayer.stamina ?? 1;
                const minScale = 0.25;
                const maxScale = 1.0;
                const s = minScale + (maxScale - minScale) * staminaForIndicator;
                selectionIndicator.scaling.y = s;
            }
        }

        // Indicateur J2 (mode 1v1) : visible hors FPV + jauge d'endurance rouge
        if (player2SelectionIndicator) {
            const p2Active = opponentTeam && opponentTeam.activePlayer ? opponentTeam.activePlayer : null;
            const showIndicator = scene.activeCamera !== cameras.fpvCamera && !!p2Active;
            player2SelectionIndicator.setEnabled(showIndicator);

            if (p2Active) {
                const staminaForIndicator = p2Active.stamina ?? 1;
                const minScale = 0.25;
                const maxScale = 1.0;
                const s = minScale + (maxScale - minScale) * staminaForIndicator;
                player2SelectionIndicator.scaling.y = s;
            }
        }

        myTeam.update(ball);
        // Met aussi à jour l'équipe adverse en 1v1 :
        // pour PlayerTeam, cela anime les coéquipiers non contrôlés via la logique Team.update().
        if (opponentTeam && typeof opponentTeam.update === "function") {
            opponentTeam.update(ball);
        }

        if (opponentTeam && opponentTeam.aiImplemented) {
            opponentTeam.players.forEach(bot => {
                if (!bot) return;

                tackleController.tryAITackle(
                    bot,
                    ball,
                    myTeam,
                    opponentTeam
                );
            });
        }

        tackleController.updateAITackle();

        // Applique l'etat "au sol" des joueurs tacles (stun temporaire)
        tackleController.updateStunnedPlayers(myTeam);
        tackleController.updateStunnedPlayers(opponentTeam);

        // COLLISIONS ENTRE JOUEURS (évite qu'ils se traversent)
        const PLAYER_RADIUS = 1.2;
        tackleController.beginFrame();

        if (opponentTeam) {
            // Joueurs de myTeam vs joueurs de opponentTeam
            myTeam.players.forEach(pA => {
                if (!pA) return;
                opponentTeam.players.forEach(pB => {
                    if (!pB) return;

                    if (tackleController.shouldIgnoreCollision(pA, pB)) {
                        tackleController.registerPotentialHit(pA, pB);
                        return;
                    }

                    resolvePlayerCollision(pA, pB, PLAYER_RADIUS, PLAYER_RADIUS);
                });
            });
            // Joueurs de la même équipe (myTeam)
            for (let i = 0; i < myTeam.players.length; i++) {
                for (let j = i + 1; j < myTeam.players.length; j++) {
                    if (tackleController.shouldIgnoreCollision(myTeam.players[i], myTeam.players[j])) {
                        continue;
                    }
                    resolvePlayerCollision(myTeam.players[i], myTeam.players[j], PLAYER_RADIUS, PLAYER_RADIUS);
                }
            }

            for (let i = 0; i < opponentTeam.players.length; i++) {
                for (let j = i + 1; j < opponentTeam.players.length; j++) {
                    if (tackleController.shouldIgnoreCollision(opponentTeam.players[i], opponentTeam.players[j])) {
                        continue;
                    }
                    resolvePlayerCollision(opponentTeam.players[i], opponentTeam.players[j], PLAYER_RADIUS, PLAYER_RADIUS);
                }
            }
        }

        tackleController.applyBallSteal(ball);
        tackleController.maintainBallControl(ball);
        
        const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);

        let moveX = 0;
        let moveZ = 0;

        const gp = getActiveGamepad();
        if (gp && gp.axes && gp.axes.length >= 2) {
            const gamepadBinds = window.inputBindings && typeof window.inputBindings.getGamepadBindings === "function"
                ? window.inputBindings.getGamepadBindings()
                : { shoot: 0, sprint: 7, tackle: 2, switchLeft: 4, switchRight: 5, options: 9 };
            // En FPV, le deplacement doit toujours rester sur le stick gauche.
            // Le stick droit est reserve a l'orientation de la camera.
            const stick = (scene.activeCamera === cameras.fpvCamera)
                ? { x: gp.axes[0] || 0, y: gp.axes[1] || 0 }
                : getPrimaryStick(gp.axes);
            const rawX = stick.x || 0;
            const rawY = stick.y || 0;
            const deadzone = 0.15;
            const stickX = Math.abs(rawX) > deadzone ? rawX : 0;
            const stickY = Math.abs(rawY) > deadzone ? rawY : 0;

            if (scene.activeCamera === cameras.broadcastCamera) {
                // Mapping manette broadcast = flèches écran
                // Stick X : gauche/droite écran | Stick Y : haut/bas écran
                const alpha = cameras.broadcastCamera.alpha;

                const screenRight = new BABYLON.Vector3(
                    Math.cos(alpha + Math.PI / 2),
                    0,
                    Math.sin(alpha + Math.PI / 2)
                );
                const screenUp = new BABYLON.Vector3(
                    -Math.cos(alpha),
                    0,
                    -Math.sin(alpha)
                );

                let h = stickX;   // droite écran
                let v = -stickY;  // haut écran

                // Fallback D-pad si stick neutre
                if (h === 0 && v === 0 && gp.buttons) {
                    if (gp.buttons[15] && gp.buttons[15].pressed) h += 1; // droite
                    if (gp.buttons[14] && gp.buttons[14].pressed) h -= 1; // gauche
                    if (gp.buttons[12] && gp.buttons[12].pressed) v += 1; // haut
                    if (gp.buttons[13] && gp.buttons[13].pressed) v -= 1; // bas
                }

                const moveVector = screenRight.scale(h).add(screenUp.scale(v));
                if (moveVector.lengthSquared() > 0) {
                    moveVector.normalize();
                    moveX = moveVector.x;
                    moveZ = moveVector.z;
                } else {
                    moveX = 0;
                    moveZ = 0;
                }
            } else if (scene.activeCamera === cameras.fpvCamera && cameras.fpvCamera) {
                const fpvForward = cameras.fpvCamera.getForwardRay().direction.clone();
                fpvForward.y = 0;

                if (fpvForward.lengthSquared() > 0.000001) {
                    fpvForward.normalize();
                }

                const fpvRight = new BABYLON.Vector3(fpvForward.z, 0, -fpvForward.x);
                if (fpvRight.lengthSquared() > 0.000001) {
                    fpvRight.normalize();
                }

                const h = stickX;
                const v = -stickY;
                const moveVector = fpvForward.scale(v).add(fpvRight.scale(h));

                if (moveVector.lengthSquared() > 0.000001) {
                    moveVector.normalize();
                    moveX = moveVector.x;
                    moveZ = moveVector.z;
                } else {
                    moveX = 0;
                    moveZ = 0;
                }
            } else {
                // Mapping standard hors broadcast
                // Stick Y -> avant/arriere (moveX), Stick X -> gauche/droite (moveZ)
                moveX = -stickY;
                moveZ = -stickX;

                if (moveX === 0 && moveZ === 0 && gp.buttons) {
                    if (gp.buttons[12] && gp.buttons[12].pressed) moveX += 1;
                    if (gp.buttons[13] && gp.buttons[13].pressed) moveX -= 1;
                    if (gp.buttons[14] && gp.buttons[14].pressed) moveZ += 1;
                    if (gp.buttons[15] && gp.buttons[15].pressed) moveZ -= 1;
                }
            }

            const sprintBtn = gp.buttons && gp.buttons[gamepadBinds.sprint];
            input.sprint = !!(sprintBtn && sprintBtn.pressed);

            if (isRestartWaitingKick()) {
                // Inversion locale: la direction de visee des remises suit le ressenti joueur.
                input.restartAimX = -moveX;
                input.restartAimZ = -moveZ;
            } else {
                input.restartAimX = 0;
                input.restartAimZ = 0;
            }

            const shootBtn = gp.buttons && gp.buttons[gamepadBinds.shoot];
            const shootPressed = !!(shootBtn && shootBtn.pressed);

            if (shootPressed && !gamepadState.lastShootPressed && !isCharging) {
                chargeStart = Date.now();
                isCharging = true;
            }
            if (!shootPressed && gamepadState.lastShootPressed && isCharging) {
                const force = computeKickPower(kickGauge);
                hideKickGauge(kickGauge);

                if (window.penaltyShootout && window.penaltyShootout.isActive()) {
                    window.penaltyShootout.handlePlayerRelease(force, lastDirection);
                    isCharging = false;
                } else if (isRestartWaitingKick()) {
                    takeRestartKick(ball, lastDirection, force);
                    isCharging = false;
                } else {
                    kick(scene, ball, activePlayer, lastDirection, force, myTeam);
                    isCharging = false;
                }
            }
            gamepadState.lastShootPressed = shootPressed;
            gamepadState.lastSkipPressed = false;

            const tackleBtn = gp.buttons && gp.buttons[gamepadBinds.tackle];
            const tacklePressed = !!(tackleBtn && tackleBtn.pressed);
            if (tacklePressed && !gamepadState.lastTacklePressed) {
                tackleController.handleKeyDown({ key: "gamepad", repeat: false }, {
                    activePlayer,
                    playerFacing,
                    ball,
                    opponentTeam,
                    team: myTeam,
                    tackleKey: "gamepad"
                });
            }
            gamepadState.lastTacklePressed = tacklePressed;

            const l1Btn = gp.buttons && gp.buttons[gamepadBinds.switchLeft];
            const l1Pressed = !!(l1Btn && l1Btn.pressed);
            if (l1Pressed && !gamepadState.lastL1Pressed) {
                if (!isRestartWaitingKick()) {
                    const p = myTeam.getPlayerOnSide("left");
                    myTeam.switchPlayerSmooth(p, cameras, scene, 180);
                    activePlayer = myTeam.activePlayer;
                    if (selectionIndicator && activePlayer) {
                        selectionIndicator.parent = activePlayer;
                    }
                }
            }
            gamepadState.lastL1Pressed = l1Pressed;

            const r1Btn = gp.buttons && gp.buttons[gamepadBinds.switchRight];
            const r1Pressed = !!(r1Btn && r1Btn.pressed);
            if (r1Pressed && !gamepadState.lastR1Pressed) {
                if (!isRestartWaitingKick()) {
                    const p = myTeam.getPlayerOnSide("right");
                    myTeam.switchPlayerSmooth(p, cameras, scene, 180);
                    activePlayer = myTeam.activePlayer;
                    if (selectionIndicator && activePlayer) {
                        selectionIndicator.parent = activePlayer;
                    }
                }
            }
            gamepadState.lastR1Pressed = r1Pressed;

            const optionsBtn = gp.buttons && gp.buttons[gamepadBinds.options];
            const optionsPressed = !!(optionsBtn && optionsBtn.pressed);
            if (optionsPressed && !gamepadState.lastOptionsPressed) {
                if (window.settingsMenu && typeof window.settingsMenu.open === "function") {
                    window.settingsMenu.open();
                }
            }
            gamepadState.lastOptionsPressed = optionsPressed;

            // Gestion caméra POV avec stick droit de la manette
            if (scene.activeCamera === cameras.fpvCamera && gp.axes && gp.axes.length >= 4) {
                const rightStickX = gp.axes[2] || 0;
                const rightStickY = gp.axes[3] || 0;
                const stickDeadzone = 0.15;
                
                // Tourner la tête avec le stick droit
                if (Math.abs(rightStickX) > stickDeadzone || Math.abs(rightStickY) > stickDeadzone) {
                    const fpv = cameras.fpvCamera;
                    const rotSpeed = 0.04;  // Sensibilité de rotation
                    
                    // Écrire directement à la rotation globale de la caméra (qui est parented au joueur)
                    // Pour un UniversalCamera parenté, on ajuste la rotation de la caméra relativement
                    const x = Math.abs(rightStickX) > stickDeadzone ? rightStickX : 0;
                    const y = Math.abs(rightStickY) > stickDeadzone ? rightStickY : 0;
                    
                    // Rotation horizontale (yaw) - rotation autour de l'axe Y global
                    fpv.rotation.y += x * rotSpeed;
                    
                    // Rotation verticale (pitch) - limiter pour éviter de se retourner
                    fpv.rotation.x -= y * rotSpeed;
                    fpv.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, fpv.rotation.x));
                }
            }
        } else if (cameraRuntime && typeof cameraRuntime.computeMoveAxes === "function") {
            const move = cameraRuntime.computeMoveAxes(input);
            moveX = move.moveX;
            moveZ = move.moveZ;
        }

        const movementState = updatePlayerMovement(activePlayer, input, moveX, moveZ, dt, {
            baseSpeed,
            sprintMultiplier: SPRINT_MULTIPLIER,
            staminaDrainRate: STAMINA_DRAIN_RATE,
            staminaRegenRate: STAMINA_REGEN_RATE,
            tackleController,
            restartState,
            isRestartTaker,
            sanitizeRestartDirection,
            getDefaultRestartDirection,
            lastDirection,
            playerFacing,
            previousPlayerPosition
        });

        const movement = movementState.movement;
        const restartTakerLocked = movementState.restartTakerLocked;
        lastDirection = movementState.lastDirection;
        playerFacing = movementState.playerFacing;
        playerMoveVelocity = movementState.playerMoveVelocity;
        previousPlayerPosition = movementState.previousPlayerPosition;

        const controlledPlayer = movement.controlledPlayer;

        // COLLISION JOUEUR HUMAIN (J1) → BALLE
        checkBallCollision(controlledPlayer, ball, playerFacing, myTeam, playerMoveVelocity, input.sprint);
        tryStealBall(controlledPlayer, ball, myTeam);

        // COLLISION JOUEUR HUMAIN (J2 en mode 1v1) → BALLE
        if (player2Controller) {
            const p2State = player2Controller.update({
                dt,
                baseSpeed,
                sprintMultiplier: SPRINT_MULTIPLIER,
                staminaDrainRate: STAMINA_DRAIN_RATE,
                staminaRegenRate: STAMINA_REGEN_RATE,
                computeMoveAxes: cameraRuntime && typeof cameraRuntime.computeMoveAxes === "function"
                    ? (inputP2) => cameraRuntime.computeMoveAxes(inputP2)
                    : null
            });

            if (p2State && p2State.controlledPlayer) {
                checkBallCollision(
                    p2State.controlledPlayer,
                    ball,
                    p2State.playerFacing,
                    opponentTeam,
                    p2State.playerMoveVelocity,
                    p2State.isSprinting
                );
                tryStealBall(p2State.controlledPlayer, ball, opponentTeam);
            }
        }
        
        // Si la balle sort du terrain, on lance l'animation de chute
        if (
            ball &&
            ball.position &&
            !ball.isOutAnimationPlaying &&
            !ball.isOutOfPlay &&
            isBallOutOfBounds(ball)
        ) {
            ball.outExitPosition = ball.position.clone();
            ball.outDecision = getRestartDecision(ball, myTeam, opponentTeam);

            startBallOutAnimation(ball);
        }

        // COLLISION JOUEURS IA → BALLE (uniquement si le comportement IA est implémenté)
        if (opponentTeam && opponentTeam.aiImplemented && !isRestartWaitingKick()) {
        const aiGK = opponentTeam.players.find(p => p && p.role === "GK");

        const reserveBallForGK =
            !!aiGK &&
            opponentTeam.goalkeeperClaiming &&
            opponentTeam.isInOwnBox &&
            opponentTeam.isInOwnBox(ball.position) &&
            BABYLON.Vector3.Distance(aiGK.position, ball.position) < 10;

            opponentTeam.players.forEach(bot => {
                if (!bot) return;

                // IMPORTANT :
                // si la balle est réservée au GK dans sa surface,
                // les autres joueurs n'ont plus le droit d'interagir avec elle
                if (reserveBallForGK && bot.role !== "GK") {
                    return;
                }

                tryStealBall(bot, ball, opponentTeam);

                const toBall = ball.position.subtract(bot.position);
                if (toBall.lengthSquared() === 0) return;
                toBall.y = 0;

                let dir = null;

                if (bot.facingDirection && bot.facingDirection.lengthSquared() > 0.0001) {
                    dir = bot.facingDirection.clone();
                    dir.y = 0;
                    dir.normalize();
                } else {
                    const fallback = ball.position.subtract(bot.position);
                    fallback.y = 0;

                    if (fallback.lengthSquared() > 0.0001) {
                        fallback.normalize();
                        dir = fallback;
                    } else {
                        dir = new BABYLON.Vector3(-1, 0, 0);
                    }
                }

                const botIsSprinting = false;
                checkBallCollision(bot, ball, dir, opponentTeam, null, botIsSprinting);
            });
        }

        // UPDATE JAUGE
        const humanCharging = isCharging;
        const aiRestartCharging = isRestartWaitingKick() && restartState.aiCharging && restartState.taker;
        const aiCharging = opponentTeam && opponentTeam.aiShotCharging;

        if (humanCharging) {
            const time = performance.now() / 1000;

            updateKickGauge(
                kickGauge,
                controlledPlayer,
                lastDirection,
                time
            );
        } else if (aiRestartCharging) {
            const time = performance.now() / 1000;

            updateKickGauge(
                kickGauge,
                restartState.taker,
                restartState.aiAimDirection || getDefaultRestartDirection(restartState),
                time
            );
        } else if (aiCharging && opponentTeam.aiShotCarrier && opponentTeam.aiShotDirection) {
            const time = performance.now() / 1000;

            updateKickGauge(
                kickGauge,
                opponentTeam.aiShotCarrier,
                opponentTeam.aiShotDirection,
                time
            );
        } else {
            hideKickGauge(kickGauge);
        }

        if (ball.isOutAnimationPlaying) {
            updateBallOutAnimation(ball, dt);
        } else if (!ball.isOutOfPlay) {
            const allPlayers = [...myTeam.players];
            if (opponentTeam) allPlayers.push(...opponentTeam.players);
            updateBallPhysics(ball, goalPosts, allPlayers, dt);
        }

        if (ball.outAnimationFinished && ball.outDecision) {
            startRestart(ball, ball.outDecision, myTeam, opponentTeam, cameras);
            ball.outAnimationFinished = false;
            ball.outDecision = null;
        }

        

        checkGoalScored(ball, leftGoal, rightGoal, goalReplay);

    });



    launchPreMatchIntro({
        scene,
        cameras,
        mode,
        tournamentStage,
        cameraRuntime,
        getActivePlayer: () => activePlayer,
        setIntroPlaying: (value) => { preMatchIntroPlaying = value; }
    });

    scene.onBeforeRenderObservable.add(() => {
        if (!goalReplay.isPlaying()) {
            // Le chrono est gelé pendant le replay du but.
            return;
        }

        const deltaSeconds = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
        window.gameScoreboard.updateTimer(deltaSeconds);

        // Gère la mi-temps + fin de match (dans js/ui/matchFlow.js)
        if (matchFlow) matchFlow.update();
    });

    scene.onDisposeObservable.add(() => {
        if (inputController && typeof inputController.dispose === "function") {
            inputController.dispose();
        }
    });

    return scene;
};

let gameStarted = false;
let activeScene = null;
let activeMatchFlow = null;
let renderLoopId = null;

function startGame(mode) {
    // Nettoyage préalable si un jeu est déjà en cours
    if (gameStarted) {
        quitGame();
    }

    const mainMenu = document.getElementById("main-menu");
    if (mainMenu) {
        mainMenu.classList.add("is-hidden");
        mainMenu.setAttribute("aria-hidden", "true");
    }

    setGameCanvasVisible(true);

    const matchHud = document.getElementById("match-hud");
    if (matchHud) matchHud.style.display = "flex";

    gameStarted = true;
    activeScene = createScene(mode);

    // Réinitialiser le scoreboard APRÈS createScene() pour avoir le canvas 3D
    if (window.gameScoreboard && typeof window.gameScoreboard.reset === "function") {
        window.gameScoreboard.reset();
    }

    // Arrêter l'ancienne boucle si elle existe
    if (renderLoopId !== null) {
        engine.stopRenderLoop();
    }

    // Démarrer une nouvelle boucle de rendu
    engine.runRenderLoop(function () {
        if (activeScene) activeScene.render();
    });
}

function quitGame() {
    // Arrêter la boucle de rendu
    engine.stopRenderLoop();
    renderLoopId = null;

    // Disposer de la scène Babylon
    if (activeScene) {
        activeScene.dispose();
        activeScene = null;
    }

    gameStarted = false;

    // Nettoyage complet du matchFlow
    if (activeMatchFlow) {
        if (typeof activeMatchFlow.cleanup === "function") {
            activeMatchFlow.cleanup();
        }
        activeMatchFlow = null;
    }
    window.selectedVersusStage = TOURNAMENT_STAGES[0];

    // Arrêter tous les sons en cours
    if (window.matchAudio && typeof window.matchAudio.stopAll === "function") {
        window.matchAudio.stopAll();
    }

    // Reset TOUS les globals de session de jeu
    window.goalReplayController = null;
    window.penaltyShootout = null;
    window.gameCameras = null;
    window.gameScene = null;
    window.cameraRuntime = null;
    window.setGameplayPaused = null;
    window.getActivePlayer = null;
    window.isIntroPlaying = null;
    window.isVersusMode = null;
    window.isMatchEnded = null;
    window.scoreBoard3D = null;

    // Masquer le canvas
    setGameCanvasVisible(false);

    // Masquer TOUS les overlays de jeu (utiliser style.display)
    const elementIds = [
        "match-hud",
        "halftime-overlay",
        "match-end-overlay",
        "penalty-overlay",
        "penalty-result-overlay",
        "pre-match-tournament-overlay",
        "replay-skip-btn"
    ];

    elementIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });

    // Masquer settings overlay
    const settingsOverlay = document.getElementById("settings-overlay");
    if (settingsOverlay) {
        settingsOverlay.setAttribute("aria-hidden", "true");
    }

    // Afficher le menu principal
    const mainMenu = document.getElementById("main-menu");
    if (mainMenu) {
        mainMenu.classList.remove("is-hidden");
        mainMenu.setAttribute("aria-hidden", "false");
    }
}

window.startTournamentMatch = function () {
    currentTournamentStage = TOURNAMENT_STAGES[0];
    startGame("tournament");
};

window.startVersusMatch = function (selectedStage) {
    const stage = TOURNAMENT_STAGES.includes(selectedStage)
        ? selectedStage
        : (TOURNAMENT_STAGES.includes(window.selectedVersusStage) ? window.selectedVersusStage : TOURNAMENT_STAGES[0]);
    currentTournamentStage = stage;
    window.selectedVersusStage = stage;
    startGame("versus");
};

window.quitGame = quitGame;

window.addEventListener("resize", function () {
    engine.resize();
});

    