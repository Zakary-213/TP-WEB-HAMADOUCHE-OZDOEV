document.addEventListener("DOMContentLoaded", () => {
    const media = document.getElementById("screenMedia");
    const video = document.getElementById("heroVideo");
    const content = document.getElementById("screenContent");
    const kicker = document.getElementById("screenKicker");
    const heading = document.getElementById("screenHeading");
    const text = document.getElementById("screenText");
    const playNowBtn = document.getElementById("playNowBtn");
    const watchTrailerBtn = document.getElementById("watchTrailerBtn");
    const dotsContainer = document.getElementById("screenDots");

    if (!media || !video || !content || !kicker || !heading || !text || !playNowBtn || !watchTrailerBtn || !dotsContainer) {
        return;
    }

    const slides = [
        {
            video: "./assets/videos/rl.mp4",
            kicker: "RÉFLEXES • SURVIE • SCORE",
            heading: "ESQUIVE LES MÉTÉORES<br>ET BATS<br>TON RECORD",
            text: "Jeu d'arcade pur : pilote ton vaisseau à travers un champ d'astéroïdes. Plus tu dures, plus le score grimpe. Simple, intense, addictif.",
            playLabel: "Jouer",
            playHref: "/JeuCanvas/index.html"
        },
        {
            video: "./assets/videos/test.mp4",
            kicker: "FOOTBALL • ARCADE • TOURNOI",
            heading: "CHOISIS TON ÉQUIPE<br>ET AFFRONTE<br>L'IA",
            text: "10 équipes françaises, 4 stades, 2 modes de jeu. Lance un tournoi à élimination directe ou défie un ami en 1vs1. Plus tu avances, plus l'IA devient redoutable.",
            playLabel: "Jouer",
            playHref: "/GamesOnWeb/index.html"
        },
        {
            video: "./assets/videos/test2.mp4",
            kicker: "PLATEFORME • 2026 • WEB",
            heading: "DEUX JEUX,<br>UNE PLATEFORME,<br>SANS LIMITE",
            text: "Inscris-toi, suis tes scores et reviens battre tes records. GamesOnWeb 2026 — entièrement jouable dans ton navigateur.",
            playLabel: "Jouer",
            playHref: "#"
        }
    ];

    const AUTO_SWITCH_DELAY = 5000;
    const FREEZE_PREVIEW_DELAY = 180;
    const SWITCH_FADE_DELAY = 420;

    let currentIndex = 0;
    let autoSwitchTimeout = null;
    let freezeTimeout = null;
    let switchTimeout = null;
    let isTransitioning = false;
    let isVideoReady = false;
    let currentLoadToken = 0;
    let requestedMode = "frozen"; // "frozen" | "trailer"

    function clearFreezeTimeout() {
        if (freezeTimeout) {
            clearTimeout(freezeTimeout);
            freezeTimeout = null;
        }
    }

    function clearSwitchTimeout() {
        if (switchTimeout) {
            clearTimeout(switchTimeout);
            switchTimeout = null;
        }
    }

    function clearAutoSwitchTimeout() {
        if (autoSwitchTimeout) {
            clearTimeout(autoSwitchTimeout);
            autoSwitchTimeout = null;
        }
    }

    function scheduleAutoSwitch() {
        clearAutoSwitchTimeout();

        if (isTransitioning || requestedMode === "trailer") {
            return;
        }

        autoSwitchTimeout = setTimeout(() => {
            nextSlide();
        }, AUTO_SWITCH_DELAY);
    }

    function resetAutoSwitch() {
        scheduleAutoSwitch();
    }

    function updateContent(index) {
        const slide = slides[index];

        kicker.textContent = slide.kicker;
        heading.innerHTML = slide.heading;
        text.textContent = slide.text;

        const label = playNowBtn.querySelector("span");
        if (label) {
            label.textContent = slide.playLabel;
        }

        playNowBtn.setAttribute("href", slide.playHref);
    }

    function renderDots() {
        dotsContainer.innerHTML = "";

        slides.forEach((_, index) => {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "screenDot";
            dot.setAttribute("aria-label", `Vidéo ${index + 1}`);
            dot.dataset.index = index;

            if (index === currentIndex) {
                dot.classList.add("active");
            }

            dot.addEventListener("click", () => {
                requestedMode = "frozen";
                resetAutoSwitch();

                if (index === currentIndex) {
                    applyFrozenState();
                    return;
                }

                if (isTransitioning) {
                    return;
                }

                showSlide(index);
            });

            dotsContainer.appendChild(dot);
        });
    }

    function updateDots() {
        const dots = dotsContainer.querySelectorAll(".screenDot");
        dots.forEach((dot, index) => {
            dot.classList.toggle("active", index === currentIndex);
        });
    }

    async function safePlay() {
        try {
            await video.play();
            return true;
        } catch (err) {
            console.warn("Video play failed:", err);
            return false;
        }
    }

    function setFrozenUI() {
        media.classList.remove("trailer-active");
        content.classList.remove("is-hidden");
        video.classList.remove("is-playing");
        video.classList.add("is-frozen");
    }

    function setTrailerUI() {
        media.classList.add("trailer-active");
        content.classList.add("is-hidden");
        video.classList.remove("is-frozen");
        video.classList.add("is-playing");
    }

    async function applyFrozenState() {
        requestedMode = "frozen";
        clearFreezeTimeout();
        setFrozenUI();

        if (!isVideoReady) {
            return;
        }

        const played = await safePlay();
        if (!played) {
            return;
        }

        freezeTimeout = setTimeout(() => {
            video.pause();
        }, FREEZE_PREVIEW_DELAY);

        scheduleAutoSwitch();
    }

    async function applyTrailerState() {
        requestedMode = "trailer";
        clearFreezeTimeout();
        clearAutoSwitchTimeout();

        if (!isVideoReady) {
            return;
        }

        setTrailerUI();

        video.pause();
        video.currentTime = 0;

        const played = await safePlay();

        if (!played) {
            requestedMode = "frozen";
            await applyFrozenState();
        }
    }

    async function applyRequestedMode() {
        if (requestedMode === "trailer") {
            await applyTrailerState();
        } else {
            await applyFrozenState();
        }
    }

    function loadVideoSource(index) {
        return new Promise((resolve) => {
            const loadToken = ++currentLoadToken;
            isVideoReady = false;

            video.pause();
            clearFreezeTimeout();

            const onLoaded = () => {
                if (loadToken !== currentLoadToken) {
                    return;
                }

                cleanup();
                isVideoReady = true;
                resolve(true);
            };

            const onError = () => {
                if (loadToken !== currentLoadToken) {
                    return;
                }

                cleanup();
                console.warn("Failed to load video:", slides[index].video);
                resolve(false);
            };

            function cleanup() {
                video.removeEventListener("loadeddata", onLoaded);
                video.removeEventListener("canplay", onLoaded);
                video.removeEventListener("error", onError);
            }

            video.addEventListener("loadeddata", onLoaded);
            video.addEventListener("canplay", onLoaded);
            video.addEventListener("error", onError);

            video.src = slides[index].video;
            video.load();
        });
    }

    async function showSlide(index) {
        if (isTransitioning) return;

        isTransitioning = true;
        clearFreezeTimeout();
        clearAutoSwitchTimeout();
        clearSwitchTimeout();

        media.classList.add("is-switching");

        switchTimeout = setTimeout(async () => {
            currentIndex = index;
            updateDots();

            const loaded = await loadVideoSource(index);
            updateContent(index);

            if (!loaded) {
                media.classList.remove("is-switching");
                isTransitioning = false;
                requestedMode = "frozen";
                scheduleAutoSwitch();
                return;
            }

            requestAnimationFrame(() => {
                requestAnimationFrame(async () => {
                    media.classList.remove("is-switching");
                    isTransitioning = false;
                    await applyRequestedMode();
                });
            });
        }, SWITCH_FADE_DELAY);
    }

    function nextSlide() {
        requestedMode = "frozen";
        const nextIndex = (currentIndex + 1) % slides.length;
        showSlide(nextIndex);
    }

    watchTrailerBtn.addEventListener("click", async () => {
        requestedMode = "trailer";
        clearAutoSwitchTimeout();

        if (isTransitioning) {
            return;
        }

        if (!isVideoReady) {
            return;
        }

        await applyTrailerState();
    });

    media.addEventListener("mouseleave", async () => {
        if (requestedMode === "trailer") {
            requestedMode = "frozen";
            await applyFrozenState();
        }
    });

    video.addEventListener("ended", async () => {
        requestedMode = "frozen";
        await applyFrozenState();
    });

    renderDots();
    updateContent(0);
    showSlide(0);
});