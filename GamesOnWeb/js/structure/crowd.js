/**
 * StadiumCrowd — Supporters en tribune via Thin Instances (sphères qui sautent)
 * 
 * Principe :
 *  - 1 sphère low-poly par fan → Thin Instances = 1 draw call GPU par tribune
 *  - La couleur est celle de l'équipe (material.diffuseColor, partagé par tribune)
 *  - Animation : vague de sauts (Mexican Wave) via mise à jour du buffer matrice chaque frame
 */
class StadiumCrowd {

    /** @param {BABYLON.Scene} scene */
    constructor(scene) {
        this.scene    = scene;
        this._time    = 0;
        this._stands  = []; // une entrée par tribune
        this._template = this._makeTemplate();
    }

    // ─── Mesh modèle (sphère, jamais affichée directement) ───────────────────

    _makeTemplate() {
        const sphere = BABYLON.MeshBuilder.CreateSphere("_crowdTpl", {
            diameter:    0.7,   // taille d'une "tête/boule"
            segments:    3      // très low-poly → parfait pour une foule
        }, this.scene);
        sphere.isVisible = false;
        return sphere;
    }

    // ─── Ajoute une tribune avec ses supporters ───────────────────────────────

    /**
     * @param {BABYLON.TransformNode} standGroup  nœud parent de la tribune
     * @param {number}   length      longueur de la tribune (axe X local)
     * @param {number[]} teamRGB     [r, g, b] couleur de l'équipe (valeurs 0-1)
     * @param {Array}    rowInfos    [{y, z}] position locale de chaque rangée
     * @param {number}   [seed]      décalage de phase pour la vague
     * @param {number}   [density]   0..1 densité de supporters (1 = tribune pleine)
     */
    addCrowdToStand(standGroup, length, teamRGB, rowInfos, seed = 0, density = 1) {
        if (!rowInfos || rowInfos.length === 0) return;

        const SPACING   = 1.2;   // distance entre deux fans
        const ROW_TOP   = 0.3;   // demi-hauteur du gradin (rowHeight / 2)
        const BALL_R    = 0.35;  // rayon de la sphère

        const d = Math.min(1, Math.max(0.15, density)); // borne la densité

        // Pour éviter d'avoir des dizaines de milliers de sphères
        // (qui peuvent poser problème suivant le GPU), on limite
        // légèrement le nombre de supporters par rangée et le
        // nombre de rangées utilisées pour la foule.
        const MAX_PER_ROW = 40;
        const MAX_ROWS    = 64;

        // Densité horizontale (nombre de supporters par rangée)
        const basePerRow = Math.min(MAX_PER_ROW, Math.max(1, Math.floor(length / SPACING)));
        const perRow     = Math.max(1, Math.round(basePerRow * d));
        const startX     = -length / 2 + SPACING / 2;

        // Densité verticale (nombre de rangées occupées)
        const maxUsableRows    = Math.min(MAX_ROWS, rowInfos.length);
        const targetRowCount   = Math.max(1, Math.round(maxUsableRows * d));
        let rowsForFans = [];

        if (targetRowCount === rowInfos.length) {
            rowsForFans = rowInfos.slice();
        } else if (targetRowCount === 1) {
            rowsForFans.push(rowInfos[Math.floor((rowInfos.length - 1) / 2)]);
        } else {
            // On prend des rangées régulièrement espacées de bas en haut
            for (let k = 0; k < targetRowCount; k++) {
                const tPos = k / (targetRowCount - 1);
                const idx  = Math.round(tPos * (rowInfos.length - 1));
                rowsForFans.push(rowInfos[idx]);
            }
        }

        const total = perRow * rowsForFans.length;

        // ── Clone du template + matériau de la couleur d'équipe ─────────────
        const mesh = this._template.clone("crowd_" + standGroup.name);
        mesh.isVisible = true;
        mesh.parent    = standGroup;

        const mat = new BABYLON.StandardMaterial("crowdMat_" + standGroup.name, this.scene);
        mat.diffuseColor  = new BABYLON.Color3(teamRGB[0], teamRGB[1], teamRGB[2]);
        mat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        mesh.material = mat;

        // ── Buffers ──────────────────────────────────────────────────────────
        const matrices  = new Float32Array(total * 16);
        const basePosY  = new Float32Array(total);   // Y de repos (sans saut)
        const posX      = new Float32Array(total);   // X pour la phase de vague
        const posZ      = new Float32Array(total);   // Z fixe (ne dépend pas de la matrice animée)

        const tmp = new BABYLON.Matrix();
        let idx = 0;

        for (const row of rowsForFans) {
            const restY = row.y + ROW_TOP + BALL_R;  // boule posée sur le gradin

            for (let f = 0; f < perRow; f++) {
                const x = startX + f * SPACING;

                basePosY[idx] = restY;
                posX[idx]     = x;
                posZ[idx]     = row.z;

                BABYLON.Matrix.TranslationToRef(x, restY, row.z, tmp);
                tmp.copyToArray(matrices, idx * 16);
                idx++;
            }
        }

        mesh.thinInstanceSetBuffer("matrix", matrices, 16);

        this._stands.push({ mesh, matrices, basePosY, posX, posZ, count: total, seed });
    }

    // ─── Animation : vague de sauts ──────────────────────────────────────────

    startAnimation() {
        this._obs = this.scene.onBeforeRenderObservable.add(() => {
            this._time += this.scene.getEngine().getDeltaTime() / 1000;
            this._tick();
        });
    }

    _tick() {
        const t   = this._time;
        const tmp = new BABYLON.Matrix();

        for (const s of this._stands) {
            const { mesh, matrices, basePosY, posX, posZ, count, seed } = s;
            const JUMP_HEIGHT = 1.2;  // hauteur de saut en unités
            const JUMP_SPEED  = 2.2;  // vitesse de la vague
            const WAVE_FREQ   = 0.28; // fréquence spatiale (propagation)

            for (let i = 0; i < count; i++) {
                // sin positif uniquement → rebond vers le haut seulement
                const phase  = t * JUMP_SPEED + posX[i] * WAVE_FREQ + seed;
                const bounce = Math.max(0, Math.sin(phase));
                const y      = basePosY[i] + bounce * JUMP_HEIGHT;

                BABYLON.Matrix.TranslationToRef(posX[i], y, posZ[i], tmp);
                tmp.copyToArray(matrices, i * 16);
            }

            mesh.thinInstanceSetBuffer("matrix", matrices, 16);
        }
    }

    dispose() {
        if (this._obs) this.scene.onBeforeRenderObservable.remove(this._obs);
        if (this._template) this._template.dispose();
    }
}
