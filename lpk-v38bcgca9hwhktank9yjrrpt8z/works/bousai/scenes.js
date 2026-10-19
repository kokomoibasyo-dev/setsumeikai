// 場面①②の動き（改善版）。
// 改善点：
// ・進み具合は「ばね（臨界減衰）」で目標に追いつく。動き出しはゆっくり加速し、止まるときはゆっくり減速して、行き過ぎない
//   （前の版は「差の一定割合だけ近づく」方式で、動き出しが急だった）
// ・ばねの速さに上限を付け、速くはじいても場面全体を最短 約2秒かけて進める（文字や写真が一瞬で切り替わらない）
// ・演出ごとの値は、さらに約0.15秒かけて目標へ近づける2段目のなめらかさを通す（速いスクロールでも1フレームで大きく変わらない）
// ・曲線は ease-in-out（sine）を基本にし、動き出しと止まり際をやわらかくした
// ・問いは2行を少しずらして浮かべ、そのあと「間」を置いてから、写真が場所を譲り、防災の情報が3段に分かれて浮かぶ
// 動きを減らす設定・JavaScriptなし・sticky 非対応では .motion を付けず、縦に並んだ読みものとして全部表示する
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var track = document.querySelector('[data-scenes]'), stage = track && track.querySelector('.stage');
  if (!track || !stage || !('CSS' in window) || !CSS.supports('position', 'sticky')) return;
  document.documentElement.classList.add('motion');

  var OMEGA = 6.5;     // ばねの固さ（大きいほど速く追いつく）。臨界減衰なので行き過ぎない
  var MAXV = 0.5;      // 進み具合の最高速度（1秒あたり）
  var x = 0, v = 0, raf = 0, last = 0;
  var clamp = function (t) { return t < 0 ? 0 : t > 1 ? 1 : t; };
  var lin = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var inOut = function (t) { return 0.5 - 0.5 * Math.cos(Math.PI * t); };
  var out = function (t) { return 1 - Math.pow(1 - t, 3); };
  function target() {
    var r = track.getBoundingClientRect(), span = track.offsetHeight - window.innerHeight;
    return span > 0 ? clamp(-r.top / span) : 0;
  }
  // 進み具合から、演出ごとの「目標の値」を出す
  function goals(p) {
    return {
      '--leave': out(lin(p, 0.03, 0.15)),
      '--open': inOut(lin(p, 0.06, 0.26)),
      '--zoom': inOut(lin(p, 0.14, 0.50)),
      '--q1': inOut(lin(p, 0.39, 0.51)),
      '--q2': inOut(lin(p, 0.45, 0.57)),
      '--split': inOut(lin(p, 0.62, 0.75)),
      '--t1': inOut(lin(p, 0.69, 0.81)),
      '--t2': inOut(lin(p, 0.75, 0.87)),
      '--t3': inOut(lin(p, 0.81, 0.92))
    };
  }
  // 2段目のなめらかさ：演出ごとの値も、目標へ約0.15秒かけて近づける（どの速さでスクロールしても、1フレームで大きく変わらない）
  var TAU2 = 0.15, cur = null, prev = {};
  function paint(p, dt) {
    var g = goals(p), busy = false;
    if (!cur || dt === 0) cur = g;
    for (var k in g) {
      if (dt > 0) { cur[k] += (g[k] - cur[k]) * (1 - Math.exp(-dt / TAU2)); if (Math.abs(g[k] - cur[k]) < 0.001) cur[k] = g[k]; else busy = true; }
      var n = Math.round(cur[k] * 1000) / 1000;
      if (prev[k] !== n) { stage.style.setProperty(k, n); prev[k] = n; }
    }
    return busy;
  }
  function tick(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    var t = target();
    // 小さな刻みに分けて計算する（低速端末で1フレームが長くても、ばねが乱れない）
    for (var s = 0, n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n; s < n; s++) {
      var a = OMEGA * OMEGA * (t - x) - 2 * OMEGA * v;
      v += a * h;
      if (v > MAXV) v = MAXV; else if (v < -MAXV) v = -MAXV;
      x += v * h;
    }
    if (Math.abs(t - x) < 0.0003 && Math.abs(v) < 0.0005) { x = t; v = 0; }
    var busy = paint(x, dt || 0.016);
    if (x !== t || v !== 0 || busy) raf = requestAnimationFrame(tick); else last = 0;
  }
  // 狭い画面では、最初に写真が見える高さ＝画面から文字の段の高さを引いたもの（写真と文字の間に隙間を作らない）
  var intro = stage.querySelector('.intro');
  function measure() { if (intro) stage.style.setProperty('--ih', Math.min(0.8, intro.offsetHeight / Math.max(1, stage.clientHeight)).toFixed(3)); }
  function wake() { if (!raf) raf = requestAnimationFrame(tick); }
  measure(); x = target(); paint(x, 0);
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', function () { measure(); wake(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();


// ===== 場面③④と参加案内：読み進めると浮かぶ・④の最初の一歩をつなぐ縦の線 =====
// ・各要素は画面の下から15%の位置まで来たら .in（時間で0.7秒かけて浮かぶ。スクロールの速さに関係なく一定）。一度出たら消さない（ちらつかない・読み返せる）
// ・④の縦の線は、手順の一覧が画面を通り過ぎる割合で伸びる。ばねで追いつく（①②と同じ考え方）
// ・動きを減らす設定・JavaScriptなし・IntersectionObserver 非対応では何も隠さない
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  var root = document.documentElement, items = document.querySelectorAll('[data-reveal]');
  root.classList.add('reveal-on');
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -15% 0px' });
  Array.prototype.forEach.call(items, function (el) { io.observe(el); });
  // ページ内リンクで飛んだ先・最初から画面に入っている要素は、待たずに出す
  window.addEventListener('hashchange', function () { var t = document.querySelector(location.hash); if (t) Array.prototype.forEach.call(t.querySelectorAll('[data-reveal]'), function (el) { el.classList.add('in'); }); });
  var steps = document.querySelector('.steps');
  if (!steps) return;
  steps.style.setProperty('--draw', 0);
  var x = 0, v = 0, raf = 0, last = 0, W = 6;
  function target() { var r = steps.getBoundingClientRect(), vh = window.innerHeight; var t = (vh * 0.75 - r.top) / Math.max(1, r.height); return t < 0 ? 0 : t > 1 ? 1 : t; }
  function tick(now) {
    raf = 0; var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; var t = target();
    for (var i = 0, n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n; i < n; i++) { v += (W * W * (t - x) - 2 * W * v) * h; x += v * h; }
    if (Math.abs(t - x) < 0.001 && Math.abs(v) < 0.001) { x = t; v = 0; }
    steps.style.setProperty('--draw', Math.max(x, 0).toFixed(3));
    if (x !== t || v) raf = requestAnimationFrame(tick); else last = 0;
  }
  function wake() { if (!raf) raf = requestAnimationFrame(tick); }
  window.addEventListener('scroll', wake, { passive: true }); wake();
})();


// ===== 場面④：いつもの道を、奥へ近づいていく =====
// ・写真の区間をどこまで読み進めたか（0→1）を、ばねで滑らかに追いかける（W=6.5。①②と同じ考え方：速いスクロールでも飛ばず、重すぎない）
// ・--ap：奥の一点へ寄る（0→1、始めと終わりをゆるやかに）。--dim：問いの直前に、写真が静かに暗くなる
// ・文は写真の上を普通に流れるので、演出を待たずに読める。動きを減らす設定・JavaScriptなしでは写真は動かない
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var sec = document.querySelector('.s4'), beats = sec && sec.querySelector('.s4__beats');
  if (!beats) return;
  var x = 0, v = 0, raf = 0, last = 0, W = 6.5;
  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function ease(t) { return 0.5 - 0.5 * Math.cos(Math.PI * clamp(t)); }
  function target() { var r = beats.getBoundingClientRect(), span = Math.max(1, beats.offsetHeight - window.innerHeight); return clamp(-r.top / span); }
  function paint(p) {
    sec.style.setProperty('--ap', ease((p - 0.04) / 0.8).toFixed(4));
    sec.style.setProperty('--dim', ease((p - 0.6) / 0.28).toFixed(4));
  }
  function tick(now) {
    raf = 0; var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; var t = target();
    for (var i = 0, n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n; i < n; i++) { v += (W * W * (t - x) - 2 * W * v) * h; x += v * h; }
    if (Math.abs(t - x) < 0.0005 && Math.abs(v) < 0.0005) { x = t; v = 0; }
    paint(x);
    if (x !== t || v) raf = requestAnimationFrame(tick); else last = 0;
  }
  function wake() { if (!raf) raf = requestAnimationFrame(tick); }
  x = target(); paint(x);
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', wake);
})();
