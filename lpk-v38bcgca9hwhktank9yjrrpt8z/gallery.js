/* Works gallery: native touch/trackpad scroll-snap works without JavaScript; buttons enhance desktop navigation. */
(() => {
  const track = document.getElementById('chooser-track');
  const prev = document.querySelector('[data-gallery-prev]');
  const next = document.querySelector('[data-gallery-next]');
  if (!track || !prev || !next) return;
  document.documentElement.classList.add('has-gallery-controls');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const update = () => {
    prev.disabled = track.scrollLeft < 4;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };
  const move = (direction) => {
    const item = track.querySelector('.chooser-card');
    if (!item) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({left: direction * (item.getBoundingClientRect().width + gap), behavior: reduceMotion.matches ? 'instant' : 'smooth'});
  };
  prev.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', update, {passive:true});
  window.addEventListener('resize', update);
  update();
})();
