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
        // side = 1 (gauche, notre équipe) ou -1 (droite, adversaire)
        const startX = -20 * side; // Milieu de notre moitié de terrain

        // Positions relatives pour une formation basique (ex: 1 gardien, 2 défenseurs, 2 attaquants)
        const formationPositions = [
            new BABYLON.Vector3(startX - (15 * side), 0, 0),     // Gardien
            new BABYLON.Vector3(startX - (5 * side), 0, -10),    // Défenseur 1
            new BABYLON.Vector3(startX - (5 * side), 0, 10),     // Défenseur 2
            new BABYLON.Vector3(startX + (5 * side), 0, -8),     // Attaquant 1
            new BABYLON.Vector3(startX + (5 * side), 0, 8)       // Attaquant 2
        ];

        formationPositions.forEach(pos => {
            this.addPlayer(pos, side);
        });
    }

    update(ball) {
        // Logique commune de mise à jour à chaque frame
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

        if(cameras && cameras.tpsCamera){
            cameras.tpsCamera.lockedTarget = newPlayer;
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


}
