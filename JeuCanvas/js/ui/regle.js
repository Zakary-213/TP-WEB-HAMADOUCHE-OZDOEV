/**
 * @module regle
 * @description Gère l'interface utilisateur des règles du jeu.
 * Contrôle l'ouverture/fermeture de l'overlay et la navigation par onglets.
 */

document.addEventListener("DOMContentLoaded", () => {

    // --- RÉFÉRENCES ÉLÉMENTS DOM ---
    const rulesOverlay = document.querySelector(".rules-overlay");
    const rulesBtn = document.querySelector(".Regles");
    const rulesClose = document.querySelector(".rules-close");

    const tabs = document.querySelectorAll(".rules-tab");
    const panels = document.querySelectorAll(".rules-panel");

    /**
     * Ouvre la fenêtre des règles.
     */
    if (rulesBtn) {
        rulesBtn.addEventListener("click", () => {
            rulesOverlay.classList.add("active");
            rulesOverlay.setAttribute("aria-hidden", "false");
        });
    }

    /**
     * Ferme la fenêtre des règles.
     */
    if (rulesClose) {
        rulesClose.addEventListener("click", () => {
            rulesOverlay.classList.remove("active");
            rulesOverlay.setAttribute("aria-hidden", "true");
        });
    }

    /**
     * Gère le basculement entre les différents panneaux de règles.
     * Utilise l'attribut 'data-tab' pour identifier le contenu à afficher.
     */
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {

            // 1. Nettoyage : On retire l'état actif de tous les onglets et panneaux
            tabs.forEach(t => t.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));

            // 2. Activation : On active l'onglet sur lequel l'utilisateur a cliqué
            tab.classList.add("active");

            // 3. Affichage du contenu : On récupère l'ID via le dataset 'tab'
            const targetId = tab.dataset.tab;
            const targetPanel = document.getElementById(targetId);

            if (targetPanel) {
                targetPanel.classList.add("active");
            }
        });
    });
});