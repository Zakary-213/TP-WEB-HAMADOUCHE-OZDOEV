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

        if (authEyebrow) authEyebrow.textContent = 'ENTER THE ARENA';
        if (authTitle) authTitle.textContent = 'JOIN THE GAMES';
        if (authText) {
            authText.textContent = 'Create your account, track your progress, save your scores and access the full GamesOnWeb experience.';
        }
    }

    function setLoginVisualState() {
        loginToggle?.classList.add('active');
        signupToggle?.classList.remove('active');
        loginForm?.classList.add('active');
        signupForm?.classList.remove('active');

        if (authEyebrow) authEyebrow.textContent = 'WELCOME BACK';
        if (authTitle) authTitle.textContent = 'LOG IN';
        if (authText) {
            authText.textContent = 'Access your account, continue your journey and jump back into the GamesOnWeb experience.';
        }
    }

    function openModal(mode = 'signup') {
        if (!authOverlay) return;

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
    }

    openSignupModalBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('signup');
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