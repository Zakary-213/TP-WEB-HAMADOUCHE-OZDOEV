document.addEventListener("DOMContentLoaded", () => {

    const rulesOverlay = document.querySelector(".rules-overlay");
    const rulesBtn = document.querySelector(".Regles");
    const rulesClose = document.querySelector(".rules-close");

    const tabs = document.querySelectorAll(".rules-tab");
    const panels = document.querySelectorAll(".rules-panel");

    // Ouvrir
    rulesBtn.addEventListener("click", () => {
        rulesOverlay.classList.add("active");
        rulesOverlay.setAttribute("aria-hidden", "false");
    });

    // Fermer
    rulesClose.addEventListener("click", () => {
        rulesOverlay.classList.remove("active");
        rulesOverlay.setAttribute("aria-hidden", "true");
    });

    // Gestion onglets
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {

            tabs.forEach(t => t.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));

            tab.classList.add("active");

            const target = document.getElementById(tab.dataset.tab);
            target.classList.add("active");
        });
    });

});
