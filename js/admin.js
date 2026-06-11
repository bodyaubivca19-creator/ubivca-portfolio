let worksCache = [];
let editingId = null;

window.addEventListener('DOMContentLoaded', async () => {
    await PortfolioAuth.ensureSetup();
    initLoginGate();
    initNavigation();
    initUploadAreas();
    initCategoryChoices();
    initForm();
    initSecuritySettings();

    if (PortfolioAuth.isAuthenticated()) {
        await unlockAdmin();
    }
});

function initLoginGate() {
    const loginForm = document.getElementById('adminLoginForm');
    const logoutBtn = document.getElementById('logoutBtn');

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('adminUsername')?.value.trim();
        const password = document.getElementById('adminPassword')?.value || '';
        const result = await PortfolioAuth.login(username, password);

        if (!result.ok) {
            setAuthHint(result.message, 'error');
            return;
        }

        setAuthHint('Вход выполнен.', 'success');
        document.getElementById('adminPassword').value = '';
        await unlockAdmin();

        if (result.defaultPassword) {
            showNotification('Вы вошли с паролем по умолчанию. Лучше сразу сменить его в настройках.', 'warning');
        }
    });

    logoutBtn?.addEventListener('click', () => {
        PortfolioAuth.logout();
        lockAdmin();
        window.location.href = 'index.html';
    });
}

async function unlockAdmin() {
    document.getElementById('adminAuthScreen')?.classList.add('hidden');
    const adminContainer = document.getElementById('adminContainer');
    if (adminContainer) adminContainer.hidden = false;
    const dateInput = document.getElementById('workDate');
    if (dateInput && (!dateInput.value || dateInput.value === '2024-01-01')) {
        dateInput.value = new Date().toISOString().slice(0, 10);
    }
    await loadWorks();
    updateStats();
    await refreshSecurityInfo();
    await openEditFromUrl();
}

function lockAdmin() {
    document.getElementById('adminAuthScreen')?.classList.remove('hidden');
    const adminContainer = document.getElementById('adminContainer');
    if (adminContainer) adminContainer.hidden = true;
}

function setAuthHint(message, type = '') {
    const hint = document.getElementById('adminAuthHint');
    if (!hint) return;
    hint.className = `admin-auth-hint ${type}`.trim();
    hint.textContent = message || '';
}

function requireAdminAccess() {
    if (!PortfolioAuth.isAuthenticated()) {
        lockAdmin();
        setAuthHint('Сначала войдите как администратор.', 'error');
        return false;
    }
    return true;
}


async function openEditFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (!editId) return;
    await editWork(editId);
}

function initNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const sections = document.querySelectorAll('.admin-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (!requireAdminAccess()) return;
            navLinks.forEach(item => item.classList.remove('active'));
            link.classList.add('active');

            const target = link.getAttribute('href');
            sections.forEach(section => section.classList.remove('active'));

            if (target === '#works') {
                document.getElementById('works-section')?.classList.add('active');
            } else if (target === '#settings') {
                document.getElementById('settings-section')?.classList.add('active');
            } else {
                document.getElementById('add-work-section')?.classList.add('active');
            }
        });
    });
}

function initUploadAreas() {
    bindUploadArea('mainImageArea', 'workImage', handleMainFilePreview);
    bindUploadArea('galleryArea', 'workGallery', handleGalleryPreview);
}

function initCategoryChoices() {
    const select = document.getElementById('workCategory');
    const choices = document.querySelectorAll('[data-category-choice]');
    if (!select || !choices.length) return;

    const sync = () => {
        choices.forEach(btn => {
            const active = btn.dataset.categoryChoice === select.value;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    };

    choices.forEach(btn => {
        btn.setAttribute('aria-pressed', 'false');
        btn.addEventListener('click', () => {
            select.value = btn.dataset.categoryChoice || '';
            select.dataset.manual = 'true';
            sync();
        });
    });

    select.addEventListener('change', () => {
        select.dataset.manual = select.value ? 'true' : '';
        sync();
    });

    sync();
}

function syncCategoryChoices() {
    const select = document.getElementById('workCategory');
    const choices = document.querySelectorAll('[data-category-choice]');
    if (!select || !choices.length) return;
    choices.forEach(btn => {
        const active = btn.dataset.categoryChoice === select.value;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function bindUploadArea(areaId, inputId, callback) {
    const area = document.getElementById(areaId);
    const input = document.getElementById(inputId);
    if (!area || !input) return;

    area.addEventListener('click', () => input.click());
    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.classList.add('dragover');
    });
    area.addEventListener('dragleave', () => area.classList.remove('dragover'));
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (!files || !files.length) return;
        input.files = files;
        callback(files);
    });
    input.addEventListener('change', () => callback(input.files));
}

function initForm() {
    const form = document.getElementById('workForm');
    const previewBtn = document.getElementById('previewBtn');
    const resetBtn = form?.querySelector('button[type="reset"]');

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!requireAdminAccess()) return;
        await saveWork();
    });

    previewBtn?.addEventListener('click', () => {
        if (!requireAdminAccess()) return;
        previewWork();
    });

    resetBtn?.addEventListener('click', () => {
        resetEditor();
    });
}

function initSecuritySettings() {
    const passwordForm = document.getElementById('passwordChangeForm');
    passwordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!requireAdminAccess()) return;

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const repeatPassword = document.getElementById('repeatPassword').value;

        if (newPassword !== repeatPassword) {
            showNotification('Новый пароль и повтор не совпадают.', 'error');
            return;
        }

        const result = await PortfolioAuth.changePassword(currentPassword, newPassword);
        if (!result.ok) {
            showNotification(result.message, 'error');
            return;
        }

        passwordForm.reset();
        closePasswordModal();
        await refreshSecurityInfo();
        showNotification('Пароль обновлён.', 'success');
    });
}

async function refreshSecurityInfo() {
    const meta = await PortfolioAuth.getPublicMeta();
    const loginEl = document.getElementById('settingsAdminLogin');
    const statusEl = document.getElementById('settingsPasswordStatus');
    const noteEl = document.getElementById('settingsSecurityNote');

    if (loginEl) loginEl.textContent = meta.username;
    if (statusEl) statusEl.textContent = meta.defaultPassword ? 'Пароль по умолчанию' : 'Пользовательский пароль';
    if (noteEl) {
        noteEl.textContent = meta.defaultPassword
            ? 'Сейчас используется стартовый пароль. Обязательно смените его после публикации сайта.'
            : 'Доступ к редактированию ограничен. Гости на сайте видят только публичную витрину проектов.';
    }
}

function handleMainFilePreview(files) {
    const file = files?.[0];
    const preview = document.getElementById('imagePreview');
    if (!preview) return;
    preview.innerHTML = '';
    if (!file) return;

    const type = PortfolioStorage.getMimeCategory(file.type, file.name);
    const objectUrl = URL.createObjectURL(file);

    if (type === 'image') {
        preview.innerHTML = `<div class="preview-item"><img src="${objectUrl}" alt="Preview"><button class="remove-btn" type="button" onclick="removeMainImage()">×</button></div>`;
    } else if (type === 'video') {
        preview.innerHTML = `<div class="preview-item"><video src="${objectUrl}" controls></video><button class="remove-btn" type="button" onclick="removeMainImage()">×</button></div>`;
    } else if (type === '3d' && PortfolioStorage.isRenderable3D(file)) {
        preview.innerHTML = `<div class="preview-item preview-model-stage">${PortfolioStorage.render3DViewerMarkup(file, objectUrl, 'admin-model-viewer')}<button class="remove-btn" type="button" onclick="removeMainImage()">×</button></div>`;
    } else if (type === 'pdf') {
        preview.innerHTML = `
            <div class="preview-item preview-pdf-download-tile">
                <div class="preview-file-icon">PDF</div>
                <div class="preview-file-name">${PortfolioStorage.escapeHtml(file.name)}</div>
                <div class="preview-file-size">${PortfolioStorage.formatFileSize(file.size)} · будет скачиваться</div>
                <button class="remove-btn" type="button" onclick="removeMainImage()">×</button>
            </div>
        `;
    } else {
        preview.innerHTML = `
            <div class="preview-item preview-file-tile">
                <div class="preview-file-icon">${type.toUpperCase()}</div>
                <div class="preview-file-name">${PortfolioStorage.escapeHtml(file.name)}</div>
                <div class="preview-file-size">${PortfolioStorage.formatFileSize(file.size)}</div>
                <button class="remove-btn" type="button" onclick="removeMainImage()">×</button>
            </div>
        `;
    }

    autoSuggestCategory(file);
}

function handleGalleryPreview(files) {
    const preview = document.getElementById('galleryPreview');
    if (!preview) return;
    preview.innerHTML = '';
    if (!files?.length) return;

    Array.from(files).forEach(file => appendStoredGalleryItem({
        name: file.name,
        type: file.type || '',
        size: file.size || 0,
        lastModified: file.lastModified || Date.now(),
        blob: file
    }, preview));
}

function autoSuggestCategory(file) {
    const select = document.getElementById('workCategory');
    if (!select || !file) return;

    // Не перезаписываем категорию, которую выбрали вручную.
    // Иначе обычный скриншот системы учёта автоматически превращал проект в «Дизайн».
    if (select.value) return;

    const map = {
        image: 'design',
        video: 'design',
        app: 'apps',
        archive: 'apps',
        '3d': '3d',
        pdf: 'other',
        audio: 'other',
        file: 'other',
        text: 'other'
    };
    const type = PortfolioStorage.getMimeCategory(file.type, file.name);
    if (map[type]) {
        select.value = map[type];
        syncCategoryChoices();
    }
}

function clearPreviews() {
    const imagePreview = document.getElementById('imagePreview');
    const galleryPreview = document.getElementById('galleryPreview');
    if (imagePreview) imagePreview.innerHTML = '';
    if (galleryPreview) galleryPreview.innerHTML = '';
}

function removeMainImage() {
    const input = document.getElementById('workImage');
    if (input) input.value = '';
    const preview = document.getElementById('imagePreview');
    if (preview) preview.innerHTML = '';
}

function resetEditor() {
    editingId = null;
    document.getElementById('workForm')?.reset();
    const mainInput = document.getElementById('workImage');
    const galleryInput = document.getElementById('workGallery');
    if (mainInput) mainInput.value = '';
    if (galleryInput) galleryInput.value = '';
    document.getElementById('workDate').value = new Date().toISOString().slice(0, 10);
    clearPreviews();
    syncCategoryChoices();
    updateFormHeading();
}

function updateFormHeading() {
    const sectionTitle = document.querySelector('#add-work-section .section-header h2');
    const sectionText = document.querySelector('#add-work-section .section-header p');
    const submitBtn = document.querySelector('.btn-save[type="submit"], button[type="submit"].btn-save');

    if (editingId) {
        if (sectionTitle) sectionTitle.textContent = 'Редактирование проекта';
        if (sectionText) sectionText.textContent = 'Измените данные проекта и сохраните обновления.';
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Обновить проект';
    } else {
        if (sectionTitle) sectionTitle.textContent = 'Новая работа';
        if (sectionText) sectionText.textContent = 'Добавьте проект: категория, описание, скриншоты, видео, ссылки и детали кейса';
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить работу';
    }
}


function normalizeAdminCategory(category = '') {
    const map = {
        '2d': 'design',
        '3d': 'design',
        banner: 'design',
        banners: 'design',
        photo: 'design',
        video: 'design',
        site: 'websites',
        website: 'websites',
        bot: 'bots',
        app: 'apps',
        program: 'apps',
        software: 'apps',
        crm: 'automation',
        system: 'automation',
        accounting: 'automation',
        links: 'other'
    };
    const value = String(category || '').toLowerCase().trim();
    return map[value] || value;
}

async function saveWork() {
    const title = document.getElementById('workTitle').value.trim();
    const category = normalizeAdminCategory(document.getElementById('workCategory').value);
    const description = document.getElementById('workDescription').value.trim();
    const detailedDescription = document.getElementById('detailedDescription').value.trim();
    const tags = document.getElementById('workTags').value.split(',').map(tag => tag.trim()).filter(Boolean);
    const link = document.getElementById('workLink').value.trim();
    const demoUrl = document.getElementById('demoUrl').value.trim();
    const repository = document.getElementById('repositoryUrl').value.trim();
    const caseUrl = document.getElementById('caseUrl').value.trim();
    const videoUrl = document.getElementById('videoUrl')?.value.trim() || '';
    const extraUrl = document.getElementById('extraUrl')?.value.trim() || '';
    const projectType = document.getElementById('projectType').value.trim();
    const client = document.getElementById('projectClient').value.trim();
    const role = document.getElementById('projectRole').value.trim();
    const projectYear = document.getElementById('projectYear').value.trim();
    const mainFile = document.getElementById('workImage').files?.[0] || null;
    const galleryFiles = Array.from(document.getElementById('workGallery').files || []);

    if (!title || !category || !description) {
        showNotification('Заполните обязательные поля.', 'error');
        return;
    }


    const existing = editingId ? await PortfolioStorage.getWork(editingId) : null;

    const work = {
        id: editingId || PortfolioStorage.createId(),
        title,
        category,
        description,
        detailedDescription: detailedDescription || description,
        tags,
        link,
        demoUrl,
        repository,
        caseUrl,
        videoUrl,
        extraUrl,
        projectType: projectType || PortfolioStorage.categoryLabel(category),
        client,
        role,
        projectYear,
        featured: document.querySelector('input[name="featured"]').checked,
        new: document.querySelector('input[name="new"]').checked,
        date: document.getElementById('workDate').value,
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
        fileData: mainFile ? {
            name: mainFile.name,
            type: mainFile.type || '',
            size: mainFile.size || 0,
            lastModified: mainFile.lastModified || Date.now(),
            blob: mainFile
        } : (existing?.fileData || null),
        gallery: galleryFiles.length ? galleryFiles.map(file => ({
            name: file.name,
            type: file.type || '',
            size: file.size || 0,
            lastModified: file.lastModified || Date.now(),
            blob: file
        })) : (existing?.gallery || [])
    };

    await PortfolioStorage.saveWork(work);
    const wasEditing = Boolean(editingId);
    resetEditor();
    await loadWorks();
    updateStats();
    showNotification(wasEditing ? 'Проект обновлён.' : 'Работа сохранена.', 'success');
    document.querySelector('.sidebar-nav .nav-link[href="#works"]')?.click();
}

async function loadWorks() {
    const worksList = document.getElementById('worksList');
    worksCache = await PortfolioStorage.getAllWorks();

    if (!worksList) return;
    if (!worksCache.length) {
        worksList.innerHTML = '<div class="loading">Пока нет работ</div>';
        return;
    }

    const items = worksCache.map(work => {
        const objectUrl = work.fileData ? PortfolioStorage.createObjectUrl(work.fileData) : '';
        return `
            <div class="work-item-admin">
                <div class="admin-work-media">
                    ${work.fileData ? PortfolioStorage.previewMarkup(work, objectUrl) : '<div class="file-preview-placeholder file"><div class="file-preview-badge">LINK</div></div>'}
                </div>
                <div class="info">
                    <div class="admin-work-topline">
                        <span class="admin-work-badge">${PortfolioStorage.escapeHtml(PortfolioStorage.categoryLabel(work.category))}</span>
                        ${work.projectYear ? `<span class="admin-work-year">${PortfolioStorage.escapeHtml(work.projectYear)}</span>` : ''}
                    </div>
                    <h4>${PortfolioStorage.escapeHtml(work.title)}</h4>
                    <p>${PortfolioStorage.escapeHtml((work.description || '').substring(0, 160))}${(work.description || '').length > 160 ? '…' : ''}</p>
                    <small>${PortfolioStorage.escapeHtml((work.tags || []).join(' · ')) || 'Без тегов'}</small>
                </div>
                <div class="actions">
                    <button onclick="editWork('${work.id}')" title="Редактировать"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteWork('${work.id}')" title="Удалить"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });

    worksList.innerHTML = items.join('');
}

function updateStats() {
    const title = document.querySelector('.admin-header h1');
    if (title) {
        title.textContent = editingId
            ? `Редактирование проекта · всего ${worksCache.length}`
            : `Управление проектами · всего ${worksCache.length}`;
    }
}

async function editWork(id) {
    if (!requireAdminAccess()) return;
    const work = await PortfolioStorage.getWork(id);
    if (!work) return;

    editingId = id;
    document.getElementById('workTitle').value = work.title || '';
    document.getElementById('workCategory').value = normalizeAdminCategory(work.category || '');
    syncCategoryChoices();
    document.getElementById('workDescription').value = work.description || '';
    document.getElementById('detailedDescription').value = work.detailedDescription || work.description || '';
    document.getElementById('workTags').value = (work.tags || []).join(', ');
    document.getElementById('workLink').value = work.link || '';
    document.getElementById('demoUrl').value = work.demoUrl || '';
    document.getElementById('repositoryUrl').value = work.repository || '';
    document.getElementById('caseUrl').value = work.caseUrl || '';
    const videoUrlInput = document.getElementById('videoUrl');
    const extraUrlInput = document.getElementById('extraUrl');
    if (videoUrlInput) videoUrlInput.value = work.videoUrl || '';
    if (extraUrlInput) extraUrlInput.value = work.extraUrl || '';
    document.getElementById('projectType').value = work.projectType || '';
    document.getElementById('projectClient').value = work.client || '';
    document.getElementById('projectRole').value = work.role || '';
    document.getElementById('projectYear').value = work.projectYear || '';
    document.getElementById('workDate').value = work.date || new Date().toISOString().slice(0, 10);
    document.querySelector('input[name="featured"]').checked = Boolean(work.featured);
    document.querySelector('input[name="new"]').checked = Boolean(work.new);

    clearPreviews();
    if (work.fileData) handleStoredPreview(work.fileData, 'imagePreview');
    if (work.gallery?.length) {
        const preview = document.getElementById('galleryPreview');
        preview.innerHTML = '';
        work.gallery.forEach(item => appendStoredGalleryItem(item, preview));
    }

    updateFormHeading();
    updateStats();
    document.querySelector('.sidebar-nav .nav-link[href="#add-work"]')?.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleStoredPreview(fileData, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    const url = PortfolioStorage.createObjectUrl(fileData);
    const type = PortfolioStorage.getMimeCategory(fileData.type, fileData.name);

    if (type === 'image') {
        preview.innerHTML = `<div class="preview-item"><img src="${url}" alt="Preview"><button class="remove-btn" type="button" onclick="removeMainImage()">×</button></div>`;
    } else if (type === 'video') {
        preview.innerHTML = `<div class="preview-item"><video src="${url}" controls></video><button class="remove-btn" type="button" onclick="removeMainImage()">×</button></div>`;
    } else if (type === '3d' && PortfolioStorage.isRenderable3D(fileData)) {
        preview.innerHTML = `<div class="preview-item preview-model-stage">${PortfolioStorage.render3DViewerMarkup(fileData, url, 'admin-model-viewer')}<button class="remove-btn" type="button" onclick="removeMainImage()">×</button></div>`;
    } else {
        preview.innerHTML = `
            <div class="preview-item preview-file-tile">
                <div class="preview-file-icon">${type.toUpperCase()}</div>
                <div class="preview-file-name">${PortfolioStorage.escapeHtml(fileData.name)}</div>
                <div class="preview-file-size">${PortfolioStorage.formatFileSize(fileData.size)}</div>
                <button class="remove-btn" type="button" onclick="removeMainImage()">×</button>
            </div>
        `;
    }
}

function appendStoredGalleryItem(fileData, preview) {
    const url = PortfolioStorage.createObjectUrl(fileData);
    const type = PortfolioStorage.getMimeCategory(fileData.type, fileData.name);
    const tile = document.createElement('div');
    tile.className = 'preview-item preview-file-tile small';

    if (type === 'image') {
        tile.innerHTML = `<img src="${url}" alt="${PortfolioStorage.escapeHtml(fileData.name)}">`;
    } else if (type === 'video') {
        tile.innerHTML = `<video src="${url}" muted playsinline preload="metadata"></video>`;
    } else if (type === '3d' && PortfolioStorage.isRenderable3D(fileData)) {
        tile.innerHTML = PortfolioStorage.render3DViewerMarkup(fileData, url, 'admin-model-viewer small');
    } else if (type === 'pdf') {
        tile.classList.add('preview-pdf-small');
        tile.innerHTML = `<div class="preview-file-icon">PDF</div><div class="preview-file-name">${PortfolioStorage.escapeHtml(fileData.name)}</div>`;
    } else {
        tile.innerHTML = `<div class="preview-file-icon">${type.toUpperCase()}</div><div class="preview-file-name">${PortfolioStorage.escapeHtml(fileData.name)}</div>`;
    }
    preview.appendChild(tile);
}

async function deleteWork(id) {
    if (!requireAdminAccess()) return;
    if (!confirm('Удалить эту работу?')) return;
    await PortfolioStorage.deleteWork(id);
    if (editingId === id) resetEditor();
    await loadWorks();
    updateStats();
    showNotification('Работа удалена.', 'success');
}

function previewWork() {
    const title = document.getElementById('workTitle').value.trim() || 'Без названия';
    const category = PortfolioStorage.categoryLabel(document.getElementById('workCategory').value || 'other');
    const description = document.getElementById('workDescription').value.trim() || 'Описание пока не заполнено.';
    const detailedDescription = document.getElementById('detailedDescription').value.trim() || description;
    const tags = document.getElementById('workTags').value.split(',').map(tag => tag.trim()).filter(Boolean);
    const client = document.getElementById('projectClient').value.trim();
    const role = document.getElementById('projectRole').value.trim();
    const projectType = document.getElementById('projectType').value.trim();
    const projectYear = document.getElementById('projectYear').value.trim();
    const videoUrl = document.getElementById('videoUrl')?.value.trim() || '';
    const extraUrl = document.getElementById('extraUrl')?.value.trim() || '';

    document.getElementById('previewContent').innerHTML = `
        <div class="preview-project-page">
            <span class="admin-work-badge">${PortfolioStorage.escapeHtml(category)}</span>
            <h2>${PortfolioStorage.escapeHtml(title)}</h2>
            <p>${PortfolioStorage.escapeHtml(description)}</p>
            <div class="preview-meta-grid">
                ${projectType ? `<div><span>Тип</span><strong>${PortfolioStorage.escapeHtml(projectType)}</strong></div>` : ''}
                ${client ? `<div><span>Клиент</span><strong>${PortfolioStorage.escapeHtml(client)}</strong></div>` : ''}
                ${role ? `<div><span>Роль</span><strong>${PortfolioStorage.escapeHtml(role)}</strong></div>` : ''}
                ${projectYear ? `<div><span>Период</span><strong>${PortfolioStorage.escapeHtml(projectYear)}</strong></div>` : ''}
            </div>
            ${tags.length ? `<div class="preview-tags">${tags.map(tag => `<span>${PortfolioStorage.escapeHtml(tag)}</span>`).join('')}</div>` : ''}
            ${(videoUrl || extraUrl) ? `<div class="preview-links">${videoUrl ? `<span>Видео: ${PortfolioStorage.escapeHtml(videoUrl)}</span>` : ''}${extraUrl ? `<span>Доп. ссылка: ${PortfolioStorage.escapeHtml(extraUrl)}</span>` : ''}</div>` : ''}
            <div class="preview-text-block">${PortfolioStorage.escapeHtml(detailedDescription).replace(/\n/g, '<br>')}</div>
        </div>
    `;
    document.getElementById('previewModal').classList.add('active');
}

function closePreview() {
    document.getElementById('previewModal').classList.remove('active');
}

function openPasswordModal() {
    if (!requireAdminAccess()) return;
    document.getElementById('passwordModal')?.classList.add('active');
}

function closePasswordModal() {
    document.getElementById('passwordModal')?.classList.remove('active');
    document.getElementById('passwordChangeForm')?.reset();
}

function showNotification(message, type = 'success') {
    const existing = document.querySelector('.admin-notification');
    existing?.remove();

    const notice = document.createElement('div');
    notice.className = `admin-notification ${type}`;
    notice.textContent = message;
    document.body.appendChild(notice);

    setTimeout(() => notice.classList.add('show'), 10);
    setTimeout(() => {
        notice.classList.remove('show');
        setTimeout(() => notice.remove(), 300);
    }, 2400);
}
