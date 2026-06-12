const PortfolioStorage = (() => {
    const WORKS_TABLE = 'works';
    const FILES_BUCKET = 'portfolio-files';

    function createId() {
        if (crypto?.randomUUID) return crypto.randomUUID();
        return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    function safePathPart(value = '') {
        return String(value || 'file')
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 120) || 'file';
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
        if (!fileData) return '';
        if (fileData.url) return fileData.url;
        if (fileData.publicUrl) return fileData.publicUrl;
        if (fileData.blob) return URL.createObjectURL(fileData.blob);
        return '';
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

    async function uploadFile(fileData, workId, folder = 'main') {
        if (!fileData?.blob) return fileData || null;
        const file = fileData.blob;
        const path = `works/${workId}/${folder}/${Date.now()}-${safePathPart(file.name || fileData.name)}`;

        const { error } = await PortfolioSupabase.storage
            .from(FILES_BUCKET)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true,
                contentType: file.type || fileData.type || undefined
            });

        if (error) throw error;

        const { data } = PortfolioSupabase.storage.from(FILES_BUCKET).getPublicUrl(path);
        return {
            name: file.name || fileData.name || 'file',
            type: file.type || fileData.type || '',
            size: file.size || fileData.size || 0,
            lastModified: file.lastModified || fileData.lastModified || Date.now(),
            path,
            url: data.publicUrl
        };
    }

    function fromRow(row) {
        const meta = row.meta || {};
        const fileData = row.file_url ? {
            name: row.file_name || meta.fileData?.name || row.title || 'file',
            type: row.file_type || meta.fileData?.type || '',
            size: row.file_size || meta.fileData?.size || 0,
            lastModified: meta.fileData?.lastModified || Date.now(),
            path: meta.fileData?.path || '',
            url: row.file_url
        } : (meta.fileData || null);

        return {
            id: row.id,
            title: row.title || '',
            category: row.category || 'other',
            description: row.description || '',
            detailedDescription: meta.detailedDescription || row.description || '',
            tags: meta.tags || [],
            link: row.link || '',
            demoUrl: meta.demoUrl || '',
            repository: meta.repository || '',
            caseUrl: meta.caseUrl || '',
            videoUrl: meta.videoUrl || '',
            extraUrl: meta.extraUrl || '',
            projectType: row.project_type || meta.projectType || categoryLabel(row.category),
            client: row.client || '',
            role: row.role || '',
            projectYear: meta.projectYear || row.work_date || '',
            featured: Boolean(meta.featured),
            new: Boolean(meta.new),
            date: row.work_date || meta.date || '',
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
            fileData,
            imageUrl: row.image_url || fileData?.url || '',
            gallery: Array.isArray(row.gallery) ? row.gallery : []
        };
    }

    async function toRow(work) {
        const id = work.id || createId();
        const uploadedMain = await uploadFile(work.fileData, id, 'main');
        const uploadedGallery = [];

        for (const item of work.gallery || []) {
            uploadedGallery.push(item?.blob ? await uploadFile(item, id, 'gallery') : item);
        }

        const mainUrl = uploadedMain?.url || '';
        const mainType = uploadedMain ? getMimeCategory(uploadedMain.type, uploadedMain.name) : '';

        return {
            id,
            title: work.title,
            description: work.description || '',
            category: work.category || 'other',
            project_type: work.projectType || categoryLabel(work.category),
            client: work.client || '',
            role: work.role || '',
            work_date: work.date || work.projectYear || '',
            link: work.link || '',
            image_url: mainType === 'image' ? mainUrl : (work.imageUrl || ''),
            file_url: mainUrl,
            file_name: uploadedMain?.name || '',
            file_type: uploadedMain?.type || '',
            file_size: uploadedMain?.size || 0,
            gallery: uploadedGallery,
            is_published: work.isPublished !== false,
            sort_order: Number(work.sortOrder || 0),
            updated_at: new Date().toISOString(),
            meta: {
                detailedDescription: work.detailedDescription || work.description || '',
                tags: work.tags || [],
                demoUrl: work.demoUrl || '',
                repository: work.repository || '',
                caseUrl: work.caseUrl || '',
                videoUrl: work.videoUrl || '',
                extraUrl: work.extraUrl || '',
                projectYear: work.projectYear || '',
                featured: Boolean(work.featured),
                new: Boolean(work.new),
                date: work.date || '',
                fileData: uploadedMain
            }
        };
    }

    async function getAllWorks() {
        const { data, error } = await PortfolioSupabase
            .from(WORKS_TABLE)
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(fromRow);
    }

    async function getWork(id) {
        const { data, error } = await PortfolioSupabase
            .from(WORKS_TABLE)
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        return data ? fromRow(data) : null;
    }

    async function saveWork(work) {
        const row = await toRow(work);
        const { data, error } = await PortfolioSupabase
            .from(WORKS_TABLE)
            .upsert(row, { onConflict: 'id' })
            .select('*')
            .single();

        if (error) throw error;
        return fromRow(data);
    }

    async function deleteWork(id) {
        const existing = await getWork(id);
        const paths = [];
        if (existing?.fileData?.path) paths.push(existing.fileData.path);
        for (const item of existing?.gallery || []) {
            if (item?.path) paths.push(item.path);
        }

        const { error } = await PortfolioSupabase.from(WORKS_TABLE).delete().eq('id', id);
        if (error) throw error;

        if (paths.length) {
            await PortfolioSupabase.storage.from(FILES_BUCKET).remove(paths);
        }
        return true;
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
