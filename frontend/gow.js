/* ========================================================
   GAMES ON WEB — Animations & interactions
   ======================================================== */
(() => {
    // Animations au scroll sur les rangées règles
    const rows = document.querySelectorAll(".gowRow");
    if (rows.length) {
        if ("IntersectionObserver" in window) {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add("visible");
                            observer.unobserve(entry.target);
                        }
                    });
                },
                {
                    threshold: 0.15,
                    rootMargin: "0px 0px -80px 0px",
                }
            );
            rows.forEach((row) => observer.observe(row));
        } else {
            const reveal = () => {
                rows.forEach((row) => {
                    const rect = row.getBoundingClientRect();
                    if (rect.top < window.innerHeight - 100) {
                        row.classList.add("visible");
                    }
                });
            };
            window.addEventListener("scroll", reveal, { passive: true });
            window.addEventListener("load", reveal);
            reveal();
        }
    }

    // Onglets Clavier / Manette
    const tabs = document.querySelectorAll(".gowControlsTab");
    const panels = document.querySelectorAll(".gowControlsPanel");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const target = tab.getAttribute("data-target");

            tabs.forEach((t) => t.classList.remove("active"));
            panels.forEach((p) => p.classList.remove("active"));

            tab.classList.add("active");
            const panel = document.getElementById(target);
            if (panel) panel.classList.add("active");
        });
    });
})();