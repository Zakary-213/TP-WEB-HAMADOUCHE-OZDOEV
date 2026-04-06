class Team {
    constructor(scene, name, color, isPlayerControlled = false, meshIndex = 0) {
        this.scene = scene;
        this.name = name;
        this.color = color;
        this.isPlayerControlled = isPlayerControlled;
        this.meshIndex = meshIndex;
        
        this.players = []; 
        this.score = 0;
        this.activePlayer = null;
        this.lastSwitchTime = 0;
        this.switchCooldown = 1000; // ms
        this.switchLockUntil = 0;

        // joueur qui presse la balle en défense
        this.ballChaser = null;

        // joueur qui a touché la balle en dernier (pour éviter qu'il chase sa propre passe)
        this.lastBallPlayer = null;

        // petit délai pendant lequel on considère encore qu'on a la possession
        this.teamPossessionLockUntil = 0;

        this.goalEmergencyModeUntil = 0;

        
    }

    addPlayer(position, side = 1) {

        const newPlayer = createPlayer(this.scene, position, this.color, this.meshIndex);
        newPlayer.teamRef = this;
        
        // On modifie la taille du joueur pour qu'elle corresponde à ce qui était dans script.js
        if(newPlayer.model){
            newPlayer.model.getChildMeshes().forEach(mesh=>{
                mesh.scaling = new BABYLON.Vector3(8,8,8);
            });
        }

        // Ajout de la boite de collision
        newPlayer.ellipsoid = new BABYLON.Vector3(1,1,1);
        newPlayer.checkCollisions = true;

        // Orientation de base selon le côté de l'équipe
        // side = 1 : équipe de gauche (regarde vers +X)
        // side = -1 : équipe de droite (regarde vers -X)
        newPlayer.side = side;

        // Sauvegarde pour reset
        newPlayer.initialPosition = position.clone();
        newPlayer.initialRotationY = side === 1 ? Math.PI / 2 : -Math.PI / 2;

        this.players.push(newPlayer);
        return newPlayer;
    }

    createTeamFormation(side){

        const startX = -20 * side;

        const gkX = side === 1 ? -47 : 47;

        const formation = [
            { role: "GK",  pos: new BABYLON.Vector3(gkX, 0, 0) },
            { role: "DEF", pos: new BABYLON.Vector3(startX - (5 * side), 0, -10) },
            { role: "DEF", pos: new BABYLON.Vector3(startX - (5 * side), 0, 10) },
            { role: "ATT", pos: new BABYLON.Vector3(startX + (5 * side), 0, -8) },
            { role: "ATT", pos: new BABYLON.Vector3(startX + (5 * side), 0, 8) }
        ];

        formation.forEach(data=>{

            const player = this.addPlayer(data.pos, side);

            player.role = data.role;

            // position tactique de base
            player.homePosition = data.pos.clone();

            player.wanderTarget = player.homePosition.clone();
            player.nextWanderTime = 0;

            // état de l'IA
            player.state = "IDLE";

            if(player.role === "GK"){
                player.minX = player.homePosition.x - 2;
                player.maxX = player.homePosition.x + 2;
            }

            if(player.role === "DEF"){
                player.minX = player.homePosition.x - 10;
                player.maxX = 40;
            }

            if(player.role === "ATT"){
                player.minX = -10;
                player.maxX = 40;
            }

            player.minZ = -25;
            player.maxZ = 25;
        });
    }

    update(ball){
        if (updateTeamForRestart(this, ball)) return;
        const teamHasBall = this.hasBall(ball);

        // si on récupère la balle on annule le chasseur
        if(teamHasBall){
            this.ballChaser = null;
        }

        // choix du chasseur
        if(!this.ballChaser){

            // On ne choisit un chasseur que si la balle est relativement libre/lente,
            // mais on ne coupe jamais toute l'IA de l'équipe.
            if(!ball.velocity || ball.velocity.length() <= 0.1){
                this.ballChaser = this.getClosestFieldPlayerToBall(ball);
            }
        }

        else{

            const dist = BABYLON.Vector3.Distance(
                this.ballChaser.position,
                ball.position
            );

            if(dist > 20){
                this.ballChaser = this.getClosestFieldPlayerToBall(ball);
            }
        }

        // défenseurs les plus proches de la balle
        let closestDef = null;
        let farthestDef = null;

        let bestDist = Infinity;
        let worstDist = -Infinity;

        this.players.forEach(player=>{

            if(player.role !== "DEF") return;

            const dist = BABYLON.Vector3.Distance(
                player.position,
                ball.position
            );

            if(dist < bestDist){
                bestDist = dist;
                closestDef = player;
            }

            if(dist > worstDist){
                worstDist = dist;
                farthestDef = player;
            }

        });

        this.players.forEach(player=>{

            if(player === this.activePlayer) return;

            // -----------------------
            // DEFENSE
            // -----------------------
            if(!teamHasBall){

                if(player === this.ballChaser){
                    player.state = "CHASE";
                }
                else{
                    player.state = "POSITION";
                }

            }

            // -----------------------
            // ATTAQUE
            // -----------------------
            else{

                if(player === closestDef){
                    player.state = "SUPPORT";
                }
                else if(player === farthestDef){
                    player.state = "COVER";
                }
                else if(player.role === "ATT"){
                    player.state = "ATTACK_POSITION";
                }

            }

            this.updatePlayerAI(player, ball, teamHasBall);

        });
    }

    updatePlayerAI(player, ball, teamHasBall){

        const ballPos = ball.position;

        // -----------------------
        // CHASE
        // -----------------------
        if(player.state === "CHASE"){

            if(player.role === "GK"){

                const dist = BABYLON.Vector3.Distance(
                    player.position,
                    ball.position
                );

                if(dist > 12) return;
            }

            this.movePlayerTowards(player, ball.position);
            return;
        }

        // -----------------------
        // SUPPORT
        // -----------------------
        if(player.state === "SUPPORT"){

            const target = this.activePlayer.position.clone();

            target.x -= 14 * player.side;
            target.z = player.homePosition.z * 1.2;

            const liveOffset = this.getLiveOffset(player, 0.8, 0.0018);
            target.addInPlace(liveOffset);

            this.movePlayerTowards(player, target);
            return;
        }

        // -----------------------
        // COVER
        // -----------------------
        if(player.state === "COVER"){

            const target = player.homePosition.clone();

            target.x += (ball.position.x - player.homePosition.x) * 0.4;
            target.z += (ball.position.z - player.homePosition.z) * 0.3;

            const liveOffset = this.getLiveOffset(player, 0.7, 0.0015);
            target.addInPlace(liveOffset);

            this.movePlayerTowards(player, target);
            return;
        }

        // -----------------------
        // ATTACK POSITION
        // triangle offensif
        // -----------------------
        if(player.state === "ATTACK_POSITION"){

            const target = player.homePosition.clone();

            // l'attaquant avance avec le jeu mais ne dépasse pas une limite
            const attackLine = ball.position.x + (10 * player.side);

            target.x = Math.max(player.minX, Math.min(player.maxX, attackLine));

            target.z = player.homePosition.z * 1.4;

            const liveOffset = this.getLiveOffset(player, 1.0, 0.002);
            target.addInPlace(liveOffset);

            this.movePlayerTowards(player, target);
            return;
        }

        // -----------------------
        // POSITION
        // -----------------------
        if(player.state === "POSITION"){

            let target = player.homePosition.clone();

            const liveOffset = this.getLiveOffset(player, 1.5, 0.0015);
            target.addInPlace(liveOffset);

            if(player.role === "DEF"){

                let influence = 0.25;

                target.x += (ballPos.x - player.homePosition.x) * influence;
                target.z += (ballPos.z - player.homePosition.z) * influence;

            }

            if(player.role === "ATT"){

                target.x += (ballPos.x - player.homePosition.x) * 0.3;
                target.z += (player.homePosition.z - ballPos.z) * 0.2;

            }

            if(player.role === "GK"){

                target.x = player.homePosition.x;

                target.z += (ballPos.z - player.homePosition.z) * 0.2;
            }

            target.x = Math.max(player.minX, Math.min(player.maxX, target.x));
            target.z = Math.max(player.minZ, Math.min(player.maxZ, target.z));

            this.movePlayerTowards(player, target);
            return;
        }
    }
    
    movePlayerTowards(player, target) {
        if (player.isTackling) return;

        const dir = target.subtract(player.position);
        const dist = dir.length();

        if (dist < 0.15) {
            if (player.playAnimation) {
                player.playAnimation("idle");
            }
            return;
        }

        dir.normalize();
        player.facingDirection = dir.clone();

        const speed = 0.07;
        player.move(dir.x, dir.z, speed);
    }

    resetPositions(){

        this.players.forEach(player=>{

            player.position = player.initialPosition.clone();
            
            if(player.model){
                player.model.rotation.y = player.initialRotationY;
                player.model.rotation.z = 0;
            }

            if(player.playAnimation){
                player.playAnimation("idle");
            }
        });
    }

    switchPlayer(newPlayer, cameras){

        if(!newPlayer) return;

        this.activePlayer = newPlayer;

        if(cameras){
            // Très important :
            // on NE change PAS lockedTarget ici
            // la TPS doit rester lock sur cameraTargetNode

            if(cameras.fpvCamera){
                cameras.fpvCamera.parent = newPlayer;
            }
        }
    }

    switchPlayerSmooth(newPlayer, cameras, scene, duration = 180){

        if(!newPlayer) return;
        if(newPlayer === this.activePlayer) return;

        const oldPlayer = this.activePlayer;

        this.activePlayer = newPlayer;

        if(cameras?.fpvCamera){
            cameras.fpvCamera.parent = newPlayer;
        }

        // Si on est en TPS, on anime le pivot caméra
        if(
            scene &&
            cameras &&
            cameras.tpsCamera &&
            cameras.cameraTargetNode &&
            scene.activeCamera === cameras.tpsCamera &&
            oldPlayer
        ){
            animateCameraSwitch(scene, cameras, oldPlayer, newPlayer, duration);
        }
        else if(cameras?.cameraTargetNode){
            // sinon on replace direct le pivot
            cameras.cameraTargetNode.position.copyFrom(newPlayer.position);
        }
    }

    getClosestPlayerToBall(ball){

        let closest = null;
        let bestDist = Infinity;

        this.players.forEach(player=>{

            const dist = BABYLON.Vector3.Distance(
                player.position,
                ball.position
            );

            if(dist < bestDist){
                bestDist = dist;
                closest = player;
            }

        });

        return closest;
    }

    hasBall(ball){

        // pendant un court instant après une passe / frappe,
        // on considère encore que l'équipe a la possession
        if(performance.now() < this.teamPossessionLockUntil){
            return true;
        }

        if(!this.activePlayer) return false;

        const dist = BABYLON.Vector3.Distance(
            this.activePlayer.position,
            ball.position
        );

        return dist < 8;
    }

    teamHasBall(ball){

        // Pendant un court instant après une passe / frappe,
        // on considère encore que l'équipe a la possession
        if(performance.now() < this.teamPossessionLockUntil){
            return true;
        }

        for(const player of this.players){
            if(!player || !player.position) continue;

            const dist = BABYLON.Vector3.Distance(
                player.position,
                ball.position
            );

            if(dist < 3){
                return true;
            }
        }

        return false;
    }

    // Trouve le joueur de champ le plus proche de la balle
    getClosestFieldPlayerToBall(ball){

        let closest = null;
        let bestDist = Infinity;

        this.players.forEach(player=>{

            if(player === this.activePlayer) return;

            if(player.role === "GK") return;

            if(player === this.lastBallPlayer) return;

            const dist = BABYLON.Vector3.Distance(
                player.position,
                ball.position
            );

            if(dist < bestDist){
                bestDist = dist;
                closest = player;
            }

        });

        return closest;
    }

    autoSwitch(ball, cameras){
        const now = performance.now();

        if (now < this.goalEmergencyModeUntil) return;

        // Auto switch uniquement quand MON équipe a la balle
        if(!this.teamHasBall(ball)) return;

        if(now < this.switchLockUntil) return;
        if(now - this.lastSwitchTime < this.switchCooldown) return;

        const closest = this.getClosestPlayerToBall(ball);

        if(!closest) return;
        if(closest === this.activePlayer) return;

        const distActive = BABYLON.Vector3.Distance(
            this.activePlayer.position,
            ball.position
        );

        const distClosest = BABYLON.Vector3.Distance(
            closest.position,
            ball.position
        );

        if(distClosest + 1 < distActive){
            this.switchPlayerSmooth(closest, cameras, this.scene, 180);
            this.lastSwitchTime = now;
        }
    }

    lockAutoSwitch(duration = 600){
        this.switchLockUntil = performance.now() + duration;
    }

    lockTeamPossession(duration = 1200){
        this.teamPossessionLockUntil = performance.now() + duration;
    }

    switchLeft(){
        return this.getPlayerOnSide("left");
    }

    switchRight(){
        return this.getPlayerOnSide("right");
    }

    getPlayerOnSide(direction){

        const current = this.activePlayer;
        if(!current) return null;

        let bestPlayer = null;
        let bestScore = -Infinity;

        this.players.forEach(player => {

            if(player === current) return;

            const dx = player.position.x - current.position.x;
            const dz = player.position.z - current.position.z;

            const dist = Math.sqrt(dx*dx + dz*dz);

            // vecteur direction
            const dir = new BABYLON.Vector3(dx,0,dz).normalize();

            // axe droite/gauche
            const right = new BABYLON.Vector3(0,0,-1);

            let score;

            if(direction === "right"){
                score = BABYLON.Vector3.Dot(dir, right);
            }
            else{
                score = BABYLON.Vector3.Dot(dir, right.scale(-1));
            }

            // on pénalise la distance
            score = score - dist * 0.02;

            if(score > bestScore){
                bestScore = score;
                bestPlayer = player;
            }

        });

        return bestPlayer;
    }

    getLiveOffset(player, amplitude = 1.2, speed = 0.0015){

        const time = performance.now() * speed;

        return new BABYLON.Vector3(
            Math.sin(time + player.homePosition.x) * amplitude,
            0,
            Math.cos(time + player.homePosition.z) * amplitude
        );
    }


}