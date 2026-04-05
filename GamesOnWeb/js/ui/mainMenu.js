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
    var focusable = Array.prototype.slice.call(menu.querySelectorAll(".menu-tile"));
    var lastNavAt = 0;
    var lastSubmitPressed = false;

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

    function isMenuVisible() {
        return !menu.classList.contains("is-hidden") && menu.getAttribute("aria-hidden") !== "true";
    }

    function getFocusIndex() {
        var active = document.activeElement;
        var idx = focusable.indexOf(active);
        return idx >= 0 ? idx : 0;
    }

    function focusAt(index) {
        if (!focusable.length) return;
        var i = index % focusable.length;
        if (i < 0) i += focusable.length;
        focusable[i].focus();
    }

    function moveFocus(delta) {
        focusAt(getFocusIndex() + delta);
    }

    function handleMenuNavKey(e) {
        if (!isMenuVisible()) return;
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            moveFocus(-1);
        } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            moveFocus(1);
        }
    }

    function getNavInputFromGamepad(pad) {
        if (!pad) return null;
        var axes = pad.axes || [];
        var deadzone = 0.4;
        var axX = axes.length > 0 ? axes[0] : 0;
        var axY = axes.length > 1 ? axes[1] : 0;
        if (Math.abs(axY) > Math.abs(axX)) {
            if (axY > deadzone) return "down";
            if (axY < -deadzone) return "up";
        } else {
            if (axX > deadzone) return "right";
            if (axX < -deadzone) return "left";
        }

        var btns = pad.buttons || [];
        if (btns[12] && btns[12].pressed) return "up";
        if (btns[13] && btns[13].pressed) return "down";
        if (btns[14] && btns[14].pressed) return "left";
        if (btns[15] && btns[15].pressed) return "right";

        return null;
    }

    function pollMenuGamepad() {
        if (isMenuVisible()) {
            var pads = (navigator.getGamepads && navigator.getGamepads()) || [];
            var pad = pads.find(function (p) { return p && p.connected; }) || null;
            var nav = getNavInputFromGamepad(pad);
            var now = performance.now();
            if (nav && now - lastNavAt > 180) {
                lastNavAt = now;
                if (nav === "left" || nav === "up") moveFocus(-1);
                if (nav === "right" || nav === "down") moveFocus(1);
            }
            var submit = pad && pad.buttons && pad.buttons[0] && pad.buttons[0].pressed;
            if (submit && !lastSubmitPressed) {
                var active = document.activeElement;
                if (active && typeof active.click === "function") {
                    active.click();
                }
            }
            lastSubmitPressed = !!submit;
        }
        window.requestAnimationFrame(pollMenuGamepad);
    }

    tiles.forEach(function (tile) {
        var key = tile.dataset.preview;
        tile.addEventListener("mouseenter", function () { setActivePreview(key); });
        tile.addEventListener("focus", function () { setActivePreview(key); });
        tile.addEventListener("mouseleave", resetPreview);
        tile.addEventListener("blur", resetPreview);
    });

    window.addEventListener("keydown", handleMenuNavKey, true);
    pollMenuGamepad();

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
