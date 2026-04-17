import { getSelectedTeamDisplayName } from "../utils/teamLabels.js";

export function setupTeams(scene, mode, tournamentStage) {
    const isVersusMode = mode === "versus";

    const readStoredMeshIndex = (storageKey) => {
        const storedMesh = window.localStorage.getItem(storageKey);
        const parsedMesh = Number.parseInt(storedMesh, 10);

        return Number.isInteger(parsedMesh) && parsedMesh >= 0 ? parsedMesh : null;
    };

    const myTeam = new PlayerTeam(scene, "My Team", new BABYLON.Color3(1, 0, 0));
    if (isVersusMode) {
        const storedP1Mesh = readStoredMeshIndex("gow-player1-skin-mesh-index");
        if (storedP1Mesh !== null) {
            myTeam.meshIndex = storedP1Mesh;
        }
    } else {
        myTeam.meshIndex = 1;
    }

    myTeam.createTeamFormation(1);

    let opponentTeam;
    if (isVersusMode) {
        myTeam.name = getSelectedTeamDisplayName("gow-player1-skin-ui", myTeam.name);
        opponentTeam = new PlayerTeam(scene, getSelectedTeamDisplayName("gow-player2-skin-ui", "Player 2"), new BABYLON.Color3(0, 0, 1));
        const storedP2Mesh = readStoredMeshIndex("gow-player2-skin-mesh-index");
        if (storedP2Mesh !== null) {
            opponentTeam.meshIndex = storedP2Mesh;
        }
    } else {
        switch (tournamentStage) {
            case "huitieme": opponentTeam = new AITeamHuitieme(scene, "Adversaire", new BABYLON.Color3(0, 0, 1)); break;
            case "quart": opponentTeam = new AITeamQuart(scene, "Adversaire", new BABYLON.Color3(0, 0, 1)); break;
            case "demi": opponentTeam = new AITeamDemi(scene, "Adversaire", new BABYLON.Color3(0, 0, 1)); break;
            case "finale": opponentTeam = new AITeamFinale(scene, "Adversaire", new BABYLON.Color3(0, 0, 1)); break;
            default: opponentTeam = new AITeamHuitieme(scene, "Adversaire", new BABYLON.Color3(0, 0, 1)); break;
        }
    }

    opponentTeam.createTeamFormation(-1);
    myTeam.opponents = opponentTeam.players;
    opponentTeam.opponents = myTeam.players;

    return { myTeam, opponentTeam };
}
