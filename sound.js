// ============================================================
// sound.js — 環境音（候ごと・クロスフェード・小音量）
// 自作合成のm4a 12種。RN版と同じ思想。
// ============================================================
const SOUND_NAMES = {
  stream: '川のせせらぎ', rain: '雨の音', storm: '夕立と遠雷',
  wind_soft: 'そよ風', wind_winter: '木枯らし', snow: '雪のしじま',
  birds: '小鳥のさえずり', frogs: '蛙の合唱', semi: '蝉しぐれ',
  higurashi: 'ひぐらし', insects: '虫の音', furin: '風鈴',
};

class SoundManager {
  constructor() {
    this.baseVol = 0.35; this.muted = false;
    this.key = null; this.cur = null; this.old = null;
    this.timer = null; this.started = false;
  }
  // 最初のユーザー操作後に呼ぶ（自動再生制限の回避）
  unlock() { this.started = true; if (this.key) this._fade(this.key); }

  play(key) {
    if (key === this.key) return;
    this.key = key;
    if (this.started) this._fade(key);
  }
  _fade(key) {
    const a = new Audio(`sounds/${key}.m4a`);
    a.loop = true; a.volume = 0;
    a.play().catch(() => {});
    if (this.old) { try { this.old.pause(); } catch (e) {} }
    this.old = this.cur; this.cur = a;
    if (this.timer) clearInterval(this.timer);
    const old = this.old, steps = 23; let t = 0;
    const target = this.muted ? 0 : this.baseVol;
    const fromV = old ? old.volume : 0;
    this.timer = setInterval(() => {
      t++; const k = Math.min(t / steps, 1);
      try { a.volume = target * k; if (old) old.volume = fromV * (1 - k); } catch (e) {}
      if (k >= 1) { clearInterval(this.timer); this.timer = null; if (old) { try { old.pause(); } catch (e) {} } }
    }, 60);
  }
  setMuted(m) {
    this.muted = m;
    try { if (this.cur) this.cur.volume = m ? 0 : this.baseVol; } catch (e) {}
  }
}
const soundManager = new SoundManager();
