const rows = document.querySelectorAll(".ruleRow");

function reveal() {
    rows.forEach(row => {
        const rect = row.getBoundingClientRect();

        if (rect.top < window.innerHeight - 100) {
            row.classList.add("visible");
        }
    });
}

window.addEventListener("scroll", reveal);
window.addEventListener("load", reveal);