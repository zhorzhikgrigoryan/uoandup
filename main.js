(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- mobile menu ---------- */
  const menuBtn = $('.menu-btn');
  const nav = $('#site-nav');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  };
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && !e.target.closest('.site-header')) setMenu(false);
  });

  /* ---------- sticky header: add a shadow once the page scrolls ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- song player: vinyl + tonearm, sticky mini player ---------- */
  (() => {
    const audio = $('#song-audio');
    const card = $('[data-player]');
    const mini = $('[data-mini]');
    const section = $('#song');
    if (!audio || !card || !mini) return;
    const deck = $('.deck', card);
    const hint = $('[data-hint]', card);
    const surfaces = [card, mini];
    let dismissed = false;
    let pastSection = false;
    const fmt = (t) => (isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '0:00');

    const setPlaying = (on) => {
      surfaces.forEach((el) => el.classList.toggle('is-playing', on));
      $$('[data-toggle]').forEach((b) => b.setAttribute('aria-label', on ? 'Դադար' : 'Նվագել'));
      hint.textContent = on ? 'Նվագում է…' : 'Լսել երգը';
      if (on) card.classList.add('is-armed');
    };
    const updateMini = () => {
      const show = pastSection && !dismissed;
      mini.classList.toggle('is-visible', show);
      document.body.classList.toggle('has-mini', show);
    };
    const play = () => audio.play().then(() => { dismissed = false; updateMini(); }).catch(() => {
      // Autoplay blocked (no click on the page yet): keep the arm on the record and ask for a click.
      card.classList.add('is-armed');
      hint.textContent = 'Սեղմի՛ր՝ նվագելու համար';
    });
    const pause = () => { audio.pause(); card.classList.toggle('is-armed', false); };
    const toggle = () => (audio.paused ? play() : pause());

    $$('[data-toggle]').forEach((el) => el.addEventListener('click', toggle));
    deck.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });

    // Hover: swing the tonearm onto the record and start playing.
    if (window.matchMedia('(hover: hover)').matches) {
      deck.addEventListener('mouseenter', () => { card.classList.add('is-armed'); if (audio.paused) play(); });
      deck.addEventListener('mouseleave', () => {
        if (audio.paused) { card.classList.toggle('is-armed', false); hint.textContent = 'Լսել երգը'; }
      });
    }

    audio.addEventListener('play', () => setPlaying(true));
    audio.addEventListener('pause', () => setPlaying(false));
    audio.addEventListener('ended', () => { setPlaying(false); card.classList.toggle('is-armed', false); });
    const sync = () => {
      const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      $$('.progress__bar').forEach((b) => { b.style.width = pct + '%'; });
      $$('[data-current]').forEach((el) => { el.textContent = fmt(audio.currentTime); });
      $$('[data-progress][role="slider"]').forEach((el) => el.setAttribute('aria-valuenow', String(Math.round(pct))));
    };
    audio.addEventListener('timeupdate', sync);
    audio.addEventListener('loadedmetadata', () => {
      $$('[data-duration]').forEach((el) => { el.textContent = fmt(audio.duration); });
      sync();
    });
    if (audio.readyState >= 1) audio.dispatchEvent(new Event('loadedmetadata'));

    // Seek by clicking / arrow keys on a progress bar.
    $$('[data-progress]').forEach((bar) => {
      bar.addEventListener('click', (e) => {
        if (!audio.duration) return;
        const r = bar.getBoundingClientRect();
        audio.currentTime = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * audio.duration;
      });
      bar.addEventListener('keydown', (e) => {
        if (!audio.duration) return;
        if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
        if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
      });
    });

    // Mini player: shows once the song section has scrolled up out of view.
    new IntersectionObserver(([entry]) => {
      pastSection = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      updateMini();
    }).observe(section);
    $('[data-mini-close]', mini).addEventListener('click', () => { dismissed = true; pause(); updateMini(); });
  })();

  /* ---------- countdown ---------- */
  const cd = $('[data-countdown]');
  const deadline = new Date(cd.dataset.countdown).getTime();
  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    const ms = deadline - Date.now();
    if (ms <= 0) { cd.textContent = '[ Հայտերն ավարտված են ]'; return false; }
    const m = Math.floor(ms / 60000);
    const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
    cd.textContent = `[ ${pad(d)} : ${pad(h)} : ${pad(mi)} ]`;
    cd.setAttribute('aria-label', `${d} օր, ${h} ժամ, ${mi} րոպե`);
    return true;
  };
  if (tick()) setInterval(tick, 15000);
  $('.countdown__label').textContent = 'Մինչև ավարտը՝ օր : ժամ : րոպե';

  /* ---------- ticker: duplicate content for a seamless loop ---------- */
  const track = $('.ticker__track');
  const group = $('.ticker__group', track);
  const fill = () => {
    $$('.ticker__group', track).slice(1).forEach((g) => g.remove());
    const needed = Math.ceil((window.innerWidth * 2) / group.offsetWidth) + 1;
    for (let i = 0; i < Math.max(needed, 2) * 2 - 1; i++) track.appendChild(group.cloneNode(true));
    // keep an even count so translateX(-50%) loops seamlessly
    if (track.children.length % 2) track.appendChild(group.cloneNode(true));
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fill); else fill();
  let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(fill, 200); });

  /* ---------- form ---------- */
  const form = $('#app-form');
  const typeInput = $('#f-type');
  const alertBox = $('#form-alert');
  const alertBody = $('#form-alert-body');
  const soloPanel = $('[data-mode-panel="solo"]');
  const groupPanel = $('[data-mode-panel="group"]');
  const countSelect = $('#g-count');
  const addBtn = $('#add-member');
  let mode = 'solo';

  const applyCopy = (root = document) => {
    $$('[data-solo]', root).forEach((el) => { el.textContent = el.dataset[mode]; });
    $$('[data-solo-ph]', root).forEach((el) => { el.placeholder = el.dataset[mode + 'Ph']; });
  };

  const setMode = (m) => {
    mode = m;
    typeInput.value = m;
    $$('.segmented__opt').forEach((b) => {
      const on = b.dataset.mode === m;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', String(on));
    });
    soloPanel.hidden = soloPanel.disabled = m !== 'solo';
    groupPanel.hidden = groupPanel.disabled = m !== 'group';
    if (m === 'group') setMembers(Number(countSelect.value));
    applyCopy(form);
    clearErrors(m === 'solo' ? groupPanel : soloPanel);
    if (!$('.has-error', form)) alertBox.hidden = true;
  };
  $$('.segmented__opt').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

  const setMembers = (n) => {
    n = Math.min(5, Math.max(2, n));
    countSelect.value = String(n);
    $$('.member', groupPanel).forEach((el) => {
      const i = Number(el.dataset.member);
      const show = i <= n;
      el.hidden = !show;
      $$('input', el).forEach((inp) => { inp.disabled = !show; });
      if (!show) clearErrors(el);
    });
    addBtn.hidden = n >= 5;
  };
  countSelect.addEventListener('change', () => setMembers(Number(countSelect.value)));
  addBtn.addEventListener('click', () => {
    const n = Number(countSelect.value) + 1;
    setMembers(n);
    const el = $(`.member[data-member="${n}"] input`, groupPanel);
    if (el) el.focus();
  });
  $$('.member__remove', groupPanel).forEach((btn) => btn.addEventListener('click', () => {
    // remove this member: shift later members' values up, then shrink
    const n = Number(countSelect.value);
    const idx = Number(btn.closest('.member').dataset.member);
    for (let i = idx; i < n; i++) {
      const cur = $$(`.member[data-member="${i}"] input`, groupPanel);
      const next = $$(`.member[data-member="${i + 1}"] input`, groupPanel);
      cur.forEach((inp, k) => { inp.value = next[k].value; });
    }
    $$(`.member[data-member="${n}"] input`, groupPanel).forEach((inp) => { inp.value = ''; });
    setMembers(n - 1);
  }));

  /* input helpers: date mask, digits only */
  $$('input[data-validate="date"]').forEach((inp) => inp.addEventListener('input', () => {
    const d = inp.value.replace(/\D/g, '').slice(0, 8);
    inp.value = [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('.');
  }));
  $$('input[data-validate="card"]').forEach((inp) => inp.addEventListener('input', () => {
    inp.value = inp.value.replace(/\D/g, '').slice(0, 4);
  }));

  /* validation */
  const MSG = {
    required: 'Պարտադիր դաշտ',
    email: 'Մուտքագրիր վավեր էլ. փոստ, օր.՝ name@mail.com',
    card: 'Պետք է լինի 4 թվանշան',
    url: 'Հղումը պետք է սկսվի https://-ով',
    phone: 'Մուտքագրիր վավեր հեռախոսահամար, օր.՝ +374 91 234 567',
    date: 'Մուտքագրիր ամսաթիվը ՕՕ.ԱԱ.ՏՏՏՏ ձևաչափով',
  };
  const validDate = (v) => {
    const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(v);
    if (!m) return false;
    const [d, mo, y] = [+m[1], +m[2], +m[3]];
    const dt = new Date(y, mo - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d && y > 1900 && dt < new Date();
  };
  const checkField = (el) => {
    const v = el.value.trim();
    const rule = el.dataset.validate;
    if (el.required && !v) return MSG.required;
    if (!v) return '';
    if (rule === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return MSG.email;
    if (rule === 'card' && !/^\d{4}$/.test(v)) return MSG.card;
    if ((rule === 'url' || rule === 'url-optional') && !/^https:\/\/\S+\.\S+/.test(v)) return MSG.url;
    if (rule === 'phone' && v.replace(/\D/g, '').length < 8) return MSG.phone;
    if (rule === 'date' && !validDate(v)) return MSG.date;
    return '';
  };
  const setError = (wrap, msg, cls) => {
    let err = $('.' + cls, wrap);
    wrap.classList.toggle('has-error', !!msg);
    if (msg) {
      if (!err) { err = document.createElement('p'); err.className = cls; wrap.appendChild(err); }
      err.textContent = msg;
    } else if (err) err.remove();
  };
  const validateInput = (el) => {
    if (el.type === 'checkbox') {
      const msg = el.required && !el.checked ? el.dataset.error : '';
      setError(el.closest('.check-field'), msg, 'check-field__error');
      return !msg;
    }
    const msg = checkField(el);
    const wrap = el.closest('.field');
    setError(wrap, msg, 'field__error');
    const err = $('.field__error', wrap);
    if (err) { err.id = el.id + '-err'; el.setAttribute('aria-describedby', err.id); el.setAttribute('aria-invalid', 'true'); }
    else { el.removeAttribute('aria-describedby'); el.removeAttribute('aria-invalid'); }
    return !msg;
  };
  function clearErrors(root) {
    $$('.has-error', root).forEach((w) => w.classList.remove('has-error'));
    $$('.field__error, .check-field__error', root).forEach((e) => e.remove());
    $$('[aria-invalid]', root).forEach((e) => { e.removeAttribute('aria-invalid'); e.removeAttribute('aria-describedby'); });
  }
  const activeControls = () => $$('input, select, textarea', form)
    .filter((el) => !el.matches(':disabled') && el.type !== 'hidden' && el.name !== 'bot-field');

  // re-validate fields that already show an error, as the user fixes them
  form.addEventListener('input', (e) => {
    const el = e.target;
    const wrap = el.closest('.field, .check-field');
    if (wrap && wrap.classList.contains('has-error')) validateInput(el);
    if (!alertBox.hidden && !$('.has-error', form)) alertBox.hidden = true;
  });
  form.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' && e.target.closest('.check-field').classList.contains('has-error')) validateInput(e.target);
  });
  form.addEventListener('focusout', (e) => {
    const el = e.target;
    if (el.matches('input:not([type=checkbox]), textarea') && el.value.trim()) validateInput(el);
  });

  const armNum = (n) => String(n);
  const encode = (fd) => new URLSearchParams(fd).toString();
  const canPostToNetlify = () => !/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname) && location.protocol.startsWith('http');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const controls = activeControls();
    const bad = controls.filter((el) => !validateInput(el));
    if (bad.length) {
      const n = bad.length;
      alertBody.textContent = (mode === 'group'
        ? `Ստուգեք կարմիրով նշված ${armNum(n)} դաշտ${n > 1 ? 'երը' : 'ը'} և փորձեք կրկին։ Լրացրած տվյալները պահպանված են։`
        : `Ստուգիր կարմիրով նշված ${armNum(n)} դաշտ${n > 1 ? 'երը' : 'ը'} և փորձիր կրկին։ Լրացրածդ տվյալները պահպանված են։`);
      alertBox.hidden = false;
      alertBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => bad[0].focus({ preventScroll: true }), 350);
      return;
    }
    alertBox.hidden = true;
    const submit = $('.submit', form);
    submit.disabled = true;
    const fd = new FormData(form);
    try {
      if (canPostToNetlify()) {
        const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: encode(fd) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
      }
      showSuccess(fd);
    } catch (err) {
      $('.alert__title', alertBox).textContent = 'Հայտը դեռ չի ուղարկվել';
      alertBody.textContent = 'Կապի խնդիր առաջացավ։ Լրացրածդ տվյալները պահպանված են, փորձիր կրկին մի քանի վայրկյանից։';
      alertBox.hidden = false;
      alertBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
      submit.disabled = false;
    }
  });

  /* success */
  const success = $('#form-success');
  const showSuccess = (fd) => {
    const id = 'UP-2026-' + String(Math.floor(1000 + Math.random() * 9000));
    const gname = fd.get('group_name');
    $('#success-id').textContent = `Հայտի համար՝ #${id}` + (mode === 'group' && gname ? ` · ${gname}` : '');
    applyCopy(success);
    form.hidden = true;
    success.hidden = false;
    $('#apply').scrollIntoView({ behavior: 'smooth', block: 'start' });
    success.focus({ preventScroll: true });
  };
  $('#share-btn').addEventListener('click', async () => {
    const data = { title: 'UP&UP', text: 'Ես դիմել եմ UP&UP մրցույթին։ Միացի՛ր դու էլ՝ մինչև դեկտեմբերի 6-ը։', url: location.origin + location.pathname };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        const lbl = $('#share-btn .btn__label');
        const old = lbl.textContent; lbl.textContent = 'Հղումը պատճենված է ✓';
        setTimeout(() => { lbl.textContent = old; }, 2200);
      }
    } catch (_) { /* user cancelled */ }
  });
  $('#home-btn').addEventListener('click', () => {
    form.reset(); clearErrors(form); setMode('solo');
    success.hidden = true; form.hidden = false;
  });

  setMode('solo');
})();
