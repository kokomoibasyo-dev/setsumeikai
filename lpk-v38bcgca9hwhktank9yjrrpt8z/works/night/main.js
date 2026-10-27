// 夜のマルシェ：(1)最初に灯りがともる (2)物語は「固定ステージ」：画面を一時的に固定し、スクロール量から
// 進み具合 --P（0〜4）を計算して、同じ画面の中で第1〜4コマを進める。戻ると巻き戻る。スクロールそのものは奪わない
// (3)第5コマ以降の見出しなどが一度だけ現れる
// 動きを減らす設定・JavaScript無効のときは、各コマを縦に並べた静止表示（すべて最終状態）になる
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  // 電球を電線に沿って並べる（装飾。読み上げの対象外）
  var path = document.querySelector('.wire'), box = document.querySelector('.bulbs');
  if (path && box) {
    var n = window.innerWidth < 768 ? 9 : 16, len = path.getTotalLength();
    for (var i = 0; i < n; i++) {
      var p = path.getPointAtLength(len * (i + 0.5) / n), b = document.createElement('span');
      b.className = 'bulb'; b.style.left = (p.x / 1200 * 100) + '%'; b.style.top = (p.y / 160 * 100) + '%'; b.style.setProperty('--i', i);
      box.appendChild(b);
    }
  }
  if (reduce) return;

  // (1) 灯りがともる：一度だけ
  root.classList.add('lights-off');
  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('lights-on'); root.classList.remove('lights-off'); }); });

  // (2) 固定ステージ：物語エリアの上端が画面上端に来てから、下端が画面下端に来るまでを 0〜4 に対応させる
  //     最後の少し（4%）は第4コマの最終場面のまま留め、余韻を残してから固定を解除する
  var story = document.querySelector('.story'), steps = document.querySelectorAll('.stage__prog li'), raf = 0, last = -1;
  if (story) {
    root.classList.add('stagejs');
    var paint = function () {
      raf = 0;
      var r = story.getBoundingClientRect(), run = r.height - window.innerHeight;
      var P = Math.max(0, Math.min(4, (-r.top / run) * 4.16));
      story.style.setProperty('--P', P.toFixed(3));
      var on = Math.min(3, Math.floor(P));
      if (on !== last) { steps.forEach(function (li, k) { li.classList.toggle('is-on', k === on); }); last = on; }
    };
    addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
    addEventListener('resize', paint); paint();
  }

  // (3) 情報が一度だけ現れる
  if (!('IntersectionObserver' in window)) return;
  root.classList.add('reveal');
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
})();
