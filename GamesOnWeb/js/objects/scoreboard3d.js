/**
 * scoreboard3d.js
 * Crée deux vrais panneaux de score style stade à chaque bord du terrain.
 * Chaque panneau a : deux poteaux métalliques, une poutre transversale, un cadre et un écran LED.
 * API : window.scoreBoard3D.updateScore(playerScore, aiScore)
 */
function createScoreboard3D(scene) {

    // ─── Apparence des matériaux ───────────────────────────────
    const metalColor  = new BABYLON.Color3(0.22, 0.22, 0.24);

    function metalMat(name) {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor   = metalColor;
        m.specularColor  = new BABYLON.Color3(0.5, 0.5, 0.5);
        m.specularPower  = 32;
        return m;
    }

    function frameMat(name) {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor  = new BABYLON.Color3(0.1, 0.1, 0.12);
        m.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        return m;
    }

    // ─── Texture LED (écran) ───────────────────────────────────
    const TEX_W = 512, TEX_H = 192;
    let leftTeamLabel = "YOU";
    let rightTeamLabel = "IA";

    function makeScreenTexture(name) {
        return new BABYLON.DynamicTexture(name, { width: TEX_W, height: TEX_H }, scene, true);
    }

    function drawScreen(tex, pScore, aScore, mirrored = false) {
        const ctx = tex.getContext();
        if (!ctx) return; // Garde contre le canvas destroyed
        
        ctx.clearRect(0, 0, TEX_W, TEX_H);

        ctx.save();
        
        // Si le panneau est retourné on retourne le canvas pour que le texte ne soit pas en miroir
        if (mirrored) {
            ctx.translate(TEX_W, 0);
            ctx.scale(-1, 1);
        }

        // Fond noir LED
        ctx.fillStyle = "#050508";
        ctx.fillRect(0, 0, TEX_W, TEX_H);

        // Légère grille de pixels (simulation LED)
        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        ctx.lineWidth = 1;
        for (let x = 0; x < TEX_W; x += 8) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,TEX_H); ctx.stroke(); }
        for (let y = 0; y < TEX_H; y += 8) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(TEX_W,y); ctx.stroke(); }

        // Nom équipe gauche - rouge
        ctx.font = "bold 40px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff4444";
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 14;
        ctx.fillText(leftTeamLabel, TEX_W * 0.18, TEX_H / 2 + 14);

        // Nom équipe droite - bleu
        ctx.fillStyle = "#4488ff";
        ctx.shadowColor = "#0044ff";
        ctx.fillText(rightTeamLabel, TEX_W * 0.82, TEX_H / 2 + 14);

        // Score (centre) - blanc lumineux
        ctx.font = "bold 72px 'Courier New', monospace";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#aaddff";
        ctx.shadowBlur = 20;
        ctx.fillText(`${pScore}`, TEX_W * 0.38, TEX_H / 2 + 24);
        ctx.fillText(`${aScore}`, TEX_W * 0.62, TEX_H / 2 + 24);

        // Trait séparateur
        ctx.font = "bold 50px 'Courier New', monospace";
        ctx.fillStyle = "#aaaaaa";
        ctx.shadowBlur = 8;
        ctx.fillText("-", TEX_W * 0.5, TEX_H / 2 + 18);

        ctx.restore(); // Reset shadow + transform

        tex.update();
    }

    // ─── Constructeur d'un panneau complet ─────────────────────
    function buildBoard(tag, position, rotY) {
        const root = new BABYLON.TransformNode("scoreboard_" + tag, scene);
        root.position = position;
        root.rotation.y = rotY;

        const mMetal = metalMat("metal_" + tag);
        const mFrame = frameMat("frame_" + tag);

        // --- Poteaux gauche / droite ---
        const poleH    = 14;
        const poleThk  = 0.6;
        const halfW    = 9;         // demi-largeur du panneau

        [-halfW, halfW].forEach((xOff, i) => {
            const pole = BABYLON.MeshBuilder.CreateCylinder("pole_" + i + tag, {
                height:         poleH,
                diameter:       poleThk,
                tessellation:   10
            }, scene);
            pole.position   = new BABYLON.Vector3(xOff, poleH / 2, 0);
            pole.material   = mMetal;
            pole.parent     = root;

            // Pied évasé
            const foot = BABYLON.MeshBuilder.CreateCylinder("foot_" + i + tag, {
                height:         0.8,
                diameterBottom: 1.4,
                diameterTop:    0.8,
                tessellation:   10
            }, scene);
            foot.position = new BABYLON.Vector3(xOff, 0.4, 0);
            foot.material = mMetal;
            foot.parent   = root;
        });

        // --- Poutre horizontale haute ---
        const beam = BABYLON.MeshBuilder.CreateBox("beam_" + tag, {
            width:  halfW * 2 + poleThk,
            height: poleThk * 0.8,
            depth:  poleThk * 0.8
        }, scene);
        beam.position = new BABYLON.Vector3(0, poleH - 1, 0);
        beam.material = mMetal;
        beam.parent   = root;

        // --- Cadre du panneau ---
        const screenW = halfW * 2 - 1;
        const screenH = 4.5;
        const screenY = poleH - 1 - screenH / 2 - poleThk * 0.4 - 0.1;
        const frameThk = 0.35;

        // Bords du cadre (haut, bas, gauche, droite)
        [
            [screenW, frameThk, screenY + screenH / 2 + frameThk / 2],          // haut
            [screenW, frameThk, screenY - screenH / 2 - frameThk / 2],          // bas
        ].forEach(([w, h, y], i) => {
            const b = BABYLON.MeshBuilder.CreateBox("fh_" + i + tag, { width: w + frameThk*2, height: frameThk, depth: 0.5 }, scene);
            b.position = new BABYLON.Vector3(0, y, -0.05);
            b.material = mFrame;
            b.parent   = root;
        });
        [
            [-screenW / 2 - frameThk / 2, screenY],
            [ screenW / 2 + frameThk / 2, screenY],
        ].forEach(([x, y], i) => {
            const b = BABYLON.MeshBuilder.CreateBox("fv_" + i + tag, { width: frameThk, height: screenH + frameThk*2, depth: 0.5 }, scene);
            b.position = new BABYLON.Vector3(x, y, -0.05);
            b.material = mFrame;
            b.parent   = root;
        });

        // --- Écran LED ---
        const screen = BABYLON.MeshBuilder.CreatePlane("screen_" + tag, {
            width:  screenW,
            height: screenH
        }, scene);
        screen.position = new BABYLON.Vector3(0, screenY, 0);
        screen.parent   = root;

        const tex = makeScreenTexture("tex_" + tag);
        const screenMat = new BABYLON.StandardMaterial("screenMat_" + tag, scene);
        screenMat.diffuseTexture  = tex;
        screenMat.emissiveTexture = tex;
        screenMat.backFaceCulling = false;
        screenMat.disableLighting = true;
        screen.material = screenMat;

        // Dessins initiaux
        // drawScreen(tex, 0, 0); // Original line
        // This call is now handled outside buildBoard to pass the correct mirrored flag
        // based on which board is being initialized.

        // --- Quelques supports diagonaux décoratifs ---
        [[-1, 1], [1, 1]].forEach(([sx, _], i) => {
            const supp = BABYLON.MeshBuilder.CreateBox("supp_" + i + tag, {
                width: 0.25, height: 3.5, depth: 0.25
            }, scene);
            supp.position = new BABYLON.Vector3(sx * (halfW - 1), poleH - 4.5, 0);
            supp.rotation.z = sx * 0.35;
            supp.material   = mMetal;
            supp.parent     = root;
        });

        return tex;
    }

    // ─── Panneau unique côté nord (Z=+38), face aux tribunes ──
    const texBack = buildBoard("back",
        new BABYLON.Vector3(0, 0, 38),
        Math.PI
    );

    // Dessin initial
    drawScreen(texBack, 0, 0, true);

    // ─── API publique ──────────────────────────────────────────
    window.scoreBoard3D = {
        setTeamLabels: function(leftLabel, rightLabel) {
            leftTeamLabel = leftLabel || "YOU";
            rightTeamLabel = rightLabel || "IA";
            drawScreen(texBack, window.gameScoreboard ? window.gameScoreboard.playerScore : 0, window.gameScoreboard ? window.gameScoreboard.aiScore : 0, true);
        },
        updateScore: function(playerScore, aiScore) {
            drawScreen(texBack, playerScore, aiScore, true);
        }
    };

    return window.scoreBoard3D;
}
