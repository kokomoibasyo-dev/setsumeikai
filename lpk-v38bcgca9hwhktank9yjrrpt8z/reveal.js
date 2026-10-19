// 作品の画像が、画面に入ったときに一度だけ浮かぶ（動きを減らす設定・JavaScriptなし・非対応のブラウザでは最初から表示）
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js');
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px' });
  Array.prototype.forEach.call(document.querySelectorAll('[data-reveal]'), function (el) { io.observe(el); });
})();
