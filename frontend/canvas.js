/* ========================================================
   CANVAS — Animations au scroll
   ======================================================== */

(() => {
    const rows = document.querySelectorAll(".ruleRow");
    if (!rows.length) return;

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
})();