// Класс для управления частицами
class ParticleSystem {
    constructor() {
        this.container = document.getElementById('particles');
        this.particleCount = 50;
        this.init();
    }

    init() {
        this.createParticles();
    }

    createParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            const particle = this.createParticle();
            this.container.appendChild(particle);
        }
    }

    createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Случайные параметры
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particle.style.animationDuration = 5 + Math.random() * 10 + 's';
        particle.style.opacity = Math.random() * 0.3;
        
        // Случайный цвет (красные оттенки)
        const hue = Math.random() * 60 + 340;
        particle.style.background = `hsl(${hue}, 100%, 50%)`;
        
        return particle;
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    new ParticleSystem();
});