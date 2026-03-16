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
    }

    addPlayer(position, side = 1) {
        const newPlayer = createPlayer(this.scene, position, this.color, this.meshIndex);
        
        // On modifie la taille du joueur pour qu'elle corresponde à ce qui était dans script.js
        if(newPlayer.model) {
            newPlayer.model.getChildMeshes().forEach(mesh => {
                mesh.scaling = new BABYLON.Vector3(8,8,8);
            });
        }
        
        // Ajout de la boite de collision
        newPlayer.ellipsoid = new BABYLON.Vector3(1,1,1);
        newPlayer.checkCollisions = true;

        // Orientation de base selon le côté de l'équipe
        // side = 1 : équipe de gauche (regarde vers +X)
        // side = -1 : équipe de droite (regarde vers -X, donc vers l'adversaire)
        newPlayer.side = side;
        
        // Sauvegarde de la position et rotation initiale pour le reset après un but
        newPlayer.initialPosition = position.clone();
        newPlayer.initialRotationY = side === 1 ? Math.PI / 2 : -Math.PI / 2;

        this.players.push(newPlayer);
        return newPlayer;
    }

    createTeamFormation(side) {

        const startX = -20 * side;

        const formation = [
            { role: "GK",  pos: new BABYLON.Vector3(startX - (15 * side), 0, 0) },
            { role: "DEF", pos: new BABYLON.Vector3(startX - (5 * side), 0, -10) },
            { role: "DEF", pos: new BABYLON.Vector3(startX - (5 * side), 0, 10) },
            { role: "ATT", pos: new BABYLON.Vector3(startX + (5 * side), 0, -8) },
            { role: "ATT", pos: new BABYLON.Vector3(startX + (5 * side), 0, 8) }
        ];

        formation.forEach(data => {

            const player = this.addPlayer(data.pos, side);

            player.role = data.role;

            // position tactique de base
            player.homePosition = data.pos.clone();

            // état de l'IA
            player.state = "IDLE";

            if(player.role === "GK"){
                player.minX = player.homePosition.x - 2;
                player.maxX = player.homePosition.x + 2;
            }

            if(player.role === "DEF"){
                player.minX = player.homePosition.x - 10;
                player.maxX = 10;
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

        const closest = this.getClosestPlayerToBall(ball);

        this.players.forEach(player => {

            if(player === this.activePlayer) return;

            if(player === closest){
                player.state = "CHASE";
            }
            else{
                player.state = "POSITION";
            }

            this.updatePlayerAI(player, ball);

        });

    }

    updatePlayerAI(player, ball){

        if(player.state === "CHASE"){

            this.movePlayerTowards(player, ball.position);
            return;

        }

        const ballPos = ball.position;

        let target = player.homePosition.clone();

        // petit mouvement naturel
        const time = performance.now() * 0.005;

        target.z += Math.sin(time + player.position.x) * 0.5;
        target.x += Math.cos(time + player.position.z) * 0.5;

        // influence de la balle selon le rôle

        if(player.role === "DEF"){

            target.x += (ballPos.x - player.homePosition.x) * 0.3;
            target.z += (ballPos.z - player.homePosition.z) * 0.3;

        }

        if(player.role === "ATT"){

            target.x += (ballPos.x - player.homePosition.x) * 0.7;
            target.z += (ballPos.z - player.homePosition.z) * 0.7;

        }

        if(player.role === "GK"){

            target.x = player.homePosition.x;

            target.z += (ballPos.z - player.homePosition.z) * 0.2;

        }

        target.x = Math.max(player.minX, Math.min(player.maxX, target.x));
        target.z = Math.max(player.minZ, Math.min(player.maxZ, target.z));

        this.movePlayerTowards(player, target);

    }

    movePlayerTowards(player, target){

        const dir = target.subtract(player.position);

        const dist = dir.length();

        if(dist < 0.2) return;

        dir.normalize();

        const speed = 0.04;

        player.move(dir.x, dir.z, speed);

    }

    resetPositions() {
        this.players.forEach(player => {
            // Réinitialise la position physique
            player.position = player.initialPosition.clone();
            
            // Réinitialise la rotation du modèle 3D
            if (player.model) {
                player.model.rotation.y = player.initialRotationY;
                player.model.rotation.z = 0; // Annule toute rotation de course en cours
            }

            // Remet l'animation en idle
            if (player.playAnimation) {
                player.playAnimation("idle");
            }
        });
    }

    switchPlayer(newPlayer, cameras){

        if(!newPlayer) return;

        this.activePlayer = newPlayer;

        if(cameras){

            // TPS camera
            if(cameras.tpsCamera){
                cameras.tpsCamera.lockedTarget = newPlayer;
            }

            // FPV camera
            if(cameras.fpvCamera){
                cameras.fpvCamera.parent = newPlayer;
            }

        }

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

    switchLeft(cameras){

        const p = this.getPlayerOnSide("left");
        this.switchPlayer(p, cameras);

    }

    switchRight(cameras){

        const p = this.getPlayerOnSide("right");
        this.switchPlayer(p, cameras);

    }

    getClosestPlayerToBall(ball){

        let closest = null;
        let bestDist = Infinity;

        this.players.forEach(player => {

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

        // on exige un vrai avantage
        if(distClosest + 1 < distActive){

            this.switchPlayer(closest, cameras);
            this.lastSwitchTime = now;

        }

    }


}
