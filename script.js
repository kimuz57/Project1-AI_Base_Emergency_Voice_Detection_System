// ============================================
// Guardian AI - Main Script
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initPageTransitions();
    initGlassAnimations();
    initWaveformAnimation();
    initScrollReveal();
    initActiveNavHighlight();
    initPasswordToggle();
    initFormHandlers();
    initMobileNavHighlight();
});

// ============================================
// Page Transition System
// ============================================
function initPageTransitions() {
    // Add fade-in on page load
    document.body.classList.add('page-loaded');

    // Intercept navigation links for smooth transitions
    const navLinks = document.querySelectorAll('a[href$=".html"]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            document.body.classList.add('page-exit');
            setTimeout(() => {
                window.location.href = href;
            }, 400);
        });
    });
}

// ============================================
// Active Navigation Highlight
// ============================================
function initActiveNavHighlight() {
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    
    // Highlight active nav items in header
    document.querySelectorAll('header nav a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes(currentPage)) {
            link.classList.add('nav-active');
        }
    });
}

// ============================================
// Mobile Bottom Nav Highlight
// ============================================
function initMobileNavHighlight() {
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    
    document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(link => {
        const href = link.getAttribute('href');
        link.classList.remove('active');
        if (href && href.includes(currentPage)) {
            link.classList.add('active');
        }
    });
}

// ============================================
// Lucid Glass Animations
// ============================================
function initGlassAnimations() {
    // Add shimmer effect to glass elements
    const glassElements = document.querySelectorAll('.lucid-glass, .glass-card, .glass-panel');
    
    glassElements.forEach((el, index) => {
        // Stagger the entrance animation
        el.style.animationDelay = `${index * 0.1}s`;
        el.classList.add('glass-entrance');
        
        // Add interactive glass shimmer on hover
        el.addEventListener('mouseenter', (e) => {
            createGlassShimmer(el, e);
        });

        el.addEventListener('mousemove', (e) => {
            updateGlassReflection(el, e);
        });

        el.addEventListener('mouseleave', () => {
            resetGlassReflection(el);
        });
    });

    // Animate lucid-glass-inner elements
    const innerGlass = document.querySelectorAll('.lucid-glass-inner');
    innerGlass.forEach((el, index) => {
        el.style.animationDelay = `${0.3 + index * 0.15}s`;
        el.classList.add('glass-entrance');
    });

    // Start ambient glass glow animation
    initAmbientGlow();
}

function createGlassShimmer(el, e) {
    // Remove existing shimmer
    const existing = el.querySelector('.glass-shimmer');
    if (existing) existing.remove();

    const shimmer = document.createElement('div');
    shimmer.className = 'glass-shimmer';
    el.style.position = el.style.position || 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(shimmer);

    // Position shimmer based on mouse entry point
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    shimmer.style.left = `${x}px`;
    shimmer.style.top = `${y}px`;
}

function updateGlassReflection(el, e) {
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    el.style.background = `
        radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.6) 0%, transparent 50%),
        rgba(255, 255, 255, 0.45)
    `;
}

function resetGlassReflection(el) {
    el.style.background = '';
}

function initAmbientGlow() {
    // Create floating ambient orbs for background depth
    const body = document.body;
    const orbContainer = document.createElement('div');
    orbContainer.className = 'ambient-orbs';
    orbContainer.setAttribute('aria-hidden', 'true');

    for (let i = 0; i < 3; i++) {
        const orb = document.createElement('div');
        orb.className = `ambient-orb orb-${i + 1}`;
        orbContainer.appendChild(orb);
    }

    body.prepend(orbContainer);
}

// ============================================
// Waveform Animation (Dashboard)
// ============================================
function initWaveformAnimation() {
    const waveformBars = document.querySelectorAll('.absolute.bottom-10 > div, .absolute.bottom-16 > div');
    if (waveformBars.length === 0) return;

    function animateWaveform() {
        waveformBars.forEach((bar) => {
            const randomHeight = Math.random() * 40 + 8;
            bar.style.transition = 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            bar.style.height = `${randomHeight}px`;
        });
    }

    setInterval(animateWaveform, 600);
}

// ============================================
// Scroll Reveal Animation
// ============================================
function initScrollReveal() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe cards, timeline items, and other content blocks
    const revealElements = document.querySelectorAll(
        '.lucid-glass, .glass-card, .glass-panel, [class*="timeline"], .grid > div'
    );
    
    revealElements.forEach((el, index) => {
        el.classList.add('reveal-on-scroll');
        el.style.transitionDelay = `${index * 0.05}s`;
        observer.observe(el);
    });
}

// ============================================
// Password Visibility Toggle
// ============================================
function initPasswordToggle() {
    const toggleBtns = document.querySelectorAll('button[type="button"]');
    toggleBtns.forEach(btn => {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon && (icon.textContent.trim() === 'visibility' || icon.textContent.trim() === 'visibility_off')) {
            btn.addEventListener('click', () => {
                const input = btn.closest('.relative')?.querySelector('input[type="password"], input[type="text"]');
                if (input) {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    icon.textContent = isPassword ? 'visibility_off' : 'visibility';
                }
            });
        }
    });
}

// ============================================
// Form Handlers
// ============================================
function initFormHandlers() {
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'login.html') {
        const loginForm = document.querySelector('form');
        if (!loginForm) return;

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = loginForm.querySelector('button[type="submit"]');
            if (btn) {
                btn.innerHTML = '<span class="inline-flex items-center gap-2"><svg class="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> กำลังเข้าสู่ระบบ...</span>';
                btn.disabled = true;
            }
            // Simulate login then redirect
            setTimeout(() => {
                document.body.classList.add('page-exit');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 400);
            }, 1500);
        });
    }

    if (currentPage === 'register.html') {
        const registerForm = document.getElementById('registerForm') || document.querySelector('form');
        if (!registerForm) return;

        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = registerForm.querySelector('button[type="submit"]') || registerForm.querySelector('button:not([type="button"])');
            if (btn) {
                btn.innerHTML = '<span class="inline-flex items-center gap-2"><svg class="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> กำลังสร้างบัญชี...</span>';
                btn.disabled = true;
            }
            setTimeout(() => {
                document.body.classList.add('page-exit');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 400);
            }, 1500);
        });
    }
}

// ============================================
// Logout Handler
// ============================================
function handleLogout() {
    if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
        document.body.classList.add('page-exit');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 400);
    }
}

// ============================================
// Utility: Debounce
// ============================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
