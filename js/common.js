/**
 * AGENT 设计基因 — 共享交互脚本
 * 赛博朋克暗黑科技风格，所有页面共用
 */

// ===== 减少动画检测 =====
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

// ===== 光标跟随光晕 =====
(function initCursorGlow() {
  if (prefersReducedMotion) return;
  const glow = document.getElementById('cursorGlow');
  if (!glow) return;
  let mouseX = 0, mouseY = 0, glowX = window.innerWidth / 2, glowY = window.innerHeight / 2;
  document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
  (function animateGlow() {
    glowX += (mouseX - glowX) * 0.08;
    glowY += (mouseY - glowY) * 0.08;
    glow.style.left = glowX + 'px';
    glow.style.top = glowY + 'px';
    requestAnimationFrame(animateGlow);
  })();
})();

// ===== 粒子尾随 Canvas =====
(function initParticleCanvas() {
  if (prefersReducedMotion) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'particle-canvas';
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let W, H;
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  const particles = [];
  const MAX_PARTICLES = isMobile ? 120 : 200;
  const colors = ['rgba(124,91,245,', 'rgba(244,114,182,', 'rgba(56,189,248,'];

  function spawnParticle(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 2.5;
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 1,
      decay: 0.01 + Math.random() * 0.02,
      size: 1.5 + Math.random() * 3.5,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
  }

  document.addEventListener('mousemove', e => {
    if (prefersReducedMotion) return;
    for (let i = 0; i < (isMobile ? 1 : 2); i++) {
      particles.push(spawnParticle(e.clientX, e.clientY));
    }
  });

  // Touch support for particle spawning
  document.addEventListener('touchmove', e => {
    if (prefersReducedMotion) return;
    const touch = e.touches[0];
    particles.push(spawnParticle(touch.clientX, touch.clientY));
  }, { passive: true });

  function drawParticles() {
    ctx.clearRect(0, 0, W, H);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.015;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color + (p.life * 0.5) + ')';
      ctx.fill();
    }
    if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES);
    requestAnimationFrame(drawParticles);
  }
  drawParticles();
})();

// ===== 浮动粒子背景 =====
(function initFloatingParticles() {
  if (prefersReducedMotion) return;
  const container = document.querySelector('.global-bg');
  if (!container) return;
  const count = isMobile ? 15 : 30;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    const size = 2 + Math.random() * 4;
    const duration = 15 + Math.random() * 20;
    const xDir = Math.random() > 0.5 ? '' : '-';
    const xDist = 50 + Math.random() * 100;
    const yDist = -200 - Math.random() * 400;
    dot.style.cssText = `
      position:absolute;width:${size}px;height:${size}px;border-radius:50%;
      background:rgba(124,91,245,${0.15 + Math.random() * 0.25});
      left:${Math.random()*100}%;top:${Math.random()*100}%;
      animation:float-particle ${duration}s linear infinite;
      animation-delay:${-Math.random()*20}s;
    `;
    container.appendChild(dot);
  }
  // keyframes injected once
  if (!document.getElementById('float-particle-style')) {
    const style = document.createElement('style');
    style.id = 'float-particle-style';
    style.textContent = `
      @keyframes float-particle {
        0% { transform: translate(0,0) scale(1); opacity:0; }
        10% { opacity:1; } 90% { opacity:1; }
        100% { transform: translate(${Math.random()>0.5?'':'-'}${50+Math.random()*100}px, ${-200-Math.random()*400}px) scale(0.5); opacity:0; }
      }
    `;
    document.head.appendChild(style);
  }
})();

// ===== 卡片 3D 倾斜 (含触摸支持) =====
(function initCardTilt() {
  if (prefersReducedMotion) return;
  document.querySelectorAll('.card').forEach(card => {
    const handleMove = (clientX, clientY) => {
      const rect = card.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width - 0.5;
      const y = (clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(800px) rotateY(${x*12}deg) rotateX(${-y*12}deg) translateY(-4px)`;
      card.style.setProperty('--mx', `${(x+0.5)*100}%`);
      card.style.setProperty('--my', `${(y+0.5)*100}%`);
    };
    const handleLeave = () => {
      card.style.transform = 'perspective(800px) rotateY(0) rotateX(0) translateY(0)';
    };

    card.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY));
    card.addEventListener('touchmove', e => {
      if (e.touches.length === 1) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    card.addEventListener('touchend', handleLeave);
    card.addEventListener('mouseleave', handleLeave);
  });
})();

// ===== 磁吸按钮 (含触摸) =====
(function initMagneticButtons() {
  if (prefersReducedMotion) return;
  document.querySelectorAll('.section-nav-next, .hero-badge, .back-to-top').forEach(btn => {
    const handleMove = (clientX, clientY) => {
      const rect = btn.getBoundingClientRect();
      const x = clientX - rect.left - rect.width / 2;
      const y = clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x*0.3}px, ${y*0.3}px)`;
    };
    const handleLeave = () => { btn.style.transform = ''; };
    btn.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY));
    btn.addEventListener('touchmove', e => {
      if (e.touches.length === 1) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    btn.addEventListener('touchend', handleLeave);
    btn.addEventListener('mouseleave', handleLeave);
  });
})();

// ===== 文字逐字显现 =====
(function initTextReveal() {
  document.querySelectorAll('section h2').forEach(h2 => {
    if (h2.querySelector('.glitch-text')) return;
    const text = h2.textContent;
    h2.innerHTML = '';
    h2.style.opacity = '1';
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? ' ' : ch;
      span.style.cssText = `display:inline-block;opacity:0;transform:translateY(20px);transition:all 0.4s ease ${i*0.03}s;`;
      h2.appendChild(span);
    });
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        h2.querySelectorAll('span').forEach(s => { s.style.opacity = '1'; s.style.transform = 'translateY(0)'; });
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(h2);
  });
})();

// ===== 滚动视差 + 扫描线 =====
(function initScrollEffects() {
  if (prefersReducedMotion) return;
  const scanline = document.getElementById('scrollScanline');
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? scrollY / maxScroll : 0;

    // 背景光球视差
    document.querySelectorAll('.global-bg .orb').forEach(orb => {
      orb.style.transform = `translateY(${scrollY * 0.15}px)`;
    });

    // 顶部扫描线
    if (scanline) {
      scanline.style.transform = `scaleX(${Number.isFinite(progress) ? progress : 0})`;
    }

    // Hero 视差
    const h1 = document.querySelector('.hero h1');
    const sub = document.querySelector('.hero-subtitle');
    const badge = document.querySelector('.hero-badge');
    if (h1) h1.style.transform = `translateY(${scrollY * 0.3}px)`;
    if (sub) sub.style.transform = `translateY(${scrollY * 0.2}px)`;
    if (badge) badge.style.transform = `translateY(${scrollY * 0.4}px)`;
  }, { passive: true });
})();

// ===== 赛博光标拖尾 =====
(function initCursorTrail() {
  if (prefersReducedMotion) return;
  const trails = [];
  const TRAIL_COUNT = isMobile ? 4 : 8;
  for (let i = 0; i < TRAIL_COUNT; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:fixed;width:${6-i*0.5}px;height:${6-i*0.5}px;
      border-radius:50%;pointer-events:none;z-index:9999;
      background:rgba(124,91,245,${0.4-i*0.04});
      box-shadow:0 0 ${8-i}px rgba(124,91,245,${0.3-i*0.03});
      transition:transform ${0.05+i*0.02}s ease;
      left:-100px;top:-100px;
    `;
    document.body.appendChild(dot);
    trails.push(dot);
  }
  let tx = -100, ty = -100;
  document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
  document.addEventListener('touchmove', e => {
    if (e.touches.length === 1) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }
  }, { passive: true });

  function animateTrail() {
    let x = tx, y = ty;
    trails.forEach((dot, i) => {
      const speed = 0.35 - i * 0.03;
      const prevX = parseFloat(dot.style.left) || x;
      const prevY = parseFloat(dot.style.top) || y;
      const newX = prevX + (x - prevX) * speed;
      const newY = prevY + (y - prevY) * speed;
      dot.style.left = newX + 'px';
      dot.style.top = newY + 'px';
      x = newX;
      y = newY;
    });
    requestAnimationFrame(animateTrail);
  }
  animateTrail();
})();

// ===== 滚动入场动画 =====
const fadeObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.fade-in, .step').forEach(el => fadeObserver.observe(el));

// ===== 顶部导航栏显隐 =====
const topNav = document.getElementById('topNav');
const heroSection = document.getElementById('hero');
if (topNav && heroSection) {
  const topNavObs = new IntersectionObserver(entries => {
    topNav.classList.toggle('visible', !entries[0].isIntersecting);
  }, { threshold: 0.1 });
  topNavObs.observe(heroSection);
}

// ===== 导航高亮 =====
const sections = document.querySelectorAll('section[id]');
const tocLinks = document.querySelectorAll('.toc a');
const topNavLinks = document.querySelectorAll('.top-nav a');
const navObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      tocLinks.forEach(link => link.classList.toggle('active', link.getAttribute('data-section') === id));
      topNavLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === '#' + id));
    }
  });
}, { threshold: 0.3, rootMargin: '-20% 0px -60% 0px' });
sections.forEach(sec => navObs.observe(sec));

// ===== 平滑滚动 (使用原生 smooth，性能更好) =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      const navHeight = topNav ? topNav.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
      window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  });
});

// ===== 滚动指示器点击 =====
document.querySelectorAll('.scroll-indicator').forEach(indicator => {
  indicator.addEventListener('click', () => {
    const container = document.querySelector('.container');
    if (container) {
      container.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  });
});

// ===== 打字机效果工具函数 =====
function initTypewriter(triggerChar) {
  if (prefersReducedMotion) {
    // Show text immediately when reduced motion preferred
    const title = document.querySelector('.hero h1');
    if (title) title.style.opacity = '1';
    return;
  }
  const title = document.querySelector('.hero h1');
  if (!title) return;
  const textOnly = title.textContent;
  title.innerHTML = '';
  title.style.opacity = '1';
  let i = 0;
  function typeChar() {
    if (i < textOnly.length) {
      const ch = textOnly[i];
      if (ch === '\n') { title.innerHTML += '<br>'; }
      else {
        const span = document.createElement('span');
        span.textContent = ch === ' ' ? ' ' : ch;
        if (triggerChar && i >= textOnly.indexOf(triggerChar)) span.className = 'gradient-text';
        span.style.cssText = 'display:inline-block;opacity:0;animation:typeIn 0.1s ease forwards;';
        title.appendChild(span);
      }
      i++;
      setTimeout(typeChar, 40 + Math.random() * 30);
    }
  }
  // Inject typeIn keyframes once
  if (!document.getElementById('typein-style')) {
    const typeStyle = document.createElement('style');
    typeStyle.id = 'typein-style';
    typeStyle.textContent = '@keyframes typeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }';
    document.head.appendChild(typeStyle);
  }
  setTimeout(typeChar, 800);
}

// ===== 键盘导航增强 =====
document.addEventListener('keydown', e => {
  // Escape to scroll to top
  if (e.key === 'Escape' && document.activeElement === document.body) {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }
});
