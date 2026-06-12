class ParticleSystem {
    constructor() {
        this.container = document.getElementById('particles');
        this.particleCount = 28;
        if (this.container) this.init();
    }
    init() {
        for (let i = 0; i < this.particleCount; i++) this.container.appendChild(this.createParticle());
    }
    createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        particle.style.animationDuration = `${7 + Math.random() * 10}s`;
        particle.style.opacity = String(Math.random() * 0.25);
        return particle;
    }
}
document.addEventListener('DOMContentLoaded', () => new ParticleSystem());
