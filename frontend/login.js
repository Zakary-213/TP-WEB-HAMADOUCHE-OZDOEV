document.addEventListener('DOMContentLoaded', () => {
    const authOverlay = document.getElementById('authModalOverlay');
    const closeAuthModalBtn = document.getElementById('closeAuthModal');

    const openSignupModalBtn = document.getElementById('openSignupModal');
    const openRegisterNowModalBtn = document.getElementById('openRegisterNowModal');
    const playNowBtn = document.getElementById('playNowBtn');

    const loginToggle = document.getElementById('login-toggle');
    const signupToggle = document.getElementById('signup-toggle');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    const authEyebrow = document.getElementById('authEyebrow');
    const authTitle = document.getElementById('authModalTitle');
    const authText = document.getElementById('authModalText');

    function setSignupVisualState() {
        signupToggle?.classList.add('active');
        loginToggle?.classList.remove('active');
        signupForm?.classList.add('active');
        loginForm?.classList.remove('active');

        if (authEyebrow) authEyebrow.textContent = 'ENTRE DANS L\'ARÈNE';
        if (authTitle) authTitle.textContent = 'REJOINS LES JEUX';
        if (authText) {
            authText.textContent = 'Crée ton compte, suis ta progression, sauvegarde tes scores et accède à l\'expérience GamesOnWeb complète.';
        }
    }

    function setLoginVisualState() {
        loginToggle?.classList.add('active');
        signupToggle?.classList.remove('active');
        loginForm?.classList.add('active');
        signupForm?.classList.remove('active');

        if (authEyebrow) authEyebrow.textContent = 'BON RETOUR';
        if (authTitle) authTitle.textContent = 'CONNEXION';
        if (authText) {
            authText.textContent = 'Accède à ton compte, continue ton parcours et replonge dans l\'expérience GamesOnWeb.';
        }
    }

    function openModal(mode = 'signup') {
        if (!authOverlay) return;

        authOverlay.style.display = 'flex';
        authOverlay.offsetHeight; // force reflow pour activer la transition
        authOverlay.classList.add('is-open');
        authOverlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        if (mode === 'login') {
            setLoginVisualState();
        } else {
            setSignupVisualState();
        }
    }

    function closeModal() {
        if (!authOverlay) return;

        authOverlay.classList.remove('is-open');
        authOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        // Retire l'overlay du stacking context après la transition
        // pour ne plus perturber les événements souris (mouseleave, hover)
        setTimeout(() => {
            if (!authOverlay.classList.contains('is-open')) {
                authOverlay.style.display = 'none';
            }
        }, 420);
    }

    const openLoginModalBtn = document.getElementById('openLoginModal');

    openSignupModalBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('signup');
    });

    openLoginModalBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('login');
    });

    openRegisterNowModalBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('signup');
    });

    playNowBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('login');
    });

    closeAuthModalBtn?.addEventListener('click', closeModal);

    authOverlay?.addEventListener('click', (e) => {
        if (e.target === authOverlay) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && authOverlay?.classList.contains('is-open')) {
            closeModal();
        }
    });

    signupToggle?.addEventListener('click', () => {
        setSignupVisualState();
    });

    loginToggle?.addEventListener('click', () => {
        setLoginVisualState();
    });

    window.authModalController = {
        openModal,
        closeModal,
        setSignupVisualState,
        setLoginVisualState
    };
});