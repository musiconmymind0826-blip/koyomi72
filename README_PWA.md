// ============================================================
// particles.js — 季節の粒子（Canvasアニメーション）
// fireflies/petals/rain/snow/leaves/mist/light/stars/golddust
// 風のひと吹き(gust)で横に流れる
// ============================================================

const COUNTS = { fireflies: 16, petals: 22, snow: 30, rain: 30, leaves: 16,
  mist: 6, light: 14, stars: 40, golddust: 10 };
const rnd = (a, b) => a + Math.random() * (b - a);

class ParticleSystem {
  constructor(type, accent, W, H) {
    this.type = type; this.accent = accent; this.W = W; this.H = H;
    this.gust = 0;            // -1..1 外から設定
    this.init();
  }
  resize(W, H) { this.W = W; this.H = H; this.init(); }
  init() {
    const { W, H } = this;
    const n = COUNTS[this.type] || 12;
    this.ps = Array.from({ length: n }, () => this.spawn());
    // golddustは常駐で別管理
    this.gold = Array.from({ length: COUNTS.golddust }, () => this.spawnGold());
  }
  spawn() {
    const { W, H } = this; const t = this.type;
    const base = { x: rnd(0, W), y: rnd(0, H), seed: rnd(0, 1000) };
    if (t === 'fireflies') return { ...base, vx: rnd(-8, 8), vy: rnd(-12, -3), g: rnd(0, 1), gs: rnd(0.6, 1.4) };
    if (t === 'rain') return { ...base, y: rnd(-H, H), spd: rnd(620, 1000), len: rnd(28, 48) };
    if (t === 'petals' || t === 'leaves') return { ...base, y: rnd(-H, H), spd: rnd(40, 95), sway: rnd(20, 60), rot: rnd(0, 6.28), vr: rnd(-2, 2), size: rnd(7, 14) };
    if (t === 'snow') return { ...base, y: rnd(-H, H), spd: rnd(28, 70), sway: rnd(12, 40), size: rnd(2.5, 6) };
    if (t === 'mist') return { ...base, y: rnd(H * 0.1, H * 0.9), w: rnd(W * 0.6, W * 1.2), h: rnd(40, 110), spd: rnd(6, 16), o: rnd(0.04, 0.1) };
    if (t === 'stars') return { ...base, size: rnd(1, 2.6), tw: rnd(0, 6.28), ts: rnd(1.5, 4) };
    return { ...base, y: rnd(0, H), spd: rnd(20, 55), size: rnd(2, 6), o: rnd(0.15, 0.5) }; // light
  }
  spawnGold() {
    const { W, H } = this;
    return { x: rnd(0, W), y: rnd(0, H), spd: rnd(14, 40), size: rnd(1.2, 3), o: rnd(0.2, 0.6), seed: rnd(0, 1000) };
  }
  step(ctx, dt, t) {
    const { W, H } = this; const gustX = this.gust * 30;
    const drawGold = (p) => {
      p.y -= p.spd * dt; if (p.y < -10) { p.y = H + 10; p.x = rnd(0, W); }
      ctx.globalAlpha = p.o * (0.6 + 0.4 * Math.sin(t * 0.002 + p.seed));
      ctx.fillStyle = '#e3c878';
      ctx.beginPath(); ctx.arc(p.x + gustX * 0.6, p.y, p.size, 0, 6.28); ctx.fill();
    };

    for (const p of this.ps) this.drawOne(ctx, p, dt, t, gustX);
    for (const p of this.gold) drawGold(p);
    ctx.globalAlpha = 1;
  }
  drawOne(ctx, p, dt, t, gustX) {
    const { W, H } = this; const type = this.type;
    if (type === 'fireflies') {
      p.x += (p.vx + gustX * 0.4) * dt; p.y += p.vy * dt;
      p.g += p.gs * dt * (Math.sin(t * 0.001 + p.seed) > 0 ? 1 : -1);
      if (p.g < 0) p.g = 0; if (p.g > 1) p.g = 1;
      if (p.y < -20 || p.x < -20 || p.x > W + 20) { Object.assign(p, this.spawn(), { y: H + 10 }); }
      const a = p.g;
      ctx.globalAlpha = a * 0.3; ctx.fillStyle = '#d8ff9a';
      ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, 6.28); ctx.fill();
      ctx.globalAlpha = a; ctx.fillStyle = '#eaffb0';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 6.28); ctx.fill();
    } else if (type === 'rain') {
      p.y += p.spd * dt; p.x += gustX * 0.3 * dt;
      if (p.y > H + 40) { p.y = -40; p.x = rnd(0, W); }
      ctx.globalAlpha = 0.4; ctx.strokeStyle = '#bcd6ea'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 3, p.y + p.len); ctx.stroke();
    } else if (type === 'petals' || type === 'leaves') {
      p.y += p.spd * dt; p.rot += p.vr * dt;
      const sx = Math.sin(t * 0.001 + p.seed) * p.sway;
      if (p.y > H + 30) { p.y = -30; p.x = rnd(0, W); }
      ctx.save(); ctx.globalAlpha = 0.85;
      ctx.translate(p.x + sx + gustX, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = this.accent;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.5, p.size * (type === 'petals' ? 0.38 : 0.5), 0, 0, 6.28);
      ctx.fill(); ctx.restore();
    } else if (type === 'snow') {
      p.y += p.spd * dt;
      const sx = Math.sin(t * 0.0008 + p.seed) * p.sway;
      if (p.y > H + 20) { p.y = -20; p.x = rnd(0, W); }
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#f2f7fc';
      ctx.beginPath(); ctx.arc(p.x + sx + gustX, p.y, p.size, 0, 6.28); ctx.fill();
    } else if (type === 'mist') {
      p.x += (p.spd + gustX) * dt * 0.4; if (p.x > W) p.x = -p.w;
      ctx.globalAlpha = p.o; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.w / 2, p.h / 2, 0, 0, 6.28); ctx.fill();
    } else if (type === 'stars') {
      p.tw += p.ts * dt;
      ctx.globalAlpha = 0.3 + 0.6 * Math.abs(Math.sin(p.tw));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.28); ctx.fill();
    } else { // light
      p.y -= p.spd * dt; if (p.y < -10) { p.y = H + 10; p.x = rnd(0, W); }
      ctx.globalAlpha = p.o; ctx.fillStyle = this.accent;
      ctx.beginPath(); ctx.arc(p.x + gustX * 0.5, p.y, p.size, 0, 6.28); ctx.fill();
    }
  }
}
