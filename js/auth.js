const PortfolioAuth = (() => {
    let currentSession = null;
    let currentUser = null;

    async function ensureSetup() {
        const { data, error } = await PortfolioSupabase.auth.getSession();
        if (error) {
            console.warn('Supabase session error:', error.message);
            currentSession = null;
            currentUser = null;
            return null;
        }
        currentSession = data?.session || null;
        currentUser = currentSession?.user || null;

        PortfolioSupabase.auth.onAuthStateChange((_event, session) => {
            currentSession = session || null;
            currentUser = session?.user || null;
        });

        return currentSession;
    }

    function getSession() {
        return currentSession;
    }

    function isAuthenticated() {
        return Boolean(currentSession?.user);
    }

    async function login(username, password) {
        const email = String(username || '').trim();
        if (!email || !password) {
            return { ok: false, message: 'Введите email и пароль.' };
        }

        const { data, error } = await PortfolioSupabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return { ok: false, message: 'Неверный email или пароль.' };
        }

        currentSession = data?.session || null;
        currentUser = data?.user || currentSession?.user || null;
        return { ok: true, defaultPassword: false };
    }

    async function logout() {
        await PortfolioSupabase.auth.signOut();
        currentSession = null;
        currentUser = null;
    }

    async function changePassword(currentPassword, newPassword) {
        const email = currentUser?.email;
        if (!email) {
            return { ok: false, message: 'Сначала войдите в админку.' };
        }
        if (!newPassword || String(newPassword).trim().length < 6) {
            return { ok: false, message: 'Новый пароль должен быть не короче 6 символов.' };
        }

        const check = await PortfolioSupabase.auth.signInWithPassword({
            email,
            password: currentPassword
        });

        if (check.error) {
            return { ok: false, message: 'Текущий пароль введён неверно.' };
        }

        const { error } = await PortfolioSupabase.auth.updateUser({
            password: String(newPassword).trim()
        });

        if (error) {
            return { ok: false, message: error.message || 'Не удалось сменить пароль.' };
        }

        return { ok: true };
    }

    async function getPublicMeta() {
        if (!currentUser) await ensureSetup();
        return {
            username: currentUser?.email || 'Supabase admin',
            defaultPassword: false
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
