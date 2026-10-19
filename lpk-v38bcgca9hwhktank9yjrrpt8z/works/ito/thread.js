// 糸の形・配置は静止版 q20261019-06 と同じ。変えたのは「見せ方」だけ。
// ・糸は8本の区間を「1本の長さ」として順に伸ばす。区間の終わり（モチーフ）では、少しの長さ（PAUSE）を使ってモチーフを出してから次へ進む
// ・スクロール位置から「目標の長さ」を出し、表示する長さは毎フレーム目標へなめらかに近づける（指数的な追従＋1フレームの上限）
//   → 糸先が飛ばない・止めると自然に追いついて止まる・逆スクロールでも跳ね返らない（行き過ぎない）
// ・モチーフ（絵と、絵につながる短い糸）は、糸先が届く直前に透明度とぼかしで現れる。戻ると消える（ちらつかないよう、出る位置と消える位置をずらす）
// ・毛糸玉は糸の出発点なので最初から表示。文字は演出を待たずに最初から読める
// ・動きを減らす設定・JavaScriptなしでは、糸もモチーフも全部表示
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.querySelector('.thread'), page = document.querySelector('.page');
  if (!svg || !page) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var motion = !reduce.matches, reveals = [], runIndex = 0;
  var PAUSE = 150;      // モチーフの前後で使う長さ（px）。この間にモチーフが現れる
  var TAU = 0.16;       // 追従のやわらかさ（秒）。小さいほど速く追いつく
  var MAXV = 2600;      // 糸先のふだんの最高速度（px/秒）。横に長い線や大きな輪で、一気に進まないように
  var shown = 0, target = 0, last = 0, raf = 0;
  if (motion) page.classList.add('motion');

  // スクロール位置から「目標の長さ」：糸先を画面の上から72%の高さに合わせる。区間は順番に満たす
  function targetLength() {
    var pr = page.getBoundingClientRect(), vh = window.innerHeight;
    var tip = -pr.top + vh * 0.72, acc = 0;
    if (window.scrollY + vh >= document.documentElement.scrollHeight - 4) tip = Infinity;
    for (var i = 0; i < reveals.length; i++) {
      var r = reveals[i], sm = r.samples, len;
      if (tip >= sm[sm.length - 1].y) { acc += r.L + (r.art ? PAUSE : 0); continue; }
      if (tip < sm[0].y) return acc;
      var lo = 0, hi = sm.length - 1;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (sm[mid].y <= tip) lo = mid; else hi = mid; }
      var k = sm[hi].y > sm[lo].y ? (tip - sm[lo].y) / (sm[hi].y - sm[lo].y) : 0;
      return acc + sm[lo].l + (sm[hi].l - sm[lo].l) * Math.max(0, Math.min(1, k));
    }
    return acc;
  }
  // 表示する長さを、各区間の糸とモチーフに配る
  function paint() {
    var acc = 0;
    reveals.forEach(function (r) {
      var len = Math.max(0, Math.min(r.L, shown - acc));
      var px = Math.round(len * 2) / 2;
      if (px !== r.px) { r.el.setAttribute('stroke-dashoffset', r.L - px); r.px = px; }
      if (r.art) {
        // 糸先が区間の終わりの 60px 手前に来たら出る。戻るときは 140px 手前まで下がったら消える（間をあけてちらつきを防ぐ）
        var d = shown - (acc + r.L);
        if (!r.on && d > -60) { r.on = true; r.art.classList.add('is-in'); }
        else if (r.on && d < -140) { r.on = false; r.art.classList.remove('is-in'); }
      }
      acc += r.L + (r.art ? PAUSE : 0);
    });
  }
  function tick(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    target = targetLength();
    var diff = target - shown;
    var step = diff * (1 - Math.exp(-dt / TAU));
    // 少しの遅れは上限速度でやわらかく、大きく遅れたとき（速いスクロール）は遅れに比例して速め、0.4秒ほどで追いつく
    var cap = Math.max(MAXV, Math.abs(diff) * 2.5) * dt;
    if (step > cap) step = cap; else if (step < -cap * 1.5) step = -cap * 1.5;   // 戻るときは少し速く
    shown += step;
    if (Math.abs(target - shown) < 0.5) shown = target;
    paint();
    if (shown !== target) raf = requestAnimationFrame(tick); else last = 0;
  }
  function wake() { if (motion && !raf) raf = requestAnimationFrame(tick); }
  function update() { if (motion) { paint(); wake(); } }
  function draw() {
    reveals = []; runIndex = 0;
    Array.prototype.forEach.call(document.querySelectorAll('.art.is-in'), function (a) { a.classList.remove('is-in'); });
    var sp = window.matchMedia('(max-width: 639px)').matches;
    var pr = page.getBoundingClientRect();
    var lane = sp ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lane')) / 2 - 2 : 0;
    svg.setAttribute('width', pr.width); svg.setAttribute('height', pr.height);
    svg.setAttribute('viewBox', '0 0 ' + pr.width + ' ' + pr.height);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var key = sp ? 'threadSp' : 'thread';
    var marks = document.querySelectorAll(sp ? '[data-thread-sp]' : '[data-thread]');
    var runs = [], cur = null;
    Array.prototype.forEach.call(marks, function (m) {
      if (!m.getClientRects().length) return;
      var r = m.getBoundingClientRect(), k = m.dataset[key];
      var p = { x: r.left - pr.left, y: r.top - pr.top, kind: k, tan: (m.dataset.tan || '').split(',').map(Number) };
      if (k === 'out') { cur = [p]; runs.push(cur); }
      else if (cur) { cur.push(p); if (k === 'in') { cur.endArt = m.closest('.art'); cur = null; } }
    });
    page.classList.add('has-thread');
    runs.forEach(function (pts) {
      if (pts.length < 2) return;
      if (sp) { var ea = pts.endArt; pts = viaLane(pts, lane); pts.endArt = ea; }
      var d = 'M' + pts[0].x + ' ' + pts[0].y;
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        var len = Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.45, k = sp ? 9 : 6;
        var c1 = i === 0 && p1.tan.length === 2 && !isNaN(p1.tan[0]) ? { x: p1.x + p1.tan[0] * len, y: p1.y + p1.tan[1] * len } : { x: p1.x + (p2.x - p0.x) / k, y: p1.y + (p2.y - p0.y) / k };
        var c2 = i === pts.length - 2 && p2.tan.length === 2 && !isNaN(p2.tan[0]) ? { x: p2.x + p2.tan[0] * len, y: p2.y + p2.tan[1] * len } : { x: p2.x - (p3.x - p1.x) / k, y: p2.y - (p3.y - p1.y) / k };
        d += ' C' + c1.x.toFixed(1) + ' ' + c1.y.toFixed(1) + ' ' + c2.x.toFixed(1) + ' ' + c2.y.toFixed(1) + ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
      }
      var g = document.createElementNS(NS, 'g');
      if (motion) {
        var id = 'reveal' + runIndex++, mask = document.createElementNS(NS, 'mask'), mp = document.createElementNS(NS, 'path');
        mask.setAttribute('id', id); mask.setAttribute('maskUnits', 'userSpaceOnUse');
        mask.setAttribute('x', 0); mask.setAttribute('y', 0); mask.setAttribute('width', pr.width); mask.setAttribute('height', pr.height);
        mp.setAttribute('d', d); mp.setAttribute('fill', 'none'); mp.setAttribute('stroke', '#fff'); mp.setAttribute('stroke-width', 16); mp.setAttribute('stroke-linecap', 'round');
        mask.appendChild(mp); svg.appendChild(mask); g.setAttribute('mask', 'url(#' + id + ')');
        // 長さごとの「伸びる位置」：下へ進む分はその高さ、横や上へ戻る分（輪など）も長さの35%ぶんは進んだことにして、
        // 一気に現れないようにする。最後に、その糸の上端〜下端の高さに収まるよう縮める（ジャンプなく、単調に増える）
        var L = mp.getTotalLength(), samples = [], env = -Infinity, v = 0, prevL = 0;
        for (var t = 0; t <= L + 6; t += 6) {
          var tl = Math.min(t, L), q = mp.getPointAtLength(tl);
          if (env === -Infinity) { env = q.y; v = q.y; }
          else { v += Math.max(q.y - env, 0.35 * (tl - prevL)); env = Math.max(env, q.y); }
          prevL = tl; samples.push({ l: tl, y: v });
        }
        var y0 = samples[0].y, v1 = samples[samples.length - 1].y, k0 = v1 > y0 ? (env - y0) / (v1 - y0) : 1;
        samples.forEach(function (sm) { sm.y = y0 + (sm.y - y0) * k0; });
        mp.setAttribute('stroke-dasharray', L + ' ' + (L + 20));
        reveals.push({ el: mp, L: L, samples: samples, px: -1, art: pts.endArt || null, on: false });
      }
      svg.appendChild(g);
      [['#d46a4c', 7, null, 'round', 1], ['#a8472f', 7, '1.4 3.6', 'butt', 0.7], ['#f2a283', 1.6, '6 5', 'round', 0.8]].forEach(function (s) {
        var p = document.createElementNS(NS, 'path');
        p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', s[0]); p.setAttribute('stroke-width', s[1]);
        if (s[2]) p.setAttribute('stroke-dasharray', s[2]);
        p.setAttribute('stroke-linecap', s[3]); p.setAttribute('opacity', s[4]);
        g.appendChild(p);
      });
    });
    update();
  }
  // スマホ：出口の真下へ少し下りてから左端の通り道へ入り、ゆるく揺れながら下って、次の入口の真上から入る。
  // 糸は絵の上下の余白だけを横切るので、文字の上を通らない（via どうしの間は、そのまま輪を描く）
  function viaLane(pts, lane) {
    var out = [pts[0]];
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1];
      if (!(a.kind === 'via' && b.kind === 'via')) {
        var y1 = a.y + (a.kind === 'via' ? 0 : 26), y2 = b.y - (b.kind === 'via' ? 0 : 26);
        if (a.kind !== 'via') { out.push({ x: a.x, y: a.y + 14 }); out.push({ x: lane, y: y1 }); }
        for (var y = y1 + 160, n = 0; y < y2 - 80; y += 160, n++) out.push({ x: lane + (n % 2 ? 5 : -5), y: y });
        if (b.kind !== 'via') { out.push({ x: lane, y: Math.max(y2, y1 + 8) }); out.push({ x: b.x, y: b.y - 14 }); }
      }
      out.push(b);
    }
    return out.map(function (p) { return { x: p.x, y: p.y, kind: p.kind, tan: [] }; });
  }
  var t; function later() { clearTimeout(t); t = setTimeout(draw, 60); }
  window.addEventListener('scroll', wake, { passive: true });
  // 動きを減らす設定が途中で変わったら、描き直す（減らす設定なら全部表示）
  if (reduce.addEventListener) reduce.addEventListener('change', function () { motion = !reduce.matches; page.classList.toggle('motion', motion); draw(); });
  draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  window.addEventListener('load', draw);
  window.addEventListener('resize', later);
})();
