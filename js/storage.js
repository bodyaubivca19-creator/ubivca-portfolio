
const PortfolioStorage = (() => {
    const DB_NAME = 'portfolioWorksDB';
    const STORE_NAME = 'works';
    const DB_VERSION = 1;

    function openDb() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function withStore(mode, callback) {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, mode);
            const store = tx.objectStore(STORE_NAME);
            const result = callback(store, resolve, reject);

            tx.oncomplete = () => db.close();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error('Транзакция прервана'));

            return result;
        });
    }

    async function getAllWorks() {
        return withStore('readonly', (store, resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const items = (request.result || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                resolve(items);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async function saveWork(work) {
        return withStore('readwrite', (store, resolve, reject) => {
            const request = store.put(work);
            request.onsuccess = () => resolve(work);
            request.onerror = () => reject(request.error);
        });
    }

    async function deleteWork(id) {
        return withStore('readwrite', (store, resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async function getWork(id) {
        return withStore('readonly', (store, resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    function createId() {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    function getMimeCategory(mime = '', fileName = '') {
        const lowerName = (fileName || '').toLowerCase();
        const lowerMime = (mime || '').toLowerCase();

        if (lowerMime.startsWith('image/')) return 'image';
        if (lowerMime.startsWith('video/')) return 'video';
        if (lowerMime.startsWith('audio/')) return 'audio';
        if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) return 'pdf';
        if (lowerName.endsWith('.glb') || lowerName.endsWith('.gltf') || lowerName.endsWith('.obj') || lowerName.endsWith('.fbx') || lowerName.endsWith('.blend')) return '3d';
        if (lowerName.endsWith('.zip') || lowerName.endsWith('.rar') || lowerName.endsWith('.7z') || lowerName.endsWith('.tar') || lowerName.endsWith('.gz')) return 'archive';
        if (lowerName.endsWith('.apk') || lowerName.endsWith('.exe') || lowerName.endsWith('.msi') || lowerName.endsWith('.dmg') || lowerName.endsWith('.app')) return 'app';
        if (lowerMime.startsWith('text/') || lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.json')) return 'text';
        return 'file';
    }

    function formatFileSize(bytes = 0) {
        if (!bytes) return '0 Б';
        const units = ['Б', 'КБ', 'МБ', 'ГБ'];
        let value = bytes;
        let idx = 0;
        while (value >= 1024 && idx < units.length - 1) {
            value /= 1024;
            idx += 1;
        }
        return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
    }

    function escapeHtml(value = '') {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function createObjectUrl(fileData) {
        if (!fileData || !fileData.blob) return '';
        return URL.createObjectURL(fileData.blob);
    }

    function isRenderable3D(fileData) {
        if (!fileData) return false;
        const lowerName = (fileData.name || '').toLowerCase();
        return lowerName.endsWith('.glb') || lowerName.endsWith('.gltf');
    }

    function render3DViewerMarkup(fileData, objectUrl = '', className = 'model-viewer-embed', extraAttrs = '') {
        if (!fileData || !objectUrl || !isRenderable3D(fileData)) return '';
        const safeAlt = escapeHtml(fileData.name || '3D model');
        return `<model-viewer class="${className}" src="${objectUrl}" alt="${safeAlt}" camera-controls auto-rotate rotation-per-second="12deg" interaction-prompt="none" shadow-intensity="1" exposure="1" disable-pan touch-action="pan-y" ${extraAttrs}></model-viewer>`;
    }

    function categoryLabel(category = '') {
        const labels = {
            banners: 'Баннеры',
            websites: 'Сайты',
            development: 'Разработка',
            software: 'Программы',
            '3d': 'Дизайн',
            video: 'Видео',
            photo: 'Фото',
            links: 'Ссылки',
            other: 'Прочее',
            banner: 'Баннеры',
            site: 'Сайты',
            program: 'Программы',
            design: 'Дизайн',
            '2d': 'Дизайн',
            website: 'Сайт',
            app: 'Приложение',
            apps: 'Приложения',
            bot: 'Telegram-бот',
            bots: 'Telegram-боты',
            automation: 'Автоматизация',
            crm: 'Система учёта'
        };
        return labels[category] || category || 'Без категории';
    }

    function previewMarkup(work, objectUrl = '') {
        const file = work.fileData || null;
        const type = file ? getMimeCategory(file.type, file.name) : 'file';
        const safeTitle = escapeHtml(work.title || 'Работа');

        if (file && type === 'image' && objectUrl) {
            return `<img src="${objectUrl}" alt="${safeTitle}" class="work-image">`;
        }
        if (file && type === 'video' && objectUrl) {
            return `<video class="work-image" src="${objectUrl}" muted playsinline preload="metadata"></video>`;
        }
        if (file && type === '3d' && objectUrl && isRenderable3D(file)) {
            return render3DViewerMarkup(file, objectUrl, 'work-model-viewer');
        }
        if (file && type === 'pdf' && objectUrl) {
            const safeName = escapeHtml(file.name || work.title || 'PDF');
            return `
                <div class="pdf-download-card">
                    <div class="pdf-download-icon">PDF</div>
                    <div class="pdf-download-info">
                        <strong>${safeName}</strong>
                        <small>${formatFileSize(file.size || 0)} · скачать файл</small>
                    </div>
                </div>
            `;
        }

        const iconMap = {
            audio: 'AUDIO',
            archive: 'ZIP',
            app: 'APP',
            '3d': 'Дизайн',
            text: 'TXT',
            file: 'FILE'
        };

        return `
            <div class="file-preview-placeholder ${type}">
                <div class="file-preview-badge">${iconMap[type] || 'FILE'}</div>
                <div class="file-preview-name">${file ? escapeHtml(file.name) : 'Внешняя ссылка'}</div>
                ${file ? `<div class="file-preview-meta">${formatFileSize(file.size || 0)}</div>` : ''}
            </div>
        `;
    }

    return {
        getAllWorks,
        saveWork,
        deleteWork,
        getWork,
        createId,
        getMimeCategory,
        formatFileSize,
        escapeHtml,
        createObjectUrl,
        previewMarkup,
        categoryLabel,
        isRenderable3D,
        render3DViewerMarkup
    };
})();
