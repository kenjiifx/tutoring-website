import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const NAV_SCROLL_CLASS = 'is-scrolled';
const NAV = () => document.getElementById('site-nav');
const NAV_OFFSET = 84;
const MOBILE_MQ = window.matchMedia('(max-width: 768px)');

let scene, camera, renderer, particles, controls;
const clock = new THREE.Clock();
const heroModels = [];
let threeActive = true;

function isMobileViewport() {
    return MOBILE_MQ.matches;
}

function applyViewportClasses() {
    if (!document.body) return;
    document.body.classList.toggle('is-mobile', isMobileViewport());
}

function initThreeJS() {
    if (isMobileViewport()) return;

    const container = document.getElementById('three-container');
    if (!container) return;

    const lite = document.body.classList.contains('low-performance');

    scene = new THREE.Scene();
    scene.background = null;
    if (!lite) scene.fog = new THREE.FogExp2(0x050508, 0.038);

    const width = container.clientWidth;
    const height = container.clientHeight;
    camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    camera.position.set(0, 0.2, 8);

    renderer = new THREE.WebGLRenderer({
        antialias: !lite,
        alpha: true,
        precision: 'mediump',
        powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(lite ? 1 : Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableRotate = false;
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    addHeroLights();
    createParticleBackground(lite);
    if (!lite) loadGraduationModels();

    const heroIo = new IntersectionObserver(
        ([entry]) => {
            threeActive = Boolean(entry?.isIntersecting);
        },
        { root: null, threshold: 0, rootMargin: '80px 0px' }
    );
    heroIo.observe(container);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) threeActive = false;
    });

    window.addEventListener('resize', onWindowResize);
    animate();
}

function addHeroLights() {
    scene.add(new THREE.AmbientLight(0x8fd4cc, 0.22));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(5, 8, 12);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xa5b4fc, 0.45);
    fill.position.set(-8, 4, 6);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xfbbf24, 0.15);
    rim.position.set(0, -4, -2);
    scene.add(rim);
}

function loadGraduationModels() {
    const loader = new GLTFLoader();
    const modelPlacements = getHeroModelPlacements();

    loader.load(
        'models/scene.gltf',
        (gltf) => {
            const centeredModel = centerModel(gltf.scene);
            modelPlacements.forEach((placement) => {
                const model = centeredModel.clone(true);
                const group = new THREE.Group();
                group.add(model);
                group.position.set(...placement.position);
                group.scale.setScalar(placement.scale);
                group.userData = {
                    baseY: placement.position[1],
                    phase: placement.phase,
                    floatSpeed: placement.floatSpeed,
                    rotateSpeed: placement.rotateSpeed
                };
                heroModels.push(group);
                scene.add(group);
            });
        },
        undefined,
        (error) => {
            console.error('Unable to load models/scene.gltf (include scene.bin in models/).', error);
        }
    );
}

function getHeroModelPlacements() {
    const modelElements = document.querySelectorAll('.hero .hero-model-instance');
    const placements = Array.from(modelElements).map((element) => {
        const position = (element.dataset.position || '0,0,0')
            .split(',')
            .map((value) => Number(value.trim()));
        return {
            position,
            scale: Number(element.dataset.scale || 0.5),
            phase: Number(element.dataset.phase || 0),
            floatSpeed: Number(element.dataset.floatSpeed || 1),
            rotateSpeed: Number(element.dataset.rotateSpeed || 0.5)
        };
    });

    return placements.length
        ? placements
        : [
              { position: [-4.8, 3, -1], scale: 0.5, phase: 0.2, floatSpeed: 1.1, rotateSpeed: 0.55 },
              { position: [4.8, 3, -1], scale: 0.5, phase: 1.6, floatSpeed: 0.9, rotateSpeed: 0.45 },
              { position: [-4.8, -2.7, -1], scale: 0.5, phase: 2.9, floatSpeed: 1.25, rotateSpeed: 0.65 },
              { position: [4.8, -2.7, -1], scale: 0.5, phase: 4.1, floatSpeed: 1, rotateSpeed: 0.5 }
          ];
}

function centerModel(model) {
    const wrapper = new THREE.Group();
    const source = model.clone(true);
    const box = new THREE.Box3().setFromObject(source);
    const center = box.getCenter(new THREE.Vector3());
    source.position.sub(center);
    wrapper.add(source);
    return wrapper;
}

function createParticleBackground(lite = false) {
    const particleCount = lite ? 180 : 700;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 90;
        positions[i + 1] = (Math.random() - 0.5) * 90;
        positions[i + 2] = (Math.random() - 0.5) * 90;
        colors[i] = 0.75 + Math.random() * 0.2;
        colors[i + 1] = 0.85 + Math.random() * 0.12;
        colors[i + 2] = 0.95 + Math.random() * 0.05;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.16,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.55
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particles.rotation.x = Math.random() * Math.PI;
    particles.rotation.y = Math.random() * Math.PI;
}

let mouseX = 0;
let mouseY = 0;

function animate() {
    requestAnimationFrame(animate);

    if (!threeActive || !renderer) return;

    const elapsed = clock.getElapsedTime();

    if (particles) {
        particles.rotation.x += 0.00004;
        particles.rotation.y += 0.000055;
    }

    heroModels.forEach((model, index) => {
        const phaseTime = elapsed * model.userData.floatSpeed + model.userData.phase;
        const jump = Math.max(0, Math.sin(phaseTime * 2.6)) * 0.22;
        model.position.y = model.userData.baseY + Math.sin(phaseTime) * 0.55 + jump;
        model.position.x += Math.sin(phaseTime * 0.55) * 0.0025;
        model.rotation.y =
            Math.cos(phaseTime * 0.65) * 0.5 + elapsed * (model.userData.rotateSpeed + index * 0.04);
    });

    if (window.innerWidth > 768) {
        updateMouseInteraction();
    }

    if (controls) controls.update();
    renderer.render(scene, camera);
}

function updateMouseInteraction() {
    if (!camera) return;
    const rotationSpeed = 0.00009;
    camera.position.x += (mouseX - camera.position.x) * rotationSpeed;
    camera.position.y += (-mouseY - camera.position.y) * rotationSpeed;
    camera.lookAt(controls ? controls.target : scene.position);
}

document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 100 - 50;
    mouseY = (e.clientY / window.innerHeight) * 100 - 50;
});

function onWindowResize() {
    const container = document.getElementById('three-container');
    if (!container || !camera || !renderer) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

applyViewportClasses();
MOBILE_MQ.addEventListener('change', applyViewportClasses);

document.addEventListener('DOMContentLoaded', () => {
    applyViewportClasses();
    if (!isMobileViewport()) setTimeout(initThreeJS, 80);
});

const observerOptions = { threshold: 0.12, rootMargin: '0px 0px -8% 0px' };
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

function initRevealFallback() {
    document.querySelectorAll('.reveal-up').forEach((el) => revealObserver.observe(el));
}

function bindNavHero() {
    const hero = document.querySelector('.hero--cinema');
    const nav = NAV();
    if (!hero || !nav) return;
    const io = new IntersectionObserver(
        ([entry]) => {
            if (!entry) return;
            nav.classList.toggle('nav-over-hero', entry.isIntersecting);
        },
        { threshold: [0, 0.06], rootMargin: '-52px 0px 0px 0px' }
    );
    io.observe(hero);
}

function scrollToSection(target) {
    if (!target) return;
    const lenis = window.lenisInstance;
    if (lenis && typeof lenis.scrollTo === 'function') {
        lenis.scrollTo(target, { offset: -NAV_OFFSET, duration: 1.2 });
        return;
    }
    const y = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
}

function closeMobileNav() {
    document.body.classList.remove('nav-open');
    const toggle = document.getElementById('nav-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === '#') return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            scrollToSection(target);
            closeMobileNav();
        }
    });
});

const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');

if (navToggle && navMenu) {
    navToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = document.body.classList.toggle('nav-open');
        navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });

    navMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => closeMobileNav());
    });

    document.addEventListener('click', (e) => {
        if (!document.body.classList.contains('nav-open')) return;
        if (!e.target.closest('.navbar')) closeMobileNav();
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileNav();
});

document.querySelectorAll('.faq-item').forEach((item) => {
    const btn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!btn || !answer) return;

    btn.addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');

        document.querySelectorAll('.faq-item').forEach((other) => {
            if (other === item) return;
            other.classList.remove('is-open');
            const oBtn = other.querySelector('.faq-question');
            const oAns = other.querySelector('.faq-answer');
            if (oBtn) oBtn.setAttribute('aria-expanded', 'false');
            if (oAns) oAns.hidden = true;
        });

        if (willOpen) {
            item.classList.add('is-open');
            answer.hidden = false;
            btn.setAttribute('aria-expanded', 'true');
        } else {
            item.classList.remove('is-open');
            answer.hidden = true;
            btn.setAttribute('aria-expanded', 'false');
        }
    });
});

const bookingForm = document.getElementById('booking-form');

if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(bookingForm);
        const data = Object.fromEntries(formData);

        if (!data.name || !data.email || !data.grade || !data.topic) {
            showNotification('Please fill in all required fields.', 'error');
            return;
        }

        if (!bookingForm.elements.terms?.checked) {
            showNotification('Please agree to be contacted about this inquiry.', 'error');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            showNotification('Please enter a valid email address.', 'error');
            return;
        }

        formData.append('_subject', 'MAS Math & Computing Academy — booking request');

        const submitButton = bookingForm.querySelector('button[type="submit"]');
        const label = submitButton?.querySelector('span');
        const prev = label ? label.textContent : submitButton.textContent;

        try {
            submitButton.disabled = true;
            if (label) label.textContent = 'Sending…';
            else submitButton.textContent = 'Sending…';

            const response = await fetch('https://formspree.io/f/xnjwbzad', {
                method: 'POST',
                headers: { Accept: 'application/json' },
                body: formData
            });

            if (response.ok) {
                showNotification("Thanks — we'll reply within 24 hours.", 'success');
                bookingForm.reset();
            } else {
                showNotification('Submission failed. Please try again.', 'error');
            }
        } catch (err) {
            console.error(err);
            showNotification('Network error. Please try again.', 'error');
        } finally {
            submitButton.disabled = false;
            if (label) label.textContent = prev;
            else submitButton.textContent = prev;
        }
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 22px;
        right: 22px;
        padding: 0.95rem 1.2rem;
        background: ${type === 'success' ? '#0d6b63' : type === 'error' ? '#b91c1c' : '#141312'};
        color: white;
        border-radius: 14px;
        box-shadow: 0 18px 50px rgba(15, 17, 23, 0.25);
        z-index: 10000;
        max-width: min(420px, calc(100vw - 36px));
        font-weight: 650;
        animation: notifIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
    `;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes notifIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes notifOut { to { opacity: 0; transform: translateY(8px); } }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'notifOut 0.25s ease forwards';
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 260);
    }, 4200);
}

document.querySelectorAll('[data-target]').forEach((button) => {
    button.addEventListener('click', (e) => {
        const targetId = button.getAttribute('data-target');
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            e.preventDefault();
            scrollToSection(targetElement);
            closeMobileNav();
        }
    });
});

function updateNavbar() {
    const nav = NAV();
    if (!nav) return;
    if (window.scrollY > 24) nav.classList.add(NAV_SCROLL_CLASS);
    else nav.classList.remove(NAV_SCROLL_CLASS);
}

let navScrollScheduled = false;
window.addEventListener(
    'scroll',
    () => {
        if (navScrollScheduled) return;
        navScrollScheduled = true;
        requestAnimationFrame(() => {
            updateNavbar();
            navScrollScheduled = false;
        });
    },
    { passive: true }
);
document.addEventListener('DOMContentLoaded', updateNavbar);

function detectPerformance() {
    if (isMobileViewport()) {
        document.body.classList.add('low-performance');
        return;
    }
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) return;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return;
    const rendererInfo = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    if (!rendererInfo) return;
    const isLowEnd =
        rendererInfo.includes('Adreno') || rendererInfo.includes('Mali') || rendererInfo.includes('Intel');
    if (isLowEnd) document.body.classList.add('low-performance');
}

try {
    if (document.body) detectPerformance();
    else document.addEventListener('DOMContentLoaded', detectPerformance);
} catch {
    /* ignore */
}

function handleHashNavigation() {
    const hash = window.location.hash;
    if (!hash) return;
    const element = document.querySelector(hash);
    if (element) {
        setTimeout(() => scrollToSection(element), 120);
    }
}

window.addEventListener('hashchange', handleHashNavigation);
document.addEventListener('DOMContentLoaded', handleHashNavigation);

function isLowPerformanceDevice() {
    return document.body.classList.contains('low-performance') || isMobileViewport();
}

function initMobileHeroIntro(gsap) {
    gsap.set('.js-hero-fade', { opacity: 0, y: 18 });
    gsap.set('.hl-line__inner', { yPercent: 105 });
    gsap
        .timeline({ defaults: { ease: 'power3.out' }, delay: 0.05 })
        .to('.hl-line__inner', { yPercent: 0, duration: 0.75, stagger: 0.07 })
        .to('.js-hero-fade', { opacity: 1, y: 0, duration: 0.55, stagger: 0.04 }, '-=0.35');
}

function initScrollProgressBar(ScrollTrigger, lenis) {
    const fill = document.querySelector('.scroll-progress__fill');
    if (!fill) return;

    const apply = (p) => {
        fill.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
    };

    if (lenis) {
        const onScroll = () => apply(lenis.progress);
        lenis.on('scroll', onScroll);
        onScroll();
        return;
    }

    ScrollTrigger.create({
        trigger: document.documentElement,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate(self) {
            apply(self.progress);
        }
    });
}

function initNativeScrollProgress() {
    const fill = document.querySelector('.scroll-progress__fill');
    if (!fill) return;
    const update = () => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const p = maxScroll > 0 ? window.scrollY / maxScroll : 0;
        fill.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
}

function initSectionHeaderMotion(gsap) {
    document.querySelectorAll('main .section-header').forEach((header) => {
        const parts = header.querySelectorAll(
            ':scope > .section-eyebrow, :scope > h2, :scope > .section-lead, :scope > .team-roster-note'
        );
        if (!parts.length) return;
        gsap.set(parts, { autoAlpha: 0, y: 34 });
        gsap.to(parts, {
            autoAlpha: 1,
            y: 0,
            duration: 0.78,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: header, start: 'top 88%', once: true }
        });
    });
}

function initMagneticButtons(gsap) {
    const nodes = document.querySelectorAll(
        '.primary-button, .nav-cta, .ghost-button, .pricing-cta, .secondary-button'
    );
    nodes.forEach((btn) => {
        btn.classList.add('magnetic-btn');
        const strength = btn.classList.contains('nav-cta') ? 9 : 12;
        btn.addEventListener('mousemove', (e) => {
            const r = btn.getBoundingClientRect();
            const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
            const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
            gsap.to(btn, {
                x: x * strength,
                y: y * (strength * 0.65),
                duration: 0.35,
                ease: 'power2.out'
            });
        });
        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, { x: 0, y: 0, duration: 0.55, ease: 'power3.out' });
        });
    });
}

function initHeroParallaxOrbs(gsap) {
    const hero = document.querySelector('.hero--cinema');
    if (!hero) return;
    const cfg = { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1.05 };
    gsap.to('.hero-orb--a', { y: -72, ease: 'none', scrollTrigger: { ...cfg, scrub: 1.25 } });
    gsap.to('.hero-orb--b', { y: -110, ease: 'none', scrollTrigger: { ...cfg, scrub: 1.45 } });
    gsap.to('.hero-orb--c', { y: -56, ease: 'none', scrollTrigger: { ...cfg, scrub: 1.05 } });
    gsap.to('.hero-grid-lines', { opacity: 0.35, ease: 'none', scrollTrigger: { ...cfg, scrub: 1.2 } });
}

function initStaggeredGrids(gsap, low) {
    const cardEase = low ? 'power2.out' : 'power3.out';
    const yLift = low ? 36 : 52;

    const subjects = document.querySelector('.subject-bands');
    if (subjects) {
        const cards = subjects.querySelectorAll('.subject-band');
        gsap.from(cards, {
            autoAlpha: 0,
            y: yLift,
            duration: low ? 0.68 : 0.82,
            stagger: 0.1,
            ease: cardEase,
            scrollTrigger: { trigger: subjects, start: 'top 84%', once: true }
        });
    }

    const benefits = document.querySelector('.benefits-grid');
    if (benefits) {
        const cards = benefits.querySelectorAll('.benefit-card');
        gsap.from(cards, {
            autoAlpha: 0,
            y: yLift * 0.85,
            scale: low ? 1 : 0.94,
            duration: low ? 0.55 : 0.72,
            stagger: { each: 0.06, from: 'start' },
            ease: 'back.out(1.1)',
            scrollTrigger: { trigger: benefits, start: 'top 86%', once: true }
        });
    }

    const track = document.querySelector('.testimonials-track');
    if (track) {
        const cards = track.querySelectorAll('.testimonial-card');
        gsap.from(cards, {
            autoAlpha: 0,
            y: yLift,
            rotateY: low ? 0 : 7,
            transformOrigin: 'center',
            duration: low ? 0.65 : 0.82,
            stagger: 0.1,
            ease: cardEase,
            scrollTrigger: { trigger: track, start: 'top 86%', once: true }
        });
    }

    const pricing = document.querySelector('.pricing-layout');
    if (pricing) {
        gsap.from(pricing.children, {
            autoAlpha: 0,
            y: 40,
            duration: 0.78,
            stagger: 0.14,
            ease: 'power3.out',
            scrollTrigger: { trigger: pricing, start: 'top 84%', once: true }
        });
    }

    const faqBox = document.querySelector('.faq-container');
    if (faqBox) {
        gsap.from(faqBox.querySelectorAll('.faq-item'), {
            autoAlpha: 0,
            y: 26,
            duration: 0.58,
            stagger: 0.055,
            ease: 'power2.out',
            scrollTrigger: { trigger: faqBox, start: 'top 88%', once: true }
        });
    }

    const steps = document.querySelectorAll('.process-step');
    steps.forEach((step, i) => {
        gsap.from(step, {
            autoAlpha: 0,
            x: i % 2 ? -36 : 36,
            duration: 0.75,
            ease: 'power3.out',
            scrollTrigger: { trigger: step, start: 'top 90%', once: true }
        });
    });

    const cred = document.querySelector('.about-credentials');
    if (cred) {
        gsap.from(cred.querySelectorAll('.credential-card'), {
            autoAlpha: 0,
            y: 28,
            duration: 0.62,
            stagger: 0.08,
            ease: 'power2.out',
            scrollTrigger: { trigger: cred, start: 'top 88%', once: true }
        });
    }
}

function initTeamRowMotion(gsap, low) {
    document.querySelectorAll('.team-row').forEach((row) => {
        const figure = row.querySelector('.team-row-figure');
        const parts = row.querySelectorAll('.team-row-ix, .team-row-role, .team-row-name, .team-row-bio');
        if (!figure) return;

        if (low) {
            gsap.from(row, {
                autoAlpha: 0,
                y: 40,
                duration: 0.7,
                ease: 'power2.out',
                scrollTrigger: { trigger: row, start: 'top 88%', once: true }
            });
            return;
        }

        gsap.set(figure, { clipPath: 'inset(10% 6% 10% 6%)' });
        gsap.set(parts, { autoAlpha: 0, y: 24 });
        const tl = gsap.timeline({
            scrollTrigger: { trigger: row, start: 'top 82%', once: true }
        });
        tl.to(figure, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.95, ease: 'power3.inOut' });
        tl.to(parts, { autoAlpha: 1, y: 0, stagger: 0.07, duration: 0.55, ease: 'power2.out' }, '-=0.52');
    });
}

function initMotion() {
    bindNavHero();

    if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') {
        initRevealFallback();
        initNativeScrollProgress();
        return;
    }

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = isMobileViewport();
    const low = isLowPerformanceDevice();

    let lenis = null;

    if (!prefersReduced && !mobile && typeof Lenis !== 'undefined') {
        lenis = new Lenis({ duration: 1.12, smoothWheel: true });
        window.lenisInstance = lenis;
        lenis.on('scroll', ScrollTrigger.update);

        ScrollTrigger.scrollerProxy(document.documentElement, {
            scrollTop(value) {
                if (arguments.length) {
                    lenis.scrollTo(value, { immediate: true });
                }
                return lenis.scroll;
            },
            getBoundingClientRect() {
                return {
                    top: 0,
                    left: 0,
                    width: window.innerWidth,
                    height: window.innerHeight
                };
            },
            pinType: document.documentElement.style.transform ? 'transform' : 'fixed'
        });

        ScrollTrigger.defaults({ scroller: document.documentElement });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    }

    if (mobile) {
        initNativeScrollProgress();
    } else {
        initScrollProgressBar(ScrollTrigger, lenis);
    }

    if (prefersReduced) {
        initRevealFallback();
        return;
    }

    if (mobile) {
        initRevealFallback();
        initMobileHeroIntro(gsap);
        return;
    }

    gsap.set('.js-hero-fade', { opacity: 0, y: 26 });
    gsap.set('.hl-line__inner', { yPercent: 110 });

    const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 0.1 });
    heroTl.to('.hl-line__inner', { yPercent: 0, duration: 1.02, stagger: 0.1 });
    heroTl.to('.js-hero-fade', { opacity: 1, y: 0, duration: 0.72, stagger: 0.05 }, '-=0.48');
    heroTl.from(
        '.js-bento',
        { autoAlpha: 0, y: 32, scale: 0.9, stagger: 0.08, duration: 0.62, ease: 'back.out(1.12)' },
        '-=0.38'
    );

    document.querySelectorAll('.js-bento').forEach((el) => {
        const s = parseFloat(el.dataset.speed) || 0.05;
        gsap.to(el, {
            y: -32 * (s / 0.05),
            ease: 'none',
            scrollTrigger: { trigger: '.hero--cinema', start: 'top top', end: 'bottom top', scrub: 1.15 }
        });
    });

    if (!low) {
        initHeroParallaxOrbs(gsap);
        initMagneticButtons(gsap);
    }

    initSectionHeaderMotion(gsap);
    initStaggeredGrids(gsap, low);
    initTeamRowMotion(gsap, low);

    gsap.utils.toArray('.reveal-up').forEach((el) => {
        gsap.fromTo(
            el,
            { autoAlpha: 0, y: 52 },
            {
                autoAlpha: 1,
                y: 0,
                duration: low ? 0.75 : 0.95,
                ease: 'power3.out',
                scrollTrigger: { trigger: el, start: 'top 89%', once: true }
            }
        );
    });

    requestAnimationFrame(() => ScrollTrigger.refresh());

    let resizeTimer;
    window.addEventListener(
        'resize',
        () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
        },
        { passive: true }
    );
}

window.addEventListener('load', () => {
    requestAnimationFrame(initMotion);
});

const formInputs = document.querySelectorAll('.booking-form input, .booking-form textarea, .booking-form select');
formInputs.forEach((input) => {
    input.addEventListener('blur', function () {
        if (this.hasAttribute('required') && !this.value.trim()) {
            this.style.borderColor = '#b91c1c';
        } else if (this.type === 'email' && this.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            this.style.borderColor = emailRegex.test(this.value) ? '#0d6b63' : '#b91c1c';
        } else {
            this.style.borderColor = '#0d6b63';
        }
    });
    input.addEventListener('focus', function () {
        this.style.borderColor = 'rgba(13, 107, 99, 0.55)';
    });
});
