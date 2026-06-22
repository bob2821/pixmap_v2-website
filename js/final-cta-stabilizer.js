/* Final CTA visibility helper.
   Keeps the OP2 -> final CTA -> footer flow intact while ensuring the
   final sentence and Download button have enough viewport space to appear. */

(function () {
  'use strict';

  var style = document.createElement('style');
  style.id = 'final-cta-viewport-fix';
  style.textContent = [
    '#finalCta {',
    '  min-height: calc(100vh - var(--header-h, 72px));',
    '  min-height: calc(100dvh - var(--header-h, 72px));',
    '  box-sizing: border-box;',
    '  padding-top: max(96px, calc(var(--header-h, 72px) + 48px));',
    '  padding-bottom: max(140px, 16vh);',
    '  scroll-margin-top: var(--header-h, 72px);',
    '}',
    '#finalCta.revealed {',
    '  opacity: 1;',
    '}'
  ].join('\n');

  document.head.appendChild(style);
}());
