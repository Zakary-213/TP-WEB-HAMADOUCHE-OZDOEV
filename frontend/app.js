document.addEventListener('DOMContentLoaded', () => {

    const logoutBtn = document.getElementById('logout-btn');

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('tpweb_is_authenticated');
        localStorage.removeItem('tpweb_user_id');
        localStorage.removeItem('tpweb_username');
        location.reload();
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
    const canvasScoreEl = document.getElementById('canvas-score');

    setGamesLocked(!isAuthenticated());

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

    const renderCanvasBestScore = async () => {
        if (!canvasScoreEl) return;

        canvasScoreEl.textContent = 'Chargement...';

        try {
            const response = await fetch(toApiUrl('/api/scores/top?game=canvas&mode=solo&limit=1'));
            const result = await response.json();

            if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
                canvasScoreEl.textContent = 'Aucun score pour le moment.';
                return;
            }

            const best = result.data[0];
            const pseudo = best?.data?.pseudo || best?.user?.username || 'Inconnu';
            const totalTime = formatTimeMs(best?.totalTime);
            const totalMeteorites = Number(best?.totalMeteorites || 0);

            canvasScoreEl.textContent = `${pseudo} - ${totalTime} - ${totalMeteorites} météorites`;
        } catch (error) {
            canvasScoreEl.textContent = 'Impossible de charger les scores.';
        }
    };

    renderCanvasBestScore();

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
                renderCanvasBestScore();
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

