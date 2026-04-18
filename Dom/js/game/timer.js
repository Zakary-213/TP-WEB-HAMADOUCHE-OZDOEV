/**
 * timer.js – Chronomètre découplé de l'UI.
 * Retourne un objet avec start / stop / reset / isRunning.
 */

/**
 * @param {(seconds: number) => void} onTick – Appelé chaque seconde avec la valeur courante.
 */
export function createTimer(onTick) {
    let intervalId = null;

    /**
     * Démarre le chrono.
     * @param {() => number} getSeconds – Getter de la valeur courante.
     * @param {(v: number) => void} setSeconds – Setter.
     */
    function start(getSeconds, setSeconds) {
        if (intervalId) return;
        intervalId = setInterval(() => {
            const next = getSeconds() + 1;
            setSeconds(next);
            onTick(next);
        }, 1000);
    }

    /** Arrête le chrono (conserve la valeur). */
    function stop() {
        if (!intervalId) return;
        clearInterval(intervalId);
        intervalId = null;
    }

    /**
     * Remet à zéro et arrête.
     * @param {(v: number) => void} setSeconds
     */
    function reset(setSeconds) {
        stop();
        setSeconds(0);
        onTick(0);
    }

    function isRunning() {
        return intervalId !== null;
    }

    return { start, stop, reset, isRunning };
}
