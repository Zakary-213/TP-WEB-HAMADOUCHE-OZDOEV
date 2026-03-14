class Team {
    constructor(scene, name, color, isPlayerControlled = false, meshIndex = 0) {
        this.scene = scene;
        this.name = name;
        this.color = color;
        this.isPlayerControlled = isPlayerControlled;
        this.meshIndex = meshIndex;
        
        this.players = []; 
        this.score = 0;
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

        newPlayer.homePosition = position.clone();
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

        this.players[0].role = "goalkeeper";
        this.players[1].role = "defender";
        this.players[2].role = "defender";
        this.players[3].role = "attacker";
        this.players[4].role = "attacker";
    }


update(ball, activePlayer){

    const attacking = ball.position.x * this.players[0].side > 0;

    // joueur le plus proche de la balle
    let closest = null;
    let minDist = Infinity;

    this.players.forEach(player => {

        const d = BABYLON.Vector3.Distance(player.position, ball.position);

        if(d < minDist){
            minDist = d;
            closest = player;
        }

    });

    this.players.forEach(player => {

        if(player.isHuman) return;

        // joueur le plus proche → pression balle
        if(player === closest){

            const dir = ball.position.subtract(player.position);
            dir.normalize();

            player.move(dir.x, dir.z, 0.07);
            return;
        }

        let target = player.homePosition.clone();

        if(attacking){

            if(player.role === "attacker"){
                target.x = ball.position.x - player.side * 6;
            }

            if(player.role === "defender"){
                target.x = ball.position.x - player.side * 16;
            }

        }else{

            if(player.role === "attacker"){
                target.x = player.homePosition.x - player.side * 5;
            }

            if(player.role === "defender"){
                target = player.homePosition.clone();
            }

        }

        this.moveToPosition(player,target);

    });

}

    moveToPosition(player, target){

        const dir = target.subtract(player.position);

        const dist = dir.length();

        if(dist < 0.5){
            player.move(0,0,0);
            return;
        }

        dir.normalize();

        player.move(dir.x, dir.z, 0.05);
    }

}
