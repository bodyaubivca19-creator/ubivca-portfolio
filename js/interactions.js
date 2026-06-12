(() => {
    function updateScrollProgress() {
        const bar = document.getElementById('scrollProgress');
        if (!bar) return;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const value = max > 0 ? (window.scrollY / max) * 100 : 0;
        bar.style.width = `${Math.max(0, Math.min(100, value))}%`;
    }

    function initReveal() {
        const items = document.querySelectorAll('.reveal');
        if (!items.length) return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        items.forEach(item => observer.observe(item));
    }

    document.addEventListener('DOMContentLoaded', () => {
        initReveal();
        updateScrollProgress();
    });
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    window.addEventListener('resize', updateScrollProgress);
})();
