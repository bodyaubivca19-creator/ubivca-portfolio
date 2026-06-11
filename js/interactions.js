// Класс для интерактивных элементов
class Interactions {
    constructor() {
        this.scrollProgress = document.getElementById('scrollProgress');
        this.tracker = document.getElementById('mouseTracker');
        this.cards = document.querySelectorAll('.interactive-card');
        this.sphere = document.querySelector('.interactive-sphere');
        this.init();
    }

    init() {
        this.initScrollProgress();
        this.initCardClicks();
        this.initMouseTracker();
        this.initParallax();
        this.initSmoothScroll();
    }

    // Прогресс-бар скролла
    initScrollProgress() {
        window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            this.scrollProgress.style.width = scrolled + '%';
        });
    }

    // Клики по карточкам
    initCardClicks() {
        this.cards.forEach(card => {
            card.addEventListener('click', () => {
                card.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    card.style.transform = '';
                }, 200);
                
                // Счетчик кликов
                this.incrementClickCounter();
            });
        });
    }

    // Счетчик кликов
    incrementClickCounter() {
        if (!window.clickCount) window.clickCount = 0;
        window.clickCount++;
        console.log(`Кликов по карточкам: ${window.clickCount}`);
    }

    // Трекер мыши
    initMouseTracker() {
        if (!this.tracker) return;
        
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            this.tracker.style.transform = `translate(${x}px, ${y}px)`;
        });
    }

    // Параллакс эффект для сферы
    initParallax() {
        if (!this.sphere) return;
        
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 30;
            const y = (e.clientY / window.innerHeight - 0.5) * 30;
            this.sphere.style.transform = `translate(${x}px, ${y}px) rotate(${x * 2}deg)`;
        });
    }

    // Плавный скролл к якорям
    initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    new Interactions();
});