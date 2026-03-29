const restartState = {
    active: false,
    type: null,
    team: null,
    taker: null,
    side: null,
    position: null,
    exitPosition: null,
    waitingForKick: false,
    aiKickTime: 0
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

    // TOUCHES
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

    // SORTIE DERRIÈRE LA LIGNE DE BUT GAUCHE
    if (x < minX) {
        // But côté gauche = défendu par myTeam
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

    // SORTIE DERRIÈRE LA LIGNE DE BUT DROITE
    if (x > maxX) {
        // But côté droit = défendu par opponentTeam
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
        restartState.aiKickTime = performance.now() + 900;
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

    // joueur le plus proche du point de remise
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

    // petit lock pour éviter autoswitch / possession parasite juste après placement
    if (restartTeam.lockAutoSwitch) restartTeam.lockAutoSwitch(900);
    if (restartTeam.lockTeamPossession) restartTeam.lockTeamPossession(900);
}

function placeCorner(ball, decision, myTeam, opponentTeam, cameras) {
    const restartTeam = decision.team;
    if (!restartTeam) return;

    const exitPos = decision.exitPosition || ball.position;

    let takerX, ballX;
    let takerZ, ballZ;

    // On place le joueur légèrement DANS le terrain
    // et la balle proche du point de corner mais jouable
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

    if (restartTeam.lockAutoSwitch) restartTeam.lockAutoSwitch(900);
    if (restartTeam.lockTeamPossession) restartTeam.lockTeamPossession(900);
}

function placeGoalKick(ball, decision, myTeam, opponentTeam, cameras) {
    const restartTeam = decision.team;
    if (!restartTeam) return;

    const goalkeeper = getGoalkeeper(restartTeam);
    if (!goalkeeper) return;

    let playerX, ballX;

    // Plus profond dans la surface, moins collé aux cages
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

    if (restartTeam.lockAutoSwitch) restartTeam.lockAutoSwitch(900);
    if (restartTeam.lockTeamPossession) restartTeam.lockTeamPossession(900);
}

function setRestartActivePlayer(team, taker, cameras) {
    if (!team || !taker) return;

    team.activePlayer = taker;

    if (team.switchPlayerSmooth) {
        team.switchPlayerSmooth(taker, cameras, team.scene, 160);
    } else if (team.switchPlayer) {
        team.switchPlayer(taker, cameras);
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

    // Tu pourras ajuster selon l’orientation native de ton modèle
    player.model.rotation.y = Math.atan2(dir.x, dir.z);
}

function sanitizeRestartDirection(direction, state) {
    let dir = direction ? direction.clone() : BABYLON.Vector3.Zero();
    dir.y = 0;

    if (dir.lengthSquared() === 0) {
        dir = getDefaultRestartDirection(state);
    }

    // TOUCHES
    if (state.type === "throwIn") {
        if (state.side === "top" && dir.z <= 0) {
            dir.z = Math.abs(dir.z) || 0.35;
        }
        if (state.side === "bottom" && dir.z >= 0) {
            dir.z = -Math.abs(dir.z) || -0.35;
        }
    }

    // CORNERS
    if (state.type === "corner") {
        const topHalf = state.cornerHalf === "top";

        if (state.side === "left" && dir.x <= 0) {
            dir.x = Math.abs(dir.x) || 0.35;
        }
        if (state.side === "right" && dir.x >= 0) {
            dir.x = -Math.abs(dir.x) || -0.35;
        }

        if (topHalf && dir.z <= 0) {
            dir.z = Math.abs(dir.z) || 0.35;
        }
        if (!topHalf && dir.z >= 0) {
            dir.z = -Math.abs(dir.z) || -0.35;
        }
    }

    // 6 MÈTRES
    if (state.type === "goalKick") {
        if (state.side === "left" && dir.x <= 0) {
            dir.x = Math.abs(dir.x) || 0.4;
        }
        if (state.side === "right" && dir.x >= 0) {
            dir.x = -Math.abs(dir.x) || -0.4;
        }
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

function takeRestartKick(ball, direction, gaugeForce) {
    if (!ball || !restartState.active || !restartState.waitingForKick || !restartState.taker) {
        return;
    }

    const cleanDir = sanitizeRestartDirection(direction, restartState);

    if (!ball.velocity) {
        ball.velocity = new BABYLON.Vector3(0, 0, 0);
    }

    let force = gaugeForce;

    // On adapte la jauge normale (30 / 45 / 60)
    // à des plages plus cohérentes selon la remise
    if (restartState.type === "throwIn") {
        if (gaugeForce <= 30) force = 30;
        else if (gaugeForce <= 45) force = 45;
        else force = 65;
    } 
    else if (restartState.type === "corner") {
        if (gaugeForce <= 30) force = 30;
        else if (gaugeForce <= 45) force = 45;
        else force = 60;
    } 
    else if (restartState.type === "goalKick") {
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

    endRestart(ball);
}

function endRestart(ball) {
    if (!ball) return;

    ball.restartLocked = false;
    ball.restartTaker = null;

    // petit buffer pour éviter qu’une collision instantanée recasse tout
    ball.pushLockUntil = performance.now() + 180;
    ball.ignorePlayerCollisionUntil = performance.now() + 180;

    resetRestartState();
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

function updateAIRestart(ball) {
    if (!isRestartWaitingKick()) return;
    if (!restartState.team || restartState.team.isPlayerControlled) return;
    if (!restartState.taker) return;

    const now = performance.now();
    if (now < restartState.aiKickTime) return;

    const taker = restartState.taker;
    const mates = restartState.team.players.filter(p => p && p !== taker);

    let targetMate = null;
    let bestScore = -Infinity;

    mates.forEach(p => {
        if (!p || !p.position) return;

        const toMate = p.position.subtract(ball.position);
        const dist = toMate.length();
        if (dist < 4 || dist > 30) return;

        let score = 100 - dist;

        // Bonus si le coéquipier est plutôt vers l'avant
        if (restartState.type === "goalKick") {
            if (restartState.side === "left" && p.position.x > ball.position.x) score += 25;
            if (restartState.side === "right" && p.position.x < ball.position.x) score += 25;
        }

        if (restartState.type === "throwIn" || restartState.type === "corner") {
            score += 10;
        }

        if (score > bestScore) {
            bestScore = score;
            targetMate = p;
        }
    });

    let dir;

    if (targetMate) {
        dir = targetMate.position.subtract(ball.position);
        dir.y = 0;
    } else {
        dir = getDefaultRestartDirection(restartState);
    }

    if (dir.lengthSquared() === 0) {
        dir = getDefaultRestartDirection(restartState);
    }

    dir.normalize();

    let fakeGaugeForce = 45;
    if (restartState.type === "throwIn") fakeGaugeForce = 45;
    if (restartState.type === "corner") fakeGaugeForce = 60;
    if (restartState.type === "goalKick") fakeGaugeForce = 60;

    takeRestartKick(ball, dir, fakeGaugeForce);
}

function enforceRestartClearance(ball, myTeam, opponentTeam) {
    if (!isRestartWaitingKick()) return;
    if (!restartState.taker || !ball || !ball.position) return;

    const radius = restartState.type === "goalKick" ? 7 : 4.2;

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
                // cas ultra rare : joueur exactement sur la balle
                nx = player.side === 1 ? -1 : 1;
                nz = 0;
            }

            const push = radius - dist;
            player.position.x += nx * push;
            player.position.z += nz * push;
        }
    });
}