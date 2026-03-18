class AITeamHuitieme extends AITeam {
    constructor(scene, name, color) {
        super(scene, name, color, 2);

        // ─── Paramètres tactiques : "Bloc médian conservateur" ───────────────
        this.speed          = 0.1;
        this.chaseSpeed     = 0.085;  // Légèrement plus lent que le joueur
        this.reactionDelay  = 2.0;    // Prise de décision lente (2s)
        this._reactionTimer = 0;
        this._frozenBall    = null;
        this._shootCooldown = 0;
        this.shootInterval  = 8.0;    // Tirs peu fréquents
        this.pressRadius    = 10;     // Pressing faible : ne s'active qu'à 10u max
        this.aiImplemented  = true;
    }

    update(ball) {
        if (ball) this.aiBehavior(ball);
    }

    aiBehavior(ball) {
        if (!ball || !ball.position) return;

        const scene = this.scene;
        const dt    = scene ? scene.getEngine().getDeltaTime() / 1000 : 0.016;

        // ─── Réaction différée ────────────────────────────────────────────────
        this._reactionTimer += dt;
        if (this._reactionTimer >= this.reactionDelay) {
            this._reactionTimer = 0;
            this._frozenBall    = ball.position.clone();
        }
        const frozenBall = this._frozenBall || ball.position.clone();
        this._shootCooldown -= dt;

        // ─── Désignation du chasseur (jamais le GK) ──────────────────────────
        let chaser = null, chaserDist = Infinity;
        this.players.forEach(p => {
            if (!p || !p.position || p.role === "GK") return;
            const d = BABYLON.Vector3.Distance(p.position, ball.position);
            if (d < chaserDist) { chaserDist = d; chaser = p; }
        });

        this.players.forEach((player) => {
            if (!player || !player.position || !player.homePosition) return;

            const role     = player.role;
            const homePos  = player.homePosition;
            const side     = player.side;
            const distBall = BABYLON.Vector3.Distance(player.position, ball.position);
            const isChaser = (player === chaser);

            // ─── GARDIEN : reste dans ses cages, avec mouvement animé ──────
            if (role === "GK") {
                // Ligne de but proche des cages (pas au point homePos.x qui est plus haut)
                const goalX = (side === -1) ? 48 : -48;

                // Distance balle–gardien
                const distToBall = distBall;

                // Cible X : par défaut sur la ligne de but
                let gkTargetX = goalX;

                // Si la balle est dans / proche de la surface, le gardien fait un petit pas en avant
                const inBoxX = Math.abs(ball.position.x - goalX) < 20;
                const inBoxZ = Math.abs(ball.position.z) < 12;
                if (inBoxX && inBoxZ && distToBall < 18) {
                    const insideDir = goalX >= 0 ? -1 : 1; // vers l'intérieur du terrain
                    gkTargetX = goalX + insideDir * 4;
                }

                // Cible Z : suit la balle latéralement pour fermer l'angle
                const gkTargetZ = homePos.z + (ball.position.z - homePos.z) * 0.7;
                const clampedZ  = Math.max(-7.5, Math.min(7.5, gkTargetZ));

                // Construire la cible et utiliser _moveTowards pour profiter de player.move()
                const gkTarget = new BABYLON.Vector3(gkTargetX, 0, clampedZ);

                // Dégagement actif si balle à portée
                if (player._gkCooldown === undefined) player._gkCooldown = 0;
                player._gkCooldown -= dt;
                if (distToBall < 2.5 && player._gkCooldown <= 0) {
                    if (!ball.velocity) ball.velocity = new BABYLON.Vector3(0, 0, 0);

                    // Dégagement vers l'avant (côté adversaire), léger angle latéral
                    const clearSide  = ball.position.z >= 0 ? 1 : -1;
                    const clearForce = 16 + Math.random() * 4;
                    ball.velocity.x  = side * clearForce * 0.7;
                    ball.velocity.z  = clearSide * clearForce * 0.6;

                    player._gkCooldown = 1.7;
                }

                // Déplacement animé du gardien vers sa cible
                this._moveTowards(player, gkTarget, this.speed * 0.9);
                return;
            }

            // ─── DÉFENSEURS ────────────────────────────────────────────────────
            let target = null;

            if (role === "DEF") {
                if (isChaser) {
                    if (distBall <= this.pressRadius) {
                        // Pressing actif : balle à portée → va dessus
                        target = ball.position.clone();
                    } else {
                        // Pressing faible : balle loin → rampe lentement vers elle
                        // Reste à 70% sur homePos (bloc), 30% vers la balle
                        target = homePos.clone();
                        target.x += (ball.position.x - homePos.x) * 0.3;
                        target.z += (ball.position.z - homePos.z) * 0.3;
                        target.x = Math.max(homePos.x - 4, Math.min(homePos.x + 6, target.x));
                    }
                } else {
                    // Mode bloc + léger support run (discret, priorité à la forme)
                    let supportX = homePos.x;
                    if (chaser && chaser.position && chaser.homePosition) {
                        const chaserAdv = (side === -1)
                            ? chaser.homePosition.x - chaser.position.x
                            : chaser.position.x - chaser.homePosition.x;
                        if (chaserAdv > 5) {
                            // DEF avance très prudemment (15% seulement)
                            supportX = homePos.x + chaserAdv * 0.15 * (side === -1 ? -1 : 1);
                        }
                    }
                    target = homePos.clone();
                    target.x = supportX;
                    target.z += (ball.position.z - homePos.z) * 0.2; // Bloc serré
                    target.x = Math.max(homePos.x - 4, Math.min(homePos.x + 4, target.x));
                }
            }

            // ─── ATTAQUANTS ────────────────────────────────────────────────────
            else if (role === "ATT") {
                if (isChaser) {
                    if (distBall <= this.pressRadius) {
                        // Pressing actif : va sur la balle
                        target = ball.position.clone();
                    } else {
                        // Pressing faible : balle loin → position d'attente à mi-chemin
                        target = homePos.clone();
                        target.x += (ball.position.x - homePos.x) * 0.35;
                        target.z += (ball.position.z - homePos.z) * 0.35;
                        // Ne pas traverser le centre
                        if (side === -1) target.x = Math.max(0, target.x);
                        else             target.x = Math.min(0, target.x);
                    }
                } else {
                    // Support run modéré : forme de l'équipe prioritaire
                    let supportX = homePos.x;
                    if (chaser && chaser.position && chaser.homePosition) {
                        const chaserAdv = (side === -1)
                            ? chaser.homePosition.x - chaser.position.x
                            : chaser.position.x - chaser.homePosition.x;
                        if (chaserAdv > 3) {
                            // Suit à 55% de l'avance (moins agressif qu'avant, forme prioritaire)
                            supportX = homePos.x + chaserAdv * 0.55 * (side === -1 ? -1 : 1);
                        }
                    }
                    target = homePos.clone();
                    target.x = supportX;
                    target.z += (ball.position.z - homePos.z) * 0.15;
                    if (side === -1) target.x = Math.max(-40, Math.min(homePos.x + 6, target.x));
                    else             target.x = Math.min(40, Math.max(homePos.x - 6, target.x));
                }
            }

            if (!target) return;

            // Borner dans le terrain
            target.x = Math.max(-48, Math.min(48, target.x));
            target.z = Math.max(-27, Math.min(27, target.z));

            // ─── POUSSÉE BALLE (DEF + ATT seulement) ─────────────────────────
            if (player._pushCooldown === undefined) player._pushCooldown = 0;
            player._pushCooldown -= dt;

            if (isChaser && distBall < 2.2 && player._pushCooldown <= 0) {
                const attackDir = new BABYLON.Vector3(side, 0, 0);
                const aimZ      = (0 - ball.position.z) * 0.2;
                const aimVec    = new BABYLON.Vector3(attackDir.x, 0, aimZ);
                aimVec.normalize();

                if (!ball.velocity) ball.velocity = new BABYLON.Vector3(0, 0, 0);

                const pushForce = 7 + Math.random() * 3;
                ball.velocity = new BABYLON.Vector3(
                    aimVec.x * pushForce,
                    0,
                    aimVec.z * pushForce
                );

                const goalX    = side === -1 ? -50 : 50;
                const distGoal = Math.abs(ball.position.x - goalX);
                if (distGoal < 10 && this._shootCooldown <= 0) { // Peu de tirs lointains : max 10u
                    ball.velocity.x *= 2.5;
                    ball.velocity.z *= 1.8;
                    this._shootCooldown = this.shootInterval;
                }

                player._pushCooldown = 1.8; // Plus long = moins de pivots, mouvement plus fluide
                return;
            }

            const spd = isChaser ? this.chaseSpeed : this.speed;
            this._moveTowards(player, target, spd);
        });
    }

    _moveTowards(player, target, speed) {
        const dir  = target.subtract(player.position);
        dir.y      = 0;
        const dist = dir.length();
        if (dist < 0.25) return;
        dir.normalize();
        player.move(dir.x, dir.z, speed);
    }
}
