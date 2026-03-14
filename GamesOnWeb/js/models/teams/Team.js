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




}
