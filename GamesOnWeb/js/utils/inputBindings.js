// js/utils/inputBindings.js
// Centralized keybind storage + input controller

(function () {
    "use strict";

    const STORAGE_KEY = "gow.keybinds.v1";
    const STORAGE_KEY_P2 = "gow.keybinds.p2.v1";
    const GAMEPAD_STORAGE_KEY = "gow.gamepadbinds.v1";
    const DEFAULTS = {
        forward: "z",
        backward: "s",
        left: "q",
        right: "d",
        sprint: "Shift",
        shoot: "Space",
        tackle: "t",
        switchLeft: "a",
        switchRight: "e"
    };
    // Touches par défaut du joueur 2 : flèches + touches dédiées
    // Complètement séparées de celles du joueur 1 (ZQSD)
    const DEFAULTS_P2 = {
        forward: "ArrowUp",
        backward: "ArrowDown",
        left: "ArrowLeft",
        right: "ArrowRight",
        sprint: "RShift",
        shoot: "Enter",
        tackle: "NumpadDecimal",
        switchLeft: "Numpad4",
        switchRight: "Numpad6"
    };
    const DEFAULT_GAMEPAD = {
        shoot: 0,
        sprint: 7,
        tackle: 2,
        switchLeft: 4,
        switchRight: 5,
        options: 9
    };

    let bindings = loadBindings();
    let player2Bindings = loadPlayer2Bindings();
    let gamepadBindings = loadGamepadBindings();

    function loadBindings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { ...DEFAULTS };
            const parsed = JSON.parse(raw);
            return { ...DEFAULTS, ...(parsed || {}) };
        } catch (err) {
            return { ...DEFAULTS };
        }
    }

    function saveBindings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
        } catch (err) {
            // ignore storage failures
        }
    }

    function loadPlayer2Bindings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_P2);
            if (!raw) return { ...DEFAULTS_P2 };
            const parsed = JSON.parse(raw) || {};
            // Migration : si les touches sauvegardées sont identiques aux anciens
            // défauts J1 (forward=z, backward=s, left=q, right=d), on remet les
            // nouveaux défauts J2 (touches fléchées) pour éviter les conflits.
            const isOldP1Default =
                (parsed.forward || "").toLowerCase() === "z" &&
                (parsed.backward || "").toLowerCase() === "s" &&
                (parsed.left || "").toLowerCase() === "q" &&
                (parsed.right || "").toLowerCase() === "d";
            if (isOldP1Default) {
                return { ...DEFAULTS_P2 };
            }
            return { ...DEFAULTS_P2, ...parsed };
        } catch (err) {
            return { ...DEFAULTS_P2 };
        }
    }

    function savePlayer2Bindings() {
        try {
            localStorage.setItem(STORAGE_KEY_P2, JSON.stringify(player2Bindings));
        } catch (err) {
            // ignore storage failures
        }
    }

    function loadGamepadBindings() {
        try {
            const raw = localStorage.getItem(GAMEPAD_STORAGE_KEY);
            if (!raw) return { ...DEFAULT_GAMEPAD };
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_GAMEPAD, ...(parsed || {}) };
        } catch (err) {
            return { ...DEFAULT_GAMEPAD };
        }
    }

    function saveGamepadBindings() {
        try {
            localStorage.setItem(GAMEPAD_STORAGE_KEY, JSON.stringify(gamepadBindings));
        } catch (err) {
            // ignore storage failures
        }
    }

    function normalizeKeyValue(value) {
        if (!value) return null;
        if (value === "Shift") return "Shift";
        if (value === "Space") return "Space";
        if (value.length === 1) return value.toLowerCase();
        // Touches spéciales multi-caractères : ArrowUp, Enter, RShift, NumpadDecimal…
        // On les accepte telles quelles (la comparaison se fera via event.code)
        return value;
    }

    function valuesEqual(a, b) {
        if (!a || !b) return false;
        if (a === "Shift" || b === "Shift") return a === b;
        if (a === "Space" || b === "Space") return a === b;
        return String(a).toLowerCase() === String(b).toLowerCase();
    }

    function findConflict(action, value) {
        const keys = Object.keys(bindings);
        for (let i = 0; i < keys.length; i += 1) {
            const act = keys[i];
            if (act === action) continue;
            if (valuesEqual(bindings[act], value)) return act;
        }
        return null;
    }

    function setBinding(action, value) {
        const normalized = normalizeKeyValue(value);
        if (!normalized) {
            return { ok: false, reason: "invalid" };
        }

        const conflictAction = findConflict(action, normalized);
        if (conflictAction) {
            return { ok: false, reason: "duplicate", conflictAction };
        }

        // Empêche de prendre une touche déjà utilisée par le joueur 2
        const conflictP2 = findPlayer2Conflict(null, normalized);
        if (conflictP2) {
            return { ok: false, reason: "duplicate-p2", conflictAction: conflictP2 };
        }

        bindings = { ...bindings, [action]: normalized };
        saveBindings();
        return { ok: true };
    }

    function setBindings(next) {
        bindings = { ...DEFAULTS, ...(next || {}) };
        saveBindings();
    }

    function findPlayer2Conflict(action, value) {
        const keys = Object.keys(player2Bindings);
        for (let i = 0; i < keys.length; i += 1) {
            const act = keys[i];
            if (act === action) continue;
            if (valuesEqual(player2Bindings[act], value)) return act;
        }
        return null;
    }

    function setPlayer2Binding(action, value) {
        const normalized = normalizeKeyValue(value);
        if (!normalized) {
            return { ok: false, reason: "invalid" };
        }

        const conflictAction = findPlayer2Conflict(action, normalized);
        if (conflictAction) {
            return { ok: false, reason: "duplicate", conflictAction };
        }

        // Empêche de prendre une touche déjà utilisée par le joueur 1
        const conflictP1 = findConflict(null, normalized);
        if (conflictP1) {
            return { ok: false, reason: "duplicate-p1", conflictAction: conflictP1 };
        }

        player2Bindings = { ...player2Bindings, [action]: normalized };
        savePlayer2Bindings();
        return { ok: true };
    }

    function setPlayer2Bindings(next) {
        player2Bindings = { ...DEFAULTS_P2, ...(next || {}) };
        savePlayer2Bindings();
    }

    function getPlayer2Bindings() {
        return { ...player2Bindings };
    }

    function isValidGamepadButton(value) {
        return Number.isInteger(value) && value >= 0 && value <= 17;
    }

    function findGamepadConflict(action, value) {
        const keys = Object.keys(gamepadBindings);
        for (let i = 0; i < keys.length; i += 1) {
            const act = keys[i];
            if (act === action) continue;
            if (gamepadBindings[act] === value) return act;
        }
        return null;
    }

    function setGamepadBinding(action, value) {
        if (!isValidGamepadButton(value)) {
            return { ok: false, reason: "invalid" };
        }

        const conflictAction = findGamepadConflict(action, value);
        if (conflictAction) {
            return { ok: false, reason: "duplicate", conflictAction };
        }

        gamepadBindings = { ...gamepadBindings, [action]: value };
        saveGamepadBindings();
        return { ok: true };
    }

    function setGamepadBindings(next) {
        gamepadBindings = { ...DEFAULT_GAMEPAD, ...(next || {}) };
        saveGamepadBindings();
    }

    function getGamepadBindings() {
        return { ...gamepadBindings };
    }

    function getBindings() {
        return { ...bindings };
    }

    function isActionKey(event, action) {
        const bind = bindings[action];
        if (!bind || !event) return false;
        if (bind === "Space") return event.code === "Space";
        if (bind === "Shift") return event.key === "Shift";
        return String(event.key || "").toLowerCase() === String(bind).toLowerCase();
    }

    function getActionFromEvent(event, actions) {
        for (let i = 0; i < actions.length; i += 1) {
            if (isActionKey(event, actions[i])) return actions[i];
        }
        return null;
    }

    function createInputController(config) {
        const actions = (config && config.actions) || [
            "forward",
            "backward",
            "left",
            "right",
            "sprint",
            "shoot",
            "switchLeft",
            "switchRight",
            "tackle"
        ];

        const isBlocked = (config && config.isBlocked) || function () { return false; };
        const onPress = (config && config.onPress) || function () {};
        const onRelease = (config && config.onRelease) || function () {};

        function handleKeyDown(event) {
            if (isBlocked()) return;
            if (event.repeat) return;
            const action = getActionFromEvent(event, actions);
            if (!action) return;
            onPress(action, event);
        }

        function handleKeyUp(event) {
            if (isBlocked()) return;
            const action = getActionFromEvent(event, actions);
            if (!action) return;
            onRelease(action, event);
        }

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return {
            dispose: function () {
                window.removeEventListener("keydown", handleKeyDown);
                window.removeEventListener("keyup", handleKeyUp);
            }
        };
    }

    window.inputBindings = {
        DEFAULTS,
        DEFAULTS_P2,
        getBindings,
        setBindings,
        setBinding,
        getPlayer2Bindings,
        setPlayer2Bindings,
        setPlayer2Binding,
        isActionKey,
        DEFAULT_GAMEPAD,
        getGamepadBindings,
        setGamepadBindings,
        setGamepadBinding
    };

    window.createInputController = createInputController;
})();
