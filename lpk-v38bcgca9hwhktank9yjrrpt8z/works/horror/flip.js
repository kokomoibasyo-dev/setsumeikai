// 和本のページめくり v3：「ゆっくり持ち上がる → パラッとめくれる → 短く着地」
// ・持ち上げ（スクロールに連動）：読み進めた量の前半で、紙の角がゆっくり持ち上がる（ばねで追う。途中で止めればその角度で止まる）
// ・めくり（時間で動く）：持ち上がりが一定の角度（ここでは読み進めた量の半分）を超えたら、紙は自分の重さで一気に裏返る。約0.45秒。
//   最初は加速し、終わりの約2割で短く減速して着地する。戻るときは、その点より上へ戻したら同じ動きで逆に裏返り、持ち上がった状態へ
// ・境目では少し幅（ヒステリシス）を持たせ、境目で止めても行ったり来たりしない
// ・速くスクロールしても、待つのは裏返る0.45秒程度だけ。陰と照り返しは、紙の傾きと裏返る速さで濃くなる
// ・動きを減らす設定・JavaScriptなしでは何もしない（CSSが2つの見開きを縦に並べる）
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var root = document.documentElement, flip = document.getElementById('flip');
  if (!flip || !('CSS' in window) || !CSS.supports('clip-path', 'polygon(0 0,1px 0,1px 1px)')) return;
  root.classList.add('flip-on');
  var book = flip.querySelector('.book'), front = flip.querySelector('.pg--front'), under = flip.querySelector('.pg--under'), l2 = flip.querySelector('.pg--l2');
  var lights = flip.querySelectorAll('.l'), num = flip.querySelector('.lights__n');

  // 裏（次の見開きの左の頁）を複製して、右の頁と同じ箱に重ねる。中身は左右反転しておき、鏡に映したときに正しく読めるようにする
  var back = document.createElement('div'); back.className = 'back'; back.setAttribute('aria-hidden', 'true');
  var backIn = document.createElement('div'); backIn.className = 'back__in';
  var copy = l2.cloneNode(true); copy.classList.remove('pg--l2'); copy.classList.remove('pg--l'); copy.classList.add('pg--backface'); copy.style.visibility = 'visible'; copy.querySelectorAll('img').forEach(function (i) { i.alt = ''; });
  backIn.appendChild(copy); back.appendChild(backIn);
  var backShade = document.createElement('div'); backShade.className = 'shade'; back.appendChild(backShade);
  var frontShade = document.createElement('div'); frontShade.className = 'shade'; front.appendChild(frontShade);
  var cast = document.createElement('div'); cast.className = 'cast'; var castShade = document.createElement('div'); castShade.className = 'shade'; cast.appendChild(castShade);
  flip.querySelector('.spread--1').appendChild(back);
  flip.querySelector('.spread--2').appendChild(cast);

  var W = 0, H = 0, X0 = 0;
  function measure() {
    W = front.offsetWidth; H = front.offsetHeight; X0 = front.offsetLeft;
    [back, cast].forEach(function (el) { el.style.left = X0 + 'px'; el.style.width = W + 'px'; el.style.height = H + 'px'; });
  }

  // 半平面で四角形を切る（Sutherland–Hodgman）。f(P) >= 0 側を残す
  function clip(pts, f) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length], fa = f(a), fb = f(b);
      if (fa >= 0) out.push(a);
      if ((fa >= 0) !== (fb >= 0)) { var t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }
  function poly(pts) { return pts.length < 3 ? 'polygon(0 0,0 0,0 0)' : 'polygon(' + pts.map(function (p) { return p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px'; }).join(',') + ')'; }

  function paint(L, F, spd) {
    var rect = [[0, 0], [W, 0], [W, H], [0, H]], lift = L * (1 - F), ex = F, sp = Math.min(1, Math.abs(spd || 0) * 0.45);
    if (L <= 0.0005 && F <= 0.0005) {
      front.style.clipPath = 'none'; back.style.display = 'none'; cast.style.display = 'none'; frontShade.style.opacity = 0;
    } else {
      // 角 C の移る先 T：右下から左下へ、少し持ち上がる弧
      var Cx = W, Cy = H, Tx = W - 2 * W * ex - 0.24 * W * lift, Ty = H - H * 0.36 * lift - H * 0.08 * Math.sin(Math.PI * ex);
      var dx = Cx - Tx, dy = Cy - Ty, len = Math.hypot(dx, dy) || 1, nx = dx / len, ny = dy / len, Mx = (Cx + Tx) / 2, My = (Cy + Ty) / 2;
      var side = function (p) { return (p[0] - Mx) * nx + (p[1] - My) * ny; };
      front.style.clipPath = poly(clip(rect, function (p) { return -side(p); }));
      var turning = clip(rect, side);
      // 鏡映：x' = x − 2((x−M)·n)n
      var d = Mx * nx + My * ny, a = 1 - 2 * nx * nx, b = -2 * nx * ny, c2 = 1 - 2 * ny * ny;
      back.style.display = 'block'; back.style.clipPath = poly(turning);
      back.style.transform = 'matrix(' + a.toFixed(5) + ',' + b.toFixed(5) + ',' + b.toFixed(5) + ',' + c2.toFixed(5) + ',' + (2 * d * nx).toFixed(2) + ',' + (2 * d * ny).toFixed(2) + ')';
      cast.style.display = 'block'; cast.style.clipPath = poly(turning);
      // 陰：折り目に沿った帯。角度は折り目の向き
      var ang = Math.atan2(ny, nx) * 180 / Math.PI + 90, k = Math.max(Math.sin(Math.PI * ex), 0.6 * lift), thick = 50 + 170 * k + 90 * sp;
      var band = function (el, grad, op) {
        el.style.width = (W + H) * 3 + 'px'; el.style.height = thick + 'px';
        el.style.transform = 'translate(' + Mx + 'px,' + My + 'px) rotate(' + ang + 'deg) translate(-50%,-50%)';
        el.style.background = grad; el.style.opacity = op;
      };
      band(frontShade, 'linear-gradient(0deg,rgba(30,18,6,0) 0%,rgba(30,18,6,0) 50%,rgba(30,18,6,.7) 54%,rgba(30,18,6,0) 100%)', Math.min(1, k * 0.8 + sp * 0.35));
      band(castShade, 'linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0) 46%,rgba(0,0,0,.75) 50%,rgba(0,0,0,0) 100%)', Math.min(1, k * 0.85 + sp * 0.3));
      // 裏の照り返し（鏡に映る前の座標で、折り目の角側に）
      band(backShade, 'linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0) 50%,rgba(60,36,12,.55) 52%,rgba(255,236,200,.32) 64%,rgba(0,0,0,0) 100%)', Math.min(1, k * 0.9 + sp * 0.2));
    }
    // 灯：ほぼめくれたら一つ消える。周りの暗さ
    var out = ex > 0.85 ? 1 : 0;
    for (var i = 0; i < lights.length; i++) lights[i].classList.toggle('out', i < out);
    if (num) num.textContent = out ? '九' : '十';
    flip.style.setProperty('--e', ex.toFixed(4)); flip.style.setProperty('--l', L.toFixed(4));
  }

  // スクロールの進み p（0→1。始めと終わりに少し止まる区間）
  function progress() {
    var r = flip.getBoundingClientRect(), span = Math.max(1, flip.offsetHeight - window.innerHeight), p = -r.top / span;
    p = (p - 0.08) / 0.84; return p < 0 ? 0 : p > 1 ? 1 : p;
  }
  var PT = 0.5, HY = 0.03, D = 0.45;           // 裏返る点・境目の幅・裏返りの時間（秒）
  // 裏返りの時間の形：0〜0.8 は加速（紙が倒れていく）、0.8〜1 は短い減速（着地）
  function flipCurve(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t < 0.8 ? 0.88 * Math.pow(t / 0.8, 2.2) : 0.88 + 0.12 * (1 - Math.pow(1 - (t - 0.8) / 0.2, 2)); }
  var L = 0, lv = 0, F = 0, goal = 0, from = 0, t0 = 0, dur = 0, raf = 0, last = 0, WL = 9, prevF = 0;
  function tick(now) {
    raf = 0; var p = progress(), dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    // 持ち上げ：p の前半に連動（ばね）
    var lt = Math.min(1, p / PT);
    for (var i = 0, n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n; i < n; i++) { lv += (WL * WL * (lt - L) - 2 * WL * lv) * h; L += lv * h; }
    if (L < 0) { L = 0; lv = 0; } if (L > 1) { L = 1; lv = 0; }
    if (Math.abs(lt - L) < 0.0008 && Math.abs(lv) < 0.0008) { L = lt; lv = 0; }
    // めくり：境目を越えたら、時間で裏返る（戻るときは逆に）
    var g = p >= PT + HY ? 1 : p <= PT - HY ? 0 : goal;
    if (g !== goal) { goal = g; from = F; t0 = now; dur = D * Math.max(0.25, Math.abs(goal - F)); }
    if (F !== goal) {
      var u = (now - t0) / 1000 / dur, c = flipCurve(u);
      F = from + (goal - from) * c; if (u >= 1) F = goal;
    }
    var spd = dt > 0 ? (F - prevF) / dt : 0; prevF = F;
    paint(L, F, spd);
    if (L !== lt || lv || F !== goal) raf = requestAnimationFrame(tick); else last = 0;
  }
  function wake() { if (!raf) raf = requestAnimationFrame(tick); }
  measure(); (function () { var p = progress(); L = Math.min(1, p / PT); goal = F = prevF = p >= PT ? 1 : 0; paint(L, F, 0); })();
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', function () { measure(); paint(L, F, 0); wake(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); paint(L, F, 0); });
})();
