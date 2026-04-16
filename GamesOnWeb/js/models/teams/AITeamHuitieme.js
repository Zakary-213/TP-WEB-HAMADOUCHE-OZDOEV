class AITeamHuitieme extends AITeam {
    constructor(scene, name, color) {
        super(scene, name, color, 2);
    }

    aiBehavior(ball) {
        if (!ball || !ball.position) return;

        const now = performance.now();
        const gk = this.getGoalkeeper();

        // fenêtre de release après une relance
        if (gk && this.goalkeeperIsClearing && now < this.goalkeeperReleaseUntil) {
            this.goalkeeperLocked = true;
            this.aiControlledPlayer = gk;
            this.ballChaser = null;
            this.repositionForGoalkeeperDistribution(gk);
            return;
        }

        if (gk && this.goalkeeperIsClearing && now >= this.goalkeeperReleaseUntil) {
            const distGKBall = BABYLON.Vector3.Distance(gk.position, ball.position);
            const ballMoving = ball.velocity && ball.velocity.lengthSquared() > 0.05;

            if (distGKBall > 3.2 || ballMoving || ball.lastKicker !== gk || ball.lastTouchTeam !== this) {
                this.goalkeeperIsClearing = false;
                this.goalkeeperReleaseUntil = 0;
                this.goalkeeperCurrentRoamTarget = null;
                this.goalkeeperNextRoamDecisionTime = 0;
            }
        }

        if (gk && this.isGoalkeeperHandlingBall(ball)) {
            this.goalkeeperLocked = true;
            this.aiControlledPlayer = gk;
            this.ballChaser = null;

            this.handleGoalkeeperPossession(gk, ball);
            this.repositionForGoalkeeperDistribution(gk);
            return;
        }

        const teamHasBall = this.hasRealPossession(ball);

        if (teamHasBall) {
            this.attackBehavior(ball);
        } else {
            this.defenseBehavior(ball);
        }
    }

    // -----------------------
    // HELPERS
    // -----------------------
    getGoalkeeper() {
        return this.players.find(p => p && p.role === "GK") || null;
    }

    setFacing(player, dir) {
        if (!player || !dir || dir.lengthSquared() < 0.0001) return;

        const d = dir.clone();
        d.y = 0;

        if (d.lengthSquared() < 0.0001) return;
        d.normalize();

        player.facingDirection = d.clone();

        if (player.model) {
            player.model.rotation.y = Math.atan2(d.x, d.z);
        }
    }

    isInOwnBox(pos) {
        if (!pos) return false;
        return pos.x > 38 && Math.abs(pos.z) < 14;
    }

    isGoalkeeperHandlingBall(ball) {
        const gk = this.getGoalkeeper();
        if (!gk || !ball || !ball.position) return false;

        if (this.goalkeeperIsClearing && performance.now() < this.goalkeeperReleaseUntil) {
            return false;
        }

        return (
            ball.lastTouchTeam === this &&
            ball.lastKicker === gk &&
            BABYLON.Vector3.Distance(gk.position, ball.position) < 2.0
        );
    }

    shouldGoalkeeperClaim(ball, enemyCarrier) {
        const gk = this.getGoalkeeper();
        if (!gk || !ball || !ball.position) return false;
        if (!this.isInOwnBox(ball.position)) return false;

        const gkDist = BABYLON.Vector3.Distance(gk.position, ball.position);
        if (gkDist > 9.5) return false;

        const ballSpeed = ball.velocity ? ball.velocity.length() : 0;

        const enemyHasTightControl =
            enemyCarrier &&
            BABYLON.Vector3.Distance(enemyCarrier.position, ball.position) < 1.7 &&
            BABYLON.Vector3.Distance(enemyCarrier.position, gk.position) > 2.2;

        if (gkDist < 2.8) return true;
        if (ballSpeed > 2.2) return true;
        if (!enemyHasTightControl) return true;

        return false;
    }

    // -----------------------
    // DEFENSE
    // -----------------------
    defenseBehavior(ball) {
        let bestPlayer = null;
        let bestScore = -Infinity;

        let enemyCarrier = null;
        let targetPos = ball.position.clone();

        const defendGoalDir = new BABYLON.Vector3(1, 0, 0);

        if (
            ball.lastTouchTeam &&
            ball.lastTouchTeam !== this &&
            ball.lastKicker &&
            ball.lastKicker.position
        ) {
            const carrierDistToBall = BABYLON.Vector3.Distance(
                ball.lastKicker.position,
                ball.position
            );

            if (carrierDistToBall < 2.2) {
                enemyCarrier = ball.lastKicker;
            }
        }

        const gk = this.getGoalkeeper();
        if (gk) {
            this.updateGoalkeeper(gk, ball, enemyCarrier);
        }

        // si le GK claim la balle, les autres restent hors de sa surface
        if (this.goalkeeperClaiming) {
            this.ballChaser = null;

            this.players.forEach(player => {
                if (!player || player.role === "GK") return;

                const target = player.homePosition.clone();

                if (target.x > 34) target.x = 34;
                if (Math.abs(target.z) < 8) {
                    target.z = target.z >= 0 ? 10 : -10;
                }

                target.x = Math.max(player.minX, Math.min(player.maxX, target.x));
                target.z = Math.max(player.minZ, Math.min(player.maxZ, target.z));

                this.movePlayerTowards(player, target);
                this.markPlayerMovedThisFrame(player);
            });

            return;
        }

        if (enemyCarrier) {
            targetPos = enemyCarrier.position.add(defendGoalDir.scale(1.8));
            targetPos.y = 0;
            targetPos.z = enemyCarrier.position.z;
        }

        this.players.forEach(player => {
            if (!player || player.role === "GK") return;
            if (player._tackleStunUntil && Date.now() < player._tackleStunUntil) return;

            const toTarget = targetPos.subtract(player.position);
            const dist = toTarget.length();

            if (dist > this.pressRadius) return;

            let score = 0;

            score -= dist * 1.0;
            score -= Math.abs(player.position.z - targetPos.z) * 0.9;

            if (enemyCarrier) {
                const fromCarrierToDef = player.position.subtract(enemyCarrier.position);
                fromCarrierToDef.y = 0;

                if (fromCarrierToDef.lengthSquared() > 0.0001) {
                    fromCarrierToDef.normalize();

                    const goalSideDot = BABYLON.Vector3.Dot(defendGoalDir, fromCarrierToDef);

                    if (goalSideDot < -0.1) {
                        score -= 1000;
                    } else if (goalSideDot < 0.15) {
                        score -= 6;
                    } else {
                        score += 12 + goalSideDot * 10;
                    }
                }

                if (player.position.x > enemyCarrier.position.x) {
                    score += 6;
                } else {
                    score -= 8;
                }
            } else {
                score -= Math.abs(player.position.x - ball.position.x) * 0.35;
            }

            if (score > bestScore) {
                bestScore = score;
                bestPlayer = player;
            }
        });

        this.ballChaser = bestPlayer;

        if (this.ballChaser) {
            this.movePlayerTowards(this.ballChaser, targetPos);
            this.markPlayerMovedThisFrame(this.ballChaser);
        }
    }

    // -----------------------
    // ATTACK
    // -----------------------
    attackBehavior(ball) {
        let ballCarrier = null;
        let bestDist = Infinity;

        this.players.forEach(player => {
            if (!player || player.role === "GK") return;

            const dist = BABYLON.Vector3.Distance(player.position, ball.position);

            if (dist < bestDist) {
                bestDist = dist;
                ballCarrier = player;
            }
        });

        if (!ballCarrier) return;

        const isNearGoal = ballCarrier.position.x < -34;
        const isCenteredEnough = Math.abs(ballCarrier.position.z) < 16;
        const shouldPrepareShot = isNearGoal && isCenteredEnough;

        if (this.aiShotCharging) {
            this.handleAIShot(ball);
            return;
        }

        if (shouldPrepareShot) {
            this.startAIShot(ballCarrier, ball);
            return;
        }

        let dir = new BABYLON.Vector3(-50, 0, 0).subtract(ballCarrier.position);

        const margin = 5;

        if (ballCarrier.position.z > 25 - margin) dir.z -= 2;
        if (ballCarrier.position.z < -25 + margin) dir.z += 2;
        if (ballCarrier.position.x < -45 + margin) dir.x += 1.5;

        this.opponents.forEach(opponent => {
            if (!opponent || !opponent.position) return;

            const toOpponent = opponent.position.subtract(ballCarrier.position);
            const dist = toOpponent.length();

            if (dist < 8) {
                const avoid = ballCarrier.position.subtract(opponent.position);
                avoid.y = 0;

                if (avoid.lengthSquared() > 0.0001) {
                    avoid.normalize();
                    dir.addInPlace(avoid.scale(3));
                }
            }
        });

        if (dir.lengthSquared() === 0) return;

        dir.y = 0;
        dir.normalize();

        this.aiControlledPlayer = ballCarrier;
        this.ballChaser = ballCarrier;

        const carrierTarget = ballCarrier.position.add(dir.scale(6));

        this.moveAICarrierTowards(ballCarrier, carrierTarget, {
            maxSpeed: 0.07,
            maxForce: 0.028,
            facingDirection: dir
        });

        this.players.forEach(player => {
            if (!player || player === ballCarrier) return;
            if (player.role === "GK") return;

            const support = player.homePosition.clone();
            support.x += (ballCarrier.position.x - player.homePosition.x) * 0.5;
            support.z += (ballCarrier.position.z - player.homePosition.z) * 0.5;

            this.movePlayerTowards(player, support);
            this.markPlayerMovedThisFrame(player);
        });
    }

    // -----------------------
    // GK MAIN
    // -----------------------
    updateGoalkeeper(gk, ball, enemyCarrier) {
        if (!gk || !ball || !ball.position) return;

        const threatPos = enemyCarrier ? enemyCarrier.position.clone() : ball.position.clone();
        const enemyInBox = this.isInOwnBox(threatPos);

        const gkHasBall =
            ball.lastTouchTeam === this &&
            ball.lastKicker === gk &&
            BABYLON.Vector3.Distance(gk.position, ball.position) < 2.0;

        if (gkHasBall) {
            this.goalkeeperLocked = true;
            this.aiControlledPlayer = gk;
            this.handleGoalkeeperPossession(gk, ball);
            return;
        }

        // priorité GK sur toute balle dangereuse dans sa surface
        if (this.shouldGoalkeeperClaim(ball, enemyCarrier)) {
            this.goalkeeperLocked = true;
            this.goalkeeperClaiming = true;
            this.aiControlledPlayer = gk;
            this.ballChaser = null;

            const target = ball.position.clone();
            target.x = BABYLON.Scalar.Clamp(target.x, 43.2, 47.0);
            target.z = BABYLON.Scalar.Clamp(target.z, -6.2, 6.2);
            target.y = 0;

            this.moveGoalkeeperTowards(gk, target, false, 0.082);
            return;
        }

        if (!enemyInBox) {
            const target = gk.homePosition.clone();
            target.x = gk.homePosition.x;

            const desiredZ = BABYLON.Scalar.Clamp(ball.position.z * 0.10, -4.0, 4.0);
            target.z = BABYLON.Scalar.Lerp(gk.position.z, desiredZ, 0.06);

            this.moveGoalkeeperTowards(gk, target, true, 0.05);
            return;
        }

        this.goalkeeperLocked = true;

        const target = gk.homePosition.clone();
        target.x = gk.homePosition.x;

        const trackZ = enemyCarrier ? enemyCarrier.position.z : ball.position.z;
        const desiredZ = BABYLON.Scalar.Clamp(trackZ * 0.45, -4.8, 4.8);
        target.z = BABYLON.Scalar.Lerp(gk.position.z, desiredZ, 0.07);

        this.moveGoalkeeperTowards(gk, target, true, 0.058);
        this.tryGoalkeeperIntercept(gk, ball);
    }

    moveGoalkeeperTowards(gk, target, keepFacingForward = true, speedOverride = null) {
        if (!gk || !target) return;
        if (gk.isTackling) return;
        if (gk._tackleStunUntil && Date.now() < gk._tackleStunUntil) return;

        const toTarget = target.subtract(gk.position);
        toTarget.y = 0;
        const dist = toTarget.length();

        if (dist < 0.05) {
            resetSteeringVelocity(gk);

            if (gk.playAnimation) gk.playAnimation("idle");
            return;
        }

        let facingDir = null;

        if (keepFacingForward) {
            facingDir = new BABYLON.Vector3(-1, 0, 0);
        } else {
            facingDir = toTarget.clone();
            facingDir.y = 0;
        }

        const speed = speedOverride ?? (dist > 1.5 ? 0.08 : 0.06);

        this.moveAIPlayerTowards(gk, target, {
            maxSpeed: speed,
            maxForce: 0.024,
            stopDistance: 0.05,
            facingDirection: facingDir
        });
    }

    tryGoalkeeperIntercept(gk, ball) {
        if (!gk || !ball || !ball.position) return;

        const distToBall = BABYLON.Vector3.Distance(gk.position, ball.position);
        if (distToBall > 1.8) return;

        if (!ball.velocity) {
            ball.velocity = new BABYLON.Vector3(0, 0, 0);
        }

        ball.lastKicker = gk;
        ball.lastTouchTeam = this;
        ball.velocity.set(0, 0, 0);

        this.goalkeeperIsClearing = false;
        this.goalkeeperReleaseUntil = 0;
        this.goalkeeperPossessionStartTime = performance.now();
        this.goalkeeperCurrentRoamTarget = null;
        this.goalkeeperNextRoamDecisionTime = 0;

        const holdDir = new BABYLON.Vector3(-1, 0, 0);
        this.setFacing(gk, holdDir);

        ball.position.x = gk.position.x + holdDir.x * 0.95;
        ball.position.z = gk.position.z + holdDir.z * 0.95;
        ball.position.y = 0.75;

        ball.pushLockUntil = performance.now() + 180;
        ball.ignorePlayerCollisionUntil = performance.now() + 180;

        this.lockTeamPossession(950);
    }

    // -----------------------
    // GK POSSESSION
    // -----------------------
    handleGoalkeeperPossession(gk, ball) {
        if (!gk || !ball || !ball.position) return;

        const now = performance.now();

        if (!this.goalkeeperPossessionStartTime) {
            this.goalkeeperPossessionStartTime = now;
        }

        const heldFor = now - this.goalkeeperPossessionStartTime;

        let nearestOpponent = null;
        let nearestDist = Infinity;

        this.opponents.forEach(op => {
            if (!op || !op.position) return;

            const d = BABYLON.Vector3.Distance(op.position, gk.position);
            if (d < nearestDist) {
                nearestDist = d;
                nearestOpponent = op;
            }
        });

        const passTarget = this.findBestGoalkeeperPassTarget(gk);

        const underPressure = nearestDist < 3.8;
        const canPassNow = passTarget && heldFor > this.goalkeeperMinHoldDuration;
        const mustReleaseNow =
            heldFor > this.goalkeeperMaxHoldDuration ||
            canPassNow ||
            (underPressure && heldFor > 700);

        if (!mustReleaseNow) {
            const roamTarget = this.computeGoalkeeperRoamTarget(gk, nearestOpponent);
            this.moveGoalkeeperWithBall(gk, ball, roamTarget);
            return;
        }

        this.goalkeeperDistribute(gk, ball, passTarget);
    }

    moveGoalkeeperWithBall(gk, ball, target) {
        this.moveAIGoalkeeperWithBall(gk, ball, target);
    }

    computeGoalkeeperRoamTarget(gk, nearestOpponent) {
        const now = performance.now();

        if (
            this.goalkeeperCurrentRoamTarget &&
            now < this.goalkeeperNextRoamDecisionTime
        ) {
            return this.goalkeeperCurrentRoamTarget.clone();
        }

        const target = gk.position.clone();

        const minX = 43.5;
        const maxX = 46.7;
        const minZ = -4.8;
        const maxZ = 4.8;

        target.x = 45.4;
        target.z = BABYLON.Scalar.Lerp(gk.position.z, 0, 0.18);

        if (nearestOpponent && nearestOpponent.position) {
            const away = gk.position.subtract(nearestOpponent.position);
            away.y = 0;

            if (away.lengthSquared() > 0.0001) {
                away.normalize();

                target.x += away.x * 0.9;
                target.z += away.z * 1.2;
            }
        }

        target.x = BABYLON.Scalar.Clamp(target.x, minX, maxX);
        target.z = BABYLON.Scalar.Clamp(target.z, minZ, maxZ);

        this.goalkeeperCurrentRoamTarget = target.clone();
        this.goalkeeperNextRoamDecisionTime = now + 420;

        return target;
    }

    goalkeeperDistribute(gk, ball, passTarget = null) {
        if (!gk || !ball || !ball.position) return;
        if (this.goalkeeperIsClearing) return;

        if (!passTarget) {
            passTarget = this.findBestGoalkeeperPassTarget(gk);
        }

        let kickDir;
        let kickForce;

        if (passTarget) {
            kickDir = passTarget.position.subtract(gk.position);
            kickDir.y = 0;

            if (kickDir.lengthSquared() > 0.0001) {
                kickDir.normalize();
            } else {
                kickDir = new BABYLON.Vector3(-1, 0, 0);
            }

            kickForce = 38;
        } else {
            kickDir = new BABYLON.Vector3(-1, 0, 0);
            kickDir.z = (Math.random() - 0.5) * 0.45;
            kickDir.normalize();

            kickForce = 52;
        }

        this.setFacing(gk, kickDir);

        this.goalkeeperIsClearing = true;
        this.goalkeeperReleaseUntil = performance.now() + 380;
        this.goalkeeperKickCooldownUntil = performance.now() + 900;

        this.aiControlledPlayer = gk;
        this.goalkeeperLocked = true;
        this.ballChaser = null;
        this.goalkeeperCurrentRoamTarget = null;
        this.goalkeeperNextRoamDecisionTime = 0;

        kick(this.scene, ball, gk, kickDir, kickForce, this);
    }

    findBestGoalkeeperPassTarget(gk) {
        if (!gk) return null;

        let bestMate = null;
        let bestScore = -Infinity;

        this.players.forEach(player => {
            if (!player || player === gk) return;
            if (player.role === "GK") return;

            const toMate = player.position.subtract(gk.position);
            const dist = toMate.length();

            if (dist < 7 || dist > 32) return;

            let score = 0;

            score += (gk.position.x - player.position.x) * 2.2;
            score -= Math.abs(player.position.z) * 0.18;

            this.opponents.forEach(op => {
                if (!op || !op.position) return;

                const d = BABYLON.Vector3.Distance(op.position, player.position);
                if (d < 9) {
                    score -= (9 - d) * 2.5;
                }
            });

            if (score > bestScore) {
                bestScore = score;
                bestMate = player;
            }
        });

        return bestScore > 0 ? bestMate : null;
    }

    repositionForGoalkeeperDistribution(gk) {
        if (!gk) return;

        this.players.forEach(player => {
            if (!player || player === gk) return;

            const target = player.homePosition.clone();

            if (target.x > 34) {
                target.x = 34;
            }

            if (Math.abs(target.z) < 8) {
                target.z = target.z >= 0 ? 10 : -10;
            }

            target.x = Math.max(player.minX, Math.min(player.maxX, target.x));
            target.z = Math.max(player.minZ, Math.min(player.maxZ, target.z));

            this.movePlayerTowards(player, target);
            this.markPlayerMovedThisFrame(player);
        });
    }

    // -----------------------
    // AI SHOT (pour les tirs à courte distance)
    // -----------------------
    startAIShot(player, ball) {
        this.aiShotCharging = true;
        this.aiShotChargeStart = performance.now();
        this.aiShotCarrier = player;
        this.aiControlledPlayer = player;
        this.ballChaser = player;

        this.aiShotDirection = new BABYLON.Vector3(-1, 0, 0);
        this.aiShotCurrentValue = 0;
    }

    handleAIShot(ball) {
        const player = this.aiShotCarrier;
        if (!player || !ball || !ball.position) {
            this.aiShotCharging = false;
            this.aiShotCarrier = null;
            this.aiShotDirection = null;
            this.aiControlledPlayer = null;
            this.ballChaser = null;
            return;
        }

        const now = performance.now();
        const chargeTime = now - this.aiShotChargeStart;

        const enemyGK = this.opponents.find(p => p && p.role === "GK") || null;

        let baseTargetZ = 0;
        if (enemyGK) {
            baseTargetZ = enemyGK.position.z >= 0 ? -7 : 7;
        }

        const scanOffset = Math.sin((chargeTime / 1000) * 7) * 2.8;
        const targetZ = BABYLON.Scalar.Clamp(baseTargetZ + scanOffset, -8.5, 8.5);

        const goalTarget = new BABYLON.Vector3(-50, 0, targetZ);
        const dir = goalTarget.subtract(player.position);
        dir.y = 0;

        if (dir.lengthSquared() > 0.0001) {
            dir.normalize();
            this.aiShotDirection = dir.clone();
        } else {
            this.aiShotDirection = new BABYLON.Vector3(-1, 0, 0);
        }

        this.aiControlledPlayer = player;
        this.ballChaser = player;

        this.setFacing(player, this.aiShotDirection);

        const shotDistance = BABYLON.Vector3.Distance(player.position, ball.position);
        if (shotDistance > 2.6) {
            this.aiShotCharging = false;
            this.aiShotCarrier = null;
            this.aiShotDirection = null;
            this.aiControlledPlayer = null;
            this.ballChaser = null;
            return;
        }

        const clearSideFromGK = !enemyGK || Math.abs(targetZ - enemyGK.position.z) > 2.2;
        const enoughCharge = chargeTime > 380;
        const mustShoot = chargeTime > 900;

        if (enoughCharge && clearSideFromGK || mustShoot) {
            const force = 55;

            kick(
                this.scene,
                ball,
                player,
                this.aiShotDirection,
                force,
                this
            );

            this.aiShotCharging = false;
            this.aiShotCarrier = null;
            this.aiShotDirection = null;
            this.aiControlledPlayer = null;
            this.ballChaser = null;

            this.teamPossessionLockUntil = performance.now() + 180;
            return;
        }
    }

    
}