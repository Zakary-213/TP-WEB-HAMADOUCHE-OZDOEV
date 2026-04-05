// js/utils/inputBindings.js
// Centralized keybind storage + input controller

(function () {
    "use strict";

    const STORAGE_KEY = "gow.keybinds.v1";
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

    let bindings = loadBindings();

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

    function normalizeKeyValue(value) {
        if (!value) return null;
        if (value === "Shift") return "Shift";
        if (value === "Space") return "Space";
        if (value.length === 1) return value.toLowerCase();
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

        bindings = { ...bindings, [action]: normalized };
        saveBindings();
        return { ok: true };
    }

    function setBindings(next) {
        bindings = { ...DEFAULTS, ...(next || {}) };
        saveBindings();
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
        getBindings,
        setBindings,
        setBinding,
        isActionKey
    };

    window.createInputController = createInputController;
})();
