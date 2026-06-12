const SUPABASE_URL = 'https://rmdrvkuquqvcaxzkxeeg.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_wd3Hj7jgldlQnLT7b1cvYQ_FPH3y0Qs';

const PortfolioSupabase = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

if (!PortfolioSupabase) {
    console.warn('Supabase SDK не загрузился. Портфолио откроется без данных из базы.');
}

if (typeof window !== 'undefined') {
    window.PortfolioSupabase = PortfolioSupabase;
}
