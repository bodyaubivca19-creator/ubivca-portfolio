const PortfolioAuth = (() => {
    const STORAGE_KEY = 'portfolio_admin_auth_v1';
    const SESSION_KEY = 'portfolio_admin_session_v1';
    const DEFAULT_USERNAME = 'admin';
    const DEFAULT_PASSWORD = 'ubivca2026';

    async function sha256(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(String(text || ''));
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function ensureSetup() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                return JSON.parse(raw);
            } catch (_) {}
        }
        const config = {
            username: DEFAULT_USERNAME,
            passwordHash: await sha256(DEFAULT_PASSWORD),
            updatedAt: Date.now(),
            defaultPassword: true
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        return config;
    }

    function getSession() {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (_) {
            return null;
        }
    }

    function isAuthenticated() {
        const session = getSession();
        return Boolean(session && session.username);
    }

    async function login(username, password) {
        const config = await ensureSetup();
        const passwordHash = await sha256(password);
        const valid = username === config.username && passwordHash === config.passwordHash;
        if (!valid) return { ok: false, message: 'Неверный логин или пароль.' };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username: config.username, loginAt: Date.now() }));
        return { ok: true, defaultPassword: Boolean(config.defaultPassword) };
    }

    function logout() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    async function changePassword(currentPassword, newPassword) {
        const config = await ensureSetup();
        const currentHash = await sha256(currentPassword);
        if (currentHash !== config.passwordHash) {
            return { ok: false, message: 'Текущий пароль введён неверно.' };
        }
        if (!newPassword || String(newPassword).trim().length < 6) {
            return { ok: false, message: 'Новый пароль должен быть не короче 6 символов.' };
        }
        const updated = {
            ...config,
            passwordHash: await sha256(newPassword.trim()),
            updatedAt: Date.now(),
            defaultPassword: false
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return { ok: true };
    }

    async function getPublicMeta() {
        const config = await ensureSetup();
        return {
            username: config.username,
            defaultPassword: Boolean(config.defaultPassword)
        };
    }

    return {
        ensureSetup,
        login,
        logout,
        isAuthenticated,
        changePassword,
        getPublicMeta,
        getSession
    };
})();
