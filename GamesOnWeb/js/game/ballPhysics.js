export function updateBallPhysics(ball, goalPosts, allPlayers, dt) {
    if (!ball.velocity) {
        ball.velocity = new BABYLON.Vector3(0, 0, 0);
    }

    if (ball.velocity.lengthSquared() > 0.000001) {
        ball.position.x += ball.velocity.x * dt;
        ball.position.z += ball.velocity.z * dt;

        const friction = 0.985;
        ball.velocity.scaleInPlace(friction);

        if (ball.velocity.lengthSquared() < 0.0001) {
            ball.velocity.set(0, 0, 0);
        }

        const ballRadius = 0.55;
        const postRadius = 0.2;
        const collisionDistance = ballRadius + postRadius;

        let hasBounced = false;

        for (let i = 0; i < goalPosts.length; i++) {
            const post = goalPosts[i];
            if (!post || hasBounced) continue;

            const postPos = post.getAbsolutePosition();
            const diff = ball.position.subtract(postPos);
            const horizontal = new BABYLON.Vector3(diff.x, 0, diff.z);
            const dist = horizontal.length();

            if (dist > 0 && dist < collisionDistance) {
                const normal = horizontal.normalize();

                const reflected = BABYLON.Vector3.Reflect(ball.velocity, normal);
                ball.velocity = reflected.scale(0.7);

                ball.position = postPos.add(normal.scale(collisionDistance));
                hasBounced = true;
            }
        }
    }

    if (!ball.restartLocked) {
        const BALL_RADIUS = 0.55;
        const PLAYER_COLR = 1.1;
        const COMBINED_R = BALL_RADIUS + PLAYER_COLR;

        allPlayers.forEach(p => {
            if (!p || !p.position) return;

            if (
                ball.lastKicker === p &&
                ball.ignorePlayerCollisionUntil &&
                performance.now() < ball.ignorePlayerCollisionUntil
            ) {
                return;
            }

            const dx = ball.position.x - p.position.x;
            const dz = ball.position.z - p.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < COMBINED_R && dist > 0.001) {
                const nx = dx / dist;
                const nz = dz / dist;

                const dot = ball.velocity.x * nx + ball.velocity.z * nz;
                if (dot < 0) {
                    ball.velocity.x -= 2 * dot * nx;
                    ball.velocity.z -= 2 * dot * nz;

                    ball.velocity.x *= 0.75;
                    ball.velocity.z *= 0.75;
                }

                const overlap = COMBINED_R - dist;
                ball.position.x += nx * overlap;
                ball.position.z += nz * overlap;
            }
        });
    }
}
