class PlayerTeam extends Team {
    constructor(scene, name, color) {
        super(scene, name, color, true, 1); // meshIndex = 1 pour PlayerTeam
    }

    update(ball, input) {
        super.update(ball);
        // Logique spécifique liée aux inputs du joueur humain (clavier, manette)
    }
}
