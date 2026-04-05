// js/ui/mainMenu.js
// Menu principal: preview video on hover/focus, with optional close action.

(function () {
    "use strict";

    var menu = document.getElementById("main-menu");
    if (!menu) return;

    var tiles = menu.querySelectorAll(".menu-tile[data-preview]");
    var tournamentTile = menu.querySelector(".menu-tile[data-preview='tournament']");
    var settingsTile = menu.querySelector(".menu-tile--settings");
    var previewFrames = menu.querySelectorAll(".menu-preview-frame");
    var closeButtons = menu.querySelectorAll("[data-menu-action='close']");

    function setActivePreview(key) {
        previewFrames.forEach(function (frame) {
            var isTarget = frame.dataset.preview === key;
            frame.classList.toggle("is-active", isTarget);

            var video = frame.querySelector(".menu-preview-video");
            if (!video) return;

            if (isTarget) {
                var dataSrc = video.getAttribute("data-src");
                if (dataSrc && !video.src) {
                    video.src = dataSrc;
                }
                if (video.src) {
                    video.play().catch(function () { /* autoplay may be blocked */ });
                }
            } else {
                if (!video.paused) video.pause();
                video.currentTime = 0;
            }
        });
    }

    function resetPreview() {
        setActivePreview("idle");
    }

    tiles.forEach(function (tile) {
        var key = tile.dataset.preview;
        tile.addEventListener("mouseenter", function () { setActivePreview(key); });
        tile.addEventListener("focus", function () { setActivePreview(key); });
        tile.addEventListener("mouseleave", resetPreview);
        tile.addEventListener("blur", resetPreview);
    });

    if (settingsTile) {
        settingsTile.addEventListener("click", function () {
            if (window.settingsMenu && typeof window.settingsMenu.open === "function") {
                window.settingsMenu.open();
            }
        });
    }

    if (tournamentTile) {
        tournamentTile.addEventListener("click", function () {
            menu.classList.add("is-hidden");
            menu.setAttribute("aria-hidden", "true");
            if (typeof window.startTournamentMatch === "function") {
                window.startTournamentMatch();
            }
        });
    }

    closeButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            menu.classList.add("is-hidden");
            menu.setAttribute("aria-hidden", "true");
        });
    });

    resetPreview();
})();
