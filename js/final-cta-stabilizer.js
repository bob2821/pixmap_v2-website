/* Final CTA scroll stabilizer.
   Keeps the OP2 -> final CTA -> footer flow intact while making the
   final sentence and Download button behave like a normal page section:
   no fade, no hide state, and no delayed extra-scroll reveal. */

(function () {
  'use strict';

  var finalCta = document.getElementById('finalCta');
  var uspSection = document.getElementById('uspSection');
  var finalCtaHasEntered = false;

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

  function alignFinalCtaIntoView() {
    if (!uspSection) return;

    var rect = finalCta.getBoundingClientRect();
    var targetTop = getHeaderHeight() + 24;

    // If OP2 has completed but the CTA is still pushed too far down,
    // shorten only the scroll container handoff height so the CTA enters
    // immediately and then continues naturally with the page.
    if (rect.top > targetTop + 8) {
      var currentHeight = uspSection.offsetHeight || 0;
      var reduceBy = rect.top - targetTop;
      uspSection.style.height = Math.max(0, currentHeight - reduceBy) + 'px';
    }
  }

  function syncFinalCta() {
    var pixmap = window.PIXMAP || {};

    if (pixmap._postBExitDone) {
      finalCtaHasEntered = true;
      keepFinalCtaVisible();
      alignFinalCtaIntoView();
      return;
    }

    // Once the final CTA has entered, never let any reverse-scroll state
    // hide it again. It should simply move up/down with the normal page.
    if (finalCtaHasEntered) keepFinalCtaVisible();
  }

  window.addEventListener('scroll', syncFinalCta, { passive: true });
  window.addEventListener('resize', syncFinalCta, { passive: true });

  var observer = new MutationObserver(function () {
    if (finalCtaHasEntered) keepFinalCtaVisible();
  });

  observer.observe(finalCta, {
    attributes: true,
    attributeFilter: ['class', 'style']
  });

  syncFinalCta();
}());
