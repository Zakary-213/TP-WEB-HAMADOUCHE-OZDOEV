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

    function spawnCards(images, onAllLoaded) {
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
        });
    }

    function switchGame(newIndex) {
        if (newIndex === currentIndex) return;

        const direction = newIndex > currentIndex ? "left" : "right";

        button.classList.remove("is-visible");

        grid.classList.add(direction === "left" ? "is-left" : "is-right");

        setTimeout(() => {

            cards.forEach(card => {
                card.classList.remove("is-loaded");
            });

            let imagesLoaded = false;
            let transitionDone = false;

            const onAllLoaded = () => {
                imagesLoaded = true;
                if (transitionDone) button.classList.add("is-visible");
            };

            const onTransitionBack = (e) => {
                if (e.target !== grid) return;
                if (e.propertyName !== 'transform' && e.propertyName !== 'opacity') return;
                grid.removeEventListener('transitionend', onTransitionBack);
                transitionDone = true;
                if (imagesLoaded) button.classList.add("is-visible");
            };

            spawnCards(gamesData[newIndex], onAllLoaded);

            grid.addEventListener('transitionend', onTransitionBack);
            grid.classList.remove("is-left", "is-right");

        }, 600);

        tabs.forEach(t => t.classList.remove("active"));
        tabs[newIndex].classList.add("active");

        currentIndex = newIndex;
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => switchGame(index));
    });

    spawnCards(gamesData[0], () => button.classList.add('is-visible'));
});