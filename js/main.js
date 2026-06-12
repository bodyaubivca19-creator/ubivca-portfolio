const portfolioState = {
    works: [],
    objectUrls: [],
    heroWorks: [],
    heroCurrentIndex: 0,
    heroAutoplay: null,
    heroDirection: 1,
    lightboxItems: [],
    lightboxIndex: 0
};

const HERO_SLIDE_DURATION = 5000;
const CATEGORY_ORDER = ['design', 'websites', 'development', 'bots', 'apps', 'automation', 'other'];
const CATEGORY_LABELS = {
    design: 'Дизайн',
    websites: 'Сайты',
    development: 'Разработка',
    bots: 'Telegram-боты',
    apps: 'Приложения',
    automation: 'Автоматизация',
    other: 'Прочее'
};
const EMPTY_TEXT = {
    design: 'Здесь появятся дизайн-проекты.',
    websites: 'Здесь появятся сайты и лендинги.',
    development: 'Здесь появятся проекты разработки.',
    bots: 'Здесь появятся Telegram-боты.',
    apps: 'Здесь появятся приложения и мини-сервисы.',
    automation: 'Здесь появятся системы и автоматизация.',
    other: 'Здесь появятся прочие работы.'
};

const fallbackWorks = [
    { id: 'placeholder-1', title: 'Visual systems', category: 'design', description: 'Графика, 3D, визуалы и подача проектов.', tags: ['Design', '3D'], _placeholder: true },
    { id: 'placeholder-2', title: 'Web products', category: 'websites', description: 'Лендинги, промо-страницы и аккуратная адаптивная верстка.', tags: ['Web', 'UI'], _placeholder: true },
    { id: 'placeholder-3', title: 'Business tools', category: 'automation', description: 'Внутренние инструменты, кабинеты и автоматизация процессов.', tags: ['Systems', 'Automation'], _placeholder: true }
];

function escapeHtml(value = '') {
    if (typeof PortfolioStorage !== 'undefined' && PortfolioStorage?.escapeHtml) return PortfolioStorage.escapeHtml(value);
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\'': '&#039;', '"': '&quot;' }[char]));
}

function getMimeCategory(fileData) {
    if (!fileData) return 'file';
    if (typeof PortfolioStorage !== 'undefined' && PortfolioStorage?.getMimeCategory) return PortfolioStorage.getMimeCategory(fileData.type, fileData.name);
    const type = String(fileData.type || '').toLowerCase();
    const name = String(fileData.name || '').toLowerCase();
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (name.endsWith('.glb') || name.endsWith('.gltf')) return '3d';
    return 'file';
}

function formatFileSize(bytes = 0) {
    return (typeof PortfolioStorage !== 'undefined' && PortfolioStorage?.formatFileSize) ? PortfolioStorage.formatFileSize(bytes) : `${Math.round((bytes || 0) / 1024)} КБ`;
}

function categoryKey(value = '') {
    const raw = typeof value === 'object' && value ? String(value.category || '') : String(value || '');
    const key = raw.toLowerCase().trim();
    const map = {
        '2d': 'design', '3d': 'design', banner: 'design', banners: 'design', photo: 'design', video: 'design', design: 'design',
        site: 'websites', website: 'websites', websites: 'websites', landing: 'websites',
        dev: 'development', development: 'development', software: 'development', program: 'apps',
        bot: 'bots', bots: 'bots', telegram: 'bots',
        app: 'apps', apps: 'apps', application: 'apps',
        crm: 'automation', system: 'automation', accounting: 'automation', automation: 'automation',
        other: 'other', links: 'other'
    };
    return map[key] || 'other';
}

function categoryLabel(workOrCategory) {
    const key = categoryKey(workOrCategory);
    return CATEGORY_LABELS[key] || 'Прочее';
}

function rememberObjectUrl(url) {
    if (url && url.startsWith('blob:')) portfolioState.objectUrls.push(url);
    return url || '';
}

function getObjectUrl(fileData) {
    if (!fileData) return '';
    return rememberObjectUrl((typeof PortfolioStorage !== 'undefined' && PortfolioStorage?.createObjectUrl) ? PortfolioStorage.createObjectUrl(fileData) : (fileData.url || fileData.publicUrl || ''));
}

function renderMedia(work, className = 'work-image') {
    const fileData = work.fileData || null;
    const safeTitle = escapeHtml(work.title || 'Project');
    const url = fileData ? getObjectUrl(fileData) : (work.imageUrl || '');
    const type = getMimeCategory(fileData);

    if (work._placeholder) {
        return `<div class="hero-featured-placeholder"><span>${escapeHtml(categoryLabel(work)).slice(0, 2)}</span><strong>${escapeHtml(categoryLabel(work))}</strong></div>`;
    }
    if (fileData && type === 'image' && url) return `<img src="${escapeHtml(url)}" alt="${safeTitle}" class="${className}">`;
    if (fileData && type === 'video' && url) return `<video src="${escapeHtml(url)}" class="${className}" muted playsinline preload="metadata"></video>`;
    if (fileData && type === '3d' && url && typeof PortfolioStorage !== 'undefined' && PortfolioStorage?.render3DViewerMarkup && PortfolioStorage.isRenderable3D(fileData)) {
        return PortfolioStorage.render3DViewerMarkup(fileData, url, className === 'work-image' ? 'work-model-viewer' : 'project-model-viewer');
    }
    if (fileData && type === 'pdf') {
        return `<div class="file-preview-placeholder pdf"><div class="file-preview-badge">PDF</div><div class="file-preview-name">${escapeHtml(fileData.name || work.title)}</div><div class="file-preview-meta">${formatFileSize(fileData.size || 0)}</div></div>`;
    }
    if (url) return `<img src="${escapeHtml(url)}" alt="${safeTitle}" class="${className}">`;
    return `<div class="file-preview-placeholder file"><div class="file-preview-badge">WORK</div><div class="file-preview-name">${safeTitle}</div></div>`;
}

async function safeLoadWorks() {
    try {
        if (typeof PortfolioAuth !== 'undefined' && PortfolioAuth?.ensureSetup) await PortfolioAuth.ensureSetup();
        if (typeof PortfolioStorage !== 'undefined' && PortfolioStorage?.getAllWorks) {
            const works = await PortfolioStorage.getAllWorks();
            return Array.isArray(works) ? works : [];
        }
    } catch (error) {
        console.warn('Не удалось загрузить проекты:', error);
    }
    return [];
}

function clearObjectUrls() {
    portfolioState.objectUrls.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (_) {}
    });
    portfolioState.objectUrls = [];
}

async function initPortfolio() {
    initProjectModal();
    initHeroControls();
    clearObjectUrls();

    const works = await safeLoadWorks();
    portfolioState.works = normalizeWorks(works);
    renderProjects(portfolioState.works);
    renderHero(portfolioState.works.length ? portfolioState.works : fallbackWorks);
}

function normalizeWorks(works) {
    return [...works]
        .filter(Boolean)
        .map(work => ({ ...work, category: categoryKey(work) }))
        .sort((a, b) => {
            const aTime = a.createdAt || Date.parse(a.date || a.projectYear || '') || 0;
            const bTime = b.createdAt || Date.parse(b.date || b.projectYear || '') || 0;
            return bTime - aTime;
        });
}

function renderProjects(works) {
    const total = works.length;
    CATEGORY_ORDER.forEach(key => {
        const section = document.querySelector(`[data-project-section="${key}"]`);
        const grid = document.querySelector(`[data-project-grid="${key}"]`);
        if (!section || !grid) return;
        const list = works.filter(work => categoryKey(work) === key);
        section.hidden = total > 0 && !list.length;
        section.classList.remove('is-expanded');
        grid.innerHTML = list.length ? list.map(renderWorkCard).join('') : renderEmpty(EMPTY_TEXT[key]);
        setupShowMore(section, list.length);
    });
    bindWorkCards();
}

function renderEmpty(text) {
    return `<div class="empty-category-card">${escapeHtml(text)}</div>`;
}

function renderWorkCard(work) {
    const fileData = work.fileData || null;
    const type = getMimeCategory(fileData);
    const isPdf = type === 'pdf';
    const tags = Array.isArray(work.tags) ? work.tags.slice(0, 4) : [];
    return `
        <article class="work-item" data-id="${escapeHtml(work.id)}" data-pdf="${isPdf ? 'true' : 'false'}">
            <div class="work-category-pill">${escapeHtml(categoryLabel(work))}</div>
            <div class="work-media-shell">${renderMedia(work)}</div>
            <div class="work-content">
                <div class="work-meta-row">
                    <span class="work-category">${escapeHtml(categoryLabel(work))}</span>
                    ${work.date || work.projectYear ? `<span class="work-date">${escapeHtml(work.projectYear || work.date)}</span>` : ''}
                </div>
                <h3 class="work-title">${escapeHtml(work.title || categoryLabel(work))}</h3>
                <p class="work-description">${escapeHtml(work.description || '')}</p>
                ${fileData ? `<div class="work-file-meta">${escapeHtml(fileData.name || '')} · ${formatFileSize(fileData.size || 0)}</div>` : ''}
                ${tags.length ? `<div class="project-tags">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
                <div class="work-open-cue">${isPdf ? 'Скачать PDF' : 'Открыть проект'}</div>
            </div>
        </article>`;
}

function setupShowMore(section, count) {
    section.querySelector('.category-show-more')?.remove();
    if (count <= 3) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-show-more';
    btn.textContent = `Показать ещё ${count - 3}`;
    section.querySelector('.works-grid')?.after(btn);
    btn.addEventListener('click', () => {
        const expanded = section.classList.toggle('is-expanded');
        btn.textContent = expanded ? 'Свернуть' : `Показать ещё ${count - 3}`;
    });
}

function bindWorkCards() {
    document.querySelectorAll('.work-item').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            const work = portfolioState.works.find(item => String(item.id) === String(id));
            if (!work) return;
            if (card.dataset.pdf === 'true') {
                downloadWorkFile(work);
                return;
            }
            openProjectModal(id);
        });
    });
}

function downloadWorkFile(work) {
    const fileData = work?.fileData;
    const url = getObjectUrl(fileData) || work?.link || work?.imageUrl;
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = fileData?.name || `${work.title || 'file'}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function heroSelection(works) {
    const selected = [...works].filter(work => work.fileData || work.imageUrl || work._placeholder).slice(0, 8);
    return selected.length ? selected : fallbackWorks;
}

function renderHero(works) {
    portfolioState.heroWorks = heroSelection(works);
    portfolioState.heroCurrentIndex = 0;
    updateHeroSlide();
    startHeroAutoplay();
}

function renderHeroCard(work) {
    return `
        <article class="hero-featured-card" data-hero-id="${escapeHtml(work.id)}">
            <div class="hero-featured-media">${renderMedia(work)}</div>
            <div class="hero-featured-overlay"></div>
            <div class="hero-featured-info">
                <span class="hero-featured-category">${escapeHtml(categoryLabel(work))}</span>
                <h3>${escapeHtml(work.title || categoryLabel(work))}</h3>
                <p>${escapeHtml(work.description || '')}</p>
                <span class="hero-featured-hint">${work._placeholder ? 'Добавь реальные работы в админке' : (getMimeCategory(work.fileData) === 'pdf' ? 'Скачать PDF' : 'Открыть проект')}</span>
            </div>
        </article>`;
}

function updateHeroSlide() {
    const stage = document.getElementById('heroSliderStage');
    const counter = document.getElementById('heroSliderCounter');
    const dots = document.getElementById('heroSliderDots');
    const works = portfolioState.heroWorks;
    if (!stage || !works.length) return;

    const index = ((portfolioState.heroCurrentIndex % works.length) + works.length) % works.length;
    portfolioState.heroCurrentIndex = index;
    const current = works[index];
    stage.style.setProperty('--slide-dir', String(portfolioState.heroDirection || 1));
    stage.classList.remove('is-changing');
    void stage.offsetWidth;
    stage.innerHTML = renderHeroCard(current);
    stage.classList.add('is-changing');

    stage.querySelector('[data-hero-id]')?.addEventListener('click', () => {
        if (current._placeholder) return;
        if (getMimeCategory(current.fileData) === 'pdf') downloadWorkFile(current);
        else openProjectModal(current.id);
    });

    if (counter) counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(works.length).padStart(2, '0')}`;
    if (dots) {
        dots.innerHTML = works.map((_, dotIndex) => `<button type="button" class="hero-slider-dot ${dotIndex === index ? 'active' : ''}" data-hero-dot="${dotIndex}" aria-label="Слайд ${dotIndex + 1}"></button>`).join('');
        dots.querySelectorAll('[data-hero-dot]').forEach(dot => dot.addEventListener('click', () => {
            const nextIndex = Number(dot.dataset.heroDot || 0);
            portfolioState.heroDirection = nextIndex >= portfolioState.heroCurrentIndex ? 1 : -1;
            portfolioState.heroCurrentIndex = nextIndex;
            updateHeroSlide();
            startHeroAutoplay();
        }));
    }
    restartTimeline();
}

function changeHeroSlide(direction = 1) {
    const works = portfolioState.heroWorks;
    if (!works.length) return;
    portfolioState.heroDirection = direction >= 0 ? 1 : -1;
    portfolioState.heroCurrentIndex = (portfolioState.heroCurrentIndex + direction + works.length) % works.length;
    updateHeroSlide();
}

function initHeroControls() {
    document.getElementById('heroPrev')?.addEventListener('click', () => { changeHeroSlide(-1); startHeroAutoplay(); });
    document.getElementById('heroNext')?.addEventListener('click', () => { changeHeroSlide(1); startHeroAutoplay(); });
    bindSwipe(document.getElementById('heroSliderStage'), () => { changeHeroSlide(1); startHeroAutoplay(); }, () => { changeHeroSlide(-1); startHeroAutoplay(); });
}

function startHeroAutoplay() {
    clearInterval(portfolioState.heroAutoplay);
    if ((portfolioState.heroWorks || []).length <= 1) return;
    portfolioState.heroAutoplay = setInterval(() => changeHeroSlide(1), HERO_SLIDE_DURATION);
    restartTimeline();
}

function restartTimeline() {
    const bar = document.getElementById('heroSliderTimelineBar');
    if (!bar) return;
    bar.classList.remove('playing');
    void bar.offsetWidth;
    if ((portfolioState.heroWorks || []).length > 1) bar.classList.add('playing');
}

function initProjectModal() {
    const modal = document.getElementById('projectModal');
    const close = document.getElementById('projectModalClose');
    close?.addEventListener('click', closeProjectModal);
    modal?.addEventListener('click', event => { if (event.target === modal) closeProjectModal(); });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            if (document.getElementById('projectMediaLightbox')?.classList.contains('active')) closeMediaLightbox();
            else closeProjectModal();
        }
        if (event.key === 'ArrowRight') changeMediaLightbox(1);
        if (event.key === 'ArrowLeft') changeMediaLightbox(-1);
    });
}

function openProjectModal(id) {
    const work = portfolioState.works.find(item => String(item.id) === String(id));
    const modal = document.getElementById('projectModal');
    const body = document.getElementById('projectModalBody');
    if (!work || !modal || !body) return;
    body.innerHTML = projectMarkup(work);
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    body.querySelectorAll('[data-gallery-lightbox]').forEach((item, index) => item.addEventListener('click', event => {
        event.preventDefault();
        openMediaLightbox(body, index);
    }));
    body.querySelectorAll('[data-related-id]').forEach(item => item.addEventListener('click', () => openProjectModal(item.dataset.relatedId)));
}

function closeProjectModal() {
    const modal = document.getElementById('projectModal');
    const body = document.getElementById('projectModalBody');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (body) body.innerHTML = '';
}

function projectMarkup(work) {
    const fileData = work.fileData || null;
    const mainUrl = fileData ? getObjectUrl(fileData) : (work.imageUrl || '');
    const tags = Array.isArray(work.tags) ? work.tags : [];
    const related = relatedWorks(work);
    const links = [
        work.link ? `<a class="project-action primary" href="${escapeHtml(work.link)}" target="_blank" rel="noopener noreferrer">Открыть проект</a>` : '',
        work.demoUrl ? `<a class="project-action" href="${escapeHtml(work.demoUrl)}" target="_blank" rel="noopener noreferrer">Демо</a>` : '',
        work.repository ? `<a class="project-action" href="${escapeHtml(work.repository)}" target="_blank" rel="noopener noreferrer">Репозиторий</a>` : '',
        work.caseUrl ? `<a class="project-action" href="${escapeHtml(work.caseUrl)}" target="_blank" rel="noopener noreferrer">Кейс</a>` : '',
        work.videoUrl ? `<a class="project-action" href="${escapeHtml(work.videoUrl)}" target="_blank" rel="noopener noreferrer">Видео</a>` : '',
        work.extraUrl ? `<a class="project-action" href="${escapeHtml(work.extraUrl)}" target="_blank" rel="noopener noreferrer">Ещё ссылка</a>` : ''
    ].filter(Boolean).join('');
    const paragraphs = splitParagraphs(work.detailedDescription || work.description || '');
    const gallery = Array.isArray(work.gallery) ? work.gallery : [];

    return `
        <div class="project-detail">
            <div class="project-hero">
                <div class="project-hero-media">${renderProjectMain(work, mainUrl)}</div>
                <div class="project-hero-info">
                    <span class="project-type-badge">${escapeHtml(categoryLabel(work))}</span>
                    <h2>${escapeHtml(work.title || categoryLabel(work))}</h2>
                    <p class="project-lead">${escapeHtml(work.description || '')}</p>
                    <div class="project-stats">
                        ${fact('Тип', work.projectType || categoryLabel(work))}
                        ${work.client ? fact('Клиент', work.client) : ''}
                        ${work.role ? fact('Роль', work.role) : ''}
                        ${work.projectYear || work.date ? fact('Период', work.projectYear || work.date) : ''}
                    </div>
                    ${tags.length ? `<div class="project-tags">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
                    ${links ? `<div class="project-actions">${links}</div>` : ''}
                    ${fileData ? `<div class="project-file-box"><strong>${escapeHtml(fileData.name || '')}</strong><span>${formatFileSize(fileData.size || 0)} · ${escapeHtml(fileData.type || 'файл')}</span></div>` : ''}
                </div>
            </div>

            <div class="project-section-grid ${links ? '' : 'single'}">
                <section class="project-section">
                    <h3>О проекте</h3>
                    ${paragraphs.length ? paragraphs.map(text => `<p>${escapeHtml(text)}</p>`).join('') : '<p>Подробности пока не добавлены.</p>'}
                </section>
                ${links ? `<section class="project-section project-related-section"><h3>Ссылки</h3><div class="project-related-links">${links}</div></section>` : ''}
            </div>

            ${gallery.length ? `<section class="project-section"><h3>Галерея</h3><div class="project-gallery-grid">${gallery.map(renderGalleryItem).join('')}</div></section>` : ''}
            ${related.length ? `<section class="project-section"><h3>Похожие работы</h3><div class="related-works-grid">${related.map(renderRelatedCard).join('')}</div></section>` : ''}
        </div>`;
}

function renderProjectMain(work, mainUrl) {
    const fileData = work.fileData || null;
    const type = getMimeCategory(fileData);
    const safeTitle = escapeHtml(work.title || 'Project');
    if (fileData && type === 'image' && mainUrl) return `<button type="button" class="project-main-media-button" data-gallery-lightbox="true" data-file-url="${escapeHtml(mainUrl)}" data-lightbox-type="image" data-lightbox-name="${escapeHtml(fileData.name || work.title)}"><img src="${escapeHtml(mainUrl)}" alt="${safeTitle}" class="project-main-image"><span class="project-main-open-hint">Открыть полностью</span></button>`;
    if (fileData && type === 'video' && mainUrl) return `<button type="button" class="project-main-media-button" data-gallery-lightbox="true" data-file-url="${escapeHtml(mainUrl)}" data-lightbox-type="video" data-lightbox-name="${escapeHtml(fileData.name || work.title)}"><video src="${escapeHtml(mainUrl)}" class="project-main-video" controls playsinline></video></button>`;
    if (fileData && type === 'pdf' && mainUrl) return `<div class="project-pdf-download"><div class="project-pdf-download-icon">PDF</div><h3>${escapeHtml(fileData.name || work.title)}</h3><p>${formatFileSize(fileData.size || 0)} · файл скачивается напрямую</p><a href="${escapeHtml(mainUrl)}" download="${escapeHtml(fileData.name || 'file.pdf')}">Скачать PDF</a></div>`;
    if (fileData && type === '3d' && mainUrl && typeof PortfolioStorage !== 'undefined' && PortfolioStorage?.render3DViewerMarkup && PortfolioStorage.isRenderable3D(fileData)) return PortfolioStorage.render3DViewerMarkup(fileData, mainUrl, 'project-model-viewer');
    if (!fileData && mainUrl) return `<button type="button" class="project-main-media-button" data-gallery-lightbox="true" data-file-url="${escapeHtml(mainUrl)}" data-lightbox-type="image" data-lightbox-name="${safeTitle}"><img src="${escapeHtml(mainUrl)}" alt="${safeTitle}" class="project-main-image"><span class="project-main-open-hint">Открыть полностью</span></button>`;
    return renderMedia(work, 'project-main-image');
}

function fact(label, value) {
    return `<div class="project-stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderGalleryItem(item) {
    const url = getObjectUrl(item);
    const type = getMimeCategory(item);
    const name = escapeHtml(item.name || 'Файл');
    if (type === 'image') return `<button type="button" class="project-gallery-item" data-gallery-lightbox="true" data-file-url="${escapeHtml(url)}" data-lightbox-type="image" data-lightbox-name="${name}"><img src="${escapeHtml(url)}" alt="${name}"><span class="project-gallery-zoom">Открыть</span><span class="project-gallery-caption">${name}</span></button>`;
    if (type === 'video') return `<button type="button" class="project-gallery-item" data-gallery-lightbox="true" data-file-url="${escapeHtml(url)}" data-lightbox-type="video" data-lightbox-name="${name}"><video src="${escapeHtml(url)}" muted playsinline preload="metadata"></video><span class="project-gallery-zoom">Открыть</span><span class="project-gallery-caption">${name}</span></button>`;
    if (type === 'pdf') return `<a class="project-gallery-item project-gallery-pdf-download" href="${escapeHtml(url)}" download="${name}"><div class="project-gallery-file-icon">PDF</div><span class="project-gallery-caption">${name}</span></a>`;
    return `<a class="project-gallery-item project-gallery-file" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><div class="project-gallery-file-icon">${escapeHtml(type.toUpperCase())}</div><span class="project-gallery-caption">${name}</span></a>`;
}

function relatedWorks(current) {
    const currentTags = new Set((current.tags || []).map(tag => String(tag).toLowerCase()));
    return portfolioState.works
        .filter(work => work.id !== current.id)
        .map(work => {
            let score = categoryKey(work) === categoryKey(current) ? 3 : 0;
            (work.tags || []).forEach(tag => { if (currentTags.has(String(tag).toLowerCase())) score += 1; });
            return { ...work, _score: score };
        })
        .filter(work => work._score > 0)
        .sort((a, b) => b._score - a._score)
        .slice(0, 3);
}

function renderRelatedCard(work) {
    return `<article class="related-work-card" data-related-id="${escapeHtml(work.id)}"><div class="related-work-media">${renderMedia(work)}</div><div class="related-work-content"><span>${escapeHtml(categoryLabel(work))}</span><h4>${escapeHtml(work.title || '')}</h4></div></article>`;
}

function splitParagraphs(text) {
    return String(text || '').split(/\n{2,}|\r\n\r\n/).map(item => item.trim()).filter(Boolean);
}

function ensureLightbox() {
    let lightbox = document.getElementById('projectMediaLightbox');
    if (lightbox) return lightbox;
    lightbox = document.createElement('div');
    lightbox.id = 'projectMediaLightbox';
    lightbox.className = 'project-media-lightbox';
    lightbox.innerHTML = `
        <button type="button" class="project-media-lightbox-close" aria-label="Закрыть">×</button>
        <button type="button" class="project-media-lightbox-nav prev" aria-label="Предыдущее">‹</button>
        <div class="project-media-lightbox-stage"></div>
        <button type="button" class="project-media-lightbox-nav next" aria-label="Следующее">›</button>
        <div class="project-media-lightbox-footer"><span class="project-media-lightbox-name"></span><span class="project-media-lightbox-counter"></span><div class="project-media-lightbox-dots"></div></div>`;
    document.body.appendChild(lightbox);
    lightbox.addEventListener('click', event => { if (event.target === lightbox) closeMediaLightbox(); });
    lightbox.querySelector('.project-media-lightbox-close')?.addEventListener('click', closeMediaLightbox);
    lightbox.querySelector('.project-media-lightbox-nav.prev')?.addEventListener('click', () => changeMediaLightbox(-1));
    lightbox.querySelector('.project-media-lightbox-nav.next')?.addEventListener('click', () => changeMediaLightbox(1));
    bindSwipe(lightbox.querySelector('.project-media-lightbox-stage'), () => changeMediaLightbox(1), () => changeMediaLightbox(-1));
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
    ensureLightbox().classList.add('active');
    renderLightbox();
}

function renderLightbox() {
    const lightbox = ensureLightbox();
    const items = portfolioState.lightboxItems;
    const current = items[portfolioState.lightboxIndex];
    if (!current) return;
    const stage = lightbox.querySelector('.project-media-lightbox-stage');
    stage.classList.remove('is-changing');
    void stage.offsetWidth;
    stage.innerHTML = current.type === 'video' ? `<video src="${escapeHtml(current.url)}" controls autoplay playsinline></video>` : `<img src="${escapeHtml(current.url)}" alt="${escapeHtml(current.name)}">`;
    stage.classList.add('is-changing');
    lightbox.querySelector('.project-media-lightbox-name').textContent = current.name || 'Файл';
    lightbox.querySelector('.project-media-lightbox-counter').textContent = `${portfolioState.lightboxIndex + 1} / ${items.length}`;
    lightbox.querySelectorAll('.project-media-lightbox-nav').forEach(btn => { btn.hidden = items.length <= 1; });
    const dots = lightbox.querySelector('.project-media-lightbox-dots');
    if (dots) {
        dots.innerHTML = items.length > 1 ? items.map((_, i) => `<button type="button" class="project-media-lightbox-dot ${i === portfolioState.lightboxIndex ? 'active' : ''}" data-lightbox-dot="${i}" aria-label="Медиа ${i + 1}"></button>`).join('') : '';
        dots.querySelectorAll('[data-lightbox-dot]').forEach(dot => dot.addEventListener('click', () => { portfolioState.lightboxIndex = Number(dot.dataset.lightboxDot || 0); renderLightbox(); }));
    }
}

function changeMediaLightbox(direction) {
    const lightbox = document.getElementById('projectMediaLightbox');
    const items = portfolioState.lightboxItems;
    if (!lightbox?.classList.contains('active') || items.length <= 1) return;
    portfolioState.lightboxIndex = (portfolioState.lightboxIndex + direction + items.length) % items.length;
    renderLightbox();
}

function closeMediaLightbox() {
    const lightbox = document.getElementById('projectMediaLightbox');
    if (!lightbox) return;
    lightbox.classList.remove('active');
    lightbox.querySelector('.project-media-lightbox-stage').innerHTML = '';
}

function bindSwipe(element, onLeft, onRight) {
    if (!element || element.dataset.swipeBound) return;
    element.dataset.swipeBound = 'true';
    let startX = 0;
    let startY = 0;
    element.addEventListener('touchstart', event => {
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
    }, { passive: true });
    element.addEventListener('touchend', event => {
        const touch = event.changedTouches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        dx < 0 ? onLeft() : onRight();
    }, { passive: true });
}

document.addEventListener('DOMContentLoaded', initPortfolio);
window.addEventListener('beforeunload', clearObjectUrls);
