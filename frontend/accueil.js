document.addEventListener("DOMContentLoaded", () => {

    const tabs = document.querySelectorAll(".awardsTab");
    const grid = document.getElementById("awardsGrid");
    const cards = document.querySelectorAll(".awardCard");
    const button = document.getElementById("awardsMoreBtn");

    let currentIndex = 0;

    const gamesData = [
        ["./assets/images/logo.png","./assets/images/logo.png","./assets/images/logo.png","./assets/images/logo.png"],
        ["./assets/images/logo.png","./assets/images/logo.png","./assets/images/logo.png","./assets/images/logo.png"],
        ["./assets/images/logo.png","./assets/images/logo.png","./assets/images/logo.png","./assets/images/logo.png"]
    ];

    function spawnCards(images) {
        button.classList.remove("is-visible");

        let loadedCount = 0;

        cards.forEach((card, i) => {
            const img = card.querySelector("img");

            card.classList.remove("is-loaded");
            img.style.opacity = 0;
            img.removeAttribute('src');

            setTimeout(() => {
                const desired = images[i];
                const withoutDot = desired.replace(/^\.\//, '');

                const markLoaded = () => {
                    loadedCount++;
                    if (loadedCount >= images.length) {
                        setTimeout(() => button.classList.add("is-visible"), 300);
                    }
                };

                img.onload = () => {
                    setTimeout(() => {
                        card.classList.add("is-loaded");
                    }, 100);
                    markLoaded();
                };

                img.onerror = (e) => {
                    console.error('image error for card', i, withoutDot, e);
                    if (withoutDot !== desired && (!img.src || img.src.endsWith(desired))) {
                        console.log('trying fallback path', withoutDot);
                        img.src = withoutDot;
                        return;
                    }
                    markLoaded();
                };

                img.src = withoutDot;
            }, i * 500);
        });
    }

    function switchGame(newIndex) {
        if (newIndex === currentIndex) return;

        const direction = newIndex > currentIndex ? "left" : "right";

        grid.classList.add(direction === "left" ? "is-left" : "is-right");

        setTimeout(() => {

            cards.forEach(card => {
                card.classList.remove("is-loaded");
            });

            button.classList.remove("is-visible");

            spawnCards(gamesData[newIndex]);

            grid.classList.remove("is-left", "is-right");

        }, 600);

        tabs.forEach(t => t.classList.remove("active"));
        tabs[newIndex].classList.add("active");

        currentIndex = newIndex;
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => switchGame(index));
    });

    spawnCards(gamesData[0]);
});