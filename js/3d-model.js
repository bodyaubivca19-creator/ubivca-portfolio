// Класс для управления 3D моделью
class ThreeDModel {
    constructor() {
        this.container = document.getElementById('model-container');
        if (!this.container) {
            console.error('Контейнер для 3D модели не найден!');
            return;
        }
        
        console.log('Инициализация 3D модели...');
        this.init();
    }

    init() {
        try {
            // Проверяем доступность THREE
            if (typeof THREE === 'undefined') {
                throw new Error('THREE не загружен! Проверь подключение библиотеки');
            }
            
            console.log('THREE версия:', THREE.REVISION);
            
            // Сцена
            this.scene = new THREE.Scene();
            this.scene.background = null; // Прозрачный фон
            
            // Камера
            const aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
            this.camera.position.set(3, 0.8, 4);
            this.camera.lookAt(0, -0.2, 0);
            
            // Рендерер
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true, 
                alpha: true
            });
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // Отключаем выделение на canvas
            this.renderer.domElement.style.outline = 'none';
            this.renderer.domElement.style.border = 'none';
            this.renderer.domElement.style.userSelect = 'none';
            this.renderer.domElement.style.webkitUserSelect = 'none';
            this.renderer.domElement.style.webkitTapHighlightColor = 'transparent';
            
            // Запрещаем выделение и перетаскивание
            this.renderer.domElement.addEventListener('selectstart', (e) => e.preventDefault());
            this.renderer.domElement.addEventListener('dragstart', (e) => e.preventDefault());
            
            // Очищаем контейнер и добавляем canvas
            this.container.innerHTML = '';
            this.container.appendChild(this.renderer.domElement);
            
            console.log('Canvas создан, размер:', this.container.clientWidth, 'x', this.container.clientHeight);
            
            // Освещение
            this.setupLights();
            
            // Загружаем модель
            this.loadModel();
            
            // Controls
            this.setupControls();
            
            // Запускаем анимацию
            this.animate();
            
            // Обработчик ресайза
            window.addEventListener('resize', () => this.onResize());
            
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError(error.message);
        }
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0x404060);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(2, 5, 3);
        dirLight.castShadow = true;
        dirLight.receiveShadow = true;
        this.scene.add(dirLight);
        
        const fillLight = new THREE.DirectionalLight(0xffaa88, 0.5);
        fillLight.position.set(-2, 1, 4);
        this.scene.add(fillLight);
        
        const bottomLight = new THREE.PointLight(0x4466ff, 0.3);
        bottomLight.position.set(0, -2, 2);
        this.scene.add(bottomLight);
        
        const backLight = new THREE.PointLight(0xff3366, 0.2);
        backLight.position.set(1, 2, -3);
        this.scene.add(backLight);
        
        console.log('Освещение добавлено');
    }

    loadModel() {
        if (typeof THREE.GLTFLoader === 'undefined') {
            console.log('GLTFLoader не найден, создаю тестовую модель');
            this.createTestModel();
            return;
        }
        
        const loader = new THREE.GLTFLoader();
        const modelPath = 'assets/models/HANdD.glb';
        
        console.log('Загрузка модели из:', modelPath);
        
        loader.load(
            modelPath,
            (gltf) => {
                console.log('✅ Модель загружена успешно!', gltf);
                
                this.model = gltf.scene;
                
                this.model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                        
                        if (node.material) {
                            if (Array.isArray(node.material)) {
                                node.material.forEach(m => {
                                    m.roughness = 0.3;
                                    m.metalness = 0.2;
                                    if (m.emissive) m.emissive.setHex(0x222222);
                                });
                            } else {
                                node.material.roughness = 0.3;
                                node.material.metalness = 0.2;
                                if (node.material.emissive) node.material.emissive.setHex(0x222222);
                            }
                        }
                    }
                });
                
                this.fitModelToView();
                this.scene.add(this.model);
                
                console.log('✅ Модель добавлена в сцену');
                this.hideLoader();
                
                if (this.controls) {
                    this.controls.autoRotate = true;
                    this.controls.autoRotateSpeed = 2;
                }
            },
            (xhr) => {
                const percent = Math.floor((xhr.loaded / xhr.total) * 100);
                console.log(`Загрузка: ${percent}%`);
                this.updateLoaderProgress(percent);
            },
            (error) => {
                console.error('❌ Ошибка загрузки модели:', error);
                console.log('Создаю тестовую модель');
                this.createTestModel();
                this.hideLoader();
            }
        );
    }

    createTestModel() {
        const group = new THREE.Group();
        
        const cubeGeo = new THREE.BoxGeometry(1.3, 1.3, 1.3);
        const cubeMat = new THREE.MeshStandardMaterial({ 
            color: 0xff3b3b,
            emissive: 0x330000,
            roughness: 0.2,
            metalness: 0.8
        });
        const cube = new THREE.Mesh(cubeGeo, cubeMat);
        cube.castShadow = true;
        cube.receiveShadow = true;
        cube.position.set(0, -0.2, 0);
        group.add(cube);
        
        const sphereGeo = new THREE.SphereGeometry(1.1, 32, 32);
        const sphereMat = new THREE.MeshStandardMaterial({ 
            color: 0x33aaff,
            emissive: 0x002233,
            roughness: 0.1,
            metalness: 0.9,
            wireframe: true
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        sphere.position.set(2.0, -0.3, -0.7);
        group.add(sphere);
        
        const torusGeo = new THREE.TorusGeometry(1.1, 0.25, 16, 64);
        const torusMat = new THREE.MeshStandardMaterial({ 
            color: 0xffaa33,
            emissive: 0x332200,
            roughness: 0.3,
            metalness: 0.6
        });
        const torus = new THREE.Mesh(torusGeo, torusMat);
        torus.castShadow = true;
        torus.receiveShadow = true;
        torus.position.set(-2.0, -0.3, 0.7);
        torus.rotation.x = Math.PI / 2;
        torus.rotation.z = 0.5;
        group.add(torus);
        
        for (let i = 0; i < 8; i++) {
            const ballGeo = new THREE.SphereGeometry(0.25, 16);
            const ballMat = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
            const ball = new THREE.Mesh(ballGeo, ballMat);
            
            const angle = (i / 8) * Math.PI * 2;
            ball.position.set(
                Math.cos(angle) * 2.5,
                -0.2 + Math.sin(angle * 2) * 0.3,
                Math.sin(angle) * 2.5
            );
            group.add(ball);
        }
        
        this.model = group;
        this.scene.add(this.model);
        
        console.log('Создана тестовая модель (опущена ниже)');
        
        if (this.controls) {
            this.controls.autoRotate = true;
            this.controls.autoRotateSpeed = 2;
        }
    }

    fitModelToView() {
        if (!this.model) return;
        
        const box = new THREE.Box3().setFromObject(this.model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        console.log('Размер модели до масштабирования:', size);
        
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
            const targetSize = 4.2;
            const scale = targetSize / maxDim;
            this.model.scale.set(scale, scale, scale);
            console.log('Масштаб применен:', scale);
        }
        
        const scaledBox = new THREE.Box3().setFromObject(this.model);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        
        this.model.position.sub(scaledCenter);
        this.model.position.y -= 0.5; // Опускаем вниз
        
        console.log('Модель опущена, позиция Y:', this.model.position.y);
    }

    setupControls() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            
            // Настройки: только вращение, без зума
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.autoRotate = true;
            this.controls.autoRotateSpeed = 2;
            
            // ВАЖНО: отключаем зум полностью
            this.controls.enableZoom = false;
            
            // Отключаем остальное
            this.controls.enablePan = false;
            this.controls.enableKeys = false;
            this.controls.enableRotate = true;
            
            // Ограничения
            this.controls.maxPolarAngle = Math.PI / 2;
            
            // Цель controls опущена
            this.controls.target.set(0, -0.3, 0);
            
            console.log('Controls добавлены (только вращение, зум отключен)');
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.controls) {
            this.controls.update();
        }
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    updateLoaderProgress(percent) {
        const loader = this.container.querySelector('.model-loader span');
        if (loader) {
            loader.textContent = `Загрузка модели... ${percent}%`;
        }
    }

    hideLoader() {
        const loader = this.container.querySelector('.model-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    }

    showError(message) {
        const loader = this.container.querySelector('.model-loader');
        if (loader) {
            loader.innerHTML = `
                <div style="color: #ff3b3b;">❌ ${message}</div>
            `;
        }
    }
}

// Инициализация после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, создаем 3D модель...');
    
    setTimeout(() => {
        new ThreeDModel();
    }, 500);
});