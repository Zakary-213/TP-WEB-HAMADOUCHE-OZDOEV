/**
 * Shared utility for Canvas API configuration and helpers.
 * This script is loaded globally in JeuCanvas/index.html
 */
(function() {
    const configuredApiBaseUrl = (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE_URL)
        ? window.__APP_CONFIG__.API_BASE_URL.replace(/\/$/, '')
        : '';

    const isLocalRuntime = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    const apiBaseUrl = isLocalRuntime ? '' : configuredApiBaseUrl;

    window.CANVAS_API = {
        baseUrl: apiBaseUrl,
        toUrl: (path) => {
            const normalizedPath = path.startsWith('/') ? path : `/${path}`;
            return `${apiBaseUrl}${normalizedPath}`;
        },
        getUserId: () => localStorage.getItem('tpweb_user_id'),
        getUsername: () => localStorage.getItem('tpweb_username') || 'Anonyme'
    };
})();
