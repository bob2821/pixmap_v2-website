/* ============================================================
   PRELOADER & HERO REVEAL SEQUENCE
   Controls the staged intro: loader → logo → bg → header → copy
   ============================================================ */

(function () {
  'use strict';

  /* ---- Element references ---- */
  const preloader  = document.getElementById('preloader');
  const header     = document.querySelector('.site-header');
  const logo3d     = document.getElementById('logo3d');
  const heroCopyL  = document.getElementById('heroCopyL');
  const heroCopyR  = document.getElementById('heroCopyR');

  /* ---- Split each sentence into staggered word spans, preserving <br> ---- */
  /* 0.07s gap between words — tight enough to feel like a smooth wave */
  var ACCENT_WORDS = ['pixmap', 'led', 'production-ready', 'unified', 'workspace', 'complex', 'visual', 'experiences', 'media', 'servers'];

  [heroCopyL, heroCopyR].forEach(function (el) {
    if (!el) return;
    var segments = el.innerHTML.split(/<br\s*\/?>/i);
    var wordIdx  = 0;
    var html = segments.map(function (seg) {
      var words = seg.trim().split(/\s+/).filter(Boolean);
      return words.map(function (word) {
        var bare  = word.replace(/[^a-zA-Z-]/g, '').toLowerCase();
        var color = ACCENT_WORDS.indexOf(bare) !== -1
                    ? ' style="animation-delay:' + (wordIdx * 0.07).toFixed(2) + 's;color:#3BA1E1;"'
                    : ' style="animation-delay:' + (wordIdx * 0.07).toFixed(2) + 's;"';
        wordIdx++;
        return '<span class="word"' + color + '>' + word + '</span>';
      }).join(' ');
    }).join('<br>');
    el.innerHTML = html;
  });

  /* ---- Shared state (read by scroll-story.js) ---- */
  window.PIXMAP = window.PIXMAP || {};
  window.PIXMAP.copyVisible = false;

  /* ---- Return from subpage bypass ---- */
  if (sessionStorage.getItem('comingFromSubpage') === 'true') {
    if (preloader) preloader.remove();
    document.body.classList.remove('loading');
    document.body.classList.add('bg-on');
    if (header) header.classList.add('reveal');
    if (logo3d) {
      logo3d.classList.add('reveal');
      logo3d.style.animation = 'none';
    }
    window.PIXMAP.copyVisible = true;
    if (heroCopyL) heroCopyL.classList.add('reveal');
    if (heroCopyR) heroCopyR.classList.add('reveal');
    return;
  }

  /* ---- Reveal sequence ---- */
  setTimeout(function () {

    /* 1. Squares shrink away one by one */
    preloader.classList.add('shrink');

    setTimeout(function () {

      /* 2. Fade out preloader overlay */
      preloader.classList.add('fade-out');
      document.body.classList.remove('loading');
      preloader.addEventListener('transitionend', function () {
        preloader.remove();
      }, { once: true });

      /* 3. Hero logo grows from the shrinking squares */
      logo3d.classList.add('reveal');

    }, 1200); /* fires the moment squares hit ~3 px */

    /* 4. Background fades in */
    setTimeout(function () {
      document.body.classList.add('bg-on');
    }, 2000);

    /* 5. Header slides down */
    setTimeout(function () {
      header.classList.add('reveal');
    }, 2600);

    /* 6. Hero copy appears — words wave in left to right
          Fires 3.5s into the outer timer = 4000 + 3500 = 7500ms total */
    setTimeout(function () {
      window.PIXMAP.copyVisible = true;
      if (heroCopyL) heroCopyL.classList.add('reveal');
      if (heroCopyR) heroCopyR.classList.add('reveal');
      /* Stays visible permanently; scroll-story.js fades it on scroll */
    }, 3500);

  }, 4000); /* loader plays for 4 s */

}());
