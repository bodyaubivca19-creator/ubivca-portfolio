const portfolioState = {
    works: [],
    objectUrls: [],
    activeWorkId: null,
    activeFilter: 'all',
    heroWorks: [],
    heroCurrentIndex: 0,
    heroAutoplay: null,
    lightboxItems: [],
    lightboxIndex: 0,
    heroTouchStartX: 0,
    heroTouchStartY: 0,
    suppressHeroClickUntil: 0,
    heroDirection: 1,
    lightboxDirection: 1
};

const HERO_SLIDE_DURATION = 5000;

function bindHorizontalSwipe(element, onLeft, onRight, options = {}) {
    if (!element || element.dataset.swipeBound === 'true') return;
    element.dataset.swipeBound = 'true';

    let startX = 0;
    let startY = 0;
    let tracking = false;

    element.addEventListener('touchstart', (event) => {
        const touch = event.touches?.[0];
        if (!touch) return;
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
    }, { passive: true });

    element.addEventListener('touchend', (event) => {
        if (!tracking) return;
        tracking = false;
        const touch = event.changedTouches?.[0];
        if (!touch) return;

        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        const threshold = Number(options.threshold || 46);

        if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.25) return;
        if (options.preventGhostClick) {
            portfolioState.suppressHeroClickUntil = Date.now() + 450;
        }

        if (dx < 0) onLeft?.();
        else onRight?.();
    }, { passive: true });
}


const PROJECT_CATEGORIES = [
    { key: 'design', empty: 'Сюда будут добавлены дизайн-проекты: 2D, 3D, визуалы и графика.' },
    { key: 'development', empty: 'Сюда будут добавлены проекты разработки: интерфейсы, модули и внутренние инструменты.' },
    { key: 'websites', empty: 'Сюда будут добавлены сайты, лендинги и промо-страницы.' },
    { key: 'bots', empty: 'Сюда будут добавлены Telegram-боты и автоматизированные сценарии.' },
    { key: 'apps', empty: 'Сюда будут добавлены приложения, мини-сервисы и прототипы.' },
    { key: 'automation', empty: 'Сюда будут добавлены системы учёта, панели и решения для автоматизации.' },
    { key: 'other', empty: 'Сюда будут добавлены прочие эксперименты, концепты и нестандартные задачи.' }
];

document.addEventListener('DOMContentLoaded', async () => {
    await PortfolioAuth.ensureSetup();
    initProjectModal();
    loadWorks();
});


function getHeroSelectedWorks(works) {
    const selected = [...works]
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        .filter(work => work.fileData || work.imageUrl)
        .slice(0, 8);

    if (selected.length) return selected;

    return [
        {
            id: 'hero-placeholder-design',
            title: '2D / 3D визуал',
            description: 'Визуалы, рендеры, графика и подача проектов.',
            category: 'design',
            _placeholder: true
        },
        {
            id: 'hero-placeholder-web',
            title: 'Сайты и лендинги',
            description: 'Промо-страницы, сайты и аккуратная визуальная подача.',
            category: 'websites',
            _placeholder: true
        },
        {
            id: 'hero-placeholder-bots',
            title: 'Telegram-боты',
            description: 'Боты, сценарии, автоматизация заявок и коммуникаций.',
            category: 'bots',
            _placeholder: true
        }
    ];
}

function getWorkObjectUrl(work) {
    const fileData = work?.fileData || null;
    if (!fileData) return '';
    if (!work.__objectUrl) {
        work.__objectUrl = rememberObjectUrl(PortfolioStorage.createObjectUrl(fileData));
    }
    return work.__objectUrl;
}

async function renderHeroSlider(works) {
    portfolioState.heroWorks = getHeroSelectedWorks(works);
    portfolioState.heroCurrentIndex = 0;
    updateHeroSlider();
    initHeroSliderControls();
    startHeroAutoplay();
}

function renderHeroSlide(work) {
    const category = getPublicCategoryLabel(work);
    const title = work.title || category;
    const description = work.description || 'Подробности будут добавлены в кейс.';
    const objectUrl = getWorkObjectUrl(work);
    let media = '';

    if (!work._placeholder && work.fileData) {
        const type = PortfolioStorage.getMimeCategory(work.fileData.type, work.fileData.name);
        if (type === 'image' && objectUrl) {
            media = `<img src="${objectUrl}" alt="${PortfolioStorage.escapeHtml(title)}">`;
        } else if (type === 'video' && objectUrl) {
            media = `<video src="${objectUrl}" muted autoplay loop playsinline preload="metadata"></video>`;
        } else if (type === '3d' && objectUrl && PortfolioStorage.isRenderable3D(work.fileData)) {
            media = PortfolioStorage.render3DViewerMarkup(work.fileData, objectUrl, 'hero-featured-model');
        }
    }

    if (!media && work.imageUrl) {
        media = `<img src="${PortfolioStorage.escapeHtml(work.imageUrl)}" alt="${PortfolioStorage.escapeHtml(title)}">`;
    }

    if (!media) {
        media = `
            <div class="hero-featured-placeholder hero-placeholder-${PortfolioStorage.escapeHtml(getPrimaryCategory(work))}">
                <span>${PortfolioStorage.escapeHtml(category)}</span>
                <strong>${PortfolioStorage.escapeHtml(title)}</strong>
            </div>
        `;
    }

    return `
        <article class="hero-featured-card ${work._placeholder ? 'is-placeholder' : ''}" ${work._placeholder ? '' : `data-hero-work-id="${PortfolioStorage.escapeHtml(work.id)}"`}>
            <div class="hero-featured-media">${media}</div>
            <div class="hero-featured-overlay"></div>
            <div class="hero-featured-info">
                <span class="hero-featured-category">${PortfolioStorage.escapeHtml(category)}</span>
                <h3>${PortfolioStorage.escapeHtml(title)}</h3>
                <p>${PortfolioStorage.escapeHtml(description)}</p>
                <div class="hero-featured-actions">
                    ${work._placeholder ? '<span class="hero-featured-hint">Здесь будут твои реальные работы</span>' : '<span class="hero-featured-hint">Нажмите, чтобы открыть</span>'}
                </div>
            </div>
        </article>
    `;
}

function updateHeroSlider() {
    const stage = document.getElementById('heroSliderStage');
    const dots = document.getElementById('heroSliderDots');
    const counter = document.getElementById('heroSliderCounter');
    const prevBtn = document.getElementById('heroPrev');
    const nextBtn = document.getElementById('heroNext');
    const works = portfolioState.heroWorks || [];

    if (!stage || !dots || !counter || !works.length) return;

    const currentIndex = ((portfolioState.heroCurrentIndex % works.length) + works.length) % works.length;
    portfolioState.heroCurrentIndex = currentIndex;
    const currentWork = works[currentIndex];

    stage.classList.remove('is-ready');
    stage.dataset.direction = String(portfolioState.heroDirection || 1);
    stage.innerHTML = renderHeroSlide(currentWork);
    requestAnimationFrame(() => {
        stage.classList.add('is-ready');
    });

    counter.textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(works.length).padStart(2, '0')}`;
    dots.innerHTML = works.map((_, idx) => `
        <button type="button" class="hero-slider-dot ${idx === currentIndex ? 'active' : ''}" data-hero-slide="${idx}" aria-label="Слайд ${idx + 1}"></button>
    `).join('');

    const shouldDisableNav = works.length <= 1;
    prevBtn?.toggleAttribute('disabled', shouldDisableNav);
    nextBtn?.toggleAttribute('disabled', shouldDisableNav);

    stage.querySelector('[data-hero-work-id]')?.addEventListener('click', () => {
        if (Date.now() < portfolioState.suppressHeroClickUntil) return;
        openProjectModal(currentWork.id);
    });

    dots.querySelectorAll('[data-hero-slide]').forEach(dot => {
        dot.addEventListener('click', () => {
            const nextIndex = Number(dot.dataset.heroSlide || 0);
            portfolioState.heroDirection = nextIndex >= portfolioState.heroCurrentIndex ? 1 : -1;
            portfolioState.heroCurrentIndex = nextIndex;
            updateHeroSlider();
            startHeroAutoplay();
        });
    });
}

function changeHeroSlide(direction = 1) {
    const works = portfolioState.heroWorks || [];
    if (works.length <= 1) return;
    portfolioState.heroDirection = direction >= 0 ? 1 : -1;
    portfolioState.heroCurrentIndex = (portfolioState.heroCurrentIndex + direction + works.length) % works.length;
    updateHeroSlider();
    startHeroAutoplay();
}

function restartHeroTimeline() {
    const bar = document.getElementById('heroSliderTimelineBar');
    if (!bar) return;

    bar.style.transition = 'none';
    bar.style.width = '0%';
    // force reflow
    void bar.offsetWidth;
    bar.style.transition = `width ${HERO_SLIDE_DURATION}ms linear`;
    requestAnimationFrame(() => {
        bar.style.width = '100%';
    });
}

function initHeroSliderControls() {
    const prevBtn = document.getElementById('heroPrev');
    const nextBtn = document.getElementById('heroNext');
    if (prevBtn && !prevBtn.dataset.bound) {
        prevBtn.dataset.bound = 'true';
        prevBtn.addEventListener('click', () => changeHeroSlide(-1));
    }
    if (nextBtn && !nextBtn.dataset.bound) {
        nextBtn.dataset.bound = 'true';
        nextBtn.addEventListener('click', () => changeHeroSlide(1));
    }

    bindHorizontalSwipe(
        document.getElementById('heroShowcase'),
        () => changeHeroSlide(1),
        () => changeHeroSlide(-1),
        { preventGhostClick: true, threshold: 42 }
    );
}

function startHeroAutoplay() {
    window.clearInterval(portfolioState.heroAutoplay);
    const works = portfolioState.heroWorks || [];
    restartHeroTimeline();
    if (works.length <= 1) return;
    portfolioState.heroAutoplay = window.setInterval(() => {
        changeHeroSlide(1);
    }, HERO_SLIDE_DURATION);
}

function initProjectModal() {
    const modal = document.getElementById('projectModal');
    const closeBtn = document.getElementById('projectModalClose');

    closeBtn?.addEventListener('click', closeProjectModal);
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeProjectModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (document.getElementById('projectMediaLightbox')?.classList.contains('active')) {
                closeMediaLightbox();
                return;
            }
            closeProjectModal();
        }
        if (e.key === 'ArrowLeft') changeMediaLightbox(-1);
        if (e.key === 'ArrowRight') changeMediaLightbox(1);
    });
}

function closeProjectModal() {
    const modal = document.getElementById('projectModal');
    if (!modal) return;
    closeMediaLightbox();
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    portfolioState.activeWorkId = null;
}

async function loadWorks() {
    const grids = document.querySelectorAll('[data-project-grid]');
    if (!grids.length) return;

    clearObjectUrls();
    const works = await PortfolioStorage.getAllWorks();
    portfolioState.works = works;
    await renderHeroSlider(works);

    for (const grid of grids) {
        const categoryKey = grid.dataset.projectGrid || 'other';
        const categorySection = grid.closest('[data-project-section]');
        const categoryWorks = works.filter(work => getPrimaryCategory(work) === categoryKey);

        if (!categoryWorks.length) {
            grid.innerHTML = '';
            if (categorySection) categorySection.hidden = true;
            continue;
        }

        if (categorySection) categorySection.hidden = false;
        const cards = await Promise.all(categoryWorks.map(renderWorkCard));
        grid.innerHTML = cards.join('');
        setupMobileShowMore(categorySection, categoryWorks.length);
    }

    renderNoProjectsState(works.length);
    attachWorkCardEvents();
    attachShowMoreEvents();
}

function setupMobileShowMore(categorySection, count) {
    if (!categorySection) return;

    categorySection.querySelector('.category-show-more')?.remove();
    categorySection.classList.toggle('has-extra-projects', count > 3);
    categorySection.classList.remove('is-expanded');

    if (count <= 3) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-show-more';
    btn.dataset.expandedText = 'Свернуть';
    btn.dataset.collapsedText = `Развернуть ещё ${count - 3}`;
    btn.textContent = btn.dataset.collapsedText;
    categorySection.appendChild(btn);
}

function attachShowMoreEvents() {
    document.querySelectorAll('.category-show-more').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.closest('.project-category-section');
            if (!section) return;
            const expanded = section.classList.toggle('is-expanded');
            btn.textContent = expanded ? btn.dataset.expandedText : btn.dataset.collapsedText;
        });
    });
}



function isPdfWork(work) {
    const fileData = work?.fileData || null;
    return fileData && PortfolioStorage.getMimeCategory(fileData.type, fileData.name) === 'pdf';
}

function downloadFileUrl(url, fileName = 'file') {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function downloadWorkPdf(id) {
    const work = portfolioState.works.find(item => item.id === id);
    if (!isPdfWork(work)) return false;
    const url = getWorkObjectUrl(work);
    downloadFileUrl(url, work.fileData.name || `${work.title || 'project'}.pdf`);
    return true;
}

function attachWorkCardEvents() {
    document.querySelectorAll('.work-item').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.work-card-action')) return;
            const id = card.dataset.id;
            openProjectModal(id);
        });
    });

    document.querySelectorAll('.work-card-action').forEach(link => {
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            if (link.dataset.downloadPdf === 'true') {
                e.preventDefault();
                downloadFileUrl(link.href, link.dataset.fileName || 'file.pdf');
            }
        });
    });
}

function renderEmptyCategory(text) {
    return `
        <div class="empty-category-card">
            <span>скоро</span>
            <p>${PortfolioStorage.escapeHtml(text)}</p>
        </div>
    `;
}

function getPrimaryCategory(workOrCategory = '') {
    const work = typeof workOrCategory === 'object' && workOrCategory !== null ? workOrCategory : null;
    const value = String(work ? (work.category || '') : workOrCategory || '').toLowerCase().trim();

    const map = {
        design: 'design',
        banner: 'design',
        banners: 'design',
        photo: 'design',
        video: 'design',
        '2d': 'design',
        '3d': 'design',

        development: 'development',
        dev: 'development',

        site: 'websites',
        website: 'websites',
        websites: 'websites',
        landing: 'websites',

        bot: 'bots',
        bots: 'bots',
        telegram: 'bots',

        app: 'apps',
        apps: 'apps',
        program: 'apps',
        software: 'apps',

        automation: 'automation',
        crm: 'automation',
        system: 'automation',
        accounting: 'automation',

        other: 'other',
        links: 'other'
    };

    // На публичной странице категория берётся из ручного выбора в админке.
    // Текст и тип файла больше не перебрасывают проект в другой раздел.
    return map[value] || 'other';
}

function getPublicCategoryLabel(work) {
    const labels = {
        design: 'Дизайн',
        development: 'Разработка',
        websites: 'Сайт',
        bots: 'Telegram-бот',
        apps: 'Приложение',
        automation: 'Автоматизация',
        other: 'Прочее'
    };
    return labels[getPrimaryCategory(work)] || PortfolioStorage.categoryLabel(work.category);
}

function renderNoProjectsState(total) {
    const section = document.getElementById('projects');
    if (!section) return;
    let state = document.getElementById('noProjectsState');

    if (total > 0) {
        state?.remove();
        return;
    }

    if (!state) {
        state = document.createElement('div');
        state.id = 'noProjectsState';
        state.className = 'empty-category-card public-empty-state';
        state.innerHTML = '<span>портфолио</span><p>Проекты пока не добавлены. После добавления в админ-панели они появятся здесь по отдельным категориям.</p>';
        section.appendChild(state);
    }
}

function clearObjectUrls() {
    portfolioState.objectUrls.forEach(url => URL.revokeObjectURL(url));
    portfolioState.objectUrls = [];
}

function rememberObjectUrl(url) {
    if (url) portfolioState.objectUrls.push(url);
    return url;
}

async function renderWorkCard(work) {
    const fileData = work.fileData || null;
    const objectUrl = fileData ? rememberObjectUrl(PortfolioStorage.createObjectUrl(fileData)) : '';
    const isPdf = fileData && PortfolioStorage.getMimeCategory(fileData.type, fileData.name) === 'pdf';
    const href = work.link || objectUrl || work.imageUrl || '#';
    const target = work.link ? '_blank' : '_self';
    const actionText = isPdf ? 'Скачать PDF' : (work.link ? 'Перейти' : (fileData ? 'Открыть файл' : 'Подробнее'));
    const category = getPublicCategoryLabel(work);

    return `
        <article class="work-item" data-id="${PortfolioStorage.escapeHtml(work.id)}" data-category="${PortfolioStorage.escapeHtml(work.category || '')}">
            <div class="work-category-pill">${PortfolioStorage.escapeHtml(category)}</div>
            <div class="work-media-shell">
                ${fileData
                    ? PortfolioStorage.previewMarkup(work, objectUrl)
                    : `<img src="${PortfolioStorage.escapeHtml(work.imageUrl || 'https://via.placeholder.com/900x700/111111/ffffff?text=Work')}" alt="${PortfolioStorage.escapeHtml(work.title)}" class="work-image">`
                }
            </div>
            <div class="work-overlay">
                <div class="work-content">
                    <div class="work-meta-row">
                        <span class="work-category">${PortfolioStorage.escapeHtml(category)}</span>
                        ${work.date ? `<span class="work-date">${PortfolioStorage.escapeHtml(work.date)}</span>` : ''}
                    </div>
                    <h3 class="work-title">${PortfolioStorage.escapeHtml(work.title)}</h3>
                    <p class="work-description">${PortfolioStorage.escapeHtml(work.description || '')}</p>
                    ${fileData ? `<div class="work-file-meta">${PortfolioStorage.escapeHtml(fileData.name)} · ${PortfolioStorage.formatFileSize(fileData.size)}</div>` : ''}
                    <div class="work-open-cue">Открыть проект</div>
                </div>
            </div>
        </article>
    `;
}

function openProjectModal(id) {
    const work = portfolioState.works.find(item => item.id === id);
    const modal = document.getElementById('projectModal');
    const content = document.getElementById('projectModalBody');
    if (!work || !modal || !content) return;

    portfolioState.activeWorkId = id;
    content.innerHTML = buildProjectModalMarkup(work);
    modal.classList.add('active');
    document.body.classList.add('modal-open');

    content.querySelectorAll('[data-related-id]').forEach(card => {
        card.addEventListener('click', () => openProjectModal(card.dataset.relatedId));
    });

    content.querySelectorAll('[data-gallery-lightbox]').forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault();
            const index = Array.from(content.querySelectorAll('[data-gallery-lightbox]')).indexOf(item);
            openMediaLightbox(content, Math.max(0, index));
        });
    });

    content.querySelectorAll('.project-gallery-item:not([data-gallery-lightbox])').forEach(item => {
        item.addEventListener('click', () => {
            const href = item.getAttribute('data-file-url');
            if (href) window.open(href, '_blank', 'noopener');
        });
    });
}

function buildProjectModalMarkup(work) {
    const fileData = work.fileData || null;
    const mainUrl = fileData ? rememberObjectUrl(PortfolioStorage.createObjectUrl(fileData)) : '';
    const category = getPublicCategoryLabel(work);
    const tags = Array.isArray(work.tags) ? work.tags.filter(Boolean) : [];
    const gallery = Array.isArray(work.gallery) ? work.gallery : [];
    const lightboxMediaCount = getProjectLightboxMediaCount(work);
    const paragraphs = splitTextToParagraphs(work.detailedDescription || work.description || '');
    const related = getRelatedWorks(work);
    const relatedLinks = [
        work.repository ? `<a href="${PortfolioStorage.escapeHtml(work.repository)}" target="_blank" rel="noopener noreferrer">Репозиторий</a>` : '',
        work.demoUrl ? `<a href="${PortfolioStorage.escapeHtml(work.demoUrl)}" target="_blank" rel="noopener noreferrer">Демо</a>` : '',
        work.caseUrl ? `<a href="${PortfolioStorage.escapeHtml(work.caseUrl)}" target="_blank" rel="noopener noreferrer">Кейс / статья</a>` : '',
        work.videoUrl ? `<a href="${PortfolioStorage.escapeHtml(work.videoUrl)}" target="_blank" rel="noopener noreferrer">Видео</a>` : '',
        work.extraUrl ? `<a href="${PortfolioStorage.escapeHtml(work.extraUrl)}" target="_blank" rel="noopener noreferrer">Дополнительная ссылка</a>` : ''
    ].filter(Boolean);

    return `
        <div class="project-detail">
            <div class="project-hero">
                <div class="project-hero-media">
                    ${renderProjectMainMedia(work, mainUrl, lightboxMediaCount)}
                </div>
                <div class="project-hero-info">
                    <span class="project-type-badge">${PortfolioStorage.escapeHtml(category)}</span>
                    <h2>${PortfolioStorage.escapeHtml(work.title)}</h2>
                    <p class="project-lead">${PortfolioStorage.escapeHtml(work.description || '')}</p>
                    <div class="project-stats">
                        ${work.projectType ? renderFactCard('Тип', work.projectType) : ''}
                        ${work.client ? renderFactCard('Клиент', work.client) : ''}
                        ${work.role ? renderFactCard('Роль', work.role) : ''}
                        ${work.date ? renderFactCard('Дата', work.date) : ''}
                    </div>
                    ${tags.length ? `<div class="project-tags">${tags.map(tag => `<span>${PortfolioStorage.escapeHtml(tag)}</span>`).join('')}</div>` : ''}
                    <div class="project-actions">
                        ${work.link ? `<a href="${PortfolioStorage.escapeHtml(work.link)}" class="project-action primary" target="_blank" rel="noopener noreferrer">Открыть проект</a>` : ''}
                        ${work.videoUrl ? `<a href="${PortfolioStorage.escapeHtml(work.videoUrl)}" class="project-action" target="_blank" rel="noopener noreferrer">Смотреть видео</a>` : ''}
                        ${mainUrl ? `<a href="${mainUrl}" class="project-action" ${fileData && PortfolioStorage.getMimeCategory(fileData.type, fileData.name) === 'pdf' ? `download="${PortfolioStorage.escapeHtml(fileData.name || 'file.pdf')}"` : 'target="_blank" rel="noopener noreferrer"'}>${fileData && PortfolioStorage.getMimeCategory(fileData.type, fileData.name) === 'pdf' ? 'Скачать PDF' : 'Открыть исходный файл'}</a>` : ''}
                    </div>
                    ${fileData ? `<div class="project-file-box"><strong>${PortfolioStorage.escapeHtml(fileData.name)}</strong><span>${PortfolioStorage.formatFileSize(fileData.size)} · ${PortfolioStorage.escapeHtml(fileData.type || 'неизвестный формат')}</span></div>` : ''}
                </div>
            </div>

            <div class="project-section-grid ${relatedLinks.length ? '' : 'single'}">
                <section class="project-section">
                    <h3>О проекте</h3>
                    ${paragraphs.length ? paragraphs.map(text => `<p>${PortfolioStorage.escapeHtml(text)}</p>`).join('') : '<p>Подробности пока не добавлены.</p>'}
                </section>
                ${relatedLinks.length ? `
                    <section class="project-section project-related-section">
                        <h3>Связанный контент</h3>
                        <div class="project-related-links">${relatedLinks.join('')}</div>
                    </section>
                ` : ''}
            </div>

            ${gallery.length ? `
                <section class="project-section">
                    <h3>Галерея и дополнительные файлы</h3>
                    <div class="project-gallery-grid">
                        ${gallery.map((item, index) => renderGalleryItem(item, index)).join('')}
                    </div>
                </section>
            ` : ''}

            ${related.length ? `
                <section class="project-section">
                    <h3>Похожие работы</h3>
                    <div class="related-works-grid">
                        ${related.map(item => renderRelatedCard(item)).join('')}
                    </div>
                </section>
            ` : ''}
        </div>
    `;
}

function getProjectLightboxMediaCount(work) {
    let count = 0;
    const fileData = work?.fileData || null;
    if (fileData) {
        const mainType = PortfolioStorage.getMimeCategory(fileData.type, fileData.name);
        if (mainType === 'image' || mainType === 'video') count += 1;
    } else if (work?.imageUrl) {
        count += 1;
    }

    const gallery = Array.isArray(work?.gallery) ? work.gallery : [];
    gallery.forEach(item => {
        const type = PortfolioStorage.getMimeCategory(item.type, item.name);
        if (type === 'image' || type === 'video') count += 1;
    });

    return count;
}

function renderProjectMediaDots(count) {
    if (count <= 1) return '';
    return `
        <div class="project-media-dots" aria-label="В проекте ${count} медиафайла">
            ${Array.from({ length: count }).map((_, index) => `<span class="project-media-dot ${index === 0 ? 'active' : ''}"></span>`).join('')}
        </div>
    `;
}

function renderProjectMainMedia(work, mainUrl, lightboxMediaCount = 0) {
    const fileData = work.fileData || null;
    const safeTitle = PortfolioStorage.escapeHtml(work.title || 'Project');
    const dots = renderProjectMediaDots(lightboxMediaCount);
    const openHint = lightboxMediaCount > 1 ? '<span class="project-main-open-hint">Нажмите, чтобы открыть галерею</span>' : '';

    if (!fileData && work.imageUrl) {
        const url = PortfolioStorage.escapeHtml(work.imageUrl);
        return `
            <button type="button" class="project-main-media-button" data-file-url="${url}" data-gallery-lightbox="true" data-lightbox-type="image" data-lightbox-name="${safeTitle}">
                <img src="${url}" alt="${safeTitle}" class="project-main-image">
                ${openHint}
                ${dots}
            </button>
        `;
    }

    if (fileData) {
        const type = PortfolioStorage.getMimeCategory(fileData.type, fileData.name);
        const safeName = PortfolioStorage.escapeHtml(fileData.name || work.title || 'Файл проекта');
        if (type === 'image' && mainUrl) {
            return `
                <button type="button" class="project-main-media-button" data-file-url="${mainUrl}" data-gallery-lightbox="true" data-lightbox-type="image" data-lightbox-name="${safeName}">
                    <img src="${mainUrl}" alt="${safeTitle}" class="project-main-image">
                    ${openHint}
                    ${dots}
                </button>
            `;
        }
        if (type === 'video' && mainUrl) {
            return `
                <button type="button" class="project-main-media-button" data-file-url="${mainUrl}" data-gallery-lightbox="true" data-lightbox-type="video" data-lightbox-name="${safeName}">
                    <video src="${mainUrl}" class="project-main-video" controls playsinline></video>
                    ${openHint}
                    ${dots}
                </button>
            `;
        }
        if (type === '3d' && mainUrl && PortfolioStorage.isRenderable3D(fileData)) {
            return `<div class="project-main-file project-main-3d">${PortfolioStorage.render3DViewerMarkup(fileData, mainUrl, 'project-model-viewer')}</div>`;
        }
        if (type === 'pdf' && mainUrl) {
            return `
                <div class="project-pdf-download">
                    <div class="project-pdf-download-icon">PDF</div>
                    <h3>${safeName}</h3>
                    <p>${PortfolioStorage.formatFileSize(fileData.size || 0)} · файл будет скачан на устройство</p>
                    <a href="${mainUrl}" download="${safeName}">Скачать PDF</a>
                </div>
            `;
        }
        return `
            <div class="project-main-file">
                ${PortfolioStorage.previewMarkup(work, mainUrl)}
            </div>
        `;
    }

    return `<div class="project-main-file"><div class="file-preview-placeholder file"><div class="file-preview-badge">PROJECT</div><div class="file-preview-name">${safeTitle}</div></div></div>`;
}

function renderFactCard(label, value) {
    return `<div class="project-stat-card"><span>${PortfolioStorage.escapeHtml(label)}</span><strong>${PortfolioStorage.escapeHtml(value)}</strong></div>`;
}

function renderGalleryItem(item, index = 0) {
    const url = rememberObjectUrl(PortfolioStorage.createObjectUrl(item));
    const type = PortfolioStorage.getMimeCategory(item.type, item.name);

    if (type === 'image') {
        return `
            <button type="button" class="project-gallery-item project-gallery-media" data-file-url="${url}" data-gallery-lightbox="true" data-lightbox-index="${index}" data-lightbox-type="image" data-lightbox-name="${PortfolioStorage.escapeHtml(item.name)}">
                <img src="${url}" alt="${PortfolioStorage.escapeHtml(item.name)}">
                <div class="project-gallery-zoom">Открыть</div>
                <div class="project-gallery-caption">${PortfolioStorage.escapeHtml(item.name)}</div>
            </button>
        `;
    }

    if (type === 'video') {
        return `
            <button type="button" class="project-gallery-item project-gallery-media" data-file-url="${url}" data-gallery-lightbox="true" data-lightbox-index="${index}" data-lightbox-type="video" data-lightbox-name="${PortfolioStorage.escapeHtml(item.name)}">
                <video src="${url}" muted playsinline preload="metadata"></video>
                <div class="project-gallery-zoom">Открыть</div>
                <div class="project-gallery-caption">${PortfolioStorage.escapeHtml(item.name)}</div>
            </button>
        `;
    }

    if (type === '3d' && PortfolioStorage.isRenderable3D(item)) {
        return `
            <div class="project-gallery-item project-gallery-model">
                ${PortfolioStorage.render3DViewerMarkup(item, url, 'gallery-model-viewer')}
                <div class="project-gallery-caption">${PortfolioStorage.escapeHtml(item.name)}</div>
            </div>
        `;
    }

    if (type === 'pdf') {
        return `
            <a class="project-gallery-item project-gallery-pdf-download" href="${url}" download="${PortfolioStorage.escapeHtml(item.name || 'file.pdf')}">
                <div class="project-gallery-file-icon">PDF</div>
                <div class="project-gallery-caption">${PortfolioStorage.escapeHtml(item.name)}</div>
                <span>Скачать</span>
            </a>
        `;
    }

    return `
        <div class="project-gallery-item project-gallery-file" data-file-url="${url}">
            <div class="project-gallery-file-icon">${type.toUpperCase()}</div>
            <div class="project-gallery-caption">${PortfolioStorage.escapeHtml(item.name)}</div>
        </div>
    `;
}

function ensureMediaLightbox() {
    let lightbox = document.getElementById('projectMediaLightbox');
    if (lightbox) return lightbox;

    lightbox = document.createElement('div');
    lightbox.id = 'projectMediaLightbox';
    lightbox.className = 'project-media-lightbox';
    lightbox.innerHTML = `
        <button type="button" class="project-media-lightbox-close" aria-label="Закрыть">×</button>
        <button type="button" class="project-media-lightbox-nav prev" aria-label="Предыдущее изображение">‹</button>
        <div class="project-media-lightbox-stage"></div>
        <button type="button" class="project-media-lightbox-nav next" aria-label="Следующее изображение">›</button>
        <div class="project-media-lightbox-footer">
            <span class="project-media-lightbox-name"></span>
            <span class="project-media-lightbox-counter"></span>
            <div class="project-media-lightbox-dots"></div>
        </div>
    `;
    document.body.appendChild(lightbox);

    lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox) closeMediaLightbox();
    });
    lightbox.querySelector('.project-media-lightbox-close')?.addEventListener('click', closeMediaLightbox);
    lightbox.querySelector('.project-media-lightbox-nav.prev')?.addEventListener('click', () => changeMediaLightbox(-1));
    lightbox.querySelector('.project-media-lightbox-nav.next')?.addEventListener('click', () => changeMediaLightbox(1));
    bindHorizontalSwipe(
        lightbox.querySelector('.project-media-lightbox-stage'),
        () => changeMediaLightbox(1),
        () => changeMediaLightbox(-1),
        { threshold: 38 }
    );

    return lightbox;
}

function openMediaLightbox(container, index = 0) {
    const items = Array.from(container.querySelectorAll('[data-gallery-lightbox]')).map(item => ({
        url: item.dataset.fileUrl || '',
        type: item.dataset.lightboxType || 'image',
        name: item.dataset.lightboxName || ''
    })).filter(item => item.url);

    if (!items.length) return;

    portfolioState.lightboxItems = items;
    portfolioState.lightboxIndex = Math.max(0, Math.min(index, items.length - 1));
    ensureMediaLightbox().classList.add('active');
    renderMediaLightbox();
}

function renderMediaLightbox() {
    const lightbox = ensureMediaLightbox();
    const items = portfolioState.lightboxItems || [];
    const current = items[portfolioState.lightboxIndex];
    if (!current) return;

    const stage = lightbox.querySelector('.project-media-lightbox-stage');
    const name = lightbox.querySelector('.project-media-lightbox-name');
    const counter = lightbox.querySelector('.project-media-lightbox-counter');
    const prev = lightbox.querySelector('.project-media-lightbox-nav.prev');
    const next = lightbox.querySelector('.project-media-lightbox-nav.next');
    const dots = lightbox.querySelector('.project-media-lightbox-dots');

    stage.dataset.direction = String(portfolioState.lightboxDirection || 1);
    stage.classList.remove('is-changing');
    void stage.offsetWidth;
    stage.innerHTML = current.type === 'video'
        ? `<video src="${current.url}" controls autoplay playsinline></video>`
        : `<img src="${current.url}" alt="${PortfolioStorage.escapeHtml(current.name)}">`;
    stage.classList.add('is-changing');
    name.textContent = current.name || 'Файл проекта';
    counter.textContent = `${portfolioState.lightboxIndex + 1} / ${items.length}`;

    const hasMany = items.length > 1;
    prev.hidden = !hasMany;
    next.hidden = !hasMany;

    if (dots) {
        dots.innerHTML = hasMany ? items.map((_, index) => `
            <button type="button" class="project-media-lightbox-dot ${index === portfolioState.lightboxIndex ? 'active' : ''}" data-lightbox-dot="${index}" aria-label="Медиа ${index + 1}"></button>
        `).join('') : '';
        dots.querySelectorAll('[data-lightbox-dot]').forEach(dot => {
            dot.addEventListener('click', () => {
                const nextIndex = Number(dot.dataset.lightboxDot || 0);
                portfolioState.lightboxDirection = nextIndex >= portfolioState.lightboxIndex ? 1 : -1;
                portfolioState.lightboxIndex = nextIndex;
                renderMediaLightbox();
            });
        });
    }
}

function changeMediaLightbox(direction = 1) {
    const lightbox = document.getElementById('projectMediaLightbox');
    if (!lightbox?.classList.contains('active')) return;
    const items = portfolioState.lightboxItems || [];
    if (items.length <= 1) return;
    portfolioState.lightboxDirection = direction >= 0 ? 1 : -1;
    portfolioState.lightboxIndex = (portfolioState.lightboxIndex + direction + items.length) % items.length;
    renderMediaLightbox();
}

function closeMediaLightbox() {
    const lightbox = document.getElementById('projectMediaLightbox');
    if (!lightbox) return;
    lightbox.classList.remove('active');
    const stage = lightbox.querySelector('.project-media-lightbox-stage');
    if (stage) stage.innerHTML = '';
}

function getRelatedWorks(currentWork) {
    const currentTags = new Set((currentWork.tags || []).map(tag => String(tag).toLowerCase()));

    return portfolioState.works
        .filter(item => item.id !== currentWork.id)
        .map(item => {
            let score = 0;
            if (item.category && item.category === currentWork.category) score += 3;
            (item.tags || []).forEach(tag => {
                if (currentTags.has(String(tag).toLowerCase())) score += 1;
            });
            return { ...item, _score: score };
        })
        .filter(item => item._score > 0)
        .sort((a, b) => b._score - a._score || (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 3);
}

function renderRelatedCard(work) {
    const fileData = work.fileData || null;
    const objectUrl = fileData ? rememberObjectUrl(PortfolioStorage.createObjectUrl(work.fileData)) : '';
    const media = fileData
        ? PortfolioStorage.previewMarkup(work, objectUrl)
        : `<img src="${PortfolioStorage.escapeHtml(work.imageUrl || 'https://via.placeholder.com/600x400/111111/ffffff?text=Project')}" alt="${PortfolioStorage.escapeHtml(work.title)}" class="work-image">`;

    return `
        <article class="related-work-card" data-related-id="${PortfolioStorage.escapeHtml(work.id)}">
            <div class="related-work-media">${media}</div>
            <div class="related-work-content">
                <span>${PortfolioStorage.escapeHtml(getPublicCategoryLabel(work))}</span>
                <h4>${PortfolioStorage.escapeHtml(work.title)}</h4>
            </div>
        </article>
    `;
}

function splitTextToParagraphs(text) {
    return String(text || '')
        .split(/\n{2,}|\r\n\r\n/)
        .map(item => item.trim())
        .filter(Boolean);
}
