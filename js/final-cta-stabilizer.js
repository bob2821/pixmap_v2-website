/* Final CTA scroll stabilizer.
   Keeps the OP2 -> final CTA -> footer flow intact while making the
   final sentence and Download button behave like a normal page section:
   no fade, no hide state, no delayed extra-scroll reveal, and no
   second-pass empty gap when scrolling back up and returning. */

(function () {
  'use strict';

  var finalCta = document.getElementById('finalCta');
  var uspSection = document.getElementById('uspSection');
  var finalCtaHasEntered = false;
  var alignedForCurrentHandoff = false;
  var wasPostBExitDone = false;

  if (!finalCta) return;

  function getHeaderHeight() {
    var root = getComputedStyle(document.documentElement);
    var fromVar = parseFloat(root.getPropertyValue('--header-h'));
    if (!isNaN(fromVar)) return fromVar;

    var header = document.querySelector('.site-header');
    return header ? header.offsetHeight : 72;
  }

  function keepFinalCtaVisible() {
    finalCta.classList.add('revealed');
    finalCta.style.opacity = '1';
    finalCta.style.visibility = 'visible';
    finalCta.style.transition = 'none';
  }

  function alignFinalCtaOnce() {
    if (!uspSection || alignedForCurrentHandoff) return;

    var targetTop = getHeaderHeight() + 24;
    var nextHeight = window.scrollY - uspSection.offsetTop + targetTop;

    // Set the handoff height from the current scroll position instead of
    // repeatedly subtracting from the existing height. This prevents the
    // CTA/footer area from collapsing into an empty gap on second visit.
    uspSection.style.height = Math.max(0, Math.round(nextHeight)) + 'px';
    alignedForCurrentHandoff = true;
  }

  function syncFinalCta() {
    var pixmap = window.PIXMAP || {};
    var postBExitDone = !!pixmap._postBExitDone;

    keepFinalCtaVisible();

    if (postBExitDone) {
      finalCtaHasEntered = true;
      alignFinalCtaOnce();
    }

    // When OP2 is reached again on reverse scroll, prepare for the next
    // forward handoff without hiding or changing the CTA itself.
    if (wasPostBExitDone && !postBExitDone) {
      alignedForCurrentHandoff = false;
    }

    if (finalCtaHasEntered) keepFinalCtaVisible();
    wasPostBExitDone = postBExitDone;
  }

  window.addEventListener('scroll', syncFinalCta, { passive: true });
  window.addEventListener('resize', syncFinalCta, { passive: true });

  var observer = new MutationObserver(function () {
    keepFinalCtaVisible();
  });

  observer.observe(finalCta, {
    attributes: true,
    attributeFilter: ['class', 'style']
  });

  syncFinalCta();
}());
