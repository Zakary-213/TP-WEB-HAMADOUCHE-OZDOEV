export const gamepadState = {
    index: null,
    lastShootPressed: false,
    lastTacklePressed: false,
    lastL1Pressed: false,
    lastR1Pressed: false,
    lastOptionsPressed: false,
    lastSkipPressed: false
};

export function getActiveGamepad() {
    const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
    if (gamepadState.index !== null && pads[gamepadState.index]) {
        return pads[gamepadState.index];
    }
    for (let i = 0; i < pads.length; i += 1) {
        if (pads[i]) return pads[i];
    }
    return null;
}

export function getPrimaryStick(axes) {
    const list = Array.isArray(axes) ? axes : [];
    if (list.length < 2) return { x: 0, y: 0 };

    if (list.length >= 4) {
        const mag01 = Math.abs(list[0]) + Math.abs(list[1]);
        const mag23 = Math.abs(list[2]) + Math.abs(list[3]);
        if (mag23 > mag01 * 1.2) {
            return { x: list[2], y: list[3] };
        }
    }

    return { x: list[0], y: list[1] };
}

export function setupGamepadNotifications() {
    const notif = document.getElementById("gamepad-notif");
    const notifName = document.getElementById("gamepad-name");
    const menu = document.getElementById("main-menu");
    if (!notif || !notifName) return;

    let hideTimeout = null;

    function showNotif(message, durationMs) {
        if (menu && (menu.classList.contains("is-hidden") || menu.getAttribute("aria-hidden") === "true")) {
            return;
        }
        notifName.textContent = message;
        notif.style.display = "flex";
        if (hideTimeout) window.clearTimeout(hideTimeout);
        hideTimeout = window.setTimeout(function () {
            notif.style.display = "none";
        }, durationMs || 3000);
    }

    function shortName(id) {
        if (!id) return "Manette";
        return id.length > 30 ? id.substring(0, 30) + "..." : id;
    }

    function handleConnect(gamepad) {
        if (!gamepad) return;
        if (typeof gamepad.index === "number") {
            gamepadState.index = gamepad.index;
        }
        showNotif(shortName(gamepad.id) + " connectee !");
    }

    function handleDisconnect(gamepad) {
        if (!gamepad) return;
        if (typeof gamepad.index === "number" && gamepadState.index === gamepad.index) {
            gamepadState.index = null;
        }
        showNotif(shortName(gamepad.id) + " deconnectee !");
    }

    if (window.BABYLON && BABYLON.GamepadManager) {
        const gamepadManager = new BABYLON.GamepadManager();
        gamepadManager.onGamepadConnectedObservable.add(handleConnect);
        gamepadManager.onGamepadDisconnectedObservable.add(handleDisconnect);
    }

    window.addEventListener("gamepadconnected", function (event) {
        handleConnect(event.gamepad);
    });

    window.addEventListener("gamepaddisconnected", function (event) {
        handleDisconnect(event.gamepad);
    });

    function scanExistingGamepads() {
        const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
        for (let i = 0; i < pads.length; i += 1) {
            if (pads[i] && pads[i].connected) {
                showNotif(shortName(pads[i].id) + " connectee !", 4000);
                return true;
            }
        }
        return false;
    }

    scanExistingGamepads();

    let scanCount = 0;
    const scanTimer = window.setInterval(function () {
        scanCount += 1;
        if (scanExistingGamepads() || scanCount >= 10) {
            window.clearInterval(scanTimer);
        }
    }, 500);
}
