(() => {
  'use strict';
  const locales = {'en':'','fr':'fr','es':'es','pt':'pt','ru':'ru','zh-CN':'zh-cn'};
  const init = () => {
    const control = document.querySelector('.gsw-language');
    if (!control) return;
    const summary = control.querySelector('summary');
    const links = Array.from(control.querySelectorAll('a[data-language]'));
    const current = control.lang;
    const suffix = window.location.search + window.location.hash;
    links.forEach(link => {
      const target = new URL(link.href);
      target.search = window.location.search;
      target.hash = window.location.hash;
      link.href = target.href;
      link.addEventListener('click', () => {
        try { localStorage.setItem('gsw_locale', link.dataset.language); } catch { /* URLs work without storage. */ }
      });
    });
    document.addEventListener('click', event => { if (!control.contains(event.target)) control.open = false; });
    control.addEventListener('keydown', event => {
      if (event.key === 'Escape') { control.open = false; summary.focus({preventScroll:true}); }
      else if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
        event.preventDefault(); control.open = true;
        const i = links.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : (i + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
        links[next].focus();
      }
    });
    // Explicit language URLs are authoritative. Only the English entry point
    // restores a previous choice; selecting English saves that choice first.
    if (current === 'en' && location.pathname === '/') {
      try {
        const saved = localStorage.getItem('gsw_locale');
        if (Object.hasOwn(locales,saved) && locales[saved]) location.replace(`/${locales[saved]}/${suffix}`);
      } catch { /* The native HTML navigation needs neither JS nor storage. */ }
    }
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
