// 体験型（exp/ だけ）：ヒーローの流れ星と、望遠鏡をのぞく疑似体験。外部通信なし・依存なし。
// 流れ星と瞬きは疑似演出（実際の天体の動きではない）。動きを減らす設定では流れ星・瞬き・広がる動きを省く
(() => {
  const hero = document.querySelector('.hero'), cta = hero?.querySelector('.cta');
  if (!hero || !cta) return;
  const rmq = matchMedia('(prefers-reduced-motion: reduce)');
  const rand = (a, b) => a + Math.random() * (b - a);
  let scopeOpen = false;

  // 流れ星を1つ流す（box の中、左上から右下の範囲を割合で指定）
  function meteor(box, area, len) {
    if (rmq.matches) return;
    const el = document.createElement('span'); el.className = 'meteor'; el.setAttribute('aria-hidden', 'true');
    const w = box.clientWidth, h = box.clientHeight;
    const x = rand(area[0], area[2]) * w, y = rand(area[1], area[3]) * h;
    const ang = rand(150, 165) * Math.PI / 180, dist = len * rand(.8, 1.2);     // 右上から左下へ
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist, deg = ang * 180 / Math.PI;
    el.style.width = Math.round(len * .6) + 'px';
    box.insertBefore(el, box.querySelector('.hero-in'));
    const a = el.animate([
      { transform: `translate(${x}px, ${y}px) rotate(${deg}deg) scaleX(.2)`, opacity: 0 },
      { opacity: 1, offset: .25 },
      { transform: `translate(${x + dx}px, ${y + dy}px) rotate(${deg}deg) scaleX(1)`, opacity: 0 }
    ], { duration: rand(500, 1000), easing: 'cubic-bezier(.3,.1,.6,1)' });
    a.onfinish = () => el.remove();
    return a;
  }

  // ---------- ① ヒーローの流れ星：見えてから5〜10秒後に1つ。その後は流れ終わってから5〜10秒後（見えている間だけ） ----------
  let timer = 0, visible = false;
  const stop = () => { clearTimeout(timer); timer = 0; };
  // 次の流れ星は、直前の1つが流れ終わってから5〜10秒後。タイマーは常に1つだけ、流れている間は次を予約しない
  let flying = null;
  const schedule = () => {
    stop();
    if (!visible || document.hidden || scopeOpen || rmq.matches || flying) return;
    timer = setTimeout(() => {
      timer = 0;
      if (!visible || document.hidden || scopeOpen) return;
      flying = meteor(hero, [.45, .04, .95, .3], 300);
      flying?.addEventListener('finish', () => { flying = null; schedule(); }, { once: true });
    }, rand(5000, 10000));
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? schedule() : stop(); }, { threshold: .4 }).observe(hero);
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : schedule(); });
  rmq.addEventListener('change', schedule);

  // ---------- ② 望遠鏡をのぞくボタン ----------
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'scope-open';
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 11.5l13-5 1.6 4.2-13 5z"/><path d="M17.6 6.2l2.6-1 1.1 3-2.6 1"/><path d="M10 14l-3.5 7M11.5 13.4l3 7.6"/></svg>望遠鏡をのぞいてみる';
  cta.after(btn);

  // 写真の望遠鏡（画像の中の位置。hero-photo の筒と三脚の上部）。文字やボタンに重なる幅では出さない
  const SPOT = { x0: .705, y0: .5, x1: .8, y1: .68 };
  const img = hero.querySelector('img.scene');
  const spot = document.createElement('button');
  spot.type = 'button'; spot.className = 'scope-spot'; spot.tabIndex = -1; spot.setAttribute('aria-hidden', 'true'); spot.title = '望遠鏡をのぞいてみる';
  hero.appendChild(spot);
  function placeSpot() {
    if (!img?.naturalWidth) { spot.hidden = true; return; }
    const W = hero.clientWidth, H = hero.clientHeight, s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const rw = img.naturalWidth * s, rh = img.naturalHeight * s, ox = W - rw, oy = (H - rh) * .6;   // theme.css の object-position: right 60%
    const r = { left: ox + SPOT.x0 * rw, top: oy + SPOT.y0 * rh, width: (SPOT.x1 - SPOT.x0) * rw, height: (SPOT.y1 - SPOT.y0) * rh };
    const hb = hero.getBoundingClientRect();
    // 文字の実際の広がり（段落の箱ではなく中身）と重なるか
    const ext = (c) => { const rg = document.createRange(); rg.selectNodeContents(c); return c.matches('.cta, .scope-open, .stop') ? c.getBoundingClientRect() : rg.getBoundingClientRect(); };
    const hit = [...hero.querySelectorAll('.hero-in > *')].some((c) => { const b = ext(c), L = b.left - hb.left - 8, T = b.top - hb.top - 8;
      return L < r.left + r.width && L + b.width + 16 > r.left && T < r.top + r.height && T + b.height + 16 > r.top; });
    spot.hidden = hit || r.width < 44 || r.left < 0 || r.top + r.height > H;
    Object.assign(spot.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  }
  img?.complete ? placeSpot() : img?.addEventListener('load', placeSpot);
  addEventListener('resize', placeSpot);

  // ---------- ③ 望遠鏡の視野 ----------
  const scope = document.createElement('div');
  scope.className = 'scope'; scope.hidden = true;
  scope.setAttribute('role', 'dialog'); scope.setAttribute('aria-modal', 'true'); scope.setAttribute('aria-labelledby', 'scope-title');
  scope.innerHTML = '<p class="scope-title" id="scope-title">望遠鏡の視野（イメージ）</p>'
    + '<div class="scope-view" tabindex="0" role="group" aria-label="星空の視野。矢印キーで見回せます"><div class="scope-sky"><img alt="" draggable="false"><div class="scope-tw"></div></div></div><span class="scope-ring" aria-hidden="true"></span>'
    + '<p class="scope-hint">ドラッグ・矢印キーで見回せます。イメージ映像です（実際の星の見え方ではありません）</p>'
    + '<button type="button" class="scope-close">閉じる</button>';
  (document.querySelector('main') ?? document.body).appendChild(scope);
  const view = scope.querySelector('.scope-view'), sky = scope.querySelector('.scope-sky'), skyImg = sky.querySelector('img'), tw = scope.querySelector('.scope-tw'), close = scope.querySelector('.scope-close');
  let px = 0, py = 0, sw = 0, sh = 0, d = 0, opener = null, mTimer = 0, loaded = false;

  function layout() {
    d = view.clientWidth; if (!skyImg.naturalWidth) return;
    const k = Math.max(d * 1.7 / skyImg.naturalWidth, d * 1.4 / skyImg.naturalHeight);   // 視野より大きく（見回せる余白）
    sw = skyImg.naturalWidth * k; sh = skyImg.naturalHeight * k;
    Object.assign(sky.style, { width: sw + 'px', height: sh + 'px' });
    move(0, 0);
  }
  function move(dx, dy) {
    px = Math.min(0, Math.max(d - sw, px + dx)); py = Math.min(0, Math.max(d - sh, py + dy));
    sky.style.transform = `translate(${px}px, ${py}px)`;
  }
  // 写真の中の明るい点を探して、そこを控えめに瞬かせる（読めなければ散らす）
  function twinkles() {
    let pts = [];
    try {
      const c = document.createElement('canvas'), W = 320, H = Math.round(320 * skyImg.naturalHeight / skyImg.naturalWidth);
      c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(skyImg, 0, 0, W, H);
      const D = g.getImageData(0, 0, W, H).data, L = (i) => D[i] * .3 + D[i + 1] * .59 + D[i + 2] * .11;
      for (let y = 2; y < H - 2; y += 1) for (let x = 2; x < W - 2; x += 1) {
        const i = (y * W + x) * 4, v = L(i); if (v < 60) continue;
        if (L(i - 4) > v || L(i + 4) > v || L(i - W * 4) > v || L(i + W * 4) > v) continue;
        pts.push([x / W, y / H, v]);
      }
      pts.sort((a, b) => b[2] - a[2]); pts = pts.slice(0, 160).sort(() => Math.random() - .5).slice(0, 45);   // 明るい星の中から選ぶ
    } catch { pts = Array.from({ length: 30 }, () => [Math.random(), Math.random()]); }
    tw.innerHTML = pts.map(([x, y]) => `<i style="left:${(x * 100).toFixed(2)}%;top:${(y * 100).toFixed(2)}%;--t:${rand(3, 6).toFixed(1)}s;--dl:${rand(0, 6).toFixed(1)}s"></i>`).join('');
  }
  skyImg.addEventListener('load', () => { loaded = true; layout(); px = (d - sw) / 2; py = (d - sh) / 2; move(0, 0); twinkles(); });

  const viewMeteors = (on) => {
    clearTimeout(mTimer);
    if (on) mTimer = setTimeout(function f() { if (!document.hidden) meteorIn(); mTimer = setTimeout(f, rand(7000, 15000)); }, rand(3000, 6000));
  };
  function meteorIn() {   // 視野の中の流れ星（視野と一緒には動かない）
    if (rmq.matches) return;
    const el = document.createElement('span'); el.className = 'meteor'; el.setAttribute('aria-hidden', 'true'); view.appendChild(el);
    const x = rand(.45, .9) * d, y = rand(.1, .45) * d, ang = rand(145, 170) * Math.PI / 180, dist = d * rand(.3, .45), deg = ang * 180 / Math.PI;
    el.animate([
      { transform: `translate(${x}px, ${y}px) rotate(${deg}deg) scaleX(.2)`, opacity: 0 }, { opacity: 1, offset: .25 },
      { transform: `translate(${x + Math.cos(ang) * dist}px, ${y + Math.sin(ang) * dist}px) rotate(${deg}deg) scaleX(1)`, opacity: 0 }
    ], { duration: rand(500, 900), easing: 'cubic-bezier(.3,.1,.6,1)' }).onfinish = () => el.remove();
  }

  function open() {
    opener = btn;   // 写真の望遠鏡から開いても、閉じた後はボタンに戻る
    if (!skyImg.src) skyImg.src = 'img/scope-sky.webp';
    scopeOpen = true; stop();
    document.documentElement.style.overflow = 'hidden';
    scope.hidden = false; view.classList.remove('wide');
    requestAnimationFrame(() => {
      scope.classList.add('on'); layout();
      const wide = () => view.classList.add('wide');
      rmq.matches ? wide() : setTimeout(wide, 300);   // 黒くなってから、小さな円が広がる
    });
    view.focus({ preventScroll: true });
    viewMeteors(true);
  }
  function shut() {
    scopeOpen = false; viewMeteors(false);
    scope.classList.remove('on'); view.classList.remove('wide');
    const done = () => { scope.hidden = true; document.documentElement.style.overflow = ''; opener?.focus({ preventScroll: true }); schedule(); };
    rmq.matches ? done() : setTimeout(done, 300);
  }
  btn.addEventListener('click', open); spot.addEventListener('click', open); close.addEventListener('click', shut);

  // 操作：ドラッグ（指・マウス）、矢印キー、Escape。タブは「視野」と「閉じる」の間だけを回る
  let drag = null;
  view.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; view.setPointerCapture(e.pointerId); view.classList.add('drag'); });
  view.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; move(e.clientX - drag.x, e.clientY - drag.y); drag.x = e.clientX; drag.y = e.clientY; });
  const end = () => { drag = null; view.classList.remove('drag'); };
  view.addEventListener('pointerup', end); view.addEventListener('pointercancel', end);
  scope.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  scope.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  scope.addEventListener('keydown', (e) => {
    const step = d * .08, k = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (e.key === 'Escape') { e.preventDefault(); shut(); }
    else if (k && document.activeElement === view) { e.preventDefault(); move(...k); }
    else if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === close ? view : close).focus(); }
  });
  addEventListener('resize', () => { if (scopeOpen && loaded) layout(); });
})();
