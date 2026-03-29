class TackleController {
    constructor(config = {}) {
        this.isTackling = false;
        this.tacklePlayer = null;
        this.tackleDirection = new BABYLON.Vector3(1, 0, 0);
        this.tackleEndTime = 0;
        this.tackleCooldownUntil = 0;

        this.tackleDurationMs = config.tackleDurationMs ?? 260;
        this.tackleCooldownMs = config.tackleCooldownMs ?? 900;
        this.tackleSpeed = config.tackleSpeed ?? 0.27;
        this.tackleTriggerRange = config.tackleTriggerRange ?? 8.5;
        this.tackleOpponentRange = config.tackleOpponentRange ?? 3.2;
        this.playerHasBallRange = config.playerHasBallRange ?? 2.2;
        this.tackleHitRange = config.tackleHitRange ?? 2.4;
        this.stunDurationMs = config.stunDurationMs ?? 1000;
        this.downPoseX = config.downPoseX ?? (-Math.PI / 2 + 1.05);
        this.getUpLerp = config.getUpLerp ?? 0.2;

        this._tackledOpponent = null;
        this._tackledOpponentDist = Infinity;
    }

    handleKeyDown(event, context) {
        if (!event || !context) return;
        if (event.repeat) return;
        if (event.key !== "x" && event.key !== "X") return;

        const { activePlayer, playerFacing, ball, opponentTeam } = context;
        const now = Date.now();

        if (!activePlayer || this.isTackling || now < this.tackleCooldownUntil) return;
        if (!ball || !ball.position || ball.isOutAnimationPlaying || ball.isOutOfPlay) return;
        if (!opponentTeam || !opponentTeam.players || opponentTeam.players.length === 0) return;

        const distToBall = BABYLON.Vector3.Distance(activePlayer.position, ball.position);

        // Le duel doit rester local autour de la balle.
        if (distToBall > this.tackleTriggerRange) return;

        let targetOpponent = null;
        let bestOpponentDist = Infinity;

        opponentTeam.players.forEach((op) => {
            if (!op || !op.position) return;
            const d = BABYLON.Vector3.Distance(activePlayer.position, op.position);
            if (d < bestOpponentDist) {
                bestOpponentDist = d;
                targetOpponent = op;
            }
        });

        if (!targetOpponent) return;
        if (bestOpponentDist > this.tackleOpponentRange) return;

        const opponentBallDist = BABYLON.Vector3.Distance(targetOpponent.position, ball.position);
        if (opponentBallDist > this.playerHasBallRange) return;

        // Possession relative:
        // on bloque uniquement si le joueur humain est clairement plus proche de la balle.
        if (distToBall + 0.25 < opponentBallDist) return;

        // Autoriser le tacle de face et sur les cotes, bloquer seulement par derriere.
        const toOpponent = targetOpponent.position.subtract(activePlayer.position);
        toOpponent.y = 0;

        const opponentFacing = targetOpponent.facingDirection
            ? targetOpponent.facingDirection.clone()
            : null;

        if (
            opponentFacing &&
            opponentFacing.lengthSquared() > 0.0001 &&
            toOpponent.lengthSquared() > 0.0001
        ) {
            opponentFacing.y = 0;
            opponentFacing.normalize();
            toOpponent.normalize();

            // dot > 0 => le tackleur arrive dans le dos (interdit)
            const behindDot = BABYLON.Vector3.Dot(opponentFacing, toOpponent);
            if (behindDot > 0.35) return;
        }

        const dashDir = targetOpponent.position.subtract(activePlayer.position);

        dashDir.y = 0;
        if (dashDir.lengthSquared() < 0.0001) return;

        dashDir.normalize();

        this.isTackling = true;
        this.tacklePlayer = activePlayer;
        this.tackleDirection.copyFrom(dashDir);
        this.tackleEndTime = now + this.tackleDurationMs;
        this.tackleCooldownUntil = now + this.tackleCooldownMs;
        this.tacklePlayer.isTackling = true;
    }

    beginFrame() {
        this._tackledOpponent = null;
        this._tackledOpponentDist = Infinity;
    }

    shouldIgnoreCollision(pA, pB) {
        if (!this.isTackling || !this.tacklePlayer) return false;
        return pA === this.tacklePlayer || pB === this.tacklePlayer;
    }

    registerPotentialHit(pA, pB) {
        if (!this.isTackling || !this.tacklePlayer) return;

        let opponent = null;
        if (pA === this.tacklePlayer) opponent = pB;
        else if (pB === this.tacklePlayer) opponent = pA;
        else return;

        if (!opponent || !opponent.position || !this.tacklePlayer.position) return;

        const dx = this.tacklePlayer.position.x - opponent.position.x;
        const dz = this.tacklePlayer.position.z - opponent.position.z;
        const d = Math.sqrt(dx * dx + dz * dz);

        if (d < this.tackleHitRange && d < this._tackledOpponentDist) {
            this._tackledOpponent = opponent;
            this._tackledOpponentDist = d;
        }
    }

    applyBallSteal(ball) {
        if (!this.isTackling || !this.tacklePlayer || !this._tackledOpponent) return;
        if (!ball || !ball.position) return;

        this._applyKnockdown(this._tackledOpponent);

        const oppBallDist = BABYLON.Vector3.Distance(this._tackledOpponent.position, ball.position);
        const myBallDist = BABYLON.Vector3.Distance(this.tacklePlayer.position, ball.position);

        if (oppBallDist < 3.0 || myBallDist < 3.0) {
            if (!ball.velocity) ball.velocity = new BABYLON.Vector3(0, 0, 0);

            const carryDir = this.tackleDirection.clone();
            carryDir.y = 0;
            if (carryDir.lengthSquared() > 0.0001) {
                carryDir.normalize();
                ball.position.x = this.tacklePlayer.position.x + carryDir.x * 1.4;
                ball.position.z = this.tacklePlayer.position.z + carryDir.z * 1.4;
                ball.velocity.x = carryDir.x * 10.5;
                ball.velocity.z = carryDir.z * 10.5;

                if (window.matchAudio && typeof window.matchAudio.playKick === "function") {
                    window.matchAudio.playKick();
                }
            }
        }
    }

    _applyKnockdown(player) {
        if (!player || !player.position) return;

        const now = Date.now();
        const minEnd = now + this.stunDurationMs;

        if (!player._tackleStunUntil || player._tackleStunUntil < minEnd) {
            player._tackleStunUntil = minEnd;
        }

        if (!player._tackleDownAnchor) {
            player._tackleDownAnchor = player.position.clone();
        } else {
            player._tackleDownAnchor.copyFrom(player.position);
        }

        this._setPlayerGray(player);
        this._setStunVfxVisible(player, false);
    }

    _setPlayerGray(player) {
        if (!player || !player.model || !player.model.getChildMeshes) return;
        if (player._tackleGrayApplied) return;

        const meshes = player.model.getChildMeshes();
        const backups = [];

        meshes.forEach((mesh) => {
            if (!mesh || !mesh.material) return;
            const mat = mesh.material;

            backups.push({
                material: mat,
                diffuse: mat.diffuseColor ? mat.diffuseColor.clone() : null,
                albedo: mat.albedoColor ? mat.albedoColor.clone() : null,
                emissive: mat.emissiveColor ? mat.emissiveColor.clone() : null
            });

            if (mat.diffuseColor) mat.diffuseColor = new BABYLON.Color3(0.45, 0.45, 0.45);
            if (mat.albedoColor) mat.albedoColor = new BABYLON.Color3(0.45, 0.45, 0.45);
            if (mat.emissiveColor) mat.emissiveColor = new BABYLON.Color3(0.06, 0.06, 0.06);
        });

        player._tackleVisualBackup = backups;
        player._tackleGrayApplied = true;
    }

    _restorePlayerColor(player) {
        if (!player || !player._tackleGrayApplied) return;

        const backups = player._tackleVisualBackup || [];
        backups.forEach((b) => {
            if (!b || !b.material) return;
            if (b.diffuse) b.material.diffuseColor = b.diffuse;
            if (b.albedo) b.material.albedoColor = b.albedo;
            if (b.emissive) b.material.emissiveColor = b.emissive;
        });

        player._tackleVisualBackup = null;
        player._tackleGrayApplied = false;
    }

    _ensureStunVfx(player) {
        if (!player || !player.scene) return null;
        if (player._stunVfxRoot) return player._stunVfxRoot;

        const scene = player.scene;

        const root = new BABYLON.TransformNode("stunVfxRoot", scene);
        root.parent = player;
        root.position = new BABYLON.Vector3(0, 3.2, 0);

        const halo = BABYLON.MeshBuilder.CreateTorus(
            "stunHalo",
            { diameter: 1.2, thickness: 0.08, tessellation: 24 },
            scene
        );
        halo.parent = root;
        halo.rotation.x = Math.PI / 2;

        const haloMat = new BABYLON.StandardMaterial("stunHaloMat", scene);
        haloMat.emissiveColor = new BABYLON.Color3(1.0, 0.9, 0.25);
        haloMat.diffuseColor = new BABYLON.Color3(1.0, 0.85, 0.2);
        halo.material = haloMat;

        const birds = [];
        const birdMat = new BABYLON.StandardMaterial("stunBirdMat", scene);
        birdMat.emissiveColor = new BABYLON.Color3(0.95, 0.95, 0.95);
        birdMat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);

        for (let i = 0; i < 3; i++) {
            const bird = BABYLON.MeshBuilder.CreateSphere(
                "stunBird",
                { diameter: 0.18, segments: 8 },
                scene
            );
            bird.parent = root;
            bird.material = birdMat;
            birds.push(bird);
        }

        root.setEnabled(false);
        player._stunVfxRoot = root;
        player._stunVfxHalo = halo;
        player._stunVfxBirds = birds;

        return root;
    }

    _setStunVfxVisible(player, visible) {
        if (!player) return;
        const root = this._ensureStunVfx(player);
        if (!root) return;
        root.setEnabled(!!visible);
    }

    _updateStunVfx(player, nowMs) {
        if (!player || !player._stunVfxRoot || !player._stunVfxRoot.isEnabled()) return;

        const t = nowMs * 0.006;

        if (player._stunVfxHalo) {
            player._stunVfxHalo.rotation.z = t * 0.7;
        }

        const birds = player._stunVfxBirds || [];
        for (let i = 0; i < birds.length; i++) {
            const b = birds[i];
            const a = t + (i * Math.PI * 2) / birds.length;
            const r = 0.8;
            b.position.x = Math.cos(a) * r;
            b.position.z = Math.sin(a) * r;
            b.position.y = 0.1 + Math.sin(t * 1.7 + i) * 0.07;
        }
    }

    updateStunnedPlayers(team) {
        if (!team || !team.players) return;

        const now = Date.now();

        team.players.forEach((p) => {
            if (!p || !p.position) return;

            if (p._tackleStunUntil && now < p._tackleStunUntil) {
                if (!p._tackleDownAnchor) {
                    p._tackleDownAnchor = p.position.clone();
                }

                p.position.copyFrom(p._tackleDownAnchor);
                this._setStunVfxVisible(p, false);

                if (p.playAnimation) {
                    p.playAnimation("idle");
                }

                if (p.model) {
                    p.model.rotation.x = BABYLON.Scalar.Lerp(
                        p.model.rotation.x,
                        -Math.PI / 2,
                        0.65
                    );
                }
                return;
            }

            if (p._tackleStunUntil && now >= p._tackleStunUntil) {
                p._tackleStunUntil = 0;
                p._tackleDownAnchor = null;
                this._setStunVfxVisible(p, false);
                this._restorePlayerColor(p);
            }

            if (p.model) {
                p.model.rotation.x = BABYLON.Scalar.Lerp(
                    p.model.rotation.x,
                    -Math.PI / 2,
                    this.getUpLerp
                );
            }

            if (!p._tackleStunUntil) {
                this._setStunVfxVisible(p, false);
                this._restorePlayerColor(p);
            }
        });
    }

    updateAndMove(activePlayer, moveX, moveZ, normalSpeed) {
        if (this.isTackling && Date.now() >= this.tackleEndTime) {
            if (this.tacklePlayer) {
                this.tacklePlayer.isTackling = false;
            }
            this.isTackling = false;
            this.tacklePlayer = null;
        }

        if (this.isTackling && this.tacklePlayer) {
            const controlledPlayer = this.tacklePlayer;
            const directionOpt = controlledPlayer.move(
                this.tackleDirection.x,
                this.tackleDirection.z,
                this.tackleSpeed
            );

            if (controlledPlayer.model) {
                controlledPlayer.model.rotation.x = BABYLON.Scalar.Lerp(
                    controlledPlayer.model.rotation.x,
                    -Math.PI / 2 + 0.42,
                    0.7
                );
            }

            return {
                controlledPlayer,
                directionOpt
            };
        }

        return {
            controlledPlayer: activePlayer,
            directionOpt: activePlayer.move(moveX, moveZ, normalSpeed)
        };
    }
}
