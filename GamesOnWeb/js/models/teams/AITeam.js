class AITeam extends Team {
    constructor(scene, name, color, meshIndex = 2) {
        super(scene, name, color, false, meshIndex);

        this.aiImplemented = true;
        this.ballChaser = null;
        this.pressRadius = 30;

        this.aiControlledPlayer = null;
        this.goalkeeperLocked = false;
        this.goalkeeperClaiming = false;

        this.goalkeeperKickCooldownUntil = 0;
        this.goalkeeperIsClearing = false;
        this.goalkeeperReleaseUntil = 0;

        this.goalkeeperPossessionStartTime = 0;
        this.goalkeeperMinHoldDuration = 1200;
        this.goalkeeperMaxHoldDuration = 2800;

        this.goalkeeperCurrentRoamTarget = null;
        this.goalkeeperNextRoamDecisionTime = 0;

        this.aiShotCharging = false;
        this.aiShotChargeStart = 0;
        this.aiShotCarrier = null;
        this.aiShotDirection = null;
        this.aiShotCurrentValue = 0;

        this._aiFrameMoveId = 0;
    }

    update(ball) {
        if (!ball || !ball.position) return;

        if (updateTeamForRestart(this, ball)) return;

        this._aiFrameMoveId = this.scene && this.scene.getFrameId
            ? this.scene.getFrameId()
            : performance.now();

        this.aiControlledPlayer = null;
        this.goalkeeperLocked = false;
        this.goalkeeperClaiming = false;

        if (this.aiShotCharging) {
            this.handleAIShot(ball);
            this.updateBasePositioning(ball);
            return;
        }

        this.aiBehavior(ball);
        this.updateBasePositioning(ball);
    }

    aiBehavior(ball) {
        // override
    }

    hasRealPossession(ball) {
        if (!ball || !ball.position) return false;

        if (performance.now() < this.teamPossessionLockUntil) {
            return true;
        }

        if (ball.lastTouchTeam !== this) {
            return false;
        }

        for (const player of this.players) {
            if (!player || !player.position) continue;

            const dist = BABYLON.Vector3.Distance(player.position, ball.position);
            if (dist < 2.0) {
                return true;
            }
        }

        return false;
    }

    updateBasePositioning(ball) {
        this.players.forEach(player => {
            if (!player) return;

            if (player === this.ballChaser) return;
            if (player === this.aiControlledPlayer) return;
            if (player.role === "GK" && this.goalkeeperLocked) return;
            if (this.hasPlayerMovedThisFrame(player)) return;

            let target = player.homePosition.clone();

            if (player.role === "GK") {
                target.x = player.homePosition.x;
                target.z += (ball.position.z - player.homePosition.z) * 0.2;
            }

            if (player.role === "DEF") {
                target.x += (ball.position.x - player.homePosition.x) * 0.3;
                target.z += (ball.position.z - player.homePosition.z) * 0.3;
            }

            if (player.role === "ATT") {
                target.x += (ball.position.x - player.homePosition.x) * 0.5;
                target.z += (ball.position.z - player.homePosition.z) * 0.4;
            }

            target.x = Math.max(player.minX, Math.min(player.maxX, target.x));
            target.z = Math.max(player.minZ, Math.min(player.maxZ, target.z));

            this.movePlayerTowards(player, target);
            this.markPlayerMovedThisFrame(player);
        });
    }

    moveAIPlayerTowards(player, target, options = {}) {
        if (!player || !target) return;
        if (player.isTackling) return;
        if (player._tackleStunUntil && Date.now() < player._tackleStunUntil) return;

        initSteeringPlayer(player);

        const maxSpeed = options.maxSpeed ?? 0.07;
        const maxForce = options.maxForce ?? 0.02;
        const stopDistance = options.stopDistance ?? 0.15;
        const slowRadius = options.slowRadius ?? 2.8;

        player.maxSteeringSpeed = maxSpeed;
        player.maxSteeringForce = maxForce;

        const useAvoid = options.useAvoid ?? false;

        const opponents = useAvoid
            ? this.getAvoidOpponents(player)
            : [];

        const avoidanceTarget = useAvoid
            ? computeAvoidanceWaypoint(player, target, opponents, {
                avoidRadius: options.avoidRadius ?? 8.0,
                corridorRadius: options.corridorRadius ?? 2.8,
                lateralOffset: options.lateralOffset ?? 4.5,
                forwardLook: options.forwardLook ?? 8.0
            })
            : null;

        const finalTarget = avoidanceTarget || target;

        const toTarget = finalTarget.subtract(player.position);
        toTarget.y = 0;
        const dist = toTarget.length();

        if (dist < stopDistance) {
            resetSteeringVelocity(player);

            if (player.playAnimation) {
                player.playAnimation("idle");
            }
            return;
        }

        const steering = arriveSteering(
            player,
            finalTarget,
            maxSpeed,
            slowRadius,
            stopDistance
        );

        const velocity = applySteering(player, steering);

        if (velocity.lengthSquared() < 0.00001) {
            if (player.playAnimation) {
                player.playAnimation("idle");
            }
            return;
        }

        const moveDir = velocity.clone();
        moveDir.y = 0;

        if (moveDir.lengthSquared() < 0.00001) return;

        moveDir.normalize();

        let facingDirection = moveDir;

        if (!avoidanceTarget && options.facingDirection && options.facingDirection.lengthSquared() > 0.0001) {
            facingDirection = options.facingDirection.clone();
            facingDirection.y = 0;
        }

        if (facingDirection && facingDirection.lengthSquared() > 0.0001) {
            this.setFacing(player, facingDirection);
        }

        const moveSpeed = velocity.length();
        player.move(moveDir.x, moveDir.z, moveSpeed);
        this.markPlayerMovedThisFrame(player);
    }

    moveAICarrierTowards(player, target, options = {}) {
        if (!player || !target) return;

        this.moveAIPlayerTowards(player, target, {
            maxSpeed: options.maxSpeed ?? 0.07,
            maxForce: options.maxForce ?? 0.028,
            stopDistance: options.stopDistance ?? 0.05,
            slowRadius: options.slowRadius ?? 3.2,
            facingDirection: options.facingDirection ?? null,

            useAvoid: true,
            avoidRadius: options.avoidRadius ?? 9.0,
            corridorRadius: options.corridorRadius ?? 3.0,
            lateralOffset: options.lateralOffset ?? 5.0,
            forwardLook: options.forwardLook ?? 9.0
        });
    }

    moveAIGoalkeeperWithBall(gk, ball, target) {
        if (!gk || !ball || !target) return;

        const holdDir = new BABYLON.Vector3(-1, 0, 0);

        this.moveAIPlayerTowards(gk, target, {
            maxSpeed: 0.042,
            maxForce: 0.02,
            stopDistance: 0.05,
            facingDirection: holdDir
        });

        this.setFacing(gk, holdDir);

        ball.lastKicker = gk;
        ball.lastTouchTeam = this;

        if (!ball.velocity) {
            ball.velocity = new BABYLON.Vector3(0, 0, 0);
        }

        ball.velocity.set(0, 0, 0);

        ball.position.x = gk.position.x + holdDir.x * 0.95;
        ball.position.z = gk.position.z + holdDir.z * 0.95;
        ball.position.y = 0.75;
    }

    markPlayerMovedThisFrame(player) {
        if (!player) return;
        player._aiLastMoveFrame = this._aiFrameMoveId;
    }

    hasPlayerMovedThisFrame(player) {
        if (!player) return false;
        return player._aiLastMoveFrame === this._aiFrameMoveId;
    }

    
    
}