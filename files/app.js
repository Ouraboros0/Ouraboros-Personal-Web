// =============================================================================
// OURABOROS — app.js
// =============================================================================


// =============================================================================
// SECTION 1 — CANVAS & DOM REFERENCES
// =============================================================================

const snakeCanvas = document.getElementById('snakeCanvas');
const ctx         = snakeCanvas.getContext('2d');

const frenzyTimerDiv    = document.getElementById('frenzyTimer');
const frenzyTimerCanvas = document.getElementById('ftc');
const frenzyTimerCtx    = frenzyTimerCanvas.getContext('2d');

const cursorDot     = document.getElementById('cur');
const cursorRing    = document.getElementById('curRing');
const btnPlay       = document.getElementById('btnPlay');
const btnStop       = document.getElementById('btnStop');
const gameUI        = document.getElementById('gameUI');
const scoreLabel    = document.getElementById('scoreLabel');
const emblem        = document.getElementById('emblem');
const flashOverlay  = document.getElementById('gameOverFlash');
const frenzyOverlay = document.getElementById('frenzyOverlay');
const heroTitle     = document.getElementById('heroTitle');

function resizeCanvas() {
  snakeCanvas.width  = window.innerWidth;
  snakeCanvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);


// =============================================================================
// SECTION 2 — CUSTOM CURSOR
// =============================================================================

let cursorX = 0, cursorY = 0;
let cursorRingX = 0, cursorRingY = 0;

document.addEventListener('mousemove', e => { cursorX = e.clientX; cursorY = e.clientY; });

(function animateCursor() {
  cursorDot.style.left = cursorX + 'px';
  cursorDot.style.top  = cursorY + 'px';
  cursorRingX += (cursorX - cursorRingX) * 0.13;
  cursorRingY += (cursorY - cursorRingY) * 0.13;
  cursorRing.style.left = cursorRingX + 'px';
  cursorRing.style.top  = cursorRingY + 'px';
  requestAnimationFrame(animateCursor);
})();

document.querySelectorAll('button, a').forEach(el => {
  el.addEventListener('mouseenter', () => cursorRing.classList.add('hovered'));
  el.addEventListener('mouseleave', () => cursorRing.classList.remove('hovered'));
});


// =============================================================================
// SECTION 3 — GAME STATE
// 'idle' | 'playing' | 'exiting'
// =============================================================================

let gameState = 'idle';
let score     = 0;
let orbsEaten = 0;


// =============================================================================
// SECTION 4 — HIGH SCORE (localStorage)
// Disimpan antar session. Ditampilkan di scoreLabel saat idle.
// =============================================================================

let highScore = parseInt(localStorage.getItem('ouraboros_hs') || '0');

function saveHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('ouraboros_hs', highScore);
  }
}

// Update label: saat idle tampil high score, saat playing tampil score aktif
function updateScoreLabel() {
  if (gameState === 'idle') {
    scoreLabel.textContent = highScore > 0
      ? `best · ${String(highScore).padStart(3, '0')}`
      : 'score · 000';
  } else {
    scoreLabel.textContent = `score · ${String(score).padStart(3, '0')}`;
  }
}


// =============================================================================
// SECTION 5 — COMBO MULTIPLIER
// Makan orb dalam 1.5 detik dari orb sebelumnya = combo.
// Combo bertambah tiap eat, reset kalau terlalu lama tidak makan.
// Multiplier: combo 1-2 = ×1, combo 3-4 = ×2, combo 5+ = ×3
// =============================================================================

let comboCount    = 0;
let lastEatTime   = 0;
const COMBO_WINDOW = 1500; // ms — batas waktu antar orb untuk maintain combo

function getComboMultiplier() {
  if (comboCount >= 5) return 3;
  if (comboCount >= 3) return 2;
  return 1;
}

function updateCombo() {
  const now = Date.now();
  if (now - lastEatTime > COMBO_WINDOW && comboCount > 0) {
    // Terlalu lama tidak makan — reset combo
    comboCount = 0;
  }
}


// =============================================================================
// SECTION 6 — BUFFS (IMMUNITY & SPEED)
// =============================================================================

const BUFF_DURATION  = 2000;
let immuneUntil      = 0;
let speedUntil       = 0;

function isImmune() { return Date.now() < immuneUntil || frenzyActive(); }
function isSpeed()  { return Date.now() < speedUntil  || frenzyActive(); }
function grantImmunity(ms)  { immuneUntil = Date.now() + ms; }
function grantSpeedBuff(ms) { speedUntil  = Date.now() + ms; }

let immunePulseAngle = 0;
let speedPulseAngle  = 0;


// =============================================================================
// SECTION 7 — FRENZY MODE
// =============================================================================

const FRENZY_DURATION  = 5000;
const FRENZY_ORB_COUNT = 8;
let frenzyEndTime = 0;

function frenzyActive() {
  return gameState === 'playing' && Date.now() < frenzyEndTime;
}

function drawFrenzyTimer() {
  if (!frenzyActive()) { frenzyTimerDiv.classList.remove('on'); return; }
  frenzyTimerDiv.classList.add('on');
  const secondsLeft  = Math.max(0, (frenzyEndTime - Date.now()) / 1000);
  const fillFraction = secondsLeft / 5;
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
  const cx = 36, cy = 36, R = 28;
  frenzyTimerCtx.clearRect(0, 0, 72, 72);
  frenzyTimerCtx.beginPath(); frenzyTimerCtx.arc(cx,cy,R+3,0,Math.PI*2); frenzyTimerCtx.fillStyle='rgba(10,8,6,0.85)'; frenzyTimerCtx.fill();
  frenzyTimerCtx.beginPath(); frenzyTimerCtx.arc(cx,cy,R,0,Math.PI*2); frenzyTimerCtx.strokeStyle='rgba(200,60,40,0.18)'; frenzyTimerCtx.lineWidth=3.5; frenzyTimerCtx.stroke();
  frenzyTimerCtx.beginPath(); frenzyTimerCtx.arc(cx,cy,R,-Math.PI/2,-Math.PI/2+fillFraction*Math.PI*2); frenzyTimerCtx.strokeStyle=`rgba(230,90,60,${0.75+pulse*0.25})`; frenzyTimerCtx.lineWidth=3.5; frenzyTimerCtx.stroke();
  frenzyTimerCtx.save(); frenzyTimerCtx.font=`500 18px 'DM Mono',monospace`; frenzyTimerCtx.fillStyle=`rgba(255,160,120,${0.9+pulse*0.1})`; frenzyTimerCtx.textAlign='center'; frenzyTimerCtx.textBaseline='middle'; frenzyTimerCtx.fillText(Math.ceil(secondsLeft),cx,cy); frenzyTimerCtx.restore();
}

function startFrenzy() {
  frenzyEndTime = Date.now() + FRENZY_DURATION;
  frenzyOverlay.classList.add('on');
  orbs.length = 0;
  for (let i = 0; i < FRENZY_ORB_COUNT; i++) orbs.push(createOrb());
}

function endFrenzy() {
  frenzyOverlay.classList.remove('on');
  frenzyTimerDiv.classList.remove('on');
  orbs.length = 0;
  orbs.push(createOrb());
  frenzyEndTime = 0;
}


// =============================================================================
// SECTION 8 — SNAKE CONFIG & INITIALIZATION
// =============================================================================

const SEGMENT_COUNT  = 28;
const SEGMENT_LENGTH = 8;
const BASE_SPEED     = 3.2;
const FAST_SPEED     = 6.4;
const ORBIT_RADIUS   = (SEGMENT_COUNT * SEGMENT_LENGTH) / (2 * Math.PI);

let mousePos  = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let snakeMode = 'wander';
let orbitAngle = 0;

let wanderTarget = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let wanderTimer  = 0;

function pickNewWanderTarget() {
  const padding = 100;
  wanderTarget = {
    x: padding + Math.random() * (window.innerWidth  - padding * 2),
    y: padding + Math.random() * (window.innerHeight - padding * 2),
  };
  wanderTimer = 220 + Math.random() * 220;
}
pickNewWanderTarget();

const segments = Array.from({ length: SEGMENT_COUNT }, (_, i) => ({
  x: window.innerWidth / 2 - i * SEGMENT_LENGTH,
  y: window.innerHeight / 2,
  vx: 0, vy: 0,
}));

document.addEventListener('mousemove', e => {
  const dx = e.clientX - mousePos.x, dy = e.clientY - mousePos.y;
  mousePos.x = e.clientX; mousePos.y = e.clientY;
  if (Math.sqrt(dx*dx+dy*dy) > 12 && snakeMode === 'orbit') snakeMode = 'chase';
});

function getSegmentRadius(i) { return 7 - (i / (SEGMENT_COUNT - 1)) * 5; }
function getSegmentAlpha(i)  { return 0.88 - (i / (SEGMENT_COUNT - 1)) * 0.6; }


// =============================================================================
// SECTION 9 — SNAKE TRAIL
// Setiap frame saat playing, posisi tiap segmen disimpan ke trail buffer.
// Trail digambar sebelum badan ular — dot kecil yang fade out.
// Saat speed buff aktif trail lebih panjang dan lebih terang.
// =============================================================================

// Trail: array of {x, y, alpha, radius} — diisi dari kepala tiap frame
const snakeTrail = [];
const TRAIL_MAX_LENGTH = 80;  // jumlah trail point maksimal
const TRAIL_FADE_RATE  = 0.03; // seberapa cepat trail fade per frame

function updateSnakeTrail() {
  if (gameState !== 'playing' && gameState !== 'exiting') return;

  // Tambah titik baru dari posisi kepala
  snakeTrail.unshift({
    x:      segments[0].x,
    y:      segments[0].y,
    alpha:  isSpeed() ? 0.35 : 0.18, // lebih terang saat speed buff
    radius: getSegmentRadius(0) * 0.4,
  });

  // Fade semua titik dan hapus yang sudah habis
  for (let i = snakeTrail.length - 1; i >= 0; i--) {
    snakeTrail[i].alpha -= TRAIL_FADE_RATE;
    if (snakeTrail[i].alpha <= 0) snakeTrail.splice(i, 1);
  }

  // Batasi panjang trail
  if (snakeTrail.length > TRAIL_MAX_LENGTH) snakeTrail.length = TRAIL_MAX_LENGTH;
}

function drawSnakeTrail() {
  if (snakeTrail.length === 0) return;
  for (const point of snakeTrail) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
    const color = isSpeed()
      ? `rgba(255,120,60,${point.alpha})`   // oranye saat speed
      : `rgba(201,185,154,${point.alpha})`; // krem normal
    ctx.fillStyle = color;
    ctx.fill();
  }
}


// =============================================================================
// SECTION 10 — GHOST TRAIL (saat exiting)
// Saat ular kabur, ninggalin after-image yang fade lambat.
// Berbeda dari snake trail biasa — lebih besar, lebih ghostly, warna biru-putih.
// =============================================================================

const ghostTrail = [];

function updateGhostTrail() {
  if (gameState !== 'exiting') { ghostTrail.length = 0; return; }

  // Rekam seluruh posisi segmen sebagai satu "snapshot" ghost
  if (Math.random() < 0.4) { // tidak setiap frame, supaya tidak terlalu penuh
    ghostTrail.push(
      segments.map(s => ({ x: s.x, y: s.y }))
    );
  }

  // Fade dan hapus snapshot lama
  if (ghostTrail.length > 8) ghostTrail.shift();
}

function drawGhostTrail() {
  if (ghostTrail.length === 0) return;
  ghostTrail.forEach((snapshot, snapshotIndex) => {
    const age   = 1 - snapshotIndex / ghostTrail.length; // 0 = lama, 1 = baru
    const alpha = age * 0.12;
    snapshot.forEach((point, segIndex) => {
      const radius = getSegmentRadius(segIndex) * (0.8 + age * 0.2);
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,210,255,${alpha})`;
      ctx.fill();
    });
  });
}


// =============================================================================
// SECTION 11 — IDLE GLOW
// Saat gameState === 'idle', badan ular punya subtle glow yang pulse pelan.
// Beda dari buff aura — lebih halus, warna warm amber/krem, menandakan "hidup".
// =============================================================================

let idleGlowAngle = 0; // increment pelan tiap frame

function drawIdleGlow() {
  if (gameState !== 'idle') return;

  idleGlowAngle += 0.018; // lebih lambat dari buff pulse
  const glow = 0.3 + 0.25 * Math.sin(idleGlowAngle); // 0.05 - 0.55

  // Glow dari ekor ke kepala
  for (let i = SEGMENT_COUNT - 1; i >= 0; i--) {
    const radius     = getSegmentRadius(i);
    const fadeAmount = Math.max(0, 1 - (i / (SEGMENT_COUNT - 1)) * 0.8);
    ctx.beginPath();
    ctx.arc(segments[i].x, segments[i].y, radius + 3 + glow * 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(201,185,154,${glow * 0.12 * fadeAmount})`;
    ctx.fill();
  }
}


// =============================================================================
// SECTION 12 — PARALLAX BACKGROUND DOTS
// Titik-titik kecil di background yang bergerak pelan ngikutin cursor
// dengan kecepatan berbeda-beda (tiap dot punya depth factor 0.0 - 1.0).
// Dot yang lebih jauh (depth kecil) bergerak lebih lambat → efek kedalaman.
// =============================================================================

const parallaxDots = [];
const PARALLAX_DOT_COUNT = 45;

// Inisialisasi dots satu kali
(function initParallax() {
  for (let i = 0; i < PARALLAX_DOT_COUNT; i++) {
    parallaxDots.push({
      // Posisi "rest" — tengah layar plus offset random
      baseX:  window.innerWidth  / 2 + (Math.random() - 0.5) * window.innerWidth  * 1.2,
      baseY:  window.innerHeight / 2 + (Math.random() - 0.5) * window.innerHeight * 1.2,
      depth:  0.05 + Math.random() * 0.25, // 0.05 = jauh, 0.25 = dekat
      radius: 0.5 + Math.random() * 1.5,
      alpha:  0.04 + Math.random() * 0.12,
    });
  }
})();

function drawParallax() {
  // Offset cursor dari tengah layar
  const offsetX = (cursorX - window.innerWidth  / 2);
  const offsetY = (cursorY - window.innerHeight / 2);

  for (const dot of parallaxDots) {
    // Dot yang lebih "dekat" (depth besar) bergerak lebih jauh dari cursor
    const x = dot.baseX - offsetX * dot.depth;
    const y = dot.baseY - offsetY * dot.depth;

    // Skip kalau keluar layar
    if (x < -10 || x > window.innerWidth + 10 || y < -10 || y > window.innerHeight + 10) continue;

    ctx.beginPath();
    ctx.arc(x, y, dot.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(201,185,154,${dot.alpha})`;
    ctx.fill();
  }
}


// =============================================================================
// SECTION 13 — OBSTACLES
// =============================================================================

let obstacleRects = [];

function collectObstacles() {
  obstacleRects = [];
  const selector    = 'nav,p,h1,h2,h3,li,button,.concept-card,.about-body,.quote-inner,footer,.hero-tagline,.hero-sub,.section-label,.divider-symbol,.emblem-symbol';
  const excludedIds = ['btnPlay','btnStop','gameUI','snakeCanvas','cur','curRing','gameOverFlash','frenzyOverlay','frenzyTimer'];
  document.querySelectorAll(selector).forEach(el => {
    if (excludedIds.includes(el.id)) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4 || rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) return;
    obstacleRects.push({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
  });
}

window.addEventListener('scroll', () => { if (gameState === 'playing') collectObstacles(); });
window.addEventListener('resize', () => { if (gameState === 'playing') collectObstacles(); });


// =============================================================================
// SECTION 14 — DANGER ZONE PROXIMITY WARNING
// Saat kepala ular mendekati obstacle (dalam DANGER_DIST px), obstacle tersebut
// pulse merah sebagai warning. Makin dekat = makin terang pulsenya.
// Hanya aktif saat tidak immune.
// =============================================================================

const DANGER_DIST = 60; // px — jarak mulai warning

function drawDangerZones() {
  if (gameState !== 'playing' || isImmune()) return;

  const hx = segments[0].x, hy = segments[0].y;

  for (const rect of obstacleRects) {
    // Jarak dari kepala ke titik terdekat rect
    const cx = Math.max(rect.x, Math.min(hx, rect.x + rect.w));
    const cy = Math.max(rect.y, Math.min(hy, rect.y + rect.h));
    const dist = Math.sqrt((hx-cx)**2 + (hy-cy)**2);

    if (dist < DANGER_DIST) {
      // Proximity: 1.0 = sangat dekat, 0.0 = di batas DANGER_DIST
      const proximity = 1 - dist / DANGER_DIST;
      const pulse     = 0.5 + 0.5 * Math.sin(Date.now() * 0.015);
      const intensity = proximity * pulse;

      ctx.save();
      ctx.strokeStyle = `rgba(220,60,40,${intensity * 0.55})`;
      ctx.lineWidth   = 1 + proximity * 1.5;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

      // Inner fill subtle
      ctx.fillStyle = `rgba(220,60,40,${intensity * 0.06})`;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }
  }
}


// =============================================================================
// SECTION 15 — ORB SYSTEM (dengan orb bergerak, magnetism, easter egg)
//
// Tipe orb:
//   'normal'   (48%) → +skor × combo multiplier. Bergerak pelan random.
//   'shield'   (22%) → +5 poin + immunity 2 detik. Diam (reward, mudah diambil).
//   'speed'    (18%) → +5 poin + speed 2 detik. Diam.
//   'golden'   (12%) → Easter egg! +50 poin, muncul quote, bergerak lebih cepat.
//
// Orb normal dan golden bergerak: punya velocity (vx, vy) yang bouncing di
// batas viewport dan menghindari obstacle.
//
// Orb magnetism (saat speed buff): orb normal/golden yang dekat dengan kepala
// (dalam MAGNET_RADIUS) sedikit tertarik ke arah ular.
// =============================================================================

const ORB_RADIUS    = 12;
const MAGNET_RADIUS = 120; // px — radius efek magnet saat speed buff
const orbs          = [];

// Quote untuk easter egg golden orb
const goldenQuotes = [
  "the output becomes the input",
  "to build is to understand",
  "every version feeds the next",
  "never ending cycle",
  "logic meets feeling",
  "growth isn't linear",
];
let activeGoldenQuote    = null;  // { text, x, y, life }
let goldenOrbSpawnTimer  = 0;     // countdown sebelum golden orb bisa spawn lagi

function createOrb() {
  // Tentukan tipe. Golden orb hanya bisa spawn kalau timer habis.
  const roll = Math.random();
  let type;
  if (roll < 0.48)       type = 'normal';
  else if (roll < 0.70)  type = 'shield';
  else if (roll < 0.88)  type = 'speed';
  else if (goldenOrbSpawnTimer <= 0) { type = 'golden'; goldenOrbSpawnTimer = 600; } // cooldown 600 frame
  else                   type = 'normal'; // fallback kalau golden masih cooldown

  const padding = 80;
  const isMoving = type === 'normal' || type === 'golden';

  for (let attempt = 0; attempt < 30; attempt++) {
    const x = padding + Math.random() * (window.innerWidth  - padding * 2);
    const y = padding + Math.random() * (window.innerHeight - padding * 2);
    let blocked = false;
    for (const rect of obstacleRects) {
      if (x > rect.x-ORB_RADIUS*2 && x < rect.x+rect.w+ORB_RADIUS*2 &&
          y > rect.y-ORB_RADIUS*2 && y < rect.y+rect.h+ORB_RADIUS*2) { blocked = true; break; }
    }
    if (!blocked) return {
      x, y,
      phase: Math.random() * Math.PI * 2,
      alive: true,
      type,
      // Velocity untuk orb bergerak — golden bergerak 1.5x lebih cepat
      vx: isMoving ? (Math.random() - 0.5) * (type === 'golden' ? 1.8 : 1.2) : 0,
      vy: isMoving ? (Math.random() - 0.5) * (type === 'golden' ? 1.8 : 1.2) : 0,
    };
  }
  return { x: window.innerWidth/2+(Math.random()-.5)*200, y: window.innerHeight/2+(Math.random()-.5)*100, phase: 0, alive: true, type, vx: 0, vy: 0 };
}

// Update posisi orb bergerak — bouncing di tepi viewport
function updateOrbs() {
  if (goldenOrbSpawnTimer > 0) goldenOrbSpawnTimer--;

  for (const orb of orbs) {
    if (!orb.alive) continue;
    if (orb.vx === 0 && orb.vy === 0) continue; // orb diam (shield/speed) skip

    // Efek magnet: saat speed buff aktif, orb bergerak tertarik ke kepala
    if (isSpeed() && gameState === 'playing') {
      const dx   = segments[0].x - orb.x;
      const dy   = segments[0].y - orb.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < MAGNET_RADIUS && dist > 1) {
        // Gaya tarik makin kuat makin dekat — lemah (0.015) supaya subtle
        const pull = (1 - dist / MAGNET_RADIUS) * 0.015;
        orb.vx += (dx / dist) * pull * dist;
        orb.vy += (dy / dist) * pull * dist;
      }
    }

    // Damping supaya tidak accelerate terus
    orb.vx *= 0.995;
    orb.vy *= 0.995;

    // Minimal speed supaya terus bergerak
    const speed = Math.sqrt(orb.vx**2 + orb.vy**2);
    const minSpeed = orb.type === 'golden' ? 0.6 : 0.3;
    if (speed < minSpeed && speed > 0) {
      orb.vx = (orb.vx / speed) * minSpeed;
      orb.vy = (orb.vy / speed) * minSpeed;
    }

    orb.x += orb.vx;
    orb.y += orb.vy;

    // Bounce di tepi viewport (dengan padding)
    const pad = ORB_RADIUS + 20;
    if (orb.x < pad)                     { orb.x = pad;                     orb.vx = Math.abs(orb.vx); }
    if (orb.x > window.innerWidth  - pad) { orb.x = window.innerWidth  - pad; orb.vx = -Math.abs(orb.vx); }
    if (orb.y < pad)                     { orb.y = pad;                     orb.vy = Math.abs(orb.vy); }
    if (orb.y > window.innerHeight - pad) { orb.y = window.innerHeight - pad; orb.vy = -Math.abs(orb.vy); }
  }
}


// =============================================================================
// SECTION 16 — PARTICLE BURST
// Saat orb dimakan, partikel kecil meledak ke segala arah.
// Warna sesuai tipe orb. Golden orb punya burst yang lebih besar dan banyak.
// =============================================================================

const orbParticles = []; // { x, y, vx, vy, alpha, size, color }

function spawnOrbBurst(x, y, type) {
  const count = type === 'golden' ? 18 : 10;
  const colors = {
    normal: '201,185,154',
    shield: '140,190,255',
    speed:  '220,80,60',
    golden: '255,210,80',
  };
  const col = colors[type] || '201,185,154';

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const speed = 1.5 + Math.random() * 3;
    orbParticles.push({
      x, y,
      vx:    Math.cos(angle) * speed,
      vy:    Math.sin(angle) * speed,
      alpha: 0.8 + Math.random() * 0.2,
      size:  1.5 + Math.random() * (type === 'golden' ? 3.5 : 2),
      color: col,
    });
  }
}

function updateDrawOrbParticles() {
  for (let i = orbParticles.length - 1; i >= 0; i--) {
    const p  = orbParticles[i];
    p.x     += p.vx;
    p.y     += p.vy;
    p.vx    *= 0.92; // friction
    p.vy    *= 0.92;
    p.alpha -= 0.035;
    if (p.alpha <= 0) { orbParticles.splice(i, 1); continue; }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
    ctx.fill();
  }
}


// =============================================================================
// SECTION 17 — GOLDEN QUOTE DISPLAY
// Saat golden orb dimakan, quote muncul di tengah layar, melayang ke atas,
// lalu fade out perlahan.
// =============================================================================

function triggerGoldenQuote(x, y) {
  const text = goldenQuotes[Math.floor(Math.random() * goldenQuotes.length)];
  activeGoldenQuote = { text, x, y: y - 20, life: 1.0 };
}

function drawGoldenQuote() {
  if (!activeGoldenQuote) return;
  activeGoldenQuote.y    -= 0.6; // melayang ke atas pelan
  activeGoldenQuote.life -= 0.008;
  if (activeGoldenQuote.life <= 0) { activeGoldenQuote = null; return; }

  const alpha = activeGoldenQuote.life;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font        = `300 13px 'Cormorant Garamond', serif`;
  ctx.fillStyle   = 'rgba(255,210,80,1)';
  ctx.textAlign   = 'center';
  ctx.fontStyle   = 'italic';
  ctx.fillText(`"${activeGoldenQuote.text}"`, activeGoldenQuote.x, activeGoldenQuote.y);
  ctx.restore();
}


// =============================================================================
// SECTION 18 — CONFETTI & SCORE POPUPS
// =============================================================================

const confettiParticles = [];

function spawnConfetti() {
  confettiParticles.length = 0;
  for (let i = 0; i < 70; i++) {
    confettiParticles.push({
      x:     window.innerWidth  / 2 + (Math.random() - 0.5) * 300,
      y:     window.innerHeight / 2 + (Math.random() - 0.5) * 150,
      vx:    (Math.random() - 0.5) * 6,
      vy:    -3 - Math.random() * 5,
      alpha: 1, size: 2 + Math.random() * 5, col: '201,185,154',
      rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.2,
    });
  }
}

const scorePopups = [];
function addScorePopup(x, y, text, color) { scorePopups.push({ x, y: y - 14, life: 1, text, color }); }

function incrementScore(points) {
  // Terapkan combo multiplier
  updateCombo();
  const now = Date.now();
  if (now - lastEatTime <= COMBO_WINDOW) {
    comboCount++;
  } else {
    comboCount = 1; // mulai combo baru
  }
  lastEatTime = now;

  const multiplier = getComboMultiplier();
  const total      = points * multiplier;
  score += total;

  updateScoreLabel();
  scoreLabel.classList.remove('pop');
  void scoreLabel.offsetWidth;
  scoreLabel.classList.add('pop');

  return { total, multiplier };
}


// =============================================================================
// SECTION 19 — GAME END SEQUENCE
// =============================================================================

function flickerTitleTo(finalHTML, durationMs) {
  const steps = 12, interval = durationMs / steps; let step = 0;
  const t = setInterval(() => {
    step++;
    if (step >= steps) { heroTitle.innerHTML = finalHTML; heroTitle.style.opacity = '1'; clearInterval(t); return; }
    heroTitle.style.opacity = step % 2 === 0 ? '0.15' : '1';
  }, interval);
}

function stopGame(isGameOver) {
  if (gameState === 'exiting') return;
  gameState     = 'exiting';
  orbs.length   = 0;
  frenzyEndTime = 0;
  comboCount    = 0;
  frenzyOverlay.classList.remove('on');
  frenzyTimerDiv.classList.remove('on');
  gameUI.classList.add('hidden');

  if (isGameOver) {
    flashOverlay.classList.add('flash');
    setTimeout(() => flashOverlay.classList.remove('flash'), 200);
  }

  saveHighScore(); // simpan ke localStorage sebelum reset

  heroTitle.innerHTML = `${score}`; heroTitle.style.opacity = '1';
  spawnConfetti();

  setTimeout(() => {
    flickerTitleTo('Oura<em>boros</em>', 900);
    setTimeout(() => {
      gameState = 'idle'; score = 0; orbsEaten = 0;
      updateScoreLabel(); // tampilkan high score saat idle
      btnPlay.classList.remove('hidden');
      snakeMode = 'wander';
      pickNewWanderTarget();
    }, 900);
  }, 1400);
}


// =============================================================================
// SECTION 20 — BUTTON EVENTS
// =============================================================================

btnPlay.addEventListener('click', () => {
  if (gameState !== 'idle') return;
  gameState = 'playing'; score = 0; orbsEaten = 0; frenzyEndTime = 0; comboCount = 0; lastEatTime = 0;
  updateScoreLabel();
  btnPlay.classList.add('hidden'); gameUI.classList.remove('hidden');
  collectObstacles();
  orbs.length = 0; orbs.push(createOrb());
  grantImmunity(BUFF_DURATION);
  snakeMode = 'chase';
  snakeTrail.length = 0; // clear trail dari sesi sebelumnya
});

btnStop.addEventListener('click', () => { if (gameState !== 'playing') return; stopGame(false); });
btnPlay.addEventListener('mouseenter', () => { btnPlay.classList.add('hovered'); emblem.classList.add('hovering'); });
btnPlay.addEventListener('mouseleave', () => { btnPlay.classList.remove('hovered'); emblem.classList.remove('hovering'); });
btnStop.addEventListener('mouseenter', () => btnStop.classList.add('hovered'));
btnStop.addEventListener('mouseleave', () => btnStop.classList.remove('hovered'));

// Tampilkan high score di label saat pertama load
updateScoreLabel();


// =============================================================================
// SECTION 21 — TONGUE
// =============================================================================

let tongueExtension = 0, tonguePhase = 'idle', tongueFrameCount = 0;

function updateTongue() {
  tongueFrameCount++;
  if (tonguePhase === 'idle' && tongueFrameCount > 85) { tonguePhase = 'out'; tongueFrameCount = 0; }
  if (tonguePhase === 'out')  { tongueExtension = Math.min(1, tongueExtension + 0.1); if (tongueExtension >= 1) { tonguePhase = 'hold'; tongueFrameCount = 0; } }
  if (tonguePhase === 'hold' && tongueFrameCount > 18) tonguePhase = 'in';
  if (tonguePhase === 'in')   { tongueExtension = Math.max(0, tongueExtension - 0.1); if (tongueExtension <= 0) { tonguePhase = 'idle'; tongueFrameCount = 0; } }
}

function drawTongue(hx, hy, angle) {
  if (tongueExtension <= 0) return;
  const l = 11 * tongueExtension, f = 5 * tongueExtension;
  const bx = hx + Math.cos(angle) * (getSegmentRadius(0) - 1), by = hy + Math.sin(angle) * (getSegmentRadius(0) - 1);
  const tx = bx + Math.cos(angle) * l, ty = by + Math.sin(angle) * l;
  const px = Math.cos(angle + Math.PI / 2), py = Math.sin(angle + Math.PI / 2);
  ctx.save(); ctx.strokeStyle = `rgba(160,50,50,${0.75*tongueExtension})`; ctx.lineWidth = 1; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx+px*f+Math.cos(angle)*3, ty+py*f+Math.sin(angle)*3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx-px*f+Math.cos(angle)*3, ty-py*f+Math.sin(angle)*3); ctx.stroke();
  ctx.restore();
}


// =============================================================================
// SECTION 22 — DRAW ORB
// =============================================================================

function drawOrb(orb) {
  if (!orb.alive) return;
  orb.phase += 0.04;
  const pulse = 0.7 + 0.3 * Math.sin(orb.phase);
  const { x, y, type } = orb;

  let coreColor, midColor, glowColor, innerColor;
  if (type === 'normal') {
    coreColor = `rgba(201,185,154,${0.75*pulse})`; midColor = `rgba(201,185,154,${0.18*pulse})`;
    glowColor = `rgba(201,185,154,${0.07*pulse})`; innerColor = `rgba(255,248,230,${0.55*pulse})`;
  } else if (type === 'shield') {
    coreColor = `rgba(140,190,255,${0.75*pulse})`; midColor = `rgba(160,200,255,${0.25*pulse})`;
    glowColor = `rgba(180,210,255,${0.10*pulse})`; innerColor = `rgba(220,235,255,${0.60*pulse})`;
  } else if (type === 'speed') {
    coreColor = `rgba(220,80,60,${0.80*pulse})`;   midColor = `rgba(240,100,80,${0.30*pulse})`;
    glowColor = `rgba(255,120,80,${0.10*pulse})`;  innerColor = `rgba(255,200,180,${0.60*pulse})`;
  } else {
    // Golden orb — lebih besar dan shimmer lebih kuat
    coreColor = `rgba(255,200,60,${0.88*pulse})`;  midColor = `rgba(255,220,100,${0.35*pulse})`;
    glowColor = `rgba(255,230,120,${0.15*pulse})`; innerColor = `rgba(255,250,200,${0.70*pulse})`;
  }

  // Golden orb sedikit lebih besar dan ada extra glow ring
  const sizeMultiplier = type === 'golden' ? 1.3 : 1;

  ctx.beginPath(); ctx.arc(x, y, ORB_RADIUS*2.8*pulse*sizeMultiplier, 0, Math.PI*2); ctx.strokeStyle = glowColor; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, ORB_RADIUS*1.9*sizeMultiplier, 0, Math.PI*2); ctx.strokeStyle = midColor; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, ORB_RADIUS*pulse*sizeMultiplier, 0, Math.PI*2); ctx.fillStyle = coreColor; ctx.fill();
  ctx.beginPath(); ctx.arc(x-ORB_RADIUS*0.3, y-ORB_RADIUS*0.3, ORB_RADIUS*0.38*sizeMultiplier, 0, Math.PI*2); ctx.fillStyle = innerColor; ctx.fill();

  ctx.save(); ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  if (type === 'shield') {
    ctx.strokeStyle = `rgba(255,255,255,${0.35*pulse})`;
    ctx.beginPath(); ctx.moveTo(x-3,y); ctx.lineTo(x+3,y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,y-3); ctx.lineTo(x,y+3); ctx.stroke();
  } else if (type === 'speed') {
    ctx.strokeStyle = `rgba(255,255,255,${0.4*pulse})`;
    ctx.beginPath(); ctx.moveTo(x+2,y-4); ctx.lineTo(x-1,y); ctx.lineTo(x+1,y); ctx.lineTo(x-2,y+4); ctx.stroke();
  } else if (type === 'golden') {
    // Ikon bintang kecil (titik 4 arah)
    ctx.strokeStyle = `rgba(255,255,255,${0.5*pulse})`;
    ctx.beginPath(); ctx.moveTo(x-4,y); ctx.lineTo(x+4,y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,y-4); ctx.lineTo(x,y+4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x-2.5,y-2.5); ctx.lineTo(x+2.5,y+2.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+2.5,y-2.5); ctx.lineTo(x-2.5,y+2.5); ctx.stroke();
  }
  ctx.restore();
}


// =============================================================================
// SECTION 23 — DRAW PREY DOT
// =============================================================================

function drawPreyDot() {
  if (gameState !== 'playing' || snakeMode === 'orbit') return;
  const dx = segments[0].x - mousePos.x, dy = segments[0].y - mousePos.y;
  if (Math.sqrt(dx*dx+dy*dy) < 5) return;
  const alpha = 0.35 + 0.2 * Math.sin(Date.now() * 0.008);
  ctx.beginPath(); ctx.arc(mousePos.x, mousePos.y, 2.5, 0, Math.PI*2); ctx.fillStyle = `rgba(201,185,154,${alpha})`; ctx.fill();
  ctx.beginPath(); ctx.arc(mousePos.x, mousePos.y, 6, 0, Math.PI*2); ctx.strokeStyle = `rgba(201,185,154,${alpha*0.3})`; ctx.lineWidth = 0.5; ctx.stroke();
}


// =============================================================================
// SECTION 24 — DRAW SNAKE (dengan huruf "OURABOROS" saat orbit)
//
// Saat snakeMode === 'orbit', huruf-huruf "OURABOROS" tampil tipis
// di segmen-segmen tertentu. Setiap huruf di-render di tengah segmennya,
// mengikuti arah gerak segmen tersebut (rotated).
// =============================================================================

const ORBIT_LETTERS = 'OURABOROS'.split('');

function drawSnake() {
  const immune = isImmune();
  const fast   = isSpeed();
  const frenzy = frenzyActive();
  const inOrbit = snakeMode === 'orbit' && gameState === 'playing';

  const timeUntilExpires = immuneUntil - Date.now();
  const isFlickering   = immune && !frenzy && timeUntilExpires < 500;
  const flickerVisible = !isFlickering || (Math.floor(Date.now() / 80) % 2 === 0);

  immunePulseAngle += 0.12; speedPulseAngle += 0.15;
  const immuneGlow = 0.5 + 0.5 * Math.sin(immunePulseAngle);
  const speedGlow  = 0.5 + 0.5 * Math.sin(speedPulseAngle);

  const hDx = segments[0].x - segments[1].x, hDy = segments[0].y - segments[1].y;
  const headAngle = Math.atan2(hDy, hDx);

  // Buff auras
  if ((immune || fast) && flickerVisible && gameState === 'playing') {
    for (let i = SEGMENT_COUNT - 1; i >= 0; i--) {
      const r = getSegmentRadius(i), fade = Math.max(0, 1-(i/(SEGMENT_COUNT-1))*0.75);
      if (immune) { ctx.beginPath(); ctx.arc(segments[i].x,segments[i].y,r+4+immuneGlow*4,0,Math.PI*2); ctx.fillStyle=`rgba(140,190,255,${(0.12+immuneGlow*0.18)*fade})`; ctx.fill(); }
      if (fast)   { ctx.beginPath(); ctx.arc(segments[i].x,segments[i].y,r+2+speedGlow*3,0,Math.PI*2);  ctx.fillStyle=`rgba(255,120,60,${(0.1+speedGlow*0.15)*fade})`;   ctx.fill(); }
    }
    if (immune) { ctx.beginPath(); ctx.arc(segments[0].x,segments[0].y,getSegmentRadius(0)+8+immuneGlow*5,0,Math.PI*2); ctx.strokeStyle=`rgba(140,190,255,${0.3+immuneGlow*0.3})`; ctx.lineWidth=1.5; ctx.stroke(); }
    if (fast)   { ctx.beginPath(); ctx.arc(segments[0].x,segments[0].y,getSegmentRadius(0)+5+speedGlow*4,0,Math.PI*2);  ctx.strokeStyle=`rgba(255,120,60,${0.3+speedGlow*0.3})`;   ctx.lineWidth=1.5; ctx.stroke(); }
  }

  // Body segments
  const bodyAlpha = gameState === 'idle' ? 0.5 : 1;

  for (let i = SEGMENT_COUNT - 1; i >= 0; i--) {
    const r = getSegmentRadius(i), a = getSegmentAlpha(i) * bodyAlpha;
    const isScale = i % 3 === 0;
    let bc;
    if (frenzy)            bc = isScale ? `rgba(180,80,60,${a})`   : `rgba(140,50,40,${a})`;
    else if (immune&&fast) bc = isScale ? `rgba(120,120,160,${a})` : `rgba(90,90,130,${a})`;
    else if (immune)       bc = isScale ? `rgba(90,115,155,${a})`  : `rgba(70,90,125,${a})`;
    else if (fast)         bc = isScale ? `rgba(140,70,40,${a})`   : `rgba(110,50,30,${a})`;
    else                   bc = isScale ? `rgba(80,62,38,${a})`    : `rgba(58,46,28,${a})`;

    ctx.beginPath(); ctx.arc(segments[i].x,segments[i].y,r,0,Math.PI*2); ctx.fillStyle=bc; ctx.fill();
    ctx.beginPath(); ctx.arc(segments[i].x-r*0.2,segments[i].y-r*0.25,r*0.5,0,Math.PI*2); ctx.fillStyle=`rgba(201,185,154,${a*0.08})`; ctx.fill();

    // Huruf OURABOROS — muncul saat orbit, satu huruf per segmen yang relevan
    // Segmen dipilih supaya tersebar merata di seluruh lingkaran
    if (inOrbit) {
      const letterCount = ORBIT_LETTERS.length;
      // Hanya segmen yang kelipatan tertentu yang dapat huruf (tersebar merata)
      const letterSpacing = Math.floor(SEGMENT_COUNT / letterCount);
      const letterIndex   = Math.floor(i / letterSpacing);
      if (i % letterSpacing === 0 && letterIndex < letterCount) {
        // Hitung arah segmen ini untuk rotasi huruf
        const nextSeg   = segments[Math.min(i + 1, SEGMENT_COUNT - 1)];
        const segAngle  = Math.atan2(segments[i].y - nextSeg.y, segments[i].x - nextSeg.x);
        const letterAlpha = a * 0.45; // huruf lebih transparan dari badan

        ctx.save();
        ctx.translate(segments[i].x, segments[i].y);
        ctx.rotate(segAngle + Math.PI / 2); // rotasi supaya huruf tegak lurus arah gerak
        ctx.font      = `300 ${Math.round(r * 1.4)}px 'DM Mono', monospace`;
        ctx.fillStyle = `rgba(201,185,154,${letterAlpha})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ORBIT_LETTERS[letterIndex], 0, 0);
        ctx.restore();
      }
    }
  }

  // Eye
  const ex = Math.cos(headAngle+0.6)*getSegmentRadius(0)*0.55, ey = Math.sin(headAngle+0.6)*getSegmentRadius(0)*0.55;
  ctx.beginPath(); ctx.arc(segments[0].x+ex,segments[0].y+ey,1.6,0,Math.PI*2); ctx.fillStyle='#0a0806'; ctx.fill();
  ctx.beginPath(); ctx.arc(segments[0].x+ex+0.3,segments[0].y+ey-0.3,0.6,0,Math.PI*2); ctx.fillStyle='rgba(201,185,154,0.7)'; ctx.fill();

  drawTongue(segments[0].x, segments[0].y, headAngle);
}


// =============================================================================
// SECTION 25 — DRAW SCORE POPUPS & CONFETTI
// =============================================================================

function drawScorePopups() {
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    const p = scorePopups[i]; p.y -= 1.5; p.life -= 0.022;
    if (p.life <= 0) { scorePopups.splice(i, 1); continue; }
    ctx.save(); ctx.globalAlpha = p.life;
    ctx.font = `300 12px 'DM Mono', monospace`; ctx.fillStyle = p.color; ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x, p.y); ctx.restore();
  }
}

function drawConfetti() {
  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const c = confettiParticles[i];
    c.x += c.vx; c.y += c.vy; c.vy += 0.13; c.rot += c.rotV; c.alpha -= 0.011;
    if (c.alpha <= 0) { confettiParticles.splice(i, 1); continue; }
    ctx.save(); ctx.globalAlpha = c.alpha; ctx.translate(c.x, c.y); ctx.rotate(c.rot);
    ctx.fillStyle = `rgba(${c.col},${c.alpha})`; ctx.fillRect(-c.size/2,-c.size/2,c.size,c.size); ctx.restore();
  }
}

// Tampilkan combo multiplier di sudut layar saat combo >= 2
function drawComboIndicator() {
  if (gameState !== 'playing' || comboCount < 2) return;
  const mult   = getComboMultiplier();
  const pulse  = 0.7 + 0.3 * Math.sin(Date.now() * 0.01);
  const color  = mult >= 3 ? `rgba(255,200,60,${pulse})` : mult >= 2 ? `rgba(255,140,100,${pulse})` : `rgba(201,185,154,${pulse})`;

  ctx.save();
  ctx.font      = `300 10px 'DM Mono', monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = 'right';
  ctx.fillText(`×${mult} combo`, window.innerWidth - 20, 30);
  ctx.restore();
}


// =============================================================================
// SECTION 26 — COLLISION DETECTION
// =============================================================================

function checkOrbCollisions() {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const orb  = orbs[i]; if (!orb.alive) continue;
    const dx   = segments[0].x - orb.x, dy = segments[0].y - orb.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < getSegmentRadius(0) + ORB_RADIUS * 0.9) {
      orb.alive = false;
      orbsEaten++;

      // Particle burst di posisi orb
      spawnOrbBurst(orb.x, orb.y, orb.type);

      const triggerFrenzy = orbsEaten % 10 === 0 && !frenzyActive();

      if (orb.type === 'shield') {
        grantImmunity(BUFF_DURATION);
        const { total, multiplier } = incrementScore(5);
        addScorePopup(orb.x, orb.y, multiplier > 1 ? `shield! +${total}` : 'shield! +5', 'rgba(180,210,255,1)');
      } else if (orb.type === 'speed') {
        grantSpeedBuff(BUFF_DURATION);
        const { total, multiplier } = incrementScore(5);
        addScorePopup(orb.x, orb.y, multiplier > 1 ? `speed! +${total}` : 'speed! +5', 'rgba(255,140,100,1)');
      } else if (orb.type === 'golden') {
        const { total } = incrementScore(50);
        addScorePopup(orb.x, orb.y, `+${total}`, 'rgba(255,210,80,1)');
        triggerGoldenQuote(orb.x, orb.y);
      } else {
        const { total, multiplier } = incrementScore(10);
        const text = multiplier > 1 ? `+${total} ×${multiplier}` : '+10';
        const col  = multiplier >= 3 ? 'rgba(255,200,60,1)' : multiplier >= 2 ? 'rgba(255,160,100,1)' : '#c9b99a';
        addScorePopup(orb.x, orb.y, text, col);
      }

      if (triggerFrenzy) {
        startFrenzy();
        addScorePopup(orb.x, orb.y - 24, 'frenzy!', 'rgba(255,120,80,1)');
      }

      orbs.splice(i, 1);
      if (!frenzyActive()) {
        setTimeout(() => { if (gameState === 'playing' && !frenzyActive()) orbs.push(createOrb()); }, 600);
      }
    }
  }
}

function checkObstacleCollisions() {
  if (isImmune()) return;
  const hx = segments[0].x, hy = segments[0].y, hr = getSegmentRadius(0);
  for (const rect of obstacleRects) {
    const cx = Math.max(rect.x, Math.min(hx, rect.x+rect.w));
    const cy = Math.max(rect.y, Math.min(hy, rect.y+rect.h));
    if ((hx-cx)**2 + (hy-cy)**2 < hr*hr) { stopGame(true); return; }
  }
}


// =============================================================================
// SECTION 27 — UPDATE LOOP
// =============================================================================

function update() {
  if (gameState === 'playing' && frenzyEndTime > 0 && !frenzyActive() && orbs.length === 0) endFrenzy();

  updateOrbs();         // gerakkan orb moving
  updateSnakeTrail();   // rekam trail
  updateGhostTrail();   // rekam ghost trail saat exiting
  updateCombo();        // cek apakah combo expired

  const hasFast = isSpeed(), cs = hasFast ? FAST_SPEED : BASE_SPEED;

  if (gameState === 'idle') {
    wanderTimer--;
    if (wanderTimer <= 0) pickNewWanderTarget();
    const dx = wanderTarget.x-segments[0].x, dy = wanderTarget.y-segments[0].y;
    const d  = Math.sqrt(dx*dx+dy*dy);
    if (d > 10) { segments[0].vx += (dx/d)*0.22; segments[0].vy += (dy/d)*0.22; } else wanderTimer = 0;
    const v = Math.sqrt(segments[0].vx**2+segments[0].vy**2);
    if (v > 1.6) { segments[0].vx=segments[0].vx/v*1.6; segments[0].vy=segments[0].vy/v*1.6; }
    segments[0].vx *= 0.94; segments[0].vy *= 0.94;
    segments[0].x  += segments[0].vx; segments[0].y += segments[0].vy;

  } else if (gameState === 'exiting') {
    const tx=window.innerWidth/2, ty=window.innerHeight+200;
    const dx=tx-segments[0].x, dy=ty-segments[0].y, d=Math.sqrt(dx*dx+dy*dy);
    if (d>1) { segments[0].vx=(dx/d)*9; segments[0].vy=(dy/d)*9; }
    segments[0].x += segments[0].vx; segments[0].y += segments[0].vy;

  } else {
    const dx=mousePos.x-segments[0].x, dy=mousePos.y-segments[0].y, dm=Math.sqrt(dx*dx+dy*dy);
    if (snakeMode === 'chase') {
      if (dm < ORBIT_RADIUS+6) { snakeMode='orbit'; orbitAngle=Math.atan2(segments[0].y-mousePos.y,segments[0].x-mousePos.x); }
      else { const spd=Math.min(dm,cs); segments[0].vx=(dx/dm)*spd; segments[0].vy=(dy/dm)*spd; segments[0].x+=segments[0].vx; segments[0].y+=segments[0].vy; }
    }
    if (snakeMode === 'orbit') {
      orbitAngle += hasFast ? 0.07 : 0.038;
      const tx=mousePos.x+Math.cos(orbitAngle)*ORBIT_RADIUS, ty=mousePos.y+Math.sin(orbitAngle)*ORBIT_RADIUS;
      segments[0].vx+=(tx-segments[0].x)*0.28; segments[0].vy+=(ty-segments[0].y)*0.28;
      segments[0].vx*=0.72; segments[0].vy*=0.72; segments[0].x+=segments[0].vx; segments[0].y+=segments[0].vy;
    }
    checkOrbCollisions(); checkObstacleCollisions();
  }

  for (let i = 1; i < SEGMENT_COUNT; i++) {
    const dx=segments[i-1].x-segments[i].x, dy=segments[i-1].y-segments[i].y, d=Math.sqrt(dx*dx+dy*dy);
    if (d>SEGMENT_LENGTH) { const s=(d-SEGMENT_LENGTH)*0.45; segments[i].vx+=(dx/d)*s; segments[i].vy+=(dy/d)*s; }
    const damp=0.65-(i/SEGMENT_COUNT)*0.12; segments[i].vx*=damp; segments[i].vy*=damp;
    segments[i].x+=segments[i].vx; segments[i].y+=segments[i].vy;
  }
  updateTongue();
}


// =============================================================================
// SECTION 28 — MAIN RENDER LOOP
// Urutan draw penting — yang belakangan muncul di atas:
//   parallax → ghost trail → snake trail → obstacles → orbs → prey dot
//   → danger zones → snake → orb particles → score popups → confetti
//   → golden quote → combo indicator → frenzy timer
// =============================================================================

function loop() {
  ctx.clearRect(0, 0, snakeCanvas.width, snakeCanvas.height);
  update();

  // Layer 1: Parallax background — selalu tampil
  drawParallax();

  // Layer 2: Ghost trail — hanya saat exiting
  drawGhostTrail();

  // Layer 3: Snake trail — saat playing dan exiting
  drawSnakeTrail();

  if (gameState === 'playing') {
    // Layer 4: Obstacle outlines + danger zones
    ctx.save(); ctx.strokeStyle='rgba(201,185,154,0.06)'; ctx.lineWidth=1;
    for (const rect of obstacleRects) ctx.strokeRect(rect.x,rect.y,rect.w,rect.h);
    ctx.restore();
    drawDangerZones();

    // Layer 5: Orbs
    for (const orb of orbs) drawOrb(orb);
    drawPreyDot();
  }

  // Layer 6: Idle glow (hanya saat idle)
  drawIdleGlow();

  // Layer 7: Snake body (selalu)
  drawSnake();

  // Layer 8: Orb burst particles
  updateDrawOrbParticles();

  // Layer 9: Score popups & confetti
  drawScorePopups();
  drawConfetti();

  // Layer 10: Golden quote
  drawGoldenQuote();

  // Layer 11: Combo indicator (top-right)
  drawComboIndicator();

  // Layer 12: Frenzy timer (canvas kecil tersendiri)
  drawFrenzyTimer();

  requestAnimationFrame(loop);
}

loop();
