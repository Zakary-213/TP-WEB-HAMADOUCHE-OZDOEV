function checkBallCollision(player, ball, playerFacing, team, playerMoveVelocity = null, isSprinting = false) {
    if (ball.isOutAnimationPlaying || ball.isOutOfPlay) return;

    if (ball.restartLocked) {
        ball.position.y = 0.75;
        return;
    }

    if (ball.pushLockUntil && performance.now() < ball.pushLockUntil) {
        ball.position.y = 0.75;
        return;
    }

    const distance = BABYLON.Vector3.Distance(player.position, ball.position);

    if (!ball.velocity) {
        ball.velocity = new BABYLON.Vector3(0, 0, 0);
    }

    if (distance < 2) {

        // joueur actif uniquement
        if (team && team.isPlayerControlled && player !== team.activePlayer) {
            return;
        }

        ball.lastKicker = player;
        ball.lastTouchTeam = team;

        const pushDir = new BABYLON.Vector3(playerFacing.x, 0, playerFacing.z);

        if (pushDir.lengthSquared() > 0) {
            pushDir.normalize();

            // MODE 1 : DRIBBLE (balle collée)
            if (!isSprinting) {

                // Position idéale juste devant le joueur
                const desiredPos = player.position.add(pushDir.scale(1.2));

                // interpolation douce → effet FIFA clean
                ball.position.x = BABYLON.Scalar.Lerp(ball.position.x, desiredPos.x, 0.5);
                ball.position.z = BABYLON.Scalar.Lerp(ball.position.z, desiredPos.z, 0.5);

                // IMPORTANT → on stop la vitesse sinon ça glisse
                ball.velocity.set(0, 0, 0);
            }

            //MODE 2 : SPRINT (poussée)
            else {

                let moveBoost = 0;

                if (playerMoveVelocity) {
                    const horizontalMove = new BABYLON.Vector3(
                        playerMoveVelocity.x,
                        0,
                        playerMoveVelocity.z
                    );

                    moveBoost = horizontalMove.length() * 18;
                }

                const basePushSpeed = 6;
                const targetSpeed = Math.min(basePushSpeed + moveBoost, 10);

                const desiredVelocity = pushDir.scale(targetSpeed);

                const smoothing = 0.25;

                ball.velocity.x = BABYLON.Scalar.Lerp(
                    ball.velocity.x,
                    desiredVelocity.x,
                    smoothing
                );

                ball.velocity.z = BABYLON.Scalar.Lerp(
                    ball.velocity.z,
                    desiredVelocity.z,
                    smoothing
                );
            }
        }
    }

    ball.position.y = 0.75;
}

function tryStealBall(defender, ball, team) {

    if (!ball || !ball.position) return;

    const carrier = ball.lastKicker;
    if (!carrier || carrier === defender) return;

    const dist = BABYLON.Vector3.Distance(defender.position, ball.position);

    if (dist > 2.2) return;

    // direction défenseur → balle
    const toBall = ball.position.subtract(defender.position);
    if (toBall.lengthSquared() === 0) return;

    const dirToBall = toBall.normalize();

    // direction du porteur
    const carrierDir = carrier.facingDirection || new BABYLON.Vector3(1, 0, 0);

    // angle entre défenseur et direction du porteur
    const dot = BABYLON.Vector3.Dot(dirToBall, carrierDir);

    // vitesse du défenseur (approx)
    let speedFactor = 0;
    if (defender._lastPosition) {
        const velocity = defender.position.subtract(defender._lastPosition);
        speedFactor = velocity.length();
    }

    defender._lastPosition = defender.position.clone();

    // conditions réalistes
    const isBehind = dot > 0.5;
    const isSideOrFront = dot < 0.3;

    if (isBehind) return;

    if (isSideOrFront || speedFactor > 0.05) {

        // transfert de possession
        ball.lastKicker = defender;
        ball.lastTouchTeam = team;

        // direction de vol de balle
        const stealDir = dirToBall.scale(6);

        ball.velocity.x = stealDir.x;
        ball.velocity.z = stealDir.z;

        // petit délai pour éviter re-collision immédiate
        ball.pushLockUntil = performance.now() + 150;
    }
}

function kick(scene, ball, player, lastDirection, force, team) {

    team.lastBallPlayer = player;
    team.lockAutoSwitch(500);
    team.lockTeamPossession(1550);

    ball.lastKicker = player;
    ball.lastTouchTeam = team;
    ball.pushLockUntil = performance.now() + 380;
    ball.ignorePlayerCollisionUntil = performance.now() + 380;
    
    const distance = BABYLON.Vector3.Distance(
        player.position,
        ball.position
    );

    if (distance > 3) {
        return;
    }

    // Direction horizontale normalisée du tir
    const dir = new BABYLON.Vector3(lastDirection.x, 0, lastDirection.z);
    if (dir.lengthSquared() === 0) {
        return;
    }
    const dirNorm = dir.normalize();

    // On utilise une physique simple : vitesse initiale proportionnelle à la force
    // L'unité correspond à des unités de terrain / seconde (le dt est géré dans script.js)
    const speed = force; // 8, 15 ou 25 selon la jauge

    if (!ball.velocity) {
        ball.velocity = new BABYLON.Vector3(0, 0, 0);
    }

    // On annule toute ancienne animation Babylon éventuellement en cours
    scene.stopAnimation(ball);

    // --- Animation procédurale de Frappe (Recul puis Frappe) ---
    if (player.model) {
        // Enregistrer la rotation de base
        const baseRotX = player.model.rotation.x; // Généralement -PI/2
        
        // Créer l'animation de recul (wind-up) puis de frappe (snap)
        const kickAnim = new BABYLON.Animation(
            "kickAnim",
            "rotation.x",
            60, // fps
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const keys = [];
        // Frame 0 : position de départ
        keys.push({ frame: 0, value: baseRotX });
        // Frame 15 : Le joueur se penche en arrière pour prendre de l'élan
        keys.push({ frame: 15, value: baseRotX - 0.5 });
        // Frame 25 : Le joueur frappe violemment vers l'avant
        keys.push({ frame: 25, value: baseRotX + 0.3 });
        // Frame 40 : Retour à la position initiale
        keys.push({ frame: 40, value: baseRotX });

        kickAnim.setKeys(keys);
        
        // Ajouter une fonction d'easing (élastique/rebond) pour rendre la frappe dynamique
        const easingFunction = new BABYLON.CubicEase();
        easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
        kickAnim.setEasingFunction(easingFunction);

        player.model.animations.push(kickAnim);

        // Lancer l'animation
        scene.beginDirectAnimation(player.model, [kickAnim], 0, 40, false, 1.5, () => {
            // Nettoyage une fois terminé
            player.model.animations = player.model.animations.filter(a => a.name !== "kickAnim");
        });

        // La balle part au moment de la frappe (vers la frame 20-25),
        // On met un petit délai de 200ms
        setTimeout(() => {
            resetBallOutState(ball);

            // Re-verrouille un tout petit peu la poussée au moment exact où la balle part
            ball.pushLockUntil = performance.now() + 220;
            ball.ignorePlayerCollisionUntil = performance.now() + 220;
            ball.lastKicker = player;
            ball.lastTouchTeam = team;

            // Petit décalage pour sortir la balle du corps du joueur
            ball.position.x += dirNorm.x * 1.2;
            ball.position.z += dirNorm.z * 1.2;

            ball.velocity = dirNorm.scale(speed);
        }, 200);

    } else {
        // Fallback si pas de modèle
        resetBallOutState(ball);

        ball.pushLockUntil = performance.now() + 220;
        ball.ignorePlayerCollisionUntil = performance.now() + 220;
        ball.lastKicker = player;
        ball.lastTouchTeam = team;

        ball.position.x += dirNorm.x * 1.2;
        ball.position.z += dirNorm.z * 1.2;

        ball.velocity = dirNorm.scale(speed);
    }
}

function createKickGauge(scene){

    const gauge = BABYLON.MeshBuilder.CreatePlane(
        "kickGauge",
        {width:3,height:0.6},
        scene
    );

    // orienter vers le sol
    gauge.rotation.x = Math.PI/2;

    const mat = new BABYLON.StandardMaterial("gaugeMat",scene);

    const texture = new BABYLON.DynamicTexture(
        "gaugeTexture",
        {width:256,height:64},
        scene
    );

    texture.hasAlpha = false;
    texture.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);
    mat.disableLighting = true;
    mat.emissiveTexture = texture;
    mat.backFaceCulling = false;

    gauge.material = mat;

    gauge.isVisible = false;

    const cursor = BABYLON.MeshBuilder.CreateBox(
        "cursor",
        {width:0.08,height:0.6,depth:0.1},
        scene
    );

    cursor.parent = gauge;

    gauge.cursor = cursor;
    gauge.texture = texture;

    gauge.renderingGroupId = 2;
    gauge.cursor.renderingGroupId = 2;

    gauge.position.y = 0.05;

    return gauge;
}

function drawGaugeColors(gauge){

    const ctx = gauge.texture.getContext();

    const w = 256;
    const h = 64;

    ctx.clearRect(0,0,w,h);

    // fond noir (bordure)
    ctx.fillStyle = "black";
    ctx.fillRect(0,0,w,h);

    const border = 8;

    // fond intérieur blanc
    ctx.fillStyle = "white";
    ctx.fillRect(border,border,w-border*2,h-border*2);

    const zoneWidth = (w-border*2)/3;

    // zones couleur
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(border,border,zoneWidth,h-border*2);

    ctx.fillStyle = "#fb923c";
    ctx.fillRect(border+zoneWidth,border,zoneWidth,h-border*2);

    ctx.fillStyle = "#ef4444";
    ctx.fillRect(border+zoneWidth*2,border,zoneWidth,h-border*2);

    // séparateurs noirs
    ctx.fillStyle = "black";
    ctx.fillRect(border+zoneWidth-2,border,4,h-border*2);
    ctx.fillRect(border+zoneWidth*2-2,border,4,h-border*2);

    gauge.texture.update();
}

function positionGauge(gauge, player, direction){

    const offset = 2;

    const dir = direction.normalize();

    const pos = player.position.subtract(dir.scale(offset));

    gauge.position.x = pos.x;
    gauge.position.z = pos.z;
    gauge.position.y = 0.1;

    const angle = Math.atan2(dir.x,dir.z);

    gauge.rotation.y = angle;
}

function updateKickGauge(gauge, player, direction, time){

    positionGauge(gauge,player,direction);

    const speed = 3;

    if(!gauge.started){
        gauge.startTime = time;
        gauge.started = true;
    }

    const value = (Math.sin((time - gauge.startTime)*speed - Math.PI/2)+1)/2;
    
    const gaugeWidth = 3;
    gauge.cursor.position.x = (value-0.5)*gaugeWidth;

    gauge.currentValue = value;

    gauge.isVisible = true;
    gauge.cursor.isVisible = true;
}

function computeKickPower(gauge){

    const value = gauge.currentValue;

    if(value < 0.33)
        return 25; // vert

    if(value < 0.66)
        return 45; // orange

    return 55; // rouge
}

function hideKickGauge(gauge){

    gauge.isVisible = false;
    gauge.cursor.isVisible = false;

    gauge.started = false;
}

function isBallOutOfBounds(ball) {
    let minX = -49;
    let maxX = 49;
    const minZ = -29;
    const maxZ = 29;

    // Derrière les buts, on laisse un peu plus de profondeur
    if (ball.position.z > -7.5 && ball.position.z < 7.5) {
        minX = -54;
        maxX = 54;
    }

    return (
        ball.position.x < minX ||
        ball.position.x > maxX ||
        ball.position.z < minZ ||
        ball.position.z > maxZ
    );
}

function startBallOutAnimation(ball) {
    if (ball.isOutAnimationPlaying || ball.isOutOfPlay) return;

    ball.isOutAnimationPlaying = true;
    ball.outAnimationFinished = false;
    ball.outTimer = 0;
    ball.outFallDelay = 0.18; // petit délai avant de commencer à tomber

    if (!ball.velocity) {
        ball.velocity = new BABYLON.Vector3(0, 0, 0);
    }

    let outDir = new BABYLON.Vector3(ball.velocity.x, 0, ball.velocity.z);

    // Si la balle sort presque sans vitesse (cas poussée),
    // on déduit la direction selon le bord franchi
    if (outDir.lengthSquared() < 0.0001) {
        outDir = BABYLON.Vector3.Zero();

        let minX = -49;
        let maxX = 49;
        const minZ = -29;
        const maxZ = 29;

        if (ball.position.z > -7.5 && ball.position.z < 7.5) {
            minX = -54;
            maxX = 54;
        }

        if (ball.position.x < minX) outDir.x = -1;
        else if (ball.position.x > maxX) outDir.x = 1;

        if (ball.position.z < minZ) outDir.z = -1;
        else if (ball.position.z > maxZ) outDir.z = 1;
    }

    if (outDir.lengthSquared() > 0) {
        outDir.normalize();
    }

    // minimum de mouvement horizontal pour voir la sortie
    const horizontalSpeed = Math.max(ball.velocity.length() * 0.65, 4.2);

    ball.outVelocity = new BABYLON.Vector3(
        outDir.x * horizontalSpeed,
        0,
        outDir.z * horizontalSpeed
    );

    // On coupe la physique normale
    ball.velocity.set(0, 0, 0);
}

function updateBallOutAnimation(ball, dt) {
    if (!ball.isOutAnimationPlaying) return;

    ball.outTimer += dt;

    // Glissement horizontal toujours présent
    ball.outVelocity.x *= 0.975;
    ball.outVelocity.z *= 0.975;

    // Pendant un très court instant, la balle glisse sans tomber
    if (ball.outTimer >= ball.outFallDelay) {
        ball.outVelocity.y -= 14 * dt;
    }

    ball.position.x += ball.outVelocity.x * dt;
    ball.position.y += ball.outVelocity.y * dt;
    ball.position.z += ball.outVelocity.z * dt;

    // on laisse un peu plus de temps visible
    const minVisibleTime = 0.60;

    if (ball.outTimer >= minVisibleTime && ball.position.y < -8) {
        ball.isOutAnimationPlaying = false;
        ball.outAnimationFinished = true;
        ball.isOutOfPlay = true;

        ball.outVelocity.set(0, 0, 0);

        if (ball.velocity) {
            ball.velocity.set(0, 0, 0);
        }

        setBallVisibility(ball, false);
    }
}

function setBallVisibility(ball, visible) {
    if (!ball) return;

    if ("isVisible" in ball) {
        ball.isVisible = visible;
    }

    if (ball.getChildMeshes) {
        const childMeshes = ball.getChildMeshes();
        childMeshes.forEach(mesh => {
            mesh.isVisible = visible;
        });
    }
}

function resetBallOutState(ball) {
    ball.isOutAnimationPlaying = false;
    ball.outAnimationFinished = false;
    ball.isOutOfPlay = false;
    ball.outTimer = 0;
    ball.outFallDelay = 0;
    ball.outVelocity = new BABYLON.Vector3(0, 0, 0);

    setBallVisibility(ball, true);
}