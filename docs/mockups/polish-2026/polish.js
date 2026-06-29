/* FioPulse Polish 2026 — interacoes compartilhadas dos mockups.
   Delegacao global; cada .scr e independente. So pros mockups. */
(function () {
  function closestScr(el) { return el.closest('.scr'); }

  document.addEventListener('click', function (e) {
    var t = e.target;

    // --- tema por telefone ---
    var themeBtn = t.closest('[data-theme]');
    if (themeBtn) {
      var scr = closestScr(themeBtn);
      var dark = scr.getAttribute('data-t') === 'dark';
      scr.setAttribute('data-t', dark ? 'light' : 'dark');
      var i = themeBtn.querySelector('i');
      if (i) i.className = dark ? 'ti ti-sun' : 'ti ti-moon';
      return;
    }

    // --- segmented ---
    var seg = t.closest('.seg button');
    if (seg) {
      var wrap = seg.closest('.seg');
      var btns = Array.prototype.slice.call(wrap.querySelectorAll('button'));
      var idx = btns.indexOf(seg);
      btns.forEach(function (b, k) { b.classList.toggle('on', k === idx); });
      var pill = wrap.querySelector('.seg-pill');
      if (pill) {
        pill.style.width = 'calc((100% - 6px)/' + btns.length + ')';
        pill.style.transform = 'translateX(' + (idx * 100) + '%)';
      }
      // tema via segmented de aparencia (Claro/Escuro)
      var lbl = (seg.textContent || '').toLowerCase();
      var s2 = closestScr(seg);
      if (lbl.indexOf('claro') >= 0) s2.setAttribute('data-t', 'light');
      if (lbl.indexOf('escuro') >= 0) s2.setAttribute('data-t', 'dark');
      // filtro de tabs: troca o painel data-pane
      var pane = seg.getAttribute('data-pane');
      if (pane) {
        var root = closestScr(seg);
        root.querySelectorAll('[data-paneof="' + wrap.id + '"]').forEach(function (p) {
          p.style.display = p.getAttribute('data-pane') === pane ? '' : 'none';
        });
      }
      return;
    }

    // --- chip-filter ---
    var cf = t.closest('.chip-f');
    if (cf) {
      var grp = cf.parentElement;
      grp.querySelectorAll('.chip-f').forEach(function (c) { c.classList.remove('on'); });
      cf.classList.add('on');
      return;
    }

    // --- switch ---
    var sw = t.closest('.switch');
    if (sw) {
      sw.setAttribute('aria-checked', sw.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
      return;
    }

    // --- abrir sheet ---
    var opener = t.closest('[data-sheet]');
    if (opener) {
      var scr3 = closestScr(opener);
      var sh = scr3.querySelector('#' + opener.getAttribute('data-sheet'));
      if (sh) sh.classList.add('show');
      return;
    }

    // --- fechar sheet ---
    if (t.closest('[data-close]') || t.classList.contains('sheet-bd')) {
      var w = t.closest('.sheet-wrap');
      if (w) w.classList.remove('show');
      return;
    }

    // --- swipe toggle (clique no foreground abre/fecha as acoes) ---
    var swipeFg = t.closest('.swipe-fg');
    if (swipeFg && !t.closest('.swipe-act')) {
      swipeFg.closest('.swipe').classList.toggle('open');
      return;
    }
    // acoes do swipe fecham
    var sa = t.closest('.swipe-act button');
    if (sa) { sa.closest('.swipe').classList.remove('open'); }
  });
})();
