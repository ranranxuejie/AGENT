// ===== 光标跟随 =====
const glow = document.getElementById('cursorGlow');
let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
(function animateGlow() {
  glowX += (mouseX - glowX) * 0.08;
  glowY += (mouseY - glowY) * 0.08;
  glow.style.left = glowX + 'px';
  glow.style.top = glowY + 'px';
  requestAnimationFrame(animateGlow);
})();

// ===== 粒子尾随 Canvas =====
(function() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let W, H;
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  const particles = [];
  const colors = ['rgba(124,91,245,', 'rgba(244,114,182,', 'rgba(56,189,248,'];
  document.addEventListener('mousemove', e => {
    for (let i = 0; i < 2; i++) {
      particles.push({
        x: e.clientX, y: e.clientY,
        vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2 - 1,
        life: 1, decay: 0.015 + Math.random() * 0.015,
        size: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  });
  function drawParticles() {
    ctx.clearRect(0, 0, W, H);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.life * 0.6 + ')';
      ctx.fill();
    }
    if (particles.length > 200) particles.splice(0, particles.length - 200);
    requestAnimationFrame(drawParticles);
  }
  drawParticles();
})();

// ===== 浮动粒子背景 =====
(function() {
  const container = document.querySelector('.global-bg');
  for (let i = 0; i < 30; i++) {
    const dot = document.createElement('div');
    const size = 2 + Math.random() * 4;
    dot.style.cssText = `
      position:absolute;width:${size}px;height:${size}px;border-radius:50%;
      background:rgba(124,91,245,${0.15 + Math.random() * 0.25});
      left:${Math.random()*100}%;top:${Math.random()*100}%;
      animation:float-particle ${15+Math.random()*20}s linear infinite;
      animation-delay:${-Math.random()*20}s;
    `;
    container.appendChild(dot);
  }
  const style = document.createElement('style');
  style.textContent = `
    @keyframes float-particle {
      0% { transform: translate(0,0) scale(1); opacity:0; }
      10% { opacity:1; } 90% { opacity:1; }
      100% { transform: translate(${Math.random()>0.5?'':'-'}${50+Math.random()*100}px, ${-200-Math.random()*400}px) scale(0.5); opacity:0; }
    }
  `;
  document.head.appendChild(style);
})();

// ===== 卡片 3D 倾斜 =====
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${x*12}deg) rotateX(${-y*12}deg) translateY(-4px)`;
    card.style.setProperty('--mx', `${(x+0.5)*100}%`);
    card.style.setProperty('--my', `${(y+0.5)*100}%`);
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(800px) rotateY(0) rotateX(0) translateY(0)';
  });
});

// ===== 磁吸按钮 =====
document.querySelectorAll('.section-nav-next, .hero-badge, .back-to-top').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x*0.3}px, ${y*0.3}px)`;
  });
  btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
});

// ===== 文字逐字显现（跳过含 glitch-text 的 h2） =====
document.querySelectorAll('section h2').forEach(h2 => {
  if (h2.querySelector('.glitch-text')) return;
  const text = h2.textContent;
  h2.innerHTML = '';
  h2.style.opacity = '1';
  ;[...text].forEach((ch, i) => {
    const span = document.createElement('span');
    span.textContent = ch === ' ' ? ' ' : ch;
    span.style.cssText = `display:inline-block;opacity:0;transform:translateY(20px);transition:all 0.4s ease ${i*0.03}s;`;
    h2.appendChild(span);
  });
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      h2.querySelectorAll('span').forEach(s => { s.style.opacity='1'; s.style.transform='translateY(0)'; });
      obs.disconnect();
    }
  }, { threshold: 0.5 });
  obs.observe(h2);
});

// ===== 滚动视差 + 扫描线 =====
const scanline = document.getElementById('scrollScanline');
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  const progress = scrollY / maxScroll;
  document.querySelectorAll('.global-bg .orb').forEach(orb => {
    orb.style.transform = `translate(0, ${scrollY * 0.15}px)`;
  });
  scanline.style.transform = `scaleX(${Number.isFinite(progress) ? progress : 0})`;
  const h1 = document.querySelector('.hero h1');
  const sub = document.querySelector('.hero-subtitle');
  const badge = document.querySelector('.hero-badge');
  if (h1) h1.style.transform = `translateY(${scrollY * 0.3}px)`;
  if (sub) sub.style.transform = `translateY(${scrollY * 0.2}px)`;
  if (badge) badge.style.transform = `translateY(${scrollY * 0.4}px)`;
}, { passive: true });

// ===== 赛博光标拖尾 =====
(function() {
  const trails = [];
  for (let i = 0; i < 8; i++) {
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
  function animateTrail() {
    let x = tx, y = ty;
    trails.forEach((dot, i) => {
      const speed = 0.35 - i * 0.03;
      const prevX = parseFloat(dot.style.left) || x;
      const prevY = parseFloat(dot.style.top) || y;
      dot.style.left = prevX + (x - prevX) * speed + 'px';
      dot.style.top = prevY + (y - prevY) * speed + 'px';
      x = prevX + (x - prevX) * speed;
      y = prevY + (y - prevY) * speed;
    });
    requestAnimationFrame(animateTrail);
  }
  animateTrail();
})();

// ===== 滚动入场动画 =====
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.fade-in, .step').forEach(el => observer.observe(el));

// ===== 顶部导航栏 =====
const topNav = document.getElementById('topNav');
const heroSection = document.getElementById('hero');
const topNavObs = new IntersectionObserver(entries => {
  topNav.classList.toggle('visible', !entries[0].isIntersecting);
}, { threshold: 0.1 });
topNavObs.observe(heroSection);

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

// ===== 平滑滚动 =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ===== 打字机效果工具函数 =====
function initTypewriter(triggerChar) {
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
  const typeStyle = document.createElement('style');
  typeStyle.textContent = '@keyframes typeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }';
  document.head.appendChild(typeStyle);
  setTimeout(typeChar, 800);
}
