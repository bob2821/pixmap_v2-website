/* ============================================================
   FINAL CTA STABILIZER
   Keeps the OP2 → final CTA handoff consistent without changing
   the existing OP1/OP2 animation sequence.
   ============================================================ */

(function () {
  'use strict';

  var finalCta = document.getElementById('finalCta');
  var uspSection = document.getElementById('uspSection');
  var uspSticky = document.getElementById('uspSticky');
  var op1Scene = document.getElementById('op1Scene');
  var op1Overlay = document.getElementById('op1Overlay');
  var op1SentB = document.getElementById('op1SentB');

  if (!finalCta || !uspSection || !op1Scene) return;

  function normalizeFinalPosition() {
    var targetTop = 4;
    var rect = finalCta.getBoundingClientRect();

    /* If the CTA is sitting lower than expected, trim only the leftover
       scroll space before it. This removes the random blank gap while
       keeping the footer and CTA layout untouched. */
    if (rect.top > targetTop + 8) {
      var reduceBy = rect.top - targetTop;
      var nextHeight = Math.max(0, uspSection.offsetHeight - reduceBy);
      uspSection.style.height = nextHeight.toFixed(0) + 'px';
    }
  }

  function completeHandoff() {
    window.PIXMAP = window.PIXMAP || {};
    window.PIXMAP._postBExitDone = true;

    op1Scene.style.opacity = '0';
    op1Scene.style.visibility = 'hidden';
    op1Scene.style.transform = '';
    op1Scene.classList.remove('glow-active');

    document.querySelectorAll('.op1-panel').forEach(function (panel) {
      panel.classList.remove('visible');
      panel.style.opacity = '0';
    });

    if (op1Overlay) {
      op1Overlay.style.opacity = '0';
      op1Overlay.style.visibility = 'hidden';
    }
    if (op1SentB) {
      op1SentB.style.opacity = '0';
      op1SentB.style.visibility = 'hidden';
    }
    if (uspSticky) uspSticky.classList.remove('active');

    uspSection.style.height = (window.scrollY - uspSection.offsetTop + 4) + 'px';
    finalCta.classList.add('revealed');
    normalizeFinalPosition();
  }

  function check() {
    window.PIXMAP = window.PIXMAP || {};

    if (window.PIXMAP._postBExitDone) {
      if (finalCta.classList.contains('revealed')) normalizeFinalPosition();
      return;
    }

    var transform = op1Scene.style.transform || '';
    var isOp2ScrollingUp = transform.indexOf('calc(-50% -') !== -1;
    if (!isOp2ScrollingUp) return;

    /* Check after layout has applied, not inside the same scroll event that
       changes the transform. This avoids the inconsistent blank gap. */
    if (op1Scene.getBoundingClientRect().bottom <= 0) {
      completeHandoff();
    }
  }

  function frame() {
    check();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}());
