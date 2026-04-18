document.addEventListener("DOMContentLoaded", () => {

    const tabs = document.querySelectorAll(".awardsTab");
    const grid = document.getElementById("awardsGrid");
    const cards = document.querySelectorAll(".awardCard");
    const button = document.getElementById("awardsMoreBtn");

    let currentIndex = 0;
    let isTransitioning = false;
    let spawnTimeouts = [];

    const gamesData = [
        ["./assets/images/canvas1.png","./assets/images/canvas2.png","./assets/images/canvas3.png","./assets/images/canvas4.png"],
        ["./assets/images/gow1.png","./assets/images/gow2.png","./assets/images/gow3.png","./assets/images/gow4.png"],
        ["./assets/images/logo.png","./assets/images/logo.png","./assets/images/logo.png","./assets/images/logo.png"]
    ];

    const gameHrefs = ["/JeuCanvas/index.html", "/GamesOnWeb/index.html", "#"];

    function spawnCards(images, onAllLoaded) {
        // cancel any pending spawns from a previous call
        spawnTimeouts.forEach(id => clearTimeout(id));
        spawnTimeouts = [];

        let loadedCount = 0;
        cards.forEach((card, i) => {
            const img = card.querySelector("img");

            card.classList.remove("is-loaded");
            img.style.opacity = 0;
            img.removeAttribute('src');

            const t = setTimeout(() => {
                const desired = images[i];
                const withoutDot = desired.replace(/^\.\//, '');

                const markLoaded = () => {
                    loadedCount++;
                    if (loadedCount >= images.length) {
                        if (typeof onAllLoaded === 'function') onAllLoaded();
                        else setTimeout(() => button.classList.add("is-visible"), 300);
                    }
                };

                img.onload = () => {
                    setTimeout(() => {
                        card.classList.add("is-loaded");
                        let finished = false;
                        const onTrans = (ev) => {
                            if (ev.target !== img) return;
                            if (ev.propertyName !== 'opacity' && ev.propertyName !== 'transform') return;
                            if (finished) return;
                            finished = true;
                            img.removeEventListener('transitionend', onTrans);
                            clearTimeout(fallback);
                            markLoaded();
                        };

                        const fallback = setTimeout(() => {
                            if (finished) return;
                            finished = true;
                            img.removeEventListener('transitionend', onTrans);
                            markLoaded();
                        }, 1200);

                        img.addEventListener('transitionend', onTrans);
                    }, 100);
                };

                img.onerror = (e) => {
                    console.error('image error for card', i, withoutDot, e);
                    if (withoutDot !== desired && (!img.src || img.src.endsWith(desired))) {
                        console.log('trying fallback path', withoutDot);
                        img.src = withoutDot;
                        return;
                    }
                    setTimeout(() => {
                        card.classList.add('is-loaded');
                        markLoaded();
                    }, 120);
                };

                img.src = withoutDot;
            }, i * 500);
            spawnTimeouts.push(t);
        });
    }

    function switchGame(newIndex) {
        if (newIndex === currentIndex) return;

        if (isTransitioning) return;
        isTransitioning = true;

        const direction = newIndex > currentIndex ? "left" : "right";

        button.classList.remove("is-visible");

        grid.classList.add(direction === "left" ? "is-left" : "is-right");

        setTimeout(() => {

            cards.forEach(card => {
                card.classList.remove("is-loaded");
            });

            let imagesLoaded = false;
            let transitionDone = false;

            const finish = () => {
                isTransitioning = false;
                button.classList.add("is-visible");
            };

            const onAllLoaded = () => {
                imagesLoaded = true;
                if (transitionDone) finish();
            };

            const onTransitionBack = (e) => {
                if (e.target !== grid) return;
                if (e.propertyName !== 'transform' && e.propertyName !== 'opacity') return;
                grid.removeEventListener('transitionend', onTransitionBack);
                transitionDone = true;
                if (imagesLoaded) finish();
            };

            spawnCards(gamesData[newIndex], onAllLoaded);

            grid.addEventListener('transitionend', onTransitionBack);
            grid.classList.remove("is-left", "is-right");

        }, 600);

        tabs.forEach(t => t.classList.remove("active"));
        tabs[newIndex].classList.add("active");

        if (button) button.setAttribute("href", gameHrefs[newIndex] || "#");

        currentIndex = newIndex;
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => switchGame(index));
    });

    spawnCards(gamesData[0], () => button.classList.add('is-visible'));
});