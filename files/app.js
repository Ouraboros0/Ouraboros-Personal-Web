const sc = document.getElementById("snakeCanvas"),
  ctx = sc.getContext("2d");
const ftDiv = document.getElementById("frenzyTimer"),
  ftc = document.getElementById("ftc"),
  ftctx = ftc.getContext("2d");
const cur = document.getElementById("cur"),
  curRing = document.getElementById("curRing");
const btnPlay = document.getElementById("btnPlay"),
  btnStop = document.getElementById("btnStop");
const gameUI = document.getElementById("gameUI"),
  scoreLabel = document.getElementById("scoreLabel");
const emblem = document.getElementById("emblem"),
  flash = document.getElementById("gameOverFlash");
const frenzyOverlay = document.getElementById("frenzyOverlay"),
  heroTitle = document.getElementById("heroTitle");

function resize() {
  sc.width = window.innerWidth;
  sc.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// ---- Cursor ----
let mx = 0,
  my = 0,
  rx = 0,
  ry = 0;
document.addEventListener("mousemove", (e) => {
  mx = e.clientX;
  my = e.clientY;
});
(function cl() {
  cur.style.left = mx + "px";
  cur.style.top = my + "px";
  rx += (mx - rx) * 0.13;
  ry += (my - ry) * 0.13;
  curRing.style.left = rx + "px";
  curRing.style.top = ry + "px";
  requestAnimationFrame(cl);
})();
document.querySelectorAll("button,a").forEach((el) => {
  el.addEventListener("mouseenter", () => curRing.classList.add("hovered"));
  el.addEventListener("mouseleave", () => curRing.classList.remove("hovered"));
});

// ---- State: 'idle' | 'playing' | 'exiting' ----
let gameState = "idle",
  score = 0,
  orbsEaten = 0;

// ---- Buffs ----
const BD = 2000;
let immuneUntil = 0,
  speedUntil = 0;
function isImmune() {
  return Date.now() < immuneUntil || frenzyActive();
}
function isSpeed() {
  return Date.now() < speedUntil || frenzyActive();
}
function grantImmune(ms) {
  immuneUntil = Date.now() + ms;
}
function grantSpeed(ms) {
  speedUntil = Date.now() + ms;
}
let iP = 0,
  sP = 0;

// ---- Frenzy ----
const FD = 5000,
  FC_N = 8;
let frenzyEnd = 0;
function frenzyActive() {
  return gameState === "playing" && Date.now() < frenzyEnd;
}

function drawFrenzyTimer() {
  if (!frenzyActive()) {
    ftDiv.classList.remove("on");
    return;
  }
  ftDiv.classList.add("on");
  const rem = Math.max(0, (frenzyEnd - Date.now()) / 1000),
    fr = rem / 5;
  const p = 0.5 + 0.5 * Math.sin(Date.now() * 0.01),
    cx = 36,
    cy = 36,
    R = 28;
  ftctx.clearRect(0, 0, 72, 72);
  ftctx.beginPath();
  ftctx.arc(cx, cy, R + 3, 0, Math.PI * 2);
  ftctx.fillStyle = "rgba(10,8,6,0.85)";
  ftctx.fill();
  ftctx.beginPath();
  ftctx.arc(cx, cy, R, 0, Math.PI * 2);
  ftctx.strokeStyle = "rgba(200,60,40,0.18)";
  ftctx.lineWidth = 3.5;
  ftctx.stroke();
  ftctx.beginPath();
  ftctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + fr * Math.PI * 2);
  ftctx.strokeStyle = `rgba(230,90,60,${0.75 + p * 0.25})`;
  ftctx.lineWidth = 3.5;
  ftctx.stroke();
  ftctx.save();
  ftctx.font = `500 18px 'DM Mono',monospace`;
  ftctx.fillStyle = `rgba(255,160,120,${0.9 + p * 0.1})`;
  ftctx.textAlign = "center";
  ftctx.textBaseline = "middle";
  ftctx.fillText(Math.ceil(rem), cx, cy);
  ftctx.restore();
}

function startFrenzy() {
  frenzyEnd = Date.now() + FD;
  frenzyOverlay.classList.add("on");
  orbs.length = 0;
  for (let i = 0; i < FC_N; i++) orbs.push(mkOrb());
}
function endFrenzy() {
  frenzyOverlay.classList.remove("on");
  ftDiv.classList.remove("on");
  orbs.length = 0;
  orbs.push(mkOrb());
  frenzyEnd = 0;
}

// ---- Snake ----
const N = 28,
  SL = 8,
  BS = 3.2,
  FS = 6.4;
const ORB_CHASE_R = (N * SL) / (2 * Math.PI);
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let snakeMode = "wander",
  oAngle = 0;

let wTarget = { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  wTimer = 0;
function newWander() {
  const p = 100;
  wTarget = {
    x: p + Math.random() * (window.innerWidth - p * 2),
    y: p + Math.random() * (window.innerHeight - p * 2),
  };
  wTimer = 220 + Math.random() * 220;
}
newWander();

const segs = Array.from({ length: N }, (_, i) => ({
  x: window.innerWidth / 2 - i * SL,
  y: window.innerHeight / 2,
  vx: 0,
  vy: 0,
}));

document.addEventListener("mousemove", (e) => {
  const dx = e.clientX - mouse.x,
    dy = e.clientY - mouse.y;
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  if (Math.sqrt(dx * dx + dy * dy) > 12 && snakeMode === "orbit")
    snakeMode = "chase";
});

// ---- Obstacles ----
let oRects = [];
function collectObs() {
  oRects = [];
  document
    .querySelectorAll(
      "nav,p,h1,h2,h3,li,button,.concept-card,.about-body,.quote-inner,footer,.hero-tagline,.hero-sub,.section-label,.divider-symbol,.emblem-symbol",
    )
    .forEach((el) => {
      if (
        [
          "btnPlay",
          "btnStop",
          "gameUI",
          "snakeCanvas",
          "cur",
          "curRing",
          "gameOverFlash",
          "frenzyOverlay",
          "frenzyTimer",
        ].includes(el.id)
      )
        return;
      const r = el.getBoundingClientRect();
      if (
        r.width < 4 ||
        r.height < 4 ||
        r.bottom < 0 ||
        r.top > window.innerHeight ||
        r.right < 0 ||
        r.left > window.innerWidth
      )
        return;
      oRects.push({ x: r.left, y: r.top, w: r.width, h: r.height });
    });
}
window.addEventListener("scroll", () => {
  if (gameState === "playing") collectObs();
});
window.addEventListener("resize", () => {
  if (gameState === "playing") collectObs();
});

// ---- Orbs ----
const OR_R = 12;
const orbs = [];
function mkOrb() {
  const r = Math.random();
  const type = r < 0.55 ? "normal" : r < 0.8 ? "shield" : "speed";
  for (let a = 0; a < 30; a++) {
    const p = 80,
      x = p + Math.random() * (window.innerWidth - p * 2),
      y = p + Math.random() * (window.innerHeight - p * 2);
    let b = false;
    for (const o of oRects) {
      if (
        x > o.x - OR_R * 2 &&
        x < o.x + o.w + OR_R * 2 &&
        y > o.y - OR_R * 2 &&
        y < o.y + o.h + OR_R * 2
      ) {
        b = true;
        break;
      }
    }
    if (!b)
      return { x, y, phase: Math.random() * Math.PI * 2, alive: true, type };
  }
  return {
    x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
    y: window.innerHeight / 2 + (Math.random() - 0.5) * 100,
    phase: 0,
    alive: true,
    type,
  };
}

// ---- Confetti ----
const conf = [];
function spawnConf() {
  conf.length = 0;
  for (let i = 0; i < 70; i++)
    conf.push({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 300,
      y: window.innerHeight / 2 + (Math.random() - 0.5) * 150,
      vx: (Math.random() - 0.5) * 6,
      vy: -3 - Math.random() * 5,
      alpha: 1,
      size: 2 + Math.random() * 5,
      col: "201,185,154",
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.2,
    });
}

// ---- Score popups ----
const pops = [];
function addPop(x, y, t, c) {
  pops.push({ x, y: y - 14, life: 1, t, c });
}
function bumpScore(p) {
  score += p;
  scoreLabel.textContent = `score · ${String(score).padStart(3, "0")}`;
  scoreLabel.classList.remove("pop");
  void scoreLabel.offsetWidth;
  scoreLabel.classList.add("pop");
}

function flickerTitle(html, ms) {
  const steps = 12,
    iv = ms / steps;
  let i = 0;
  const t = setInterval(() => {
    i++;
    if (i >= steps) {
      heroTitle.innerHTML = html;
      heroTitle.style.opacity = "1";
      clearInterval(t);
      return;
    }
    heroTitle.style.opacity = i % 2 === 0 ? "0.15" : "1";
  }, iv);
}

// ---- Stop / Game over ----
function doStop(go) {
  if (gameState === "exiting") return;
  gameState = "exiting";
  orbs.length = 0;
  frenzyEnd = 0;
  frenzyOverlay.classList.remove("on");
  ftDiv.classList.remove("on");
  gameUI.classList.add("hidden");
  if (go) {
    flash.classList.add("flash");
    setTimeout(() => flash.classList.remove("flash"), 200);
  }
  const fs = score;
  heroTitle.innerHTML = `${fs}`;
  heroTitle.style.opacity = "1";
  spawnConf();
  setTimeout(() => {
    flickerTitle("Oura<em>boros</em>", 900);
    setTimeout(() => {
      gameState = "idle";
      score = 0;
      orbsEaten = 0;
      scoreLabel.textContent = "score · 000";
      btnPlay.classList.remove("hidden");
      snakeMode = "wander";
      newWander();
    }, 900);
  }, 1400);
}

// ---- Buttons ----
btnPlay.addEventListener("click", () => {
  if (gameState !== "idle") return;
  gameState = "playing";
  score = 0;
  orbsEaten = 0;
  frenzyEnd = 0;
  scoreLabel.textContent = "score · 000";
  btnPlay.classList.add("hidden");
  gameUI.classList.remove("hidden");
  collectObs();
  orbs.length = 0;
  orbs.push(mkOrb());
  grantImmune(BD);
  snakeMode = "chase";
});
btnStop.addEventListener("click", () => {
  if (gameState !== "playing") return;
  doStop(false);
});
btnPlay.addEventListener("mouseenter", () => {
  btnPlay.classList.add("hovered");
  emblem.classList.add("hovering");
});
btnPlay.addEventListener("mouseleave", () => {
  btnPlay.classList.remove("hovered");
  emblem.classList.remove("hovering");
});
btnStop.addEventListener("mouseenter", () => btnStop.classList.add("hovered"));
btnStop.addEventListener("mouseleave", () =>
  btnStop.classList.remove("hovered"),
);

// ---- Tongue ----
function sR(i) {
  return 7 - (i / (N - 1)) * 5;
}
function sA(i) {
  return 0.88 - (i / (N - 1)) * 0.6;
}
let tO = 0,
  tPh = "idle",
  tT = 0;
function tickT() {
  tT++;
  if (tPh === "idle" && tT > 85) {
    tPh = "out";
    tT = 0;
  }
  if (tPh === "out") {
    tO = Math.min(1, tO + 0.1);
    if (tO >= 1) {
      tPh = "hold";
      tT = 0;
    }
  }
  if (tPh === "hold" && tT > 18) tPh = "in";
  if (tPh === "in") {
    tO = Math.max(0, tO - 0.1);
    if (tO <= 0) {
      tPh = "idle";
      tT = 0;
    }
  }
}
function drawT(hx, hy, ang) {
  if (tO <= 0) return;
  const l = 11 * tO,
    f = 5 * tO;
  const bx = hx + Math.cos(ang) * (sR(0) - 1),
    by = hy + Math.sin(ang) * (sR(0) - 1);
  const tx = bx + Math.cos(ang) * l,
    ty = by + Math.sin(ang) * l;
  const px = Math.cos(ang + Math.PI / 2),
    py = Math.sin(ang + Math.PI / 2);
  ctx.save();
  ctx.strokeStyle = `rgba(160,50,50,${0.75 * tO})`;
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx + px * f + Math.cos(ang) * 3, ty + py * f + Math.sin(ang) * 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - px * f + Math.cos(ang) * 3, ty - py * f + Math.sin(ang) * 3);
  ctx.stroke();
  ctx.restore();
}

// ---- Draw orb ----
function drawOrb(o) {
  if (!o.alive) return;
  o.phase += 0.04;
  const p = 0.7 + 0.3 * Math.sin(o.phase);
  const { x, y, type } = o;
  let co, mi, gl, inn;
  if (type === "normal") {
    co = `rgba(201,185,154,${0.75 * p})`;
    mi = `rgba(201,185,154,${0.18 * p})`;
    gl = `rgba(201,185,154,${0.07 * p})`;
    inn = `rgba(255,248,230,${0.55 * p})`;
  } else if (type === "shield") {
    co = `rgba(140,190,255,${0.75 * p})`;
    mi = `rgba(160,200,255,${0.25 * p})`;
    gl = `rgba(180,210,255,${0.1 * p})`;
    inn = `rgba(220,235,255,${0.6 * p})`;
  } else {
    co = `rgba(220,80,60,${0.8 * p})`;
    mi = `rgba(240,100,80,${0.3 * p})`;
    gl = `rgba(255,120,80,${0.1 * p})`;
    inn = `rgba(255,200,180,${0.6 * p})`;
  }
  ctx.beginPath();
  ctx.arc(x, y, OR_R * 2.8 * p, 0, Math.PI * 2);
  ctx.strokeStyle = gl;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, OR_R * 1.9, 0, Math.PI * 2);
  ctx.strokeStyle = mi;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, OR_R * p, 0, Math.PI * 2);
  ctx.fillStyle = co;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - OR_R * 0.3, y - OR_R * 0.3, OR_R * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = inn;
  ctx.fill();
  ctx.save();
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  if (type === "shield") {
    ctx.strokeStyle = `rgba(255,255,255,${0.35 * p})`;
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.lineTo(x + 3, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 3);
    ctx.lineTo(x, y + 3);
    ctx.stroke();
  } else if (type === "speed") {
    ctx.strokeStyle = `rgba(255,255,255,${0.4 * p})`;
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 4);
    ctx.lineTo(x - 1, y);
    ctx.lineTo(x + 1, y);
    ctx.lineTo(x - 2, y + 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPrey() {
  if (gameState !== "playing" || snakeMode === "orbit") return;
  const dx = segs[0].x - mouse.x,
    dy = segs[0].y - mouse.y;
  if (Math.sqrt(dx * dx + dy * dy) < 5) return;
  const a = 0.35 + 0.2 * Math.sin(Date.now() * 0.008);
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(201,185,154,${a})`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 6, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(201,185,154,${a * 0.3})`;
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

function drawSnake() {
  const im = isImmune(),
    sp = isSpeed(),
    fr = frenzyActive();
  const tl = immuneUntil - Date.now(),
    flk = im && !fr && tl < 500,
    fv = !flk || Math.floor(Date.now() / 80) % 2 === 0;
  iP += 0.12;
  sP += 0.15;
  const gP = 0.5 + 0.5 * Math.sin(iP),
    spP = 0.5 + 0.5 * Math.sin(sP);
  const hDx = segs[0].x - segs[1].x,
    hDy = segs[0].y - segs[1].y,
    ha = Math.atan2(hDy, hDx);
  if ((im || sp) && fv && gameState === "playing") {
    for (let i = N - 1; i >= 0; i--) {
      const r = sR(i),
        fd = Math.max(0, 1 - (i / (N - 1)) * 0.75);
      if (im) {
        ctx.beginPath();
        ctx.arc(segs[i].x, segs[i].y, r + 4 + gP * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(140,190,255,${(0.12 + gP * 0.18) * fd})`;
        ctx.fill();
      }
      if (sp) {
        ctx.beginPath();
        ctx.arc(segs[i].x, segs[i].y, r + 2 + spP * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,120,60,${(0.1 + spP * 0.15) * fd})`;
        ctx.fill();
      }
    }
    if (im) {
      ctx.beginPath();
      ctx.arc(segs[0].x, segs[0].y, sR(0) + 8 + gP * 5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(140,190,255,${0.3 + gP * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (sp) {
      ctx.beginPath();
      ctx.arc(segs[0].x, segs[0].y, sR(0) + 5 + spP * 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,120,60,${0.3 + spP * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  const idleAlpha = gameState === "idle" ? 0.5 : 1;
  for (let i = N - 1; i >= 0; i--) {
    const r = sR(i),
      a = sA(i) * idleAlpha;
    let bc;
    if (fr) bc = i % 3 === 0 ? `rgba(180,80,60,${a})` : `rgba(140,50,40,${a})`;
    else if (im && sp)
      bc = i % 3 === 0 ? `rgba(120,120,160,${a})` : `rgba(90,90,130,${a})`;
    else if (im)
      bc = i % 3 === 0 ? `rgba(90,115,155,${a})` : `rgba(70,90,125,${a})`;
    else if (sp)
      bc = i % 3 === 0 ? `rgba(140,70,40,${a})` : `rgba(110,50,30,${a})`;
    else bc = i % 3 === 0 ? `rgba(80,62,38,${a})` : `rgba(58,46,28,${a})`;
    ctx.beginPath();
    ctx.arc(segs[i].x, segs[i].y, r, 0, Math.PI * 2);
    ctx.fillStyle = bc;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(segs[i].x - r * 0.2, segs[i].y - r * 0.25, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(201,185,154,${a * 0.08})`;
    ctx.fill();
  }
  const ex = Math.cos(ha + 0.6) * sR(0) * 0.55,
    ey = Math.sin(ha + 0.6) * sR(0) * 0.55;
  ctx.beginPath();
  ctx.arc(segs[0].x + ex, segs[0].y + ey, 1.6, 0, Math.PI * 2);
  ctx.fillStyle = "#0a0806";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(segs[0].x + ex + 0.3, segs[0].y + ey - 0.3, 0.6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(201,185,154,0.7)";
  ctx.fill();
  drawT(segs[0].x, segs[0].y, ha);
}

function drawPops() {
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    p.y -= 1.5;
    p.life -= 0.022;
    if (p.life <= 0) {
      pops.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.font = `300 12px 'DM Mono',monospace`;
    ctx.fillStyle = p.c;
    ctx.textAlign = "center";
    ctx.fillText(p.t, p.x, p.y);
    ctx.restore();
  }
}

function drawConf() {
  for (let i = conf.length - 1; i >= 0; i--) {
    const c = conf[i];
    c.x += c.vx;
    c.y += c.vy;
    c.vy += 0.13;
    c.rot += c.rotV;
    c.alpha -= 0.011;
    if (c.alpha <= 0) {
      conf.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = c.alpha;
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.fillStyle = `rgba(${c.col},${c.alpha})`;
    ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
    ctx.restore();
  }
}

// ---- Collisions ----
function checkOrbs() {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    if (!o.alive) continue;
    const dx = segs[0].x - o.x,
      dy = segs[0].y - o.y;
    if (Math.sqrt(dx * dx + dy * dy) < sR(0) + OR_R * 0.9) {
      o.alive = false;
      orbsEaten++;
      const tf = orbsEaten % 10 === 0 && !frenzyActive();
      if (o.type === "shield") {
        grantImmune(BD);
        bumpScore(5);
        addPop(o.x, o.y, "shield! +5", "rgba(180,210,255,1)");
      } else if (o.type === "speed") {
        grantSpeed(BD);
        bumpScore(5);
        addPop(o.x, o.y, "speed! +5", "rgba(255,140,100,1)");
      } else {
        bumpScore(10);
        addPop(o.x, o.y, "+10", "#c9b99a");
      }
      if (tf) {
        startFrenzy();
        addPop(o.x, o.y - 24, "frenzy!", "rgba(255,120,80,1)");
      }
      orbs.splice(i, 1);
      if (!frenzyActive()) {
        setTimeout(() => {
          if (gameState === "playing" && !frenzyActive()) orbs.push(mkOrb());
        }, 600);
      }
    }
  }
}

function checkWalls() {
  if (isImmune()) return;
  const hx = segs[0].x,
    hy = segs[0].y,
    hr = sR(0);
  for (const r of oRects) {
    const cx = Math.max(r.x, Math.min(hx, r.x + r.w)),
      cy = Math.max(r.y, Math.min(hy, r.y + r.h));
    const dx = hx - cx,
      dy = hy - cy;
    if (dx * dx + dy * dy < hr * hr) {
      doStop(true);
      return;
    }
  }
}

// ---- Update ----
function update() {
  if (
    gameState === "playing" &&
    frenzyEnd > 0 &&
    !frenzyActive() &&
    orbs.length === 0
  )
    endFrenzy();
  const sp = isSpeed(),
    cs = sp ? FS : BS;

  if (gameState === "idle") {
    wTimer--;
    if (wTimer <= 0) newWander();
    const dx = wTarget.x - segs[0].x,
      dy = wTarget.y - segs[0].y,
      d = Math.sqrt(dx * dx + dy * dy);
    if (d > 10) {
      segs[0].vx += (dx / d) * 0.22;
      segs[0].vy += (dy / d) * 0.22;
    } else {
      wTimer = 0;
    }
    const spd = Math.sqrt(segs[0].vx * segs[0].vx + segs[0].vy * segs[0].vy);
    if (spd > 1.6) {
      segs[0].vx = (segs[0].vx / spd) * 1.6;
      segs[0].vy = (segs[0].vy / spd) * 1.6;
    }
    segs[0].vx *= 0.94;
    segs[0].vy *= 0.94;
    segs[0].x += segs[0].vx;
    segs[0].y += segs[0].vy;
  } else if (gameState === "exiting") {
    const tx = window.innerWidth / 2,
      ty = window.innerHeight + 200;
    const dx = tx - segs[0].x,
      dy = ty - segs[0].y,
      d = Math.sqrt(dx * dx + dy * dy);
    if (d > 1) {
      segs[0].vx = (dx / d) * 9;
      segs[0].vy = (dy / d) * 9;
    }
    segs[0].x += segs[0].vx;
    segs[0].y += segs[0].vy;
  } else {
    const hdx = mouse.x - segs[0].x,
      hdy = mouse.y - segs[0].y,
      hd = Math.sqrt(hdx * hdx + hdy * hdy);
    if (snakeMode === "chase") {
      if (hd < ORB_CHASE_R + 6) {
        snakeMode = "orbit";
        oAngle = Math.atan2(segs[0].y - mouse.y, segs[0].x - mouse.x);
      } else {
        const spd = Math.min(hd, cs);
        segs[0].vx = (hdx / hd) * spd;
        segs[0].vy = (hdy / hd) * spd;
        segs[0].x += segs[0].vx;
        segs[0].y += segs[0].vy;
      }
    }
    if (snakeMode === "orbit") {
      oAngle += sp ? 0.07 : 0.038;
      const tx = mouse.x + Math.cos(oAngle) * ORB_CHASE_R,
        ty = mouse.y + Math.sin(oAngle) * ORB_CHASE_R;
      segs[0].vx += (tx - segs[0].x) * 0.28;
      segs[0].vy += (ty - segs[0].y) * 0.28;
      segs[0].vx *= 0.72;
      segs[0].vy *= 0.72;
      segs[0].x += segs[0].vx;
      segs[0].y += segs[0].vy;
    }
    checkOrbs();
    checkWalls();
  }

  for (let i = 1; i < N; i++) {
    const fx = segs[i - 1].x - segs[i].x,
      fy = segs[i - 1].y - segs[i].y,
      d = Math.sqrt(fx * fx + fy * fy);
    if (d > SL) {
      const s = (d - SL) * 0.45;
      segs[i].vx += (fx / d) * s;
      segs[i].vy += (fy / d) * s;
    }
    const dmp = 0.65 - (i / N) * 0.12;
    segs[i].vx *= dmp;
    segs[i].vy *= dmp;
    segs[i].x += segs[i].vx;
    segs[i].y += segs[i].vy;
  }
  tickT();
}

// ---- Loop ----
function loop() {
  ctx.clearRect(0, 0, sc.width, sc.height);
  update();
  drawFrenzyTimer();
  if (gameState === "playing") {
    ctx.save();
    ctx.strokeStyle = "rgba(201,185,154,0.06)";
    ctx.lineWidth = 1;
    for (const r of oRects) ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.restore();
    for (const o of orbs) drawOrb(o);
    drawPrey();
  }
  drawSnake();
  drawPops();
  drawConf();
  requestAnimationFrame(loop);
}
loop();
