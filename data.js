// ============================================================
// app.js — こよみ七十二候 PWA 本体
// ============================================================
(function () {
  const now = new Date();
  const sessionSeed = Math.floor(Math.random() * 0xffffffff);
  const todayIndex = findCurrentIndex(now);
  let current = todayIndex;
  let muted = false;

  // DPR対応Canvas
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildCurrent();
  }

  // 現在候のシーン・粒子
  let spec = null, particles = null, goldSys = null;
  let gust = 0, gustPhase = 0, nextGust = 6000, gustT = 0;
  let ripples = [];

  function baseDateFor(i) {
    const ko = KO[i];
    return i === todayIndex ? now : new Date(now.getFullYear(), ko.m - 1, ko.d);
  }
  function buildCurrent() {
    const ko = KO[current], sekki = SEKKI[ko.s];
    spec = buildScene({ baseDate: baseDateFor(current), sessionSeed, sekki, now, W, H });
    particles = new ParticleSystem(ko.p, sekki.c[2], W, H);
    renderUI();
  }

  // 描画ループ
  let last = performance.now();
  function loop(t) {
    const dt = Math.min((t - last) / 1000, 0.05); last = t;

    // 風のひと吹き
    gustT += dt * 1000;
    if (gustT > nextGust) { gustPhase = 1.6; gustT = 0; nextGust = 9000 + Math.random() * 11000; }
    if (gustPhase > 0) { gustPhase -= dt; gust = Math.sin((1.6 - gustPhase) / 1.6 * Math.PI) * (gustPhase > 0 ? 1 : 0); }
    else gust = 0;
    if (particles) particles.gust = gust;

    // ゆっくりした視点移動（KenBurns風）
    const kb = Math.sin(t * 0.00012) * 0.5 + 0.5;
    const sc = 1.03 + kb * 0.035;
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
    ctx.translate((kb - 0.5) * 12, (0.5 - kb) * 8);

    if (spec) drawScene(ctx, spec);
    if (particles) particles.step(ctx, dt, t);

    // 風で金がきらめく
    if (gust > 0.02) {
      const g = ctx.createLinearGradient(0, H * 0.2, W, H * 0.8);
      g.addColorStop(0, 'rgba(217,182,103,0)');
      g.addColorStop(0.5, `rgba(217,182,103,${gust * 0.07})`);
      g.addColorStop(1, 'rgba(217,182,103,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();

    // 波紋（変形外で描く）
    ripples = ripples.filter((r) => {
      r.t += dt; const k = r.t / 0.95; if (k >= 1) return false;
      const rad = (0.15 + k * 2.75) * 65;
      ctx.globalAlpha = k < 0.15 ? k / 0.15 * 0.55 : (1 - k) * 0.55;
      ctx.strokeStyle = '#d9b667'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, 6.28); ctx.stroke();
      return true;
    });
    ctx.globalAlpha = 1;

    requestAnimationFrame(loop);
  }

  // UI（組版）
  const $ = (id) => document.getElementById(id);
  function renderUI() {
    const ko = KO[current], sekki = SEKKI[ko.s];
    // 枠ラベル
    const fc = '七十二候'.split('').map((c) => `<span class="fc">${c}</span>`).join('');
    const num = ('第' + kanjiNum(current + 1) + '候').split('').map((c) => `<span class="fc">${c}</span>`).join('');
    $('frame').innerHTML = fc + '<div class="div"></div>' + num +
      (current === todayIndex ? '<div id="today-mark">今日</div>' : '');
    // 題字
    const ts = ko.k.length <= 3 ? 68 : 56;
    const kanji = ko.k.split('').map((c) => `<div>${c}</div>`).join('');
    const ruby = ko.y.split('').map((c) => `<span>${c}</span>`).join('');
    $('title').style.setProperty('--ts', ts + 'px');
    $('title').innerHTML = `<div class="kanji">${kanji}</div><div class="ruby">${ruby}</div>`;
    // 解説・脇
    $('desc').textContent = ko.t;
    $('side').querySelector('.sekki').textContent = `${sekki.n}　${rangeLabel(current)}`;
    $('side').querySelector('.toki').textContent = `${spec.tod.n}の刻　${moonName(moonPhase(baseDateFor(current)))}`;
    // フッター
    $('fill').style.width = ((current + 1) / KO.length * 100) + '%';
    $('b-today').style.visibility = current === todayIndex ? 'hidden' : 'visible';
    $('b-sound').textContent = muted ? '♪ 消音中' : '♪ ' + (SOUND_NAMES[ko.snd] || '');
    $('b-sound').classList.toggle('off', muted);
    // 入場フェード
    ['frame', 'title', 'desc', 'hanko', 'side'].forEach((id, i) => {
      const el = $(id); el.classList.remove('in');
      setTimeout(() => el.classList.add('in'), 60 + i * 110);
    });
    // 音
    soundManager.play(ko.snd);
  }

  // ページ送り
  function go(i) {
    i = Math.max(0, Math.min(KO.length - 1, i));
    if (i === current) return;
    current = i;
    buildCurrent();
    if (navigator.vibrate) navigator.vibrate(8);
  }

  // スワイプ
  let sx = 0, sy = 0, swiping = false;
  const stage = document.getElementById('stage');
  stage.addEventListener('touchstart', (e) => {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiping = true;
  }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (!swiping) return; swiping = false;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      go(current + (dx < 0 ? 1 : -1));   // 左スワイプ=次へ
    } else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      // タップ=波紋
      addRipple(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
  }, { passive: true });

  // PC用：クリックで波紋、矢印キーで送り
  stage.addEventListener('click', (e) => {
    if (e.target.closest('.btn') || e.target.closest('#shiori')) return;
    addRipple(e.clientX, e.clientY);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(current - 1);
    if (e.key === 'ArrowRight') go(current + 1);
  });

  function addRipple(x, y) {
    ripples.push({ x, y, t: 0 });
    if (ripples.length > 5) ripples.shift();
    soundManager.unlock();
    if (navigator.vibrate) navigator.vibrate(5);
  }

  // ボタン
  $('b-today').addEventListener('click', (e) => { e.stopPropagation(); go(todayIndex); });
  $('b-sound').addEventListener('click', (e) => {
    e.stopPropagation(); soundManager.unlock();
    muted = !muted; soundManager.setMuted(muted); renderUI();
  });
  $('b-shiori').addEventListener('click', (e) => { e.stopPropagation(); openShiori(); });

  // 栞
  function openShiori() {
    const ko = KO[current], sekki = SEKKI[ko.s];
    $('sh-head').textContent = '栞　—　' + ko.k;
    const col = (title, body) =>
      `<div class="col"><div class="ct v">${title}</div><div class="cr"></div><div class="cb v">${body}</div></div>`;
    $('cols').innerHTML =
      col('候の花', ko.hana) + col('旬の味', ko.shun) +
      col('節気のこと', `${sekki.n}（${sekki.y}）。${sekki.t}`) +
      col('いまの音', SOUND_NAMES[ko.snd] || '');
    $('shiori').classList.add('on');
  }
  $('shiori').addEventListener('click', () => $('shiori').classList.remove('on'));

  // iOS Safari & 未インストール時のみ「ホーム追加」案内
  function maybeShowA2HS() {
    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (isiOS && !standalone && !localStorage.getItem('a2hs-dismissed')) {
      setTimeout(() => $('a2hs').classList.add('on'), 2500);
    }
  }
  $('a2hs-x').addEventListener('click', (e) => {
    e.stopPropagation(); $('a2hs').classList.remove('on');
    try { localStorage.setItem('a2hs-dismissed', '1'); } catch (e) {}
  });

  // 起動
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);
  maybeShowA2HS();

  // 最初のタップ/クリックで音を解錠
  const unlockOnce = () => { soundManager.unlock(); window.removeEventListener('pointerdown', unlockOnce); };
  window.addEventListener('pointerdown', unlockOnce);

  // Service Worker（オフライン動作）
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
