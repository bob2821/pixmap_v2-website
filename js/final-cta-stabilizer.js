/* Final CTA safety helper.
   Keeps the OP2 -> final CTA -> footer flow intact without observing or
   rewriting the same element repeatedly. This avoids browser freeze loops. */

(function () {
  'use strict';

  var finalCta = document.getElementById('finalCta');
  if (!finalCta) return;

  function keepFinalCtaVisible() {
    finalCta.classList.add('revealed');
    finalCta.style.opacity = '1';
    finalCta.style.visibility = 'visible';
    finalCta.style.transition = 'none';
  }

  // Run once after scripts load. The main OP2 scroll flow remains controlled
  // by op1-scene.js; this file only prevents the final CTA from being hidden.
  keepFinalCtaVisible();

  window.addEventListener('pageshow', keepFinalCtaVisible, { passive: true });
}());
