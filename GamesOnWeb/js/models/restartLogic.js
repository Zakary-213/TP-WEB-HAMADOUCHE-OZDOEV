const restartState = {
    active: false,
    type: null,
    team: null,
    taker: null,
    side: null,
    position: null,
    exitPosition: null,
    waitingForKick: false,
    aiKickTime: 0,

    cornerHalf: null,

    aiCharging: false,
    aiChargeStart: 0,
    aiAimDirection: null,

    phase: "idle" // idle | setup | aiming | kicked
};

function resetRestartState() {
    restartState.active = false;
    restartState.type = null;
    restartState.team = null;
    restartState.taker = null;
    restartState.side = null;
    restartState.position = null;
    restartState.exitPosition = null;
    restartState.waitingForKick = false;
    restartState.aiKickTime = 0;
    restartState.cornerHalf = null;
    restartState.aiCharging = false;
    restartState.aiChargeStart = 0;
    restartState.aiAimDirection = null;
    restartState.phase = "idle";
}

function isRestartActive() {
    return restartState.active;
}

function isRestartWaitingKick() {
    return restartState.active && restartState.waitingForKick;
}

function isRestartTaker(player) {
    return (
        restartState.active &&
        restartState.waitingForKick &&
        restartState.taker === player
    );
}

function isRestartForTeam(team) {
    return isRestartWaitingKick() && restartState.team === team;
}

function isRestartAgainstTeam(team) {
    return isRestartWaitingKick() && restartState.team && restartState.team !== team;
}

function getRestartDecision(ball, myTeam, opponentTeam) {
    if (!ball || !ball.position) return null;

    const exitPos = ball.outExitPosition ? ball.outExitPosition.clone() : ball.position.clone();
    const x = exitPos.x;
    const z = exitPos.z;

    const lastTeam = ball.lastTouchTeam || null;

    let minX = -49;
    let maxX = 49;
    const minZ = -29;
    const maxZ = 29;

    const inGoalWidth = z > -7.5 && z < 7.5;
    if (inGoalWidth) {
        minX = -54;
        maxX = 54;
    }

    if (z < minZ) {
        return {
            type: "throwIn",
            side: "top",
            team: lastTeam === myTeam ? opponentTeam : myTeam,
            exitPosition: exitPos
        };
    }

    if (z > maxZ) {
        return {
            type: "throwIn",
            side: "bottom",
            team: lastTeam === myTeam ? opponentTeam : myTeam,
            exitPosition: exitPos
        };
    }

    if (x < minX) {
        if (lastTeam === myTeam) {
            return {
                type: "corner",
                side: "left",
                team: opponentTeam,
                exitPosition: exitPos
            };
        }

        return {
            type: "goalKick",
            side: "left",
            team: myTeam,
            exitPosition: exitPos
        };
    }

    if (x > maxX) {
        if (lastTeam === opponentTeam) {
            return {
                type: "corner",
                side: "right",
                team: myTeam,
                exitPosition: exitPos
            };
        }

        return {
            type: "goalKick",
            side: "right",
            team: opponentTeam,
            exitPosition: exitPos
        };
    }

    return null;
}

function startRestart(ball, decision, myTeam, opponentTeam, cameras) {
    if (!ball || !decision) return;

    resetBallOutState(ball);

    if (!ball.velocity) {
        ball.velocity = new BABYLON.Vector3(0, 0, 0);
    }
    ball.velocity.set(0, 0, 0);

    restartState.active = true;
    restartState.type = decision.type;
    restartState.team = decision.team;
    restartState.side = decision.side;
    restartState.exitPosition = decision.exitPosition ? decision.exitPosition.clone() : ball.position.clone();
    restartState.waitingForKick = true;
    restartState.phase = "setup";

    ball.restartLocked = true;
    ball.restartTaker = null;

    if (decision.type === "throwIn") {
        placeThrowIn(ball, decision, myTeam, opponentTeam, cameras);
    } else if (decision.type === "corner") {
        placeCorner(ball, decision, myTeam, opponentTeam, cameras);
    } else if (decision.type === "goalKick") {
        placeGoalKick(ball, decision, myTeam, opponentTeam, cameras);
    }

    if (decision.team && !decision.team.isPlayerControlled) {
        restartState.aiKickTime = performance.now() + 500;
    }
}

function placeThrowIn(ball, decision, myTeam, opponentTeam, cameras) {
    const restartTeam = decision.team;
    if (!restartTeam) return;

    const exitPos = decision.exitPosition || ball.position;
    const x = BABYLON.Scalar.Clamp(exitPos.x, -45, 45);

    let playerZ;
    let ballZ;

    if (decision.side === "top") {
        playerZ = -29.0;
        ballZ = -27.8;
    } else {
        playerZ = 29.0;
        ballZ = 27.8;
    }

    const taker = getClosestPlayerToPosition(restartTeam, new BABYLON.Vector3(x, 0, playerZ), false);
    if (!taker) return;

    taker.position.x = x;
    taker.position.z = playerZ;

    ball.position.x = x;
    ball.position.y = 0.75;
    ball.position.z = ballZ;

    orientPlayerTowardBall(taker, ball);

    restartState.taker = taker;
    restartState.position = ball.position.clone();

    ball.restartTaker = taker;

    setRestartActivePlayer(restartTeam, taker, cameras);

    if (restartTeam.lockAutoSwitch) restartTeam.lockAutoSwitch(1200);
    if (restartTeam.lockTeamPossession) restartTeam.lockTeamPossession(1200);
}

function placeCorner(ball, decision, myTeam, opponentTeam, cameras) {
    const restartTeam = decision.team;
    if (!restartTeam) return;

    const exitPos = decision.exitPosition || ball.position;

    let takerX, ballX;
    let takerZ, ballZ;

    if (decision.side === "left") {
        takerX = -47.8;
        ballX = -48.8;
    } else {
        takerX = 47.8;
        ballX = 48.8;
    }

    const topCorner = exitPos.z < 0;

    if (topCorner) {
        takerZ = -28.6;
        ballZ = -27.8;
    } else {
        takerZ = 28.6;
        ballZ = 27.8;
    }

    const taker = getClosestPlayerToPosition(
        restartTeam,
        new BABYLON.Vector3(takerX, 0, takerZ),
        false
    );
    if (!taker) return;

    taker.position.x = takerX;
    taker.position.z = takerZ;

    ball.position.x = ballX;
    ball.position.y = 0.75;
    ball.position.z = ballZ;

    orientPlayerTowardBall(taker, ball);

    restartState.taker = taker;
    restartState.position = ball.position.clone();
    restartState.cornerHalf = topCorner ? "top" : "bottom";

    ball.restartTaker = taker;

    setRestartActivePlayer(restartTeam, taker, cameras);

    if (restartTeam.lockAutoSwitch) restartTeam.lockAutoSwitch(1200);
    if (restartTeam.lockTeamPossession) restartTeam.lockTeamPossession(1200);
}

function placeGoalKick(ball, decision, myTeam, opponentTeam, cameras) {
    const restartTeam = decision.team;
    if (!restartTeam) return;

    const goalkeeper = getGoalkeeper(restartTeam);
    if (!goalkeeper) return;

    let playerX, ballX;

    if (decision.side === "left") {
        playerX = -41.5;
        ballX = -40.0;
    } else {
        playerX = 41.5;
        ballX = 40.0;
    }

    const playerZ = 0;
    const ballZ = 0;

    goalkeeper.position.x = playerX;
    goalkeeper.position.z = playerZ;

    ball.position.x = ballX;
    ball.position.y = 0.75;
    ball.position.z = ballZ;

    orientPlayerTowardBall(goalkeeper, ball);

    restartState.taker = goalkeeper;
    restartState.position = ball.position.clone();

    ball.restartTaker = goalkeeper;

    setRestartActivePlayer(restartTeam, goalkeeper, cameras);

    if (restartTeam.lockAutoSwitch) restartTeam.lockAutoSwitch(1200);
    if (restartTeam.lockTeamPossession) restartTeam.lockTeamPossession(1200);
}

function setRestartActivePlayer(team, taker, cameras) {
    if (!team || !taker) return;

    if (team.switchPlayerSmooth) {
        team.switchPlayerSmooth(taker, cameras, team.scene, 160);
    } else if (team.switchPlayer) {
        team.switchPlayer(taker, cameras);
    } else {
        team.activePlayer = taker;
    }
}

function getClosestPlayerToPosition(team, targetPos, excludeGK = false) {
    if (!team || !team.players || !targetPos) return null;

    let closest = null;
    let bestDist = Infinity;

    team.players.forEach(player => {
        if (!player || !player.position) return;
        if (excludeGK && player.role === "GK") return;

        const dist = BABYLON.Vector3.Distance(player.position, targetPos);
        if (dist < bestDist) {
            bestDist = dist;
            closest = player;
        }
    });

    return closest;
}

function getGoalkeeper(team) {
    if (!team || !team.players) return null;
    return team.players.find(player => player && player.role === "GK") || null;
}

function orientPlayerTowardBall(player, ball) {
    if (!player || !ball || !player.model) return;

    const dir = ball.position.subtract(player.position);
    dir.y = 0;

    if (dir.lengthSquared() === 0) return;

    dir.normalize();
    orientPlayerTowardDirection(player, dir);
}

function orientPlayerTowardDirection(player, dir) {
    if (!player || !dir) return;

    const flat = dir.clone();
    flat.y = 0;

    if (flat.lengthSquared() === 0) return;
    flat.normalize();

    player.facingDirection = flat.clone();

    if (player.model) {
        player.model.rotation.y = Math.atan2(flat.x, flat.z);
    }
}

function sanitizeRestartDirection(direction, state) {
    let dir = direction ? direction.clone() : BABYLON.Vector3.Zero();
    dir.y = 0;

    if (dir.lengthSquared() === 0) {
        dir = getDefaultRestartDirection(state);
    }

    if (state.type === "throwIn") {
        if (state.side === "top" && dir.z <= 0) dir.z = Math.abs(dir.z) || 0.35;
        if (state.side === "bottom" && dir.z >= 0) dir.z = -Math.abs(dir.z) || -0.35;
    }

    if (state.type === "corner") {
        const topHalf = state.cornerHalf === "top";

        if (state.side === "left" && dir.x <= 0) dir.x = Math.abs(dir.x) || 0.35;
        if (state.side === "right" && dir.x >= 0) dir.x = -Math.abs(dir.x) || -0.35;

        if (topHalf && dir.z <= 0) dir.z = Math.abs(dir.z) || 0.35;
        if (!topHalf && dir.z >= 0) dir.z = -Math.abs(dir.z) || -0.35;
    }

    if (state.type === "goalKick") {
        if (state.side === "left" && dir.x <= 0) dir.x = Math.abs(dir.x) || 0.4;
        if (state.side === "right" && dir.x >= 0) dir.x = -Math.abs(dir.x) || -0.4;
    }

    if (dir.lengthSquared() === 0) {
        dir = getDefaultRestartDirection(state);
    }

    dir.normalize();
    return dir;
}

function getDefaultRestartDirection(state) {
    if (!state) return new BABYLON.Vector3(1, 0, 0);

    if (state.type === "throwIn") {
        return state.side === "top"
            ? new BABYLON.Vector3(0.6, 0, 1)
            : new BABYLON.Vector3(0.6, 0, -1);
    }

    if (state.type === "corner") {
        const topHalf = state.cornerHalf === "top";

        if (state.side === "left") {
            return topHalf
                ? new BABYLON.Vector3(1, 0, 1)
                : new BABYLON.Vector3(1, 0, -1);
        } else {
            return topHalf
                ? new BABYLON.Vector3(-1, 0, 1)
                : new BABYLON.Vector3(-1, 0, -1);
        }
    }

    if (state.type === "goalKick") {
        return state.side === "left"
            ? new BABYLON.Vector3(1, 0, 0.15)
            : new BABYLON.Vector3(-1, 0, 0.15);
    }

    return new BABYLON.Vector3(1, 0, 0);
}

function getRestartClearanceRadius() {
    if (!isRestartWaitingKick()) return 0;
    return restartState.type === "goalKick" ? 7.0 : 4.5;
}

function getRestartSafeRadius() {
    if (!isRestartWaitingKick()) return 0;
    return restartState.type === "goalKick" ? 9.0 : 6.0;
}

function updateTeamForRestart(team, ball) {
    if (!isRestartWaitingKick() || !team || !team.players || !restartState.position) return false;

    const taker = restartState.taker;
    const ballPos = restartState.position.clone();
    const isTakerTeam = restartState.team === team;

    team.ballChaser = null;

    if ("aiControlledPlayer" in team) {
        team.aiControlledPlayer = taker;
    }
    if ("goalkeeperLocked" in team) {
        team.goalkeeperLocked = false;
    }
    if ("goalkeeperClaiming" in team) {
        team.goalkeeperClaiming = false;
    }
    if ("aiShotCharging" in team) {
        team.aiShotCharging = false;
        team.aiShotCarrier = null;
        team.aiShotDirection = null;
    }

    team.players.forEach(player => {
        if (!player) return;

        // tireur figé
        if (player === taker) {
            if (player.playAnimation) player.playAnimation("idle");
            return;
        }

        // joueur humain actif jamais piloté par l'IA
        if (team.isPlayerControlled && player === team.activePlayer) {
            return;
        }

        // GK ne monte pas sur touche / corner
        if (player.role === "GK" && restartState.type !== "goalKick") {
            const gkHold = player.homePosition.clone();
            team.movePlayerTowards(player, gkHold, 0.04);
            return;
        }

        let target;

        if (isTakerTeam) {
            target = getDynamicSupportTarget(team, player, ballPos);
        } else {
            target = getDynamicMarkingTarget(team, player, ballPos, restartState.team);
        }

        if (!target) return;

        target.x = Math.max(player.minX, Math.min(player.maxX, target.x));
        target.z = Math.max(player.minZ, Math.min(player.maxZ, target.z));

        const speed = isTakerTeam ? 0.075 : 0.05;
        team.movePlayerTowards(player, target, speed);
    });

    return true;
}

function scoreRestartPassTarget(team, taker, candidate, ball) {
    if (!team || !taker || !candidate || !candidate.position || !ball || !ball.position) return -Infinity;
    if (candidate === taker) return -Infinity;

    const toMate = candidate.position.subtract(ball.position);
    const dist = toMate.length();

    if (restartState.type === "throwIn" && (dist < 4 || dist > 20)) return -Infinity;
    if (restartState.type === "corner" && (dist < 4 || dist > 28)) return -Infinity;
    if (restartState.type === "goalKick" && (dist < 6 || dist > 34)) return -Infinity;

    let score = 100 - dist;

    if (candidate.role === "ATT") score += 8;
    if (candidate.role === "DEF") score += 4;

    if (restartState.type === "goalKick") {
        if (restartState.side === "left" && candidate.position.x > ball.position.x) score += 18;
        if (restartState.side === "right" && candidate.position.x < ball.position.x) score += 18;
    } else {
        if (restartState.side === "left" && candidate.position.x > ball.position.x) score += 8;
        if (restartState.side === "right" && candidate.position.x < ball.position.x) score += 8;
    }

    const opponents = team.opponents || [];
    opponents.forEach(op => {
        if (!op || !op.position) return;

        const d = BABYLON.Vector3.Distance(op.position, candidate.position);
        if (d < 10) {
            score -= (10 - d) * 5.5;
        }
    });

    const seg = candidate.position.subtract(ball.position);
    const segLenSq = seg.lengthSquared();

    if (segLenSq > 0.001) {
        opponents.forEach(op => {
            if (!op || !op.position) return;

            const ap = op.position.subtract(ball.position);
            const t = BABYLON.Scalar.Clamp(BABYLON.Vector3.Dot(ap, seg) / segLenSq, 0, 1);
            const proj = ball.position.add(seg.scale(t));
            const dLine = BABYLON.Vector3.Distance(op.position, proj);

            if (dLine < 2.2) {
                score -= (2.2 - dLine) * 25;
            }
        });
    }

    return score;
}

function findBestRestartPassTarget(team, taker, ball) {
    if (!team || !team.players) return null;

    let best = null;
    let bestScore = -Infinity;

    team.players.forEach(player => {
        if (!player || player === taker) return;

        const score = scoreRestartPassTarget(team, taker, player, ball);

        if (score > bestScore) {
            bestScore = score;
            best = player;
        }
    });

    return best;
}

function takeRestartKick(ball, direction, gaugeForce) {
    if (!ball || !restartState.active || !restartState.waitingForKick || !restartState.taker) {
        return;
    }

    const cleanDir = sanitizeRestartDirection(direction, restartState);

    if (!ball.velocity) {
        ball.velocity = new BABYLON.Vector3(0, 0, 0);
    }

    let force = gaugeForce;

    if (restartState.type === "throwIn") {
        if (gaugeForce <= 30) force = 30;
        else if (gaugeForce <= 45) force = 45;
        else force = 65;
    } else if (restartState.type === "corner") {
        if (gaugeForce <= 30) force = 30;
        else if (gaugeForce <= 45) force = 45;
        else force = 60;
    } else if (restartState.type === "goalKick") {
        if (gaugeForce <= 30) force = 32;
        else if (gaugeForce <= 45) force = 46;
        else force = 60;
    }

    ball.lastKicker = restartState.taker;
    ball.lastTouchTeam = restartState.team;

    ball.position.x += cleanDir.x * 0.9;
    ball.position.z += cleanDir.z * 0.9;

    ball.velocity = cleanDir.scale(force);

    if (window.matchAudio && typeof window.matchAudio.playKick === "function") {
        window.matchAudio.playKick();
    }

    restartState.phase = "kicked";
    if (restartState.team) {
        restartState.team.switchLockUntil = 0;
        restartState.team.teamPossessionLockUntil = performance.now() + 250;
    }
    endRestart(ball);
}

function endRestart(ball) {
    if (!ball) return;

    ball.restartLocked = false;
    ball.restartTaker = null;

    ball.pushLockUntil = performance.now() + 180;
    ball.ignorePlayerCollisionUntil = performance.now() + 180;

    resetRestartState();
}

function updateAIRestart(ball) {
    if (!isRestartWaitingKick()) return;
    if (!restartState.team || restartState.team.isPlayerControlled) return;
    if (!restartState.taker) return;

    const now = performance.now();
    if (now < restartState.aiKickTime) return;

    const taker = restartState.taker;
    const targetMate = findBestRestartPassTarget(restartState.team, taker, ball);

    let baseDir;
    if (targetMate) {
        baseDir = targetMate.position.subtract(ball.position);
        baseDir.y = 0;
    } else {
        baseDir = getDefaultRestartDirection(restartState);
    }

    if (baseDir.lengthSquared() === 0) {
        baseDir = getDefaultRestartDirection(restartState);
    }

    baseDir.normalize();

    if (!restartState.aiCharging) {
        restartState.aiCharging = true;
        restartState.aiChargeStart = now;
        restartState.phase = "aiming";
    }

    const t = (now - restartState.aiChargeStart) / 1000;
    const scan = Math.sin(t * 3.4) * 0.32;
    const cos = Math.cos(scan);
    const sin = Math.sin(scan);

    let scannedDir = new BABYLON.Vector3(
        baseDir.x * cos - baseDir.z * sin,
        0,
        baseDir.x * sin + baseDir.z * cos
    );

    scannedDir = sanitizeRestartDirection(scannedDir, restartState);
    restartState.aiAimDirection = scannedDir.clone();

    orientPlayerTowardDirection(taker, restartState.aiAimDirection);

    const chargeDuration = now - restartState.aiChargeStart;
    if (chargeDuration < 900) return;

    let fakeGaugeForce = 45;
    if (restartState.type === "corner") fakeGaugeForce = 60;
    if (restartState.type === "goalKick") fakeGaugeForce = 60;

    takeRestartKick(ball, restartState.aiAimDirection, fakeGaugeForce);
}

function enforceRestartClearance(ball, myTeam, opponentTeam) {
    if (!isRestartWaitingKick()) return;
    if (!restartState.taker || !ball || !ball.position) return;

    const radius = getRestartClearanceRadius();

    const allPlayers = [
        ...(myTeam?.players || []),
        ...(opponentTeam?.players || [])
    ];

    allPlayers.forEach(player => {
        if (!player || !player.position) return;
        if (player === restartState.taker) return;

        const dx = player.position.x - ball.position.x;
        const dz = player.position.z - ball.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < radius) {
            let nx = 0;
            let nz = 0;

            if (dist > 0.001) {
                nx = dx / dist;
                nz = dz / dist;
            } else {
                nx = player.side === 1 ? -1 : 1;
                nz = 0;
            }

            const push = radius - dist;
            player.position.x += nx * push;
            player.position.z += nz * push;
        }
    });
}

function spreadRestartTargets(targets, minSpacing = 5.5) {
    if (!targets || targets.length === 0) return targets;

    const result = targets.map(t => t.clone());

    for (let pass = 0; pass < 4; pass++) {
        for (let i = 0; i < result.length; i++) {
            for (let j = i + 1; j < result.length; j++) {
                const a = result[i];
                const b = result[j];

                const dx = b.x - a.x;
                const dz = b.z - a.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist < minSpacing) {
                    const nx = dist > 0.001 ? dx / dist : 0;
                    const nz = dist > 0.001 ? dz / dist : 1;

                    const push = (minSpacing - dist) * 0.5;

                    a.x -= nx * push;
                    a.z -= nz * push;

                    b.x += nx * push;
                    b.z += nz * push;
                }
            }
        }
    }

    return result;
}

function getDynamicSupportTarget(team, player, ballPos) {
    const t = performance.now() * 0.0012;
    const side = player.side || 1;

    // le GK ne monte jamais sur touche/corner
    if (player.role === "GK" && restartState.type !== "goalKick") {
        return player.homePosition.clone();
    }

    const fieldPlayers = team.players.filter(p => p && p.role !== "GK");
    const fieldIndex = Math.max(0, fieldPlayers.indexOf(player));

    let target = player.homePosition.clone();

    if (restartState.type === "throwIn") {
        // Répartition type :
        // 0 = solution courte haute
        // 1 = solution courte basse
        // 2 = solution intermédiaire au coeur du jeu
        // 3 = solution plus lointaine / opposée

        if (fieldIndex === 0) {
            target.x = ballPos.x + side * 8;
            target.z = ballPos.z - 10;
        }
        else if (fieldIndex === 1) {
            target.x = ballPos.x + side * 8;
            target.z = ballPos.z + 10;
        }
        else if (fieldIndex === 2) {
            // on garde une zone plus intérieure sur le terrain
            target.x = player.homePosition.x + side * 8;
            target.z = player.homePosition.z * 0.6;
        }
        else {
            // joueur plus loin, plus utile comme solution de renversement
            target.x = player.homePosition.x + side * 12;
            target.z = player.homePosition.z;
        }
    }

    if (restartState.type === "corner") {
        const inwardX = restartState.side === "left" ? 1 : -1;

        if (fieldIndex === 0) {
            target.x = ballPos.x + inwardX * 10;
            target.z = ballPos.z + (restartState.cornerHalf === "top" ? 8 : -8);
        }
        else if (fieldIndex === 1) {
            target.x = ballPos.x + inwardX * 16;
            target.z = restartState.cornerHalf === "top" ? -5 : 5;
        }
        else if (fieldIndex === 2) {
            target.x = player.homePosition.x + inwardX * 10;
            target.z = player.homePosition.z * 0.7;
        }
        else {
            target.x = player.homePosition.x;
            target.z = player.homePosition.z;
        }
    }

    if (restartState.type === "goalKick") {
        const dirX = restartState.side === "left" ? 1 : -1;

        if (player.role === "DEF") {
            target.x = player.homePosition.x + dirX * 8;
            target.z = player.homePosition.z < 0 ? -16 : 16;
        } else if (player.role === "ATT") {
            target.x = player.homePosition.x + dirX * 10;
            target.z = player.homePosition.z < 0 ? -8 : 8;
        }
    }

    // mouvement vivant autour de la zone choisie
    target.x += Math.sin(t + fieldIndex * 1.7) * 2.4;
    target.z += Math.cos(t * 1.15 + fieldIndex * 2.1) * 3.0;

    // sécurité autour du ballon seulement pour les solutions courtes
    if (restartState.type === "throwIn" && fieldIndex <= 1) {
        const dx = target.x - ballPos.x;
        const dz = target.z - ballPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const safeR = getRestartSafeRadius() + 1.0;

        if (dist < safeR) {
            const nx = dist > 0.001 ? dx / dist : side;
            const nz = dist > 0.001 ? dz / dist : (fieldIndex === 0 ? -1 : 1);
            target.x = ballPos.x + nx * safeR;
            target.z = ballPos.z + nz * safeR;
        }
    }

    target.x = Math.max(player.minX, Math.min(player.maxX, target.x));
    target.z = Math.max(player.minZ, Math.min(player.maxZ, target.z));

    return target;
}

function getDynamicMarkingTarget(team, player, ballPos, takerTeam) {
    if (!takerTeam || !takerTeam.players) {
        return player.homePosition.clone();
    }

    const taker = restartState.taker;

    const candidates = takerTeam.players.filter(p => {
        if (!p || !p.position) return false;
        if (p === taker) return false;
        if (restartState.type !== "goalKick" && p.role === "GK") return false;
        return true;
    });

    if (!candidates.length) {
        return player.homePosition.clone();
    }

    let bestTargetPlayer = null;
    let bestScore = Infinity;

    candidates.forEach(candidate => {
        const dist = BABYLON.Vector3.Distance(player.position, candidate.position);
        if (dist < bestScore) {
            bestScore = dist;
            bestTargetPlayer = candidate;
        }
    });

    if (!bestTargetPlayer) {
        return player.homePosition.clone();
    }

    const goalDir = restartState.side === "left"
        ? new BABYLON.Vector3(1, 0, 0)
        : new BABYLON.Vector3(-1, 0, 0);

    const desired = bestTargetPlayer.position.subtract(goalDir.scale(4.5));

    const tt = performance.now() * 0.001;
    desired.z += Math.sin(tt + player.homePosition.z * 0.15) * 1.8;

    const dx = desired.x - ballPos.x;
    const dz = desired.z - ballPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const safeR = getRestartSafeRadius() + 1.5;

    if (dist < safeR) {
        const nx = dist > 0.001 ? dx / dist : -player.side;
        const nz = dist > 0.001 ? dz / dist : (player.homePosition.z < 0 ? -1 : 1);
        desired.x = ballPos.x + nx * safeR;
        desired.z = ballPos.z + nz * safeR;
    }

    // latence de réaction = ils suivent moins parfaitement
    if (!player.restartLagTarget) {
        player.restartLagTarget = desired.clone();
    }

    player.restartLagTarget = BABYLON.Vector3.Lerp(
        player.restartLagTarget,
        desired,
        0.07
    );

    player.restartLagTarget.x = Math.max(player.minX, Math.min(player.maxX, player.restartLagTarget.x));
    player.restartLagTarget.z = Math.max(player.minZ, Math.min(player.maxZ, player.restartLagTarget.z));

    return player.restartLagTarget.clone();
}

function applyRestartTeamSpacing(team, minSpacing = 7.0) {
    if (!team || !team.players) return;

    for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < team.players.length; i++) {
            const a = team.players[i];
            if (!a || a === restartState.taker) continue;

            for (let j = i + 1; j < team.players.length; j++) {
                const b = team.players[j];
                if (!b || b === restartState.taker) continue;

                const dx = b.position.x - a.position.x;
                const dz = b.position.z - a.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist < minSpacing) {
                    const nx = dist > 0.001 ? dx / dist : 1;
                    const nz = dist > 0.001 ? dz / dist : 0;
                    const push = (minSpacing - dist) * 0.5;

                    a.position.x -= nx * push;
                    a.position.z -= nz * push;
                    b.position.x += nx * push;
                    b.position.z += nz * push;
                }
            }
        }
    }
}