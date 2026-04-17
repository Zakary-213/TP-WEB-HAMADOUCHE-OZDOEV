document.addEventListener('DOMContentLoaded', () => {

    const logoutBtn = document.getElementById('logout-btn');
    const canvasScoreEl = document.getElementById('canvas-score');
    const canvasScoreCard = document.querySelector('.score.canvas');
    const gowScoreEl = document.getElementById('gow-score');
    const gowScoreCard = document.querySelector('.score.gamesonweb');

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('tpweb_is_authenticated');
        localStorage.removeItem('tpweb_user_id');
        localStorage.removeItem('tpweb_username');
        setGamesLocked(true);
        syncAuthUi();
        showMessage('Déconnexion réussie.', 'success');
    });


    const AUTH_STATE_KEY = 'tpweb_is_authenticated';
    const gameLinks = document.querySelectorAll('.game-link');

    const setGamesLocked = (locked) => {
        gameLinks.forEach((link) => {
            link.classList.toggle('is-locked', locked);
            link.setAttribute('aria-disabled', String(locked));

            if (locked) {
                link.setAttribute('tabindex', '-1');
            } else {
                link.removeAttribute('tabindex');
            }
        });
    };

    const isAuthenticated = () => localStorage.getItem(AUTH_STATE_KEY) === 'true';

    const apiBaseUrl = (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE_URL)
        ? window.__APP_CONFIG__.API_BASE_URL.replace(/\/$/, '')
        : '';

    const toApiUrl = (path) => {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${apiBaseUrl}${normalizedPath}`;
    };

    const loginToggle = document.getElementById('login-toggle');
    const signupToggle = document.getElementById('signup-toggle');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const messageDiv = document.getElementById('message');

    const syncAuthUi = () => {
        const loggedIn = isAuthenticated();

        if (logoutBtn) {
            logoutBtn.style.display = loggedIn ? 'block' : 'none';
        }

        if (canvasScoreCard) {
            canvasScoreCard.style.display = loggedIn ? 'block' : 'none';
        }

        if (gowScoreCard) {
            gowScoreCard.style.display = loggedIn ? 'block' : 'none';
        }

        if (!loggedIn && canvasScoreEl) {
            canvasScoreEl.textContent = '';
        }

        if (!loggedIn && gowScoreEl) {
            gowScoreEl.textContent = '';
        }
    };

    setGamesLocked(!isAuthenticated());
    syncAuthUi();

    gameLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            if (!isAuthenticated()) {
                event.preventDefault();
                showMessage('Connecte-toi d\'abord pour acceder au jeu.', 'error');
            }
        });
    });

    // Toggle between Login and Signup
    loginToggle.addEventListener('click', () => {
        loginToggle.classList.add('active');
        signupToggle.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        clearMessage();
    });

    signupToggle.addEventListener('click', () => {
        signupToggle.classList.add('active');
        loginToggle.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        clearMessage();
    });

    const formatTimeMs = (ms) => {
        const safeMs = Number(ms) || 0;
        const totalSeconds = Math.floor(safeMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const renderCanvasScores = async () => {
        if (!canvasScoreEl) return;

        if (!isAuthenticated()) {
            canvasScoreEl.textContent = '';
            return;
        }

        const userId = localStorage.getItem('tpweb_user_id');
        if (!userId) {
            canvasScoreEl.textContent = 'Aucun score pour ce compte.';
            return;
        }

        canvasScoreEl.textContent = 'Chargement...';

        try {
            const query = new URLSearchParams({
                game: 'canvas',
                mode: 'solo',
                limit: '100',
                userId
            });
            const response = await fetch(toApiUrl(`/api/scores/top?${query.toString()}`));
            const result = await response.json();

            if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
                canvasScoreEl.textContent = 'Aucun score pour ce compte.';
                return;
            }

            canvasScoreEl.replaceChildren();
            result.data.forEach((score, index) => {
                const pseudo = score?.data?.pseudo || score?.user?.username || 'Inconnu';
                const totalTime = formatTimeMs(score?.totalTime);
                const totalMeteorites = Number(score?.totalMeteorites || 0);

                const row = document.createElement('div');
                row.textContent = `${index + 1}. ${pseudo} - ${totalTime} - ${totalMeteorites} météorites`;
                canvasScoreEl.appendChild(row);
            });
        } catch (error) {
            canvasScoreEl.textContent = 'Impossible de charger les scores.';
        }
    };

    const formatGoalMinutes = (minutes) => {
        if (!Array.isArray(minutes) || minutes.length === 0) {
            return '-';
        }

        return minutes
            .map((m) => Number(m))
            .filter((m) => Number.isFinite(m))
            .map((m) => `${Math.max(0, Math.floor(m))}'`)
            .join(', ');
    };

    const deriveResultLabel = (result, myGoals, opponentGoals) => {
        const safeResult = typeof result === 'string' ? result.toLowerCase() : '';

        if (safeResult === 'win' || safeResult === 'victoire' || safeResult === 'gagne') return 'Victoire';
        if (safeResult === 'loss' || safeResult === 'defaite' || safeResult === 'perdu') return 'Défaite';
        if (safeResult === 'draw' || safeResult === 'nul') return 'Match nul';

        if (myGoals > opponentGoals) return 'Victoire';
        if (myGoals < opponentGoals) return 'Défaite';
        return 'Match nul';
    };

    const renderGamesOnWebScores = async () => {
        if (!gowScoreEl) return;

        if (!isAuthenticated()) {
            gowScoreEl.textContent = '';
            return;
        }

        const userId = localStorage.getItem('tpweb_user_id');
        if (!userId) {
            gowScoreEl.textContent = 'Aucune sauvegarde pour ce compte.';
            return;
        }

        gowScoreEl.textContent = 'Chargement...';

        try {
            const modes = ['tournament', 'versus', '1v1'];
            const responses = await Promise.all(
                modes.map(async (mode) => {
                    const query = new URLSearchParams({
                        game: 'gamesonweb',
                        mode,
                        limit: '100',
                        userId
                    });

                    const response = await fetch(toApiUrl(`/api/scores/top?${query.toString()}`));
                    const result = await response.json();
                    if (!result.success || !Array.isArray(result.data)) {
                        return [];
                    }

                    return result.data;
                })
            );

            const merged = responses.flat();
            const uniqueById = Array.from(
                new Map(merged.map((entry) => [entry?._id || `${entry?.createdAt}-${entry?.totalTime}`, entry])).values()
            );

            if (uniqueById.length === 0) {
                gowScoreEl.textContent = 'Aucune sauvegarde pour ce compte.';
                return;
            }

            uniqueById.sort((a, b) => {
                const aTime = new Date(a?.createdAt || 0).getTime();
                const bTime = new Date(b?.createdAt || 0).getTime();
                return bTime - aTime;
            });

            gowScoreEl.replaceChildren();
            uniqueById.forEach((match, index) => {
                const payload = match?.data || {};
                const myGoals = Number(payload.totalButs || 0);
                const opponentGoals = Number(payload.totalButsAdversaire || 0);
                const resultLabel = deriveResultLabel(payload.result || payload.Résultat, myGoals, opponentGoals);
                const myGoalTimes = formatGoalMinutes(payload.minuteButs);
                const opponentGoalTimes = formatGoalMinutes(payload.minuteButsAdversaire);
                const modeLabel = match?.mode || payload?.mode || 'inconnu';

                const row = document.createElement('div');
                row.textContent = `${index + 1}. [${modeLabel}] ${resultLabel} - ${myGoals} : ${opponentGoals} | Mes buts: ${myGoalTimes} | Buts adverses: ${opponentGoalTimes}`;
                gowScoreEl.appendChild(row);
            });
        } catch (error) {
            gowScoreEl.textContent = 'Impossible de charger les sauvegardes.';
        }
    };

    renderCanvasScores();
    renderGamesOnWebScores();

    // Handle Signup
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        console.log('username:', username, 'email:', email, 'password:', password);
        try {
            const response = await fetch(toApiUrl('/api/auth/signup'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (data.success) {
                showMessage('Inscription réussie ! Vous pouvez vous connecter.', 'success');
                signupForm.reset();
                setTimeout(() => loginToggle.click(), 2000);
            } else {
                showMessage(data.message || 'Erreur lors de l\'inscription', 'error');
            }
        } catch (error) {
            showMessage('Erreur de connexion au serveur', 'error');
        }
    });

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch(toApiUrl('/api/auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem(AUTH_STATE_KEY, 'true');
                localStorage.setItem('tpweb_user_id', data.data.id);
                localStorage.setItem('tpweb_username', data.data.username);
                showMessage(`Bienvenue ${data.data.username} ! Connexion réussie.`, 'success');

                loginForm.reset();
                setGamesLocked(false);
                syncAuthUi();
                renderCanvasScores();
                renderGamesOnWebScores();
                // Here you could redirect or update UI
            } else {
                showMessage(data.message || 'Identifiants invalides', 'error');
            }
        } catch (error) {
            showMessage('Erreur de connexion au serveur', 'error');
        }
    });

    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
    }

    function clearMessage() {
        messageDiv.style.display = 'none';
        messageDiv.textContent = '';
    }
});

