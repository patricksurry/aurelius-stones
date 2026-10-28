// The progress map: every passage by book and every stone by discipline, linked on hover,
// with sign-in and "clear progress" at its foot.

const DISCIPLINES = [
  { id: 'Judgment', hint: 'How to judge' },
  { id: 'Acceptance', hint: 'What to desire' },
  { id: 'Action', hint: 'How to act' }
];

const CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';

// Clearing asks first, in place
let confirmingClear = false;

function clearHtml(claimedCount) {
  if (!state.read.size && !claimedCount) return '';
  if (!confirmingClear) return '<button class="quiet-btn" id="clearAsk">clear progress</button>';
  const what = [
    state.read.size ? `${state.read.size} passage${state.read.size === 1 ? '' : 's'} read` : '',
    claimedCount ? `${claimedCount} stone${claimedCount === 1 ? '' : 's'} claimed` : ''
  ].filter(Boolean).join(' and ');
  return `<span class="acct-note">Forget ${what}${account.user ? ', on every device' : ''}?</span>
    <button class="quiet-btn" id="clearYes">clear</button>
    <button class="quiet-btn" id="clearNo">keep</button>`;
}

function stonesListHtml(current) {
  const today = todayStone();
  return `
    <div class="map-stones-themes">
      ${DISCIPLINES.map(d => `
        <div class="map-theme-group">
          <div class="map-theme-head">
            <span class="map-theme">${d.id}</span>
            <span class="map-theme-hint">· ${d.hint}</span>
          </div>
          <div class="map-stone-list">
            ${STONES.filter(s => s.discipline === d.id).map(s => {
              const claimed = isClaimed(s.id);
              const isCurrent = s.id === state.currentStoneId;
              const isToday = s.id === today.id;
              return `
                <div class="map-stone-item ${claimed ? 'claimed' : ''} ${isCurrent ? 'current' : ''}" data-stone-item="${s.id}">
                  <button class="map-stone-row" data-stone-id="${s.id}">
                    <span class="stone-ellipse ${claimed ? 'claimed' : ''} ${isCurrent ? 'current' : ''} ${isToday ? 'today' : ''}" aria-hidden="true"></span>
                    <span class="map-stone-maxim ${claimed ? 'claimed' : ''}">${escapeHtml(getStoneHeadline(s))}</span>
                  </button>
                  <div class="map-stone-dots">
                    ${s.verseIds.map(id => VERSE_BY_ID[id]).map(v => `
                      <button class="map-dot ${state.read.has(v.id) ? 'read' : ''} ${v.id === current.id ? 'current' : ''}"
                              data-ref="${v.id}" aria-label="${v.id}"></button>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function booksViewHtml(current) {
  const today = todayStone();
  return `
    ${BOOKS.map(b => `
      <div class="map-book">
        <span class="map-numeral" title="${escapeHtml(b.heading || `Book ${b.roman}`)}">${b.roman}</span>
        <div class="map-dots">
          ${VERSES.filter(v => v.book === b.book).map(v => `
            <button class="map-dot ${state.read.has(v.id) ? 'read' : ''} ${v.id === current.id ? 'current' : ''}"
                    data-ref="${v.id}" aria-label="${v.id}"></button>
          `).join('')}
        </div>
      </div>
    `).join('')}

    <div class="map-section">STONES</div>
    <div class="map-stones">
      ${DISCIPLINES.map(d => `
        <div class="map-discipline">
          <span class="map-theme" title="${d.hint}">${d.id}</span>
          <div class="map-pebbles">
            ${STONES.filter(s => s.discipline === d.id).map(s => `
              <button class="stone-ellipse ${isClaimed(s.id) ? 'claimed' : ''} ${s.id === state.currentStoneId ? 'current' : ''} ${s.id === today.id ? 'today' : ''}"
                      data-stone-id="${s.id}" aria-label="${escapeHtml(getStoneHeadline(s))}"></button>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderMap() {
  const mapEl = document.getElementById('map');
  mapEl.hidden = !state.mapOpen;
  if (!state.mapOpen) return;

  const claimedCount = STONES.filter(s => isClaimed(s.id)).length;
  const current = VERSE_BY_ID[state.currentVerseRef];
  const byBook = prefs.mapView === 'books';

  mapEl.innerHTML = `
    <div class="map-inner">
      <div class="map-head">
        <span>${state.read.size} of ${VERSES.length} passages read · ${claimedCount} of ${STONES.length} stones claimed</span>
        <span class="map-actions">
          <span class="map-view-toggle">
            <button class="quiet-btn ${!byBook ? 'on' : ''}" data-map-view="stones">by stone</button>
            ·
            <button class="quiet-btn ${byBook ? 'on' : ''}" data-map-view="books">by book</button>
          </span>
          <button class="quiet-btn map-icon" id="mapAbout" title="About" aria-label="About"><span class="glyph circled" aria-hidden="true">?</span></button>
          <button class="quiet-btn map-icon" id="mapClose" title="Close (Esc)" aria-label="Close">${CLOSE_ICON}</button>
        </span>
      </div>

      ${byBook ? booksViewHtml(current) : stonesListHtml(current)}

      <div class="map-hover" id="mapHover"></div>
      <p class="map-hint" id="mapHint"></p>

      <div class="map-foot">
        <div class="account" data-place="map"></div>
        <div class="map-clear">${clearHtml(claimedCount)}</div>
      </div>
    </div>
  `;

  document.getElementById('mapClose').addEventListener('click', toggleMap);
  document.getElementById('mapAbout').addEventListener('click', () => { toggleMap(); showWelcome(); });
  mapEl.querySelectorAll('[data-map-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      prefs.mapView = btn.dataset.mapView;
      store('meditations_prefs_v1', prefs);
      renderMap();
    });
  });
  renderAccount();
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  on('clearAsk', () => { confirmingClear = true; renderMap(); });
  on('clearNo', () => { confirmingClear = false; renderMap(); });
  on('clearYes', () => { confirmingClear = false; clearProgress(); render(); renderMap(); });

  // In book view, pointing at a passage shows its opening and lights its stone; pointing at a stone lights its passages.
  // In stone view, pointing at a passage circle shows its opening lines beside it.
  // On touch screens (no hover), the preview sits at the foot instead: the first tap previews; a second tap goes there.
  const hover = document.getElementById('mapHover');
  const touchOnly = window.matchMedia('(hover: none)').matches;
  const hintText = byBook
    ? `${touchOnly ? 'Tap' : 'Point at'} a stone to see its passages, or a passage to see its stone.`
    : `${touchOnly ? 'Tap' : 'Point at'} any passage circle to see its opening lines.`;
  const hint = touchOnly ? `<span class="hint">${hintText}</span>` : '';
  hover.classList.toggle('floating', !touchOnly);
  if (!touchOnly) document.getElementById('mapHint').textContent = hintText;
  let litKey = null;
  let litTarget = null;
  const clear = () => {
    litKey = null;
    litTarget = null;
    hover.removeAttribute('data-go');
    hover.classList.remove('shown');
    mapEl.querySelectorAll('.lit').forEach(el => el.classList.remove('lit'));
    mapEl.querySelectorAll('.dim').forEach(el => el.classList.remove('dim'));
    hover.innerHTML = hint;
  };
  // Beside what's pointed at: just below it, or above when near the window's foot
  const place = (el) => {
    const r = el.getBoundingClientRect();
    const w = hover.offsetWidth;
    const h = hover.offsetHeight;
    const gap = 12;
    const top = r.bottom + gap + h > window.innerHeight ? r.top - gap - h : r.bottom + gap;
    const left = Math.max(16, Math.min(r.left - 16, window.innerWidth - w - 16));
    hover.style.top = `${top}px`;
    hover.style.left = `${left}px`;
    hover.classList.add('shown');
  };
  const light = (stoneId, ref, el) => {
    clear();
    litKey = ref ? `v:${ref}` : `s:${stoneId}`;
    litTarget = { stoneId, ref };
    if (touchOnly) hover.setAttribute('data-go', '1');
    const stone = STONE_BY_ID[stoneId];
    const goHint = touchOnly ? ' · tap again to open' : '';
    if (byBook) {
      stone.verseIds.forEach(id => mapEl.querySelector(`.map-dot[data-ref="${id}"]`).classList.add('lit'));
      mapEl.querySelector(`.stone-ellipse[data-stone-id="${stoneId}"]`).classList.add('lit');
      mapEl.querySelectorAll('.map-dots, .map-stones').forEach(c => c.classList.add('dim'));
      hover.innerHTML = ref
        ? `<span class="text"><span class="ref">${ref}</span>${escapeHtml(incipit(VERSE_BY_ID[ref]))}</span><span class="on-stone">${escapeHtml(getStoneHeadline(stone))}${goHint}</span>`
        : `<span class="text">${escapeHtml(getStoneHeadline(stone))}</span><span class="on-stone">${stone.id === todayStone().id ? "today's stone · " : ''}${stone.discipline} · ${stone.verseIds.length} passages${goHint}</span>`;
      if (!touchOnly && el) place(el);
    } else if (ref) {
      el.classList.add('lit');
      hover.innerHTML = `<span class="text"><span class="ref">${ref}</span>${escapeHtml(incipit(VERSE_BY_ID[ref]))}</span>${touchOnly ? `<span class="on-stone">${escapeHtml(getStoneHeadline(stone))}${goHint}</span>` : ''}`;
      if (!touchOnly && el) place(el);
    } else if (touchOnly) {
      hover.innerHTML = `<span class="text">${escapeHtml(getStoneHeadline(stone))}</span><span class="on-stone">${stone.id === todayStone().id ? "today's stone · " : ''}${stone.discipline} · ${stone.verseIds.length} passages${goHint}</span>`;
    }
  };
  const onPoint = (e) => {
    const dot = e.target.closest('.map-dot');
    const stoneBtn = byBook && e.target.closest('[data-stone-id]');
    if (dot) light(VERSE_BY_ID[dot.dataset.ref].stoneId, dot.dataset.ref, dot);
    else if (stoneBtn) light(stoneBtn.dataset.stoneId, null, stoneBtn);
  };
  const jumpTo = (stoneId, ref) => {
    state.mapOpen = false;
    history.replaceState({ ref: state.currentVerseRef, study: state.flipped }, '', `#${state.currentVerseRef}`);
    renderMap();
    if (ref) goToVerse(ref);
    else goToStone(stoneId);
  };
  // Listen on the freshly built content, so reopening the map doesn't stack listeners
  const inner = mapEl.querySelector('.map-inner');
  if (!touchOnly) inner.addEventListener('mouseover', onPoint);
  inner.addEventListener('focusin', onPoint);
  if (!touchOnly) mapEl.querySelectorAll('.map-dots, .map-stones, .map-stone-dots').forEach(el => el.addEventListener('mouseleave', clear));
  clear();
  // A preview floating beside a dot would be left behind by scrolling
  mapEl.onscroll = () => { if (!touchOnly && litKey) clear(); };
  hover.addEventListener('click', () => {
    if (litTarget) jumpTo(litTarget.stoneId, litTarget.ref);
  });
  mapEl.querySelectorAll('.map-dot').forEach(el => {
    el.addEventListener('click', () => {
      const ref = el.getAttribute('data-ref');
      if (touchOnly && litKey !== `v:${ref}`) { light(VERSE_BY_ID[ref].stoneId, ref, el); return; }
      jumpTo(null, ref);
    });
  });
  mapEl.querySelectorAll('[data-stone-id]').forEach(el => {
    el.addEventListener('click', () => {
      const stoneId = el.getAttribute('data-stone-id');
      if (touchOnly && litKey !== `s:${stoneId}`) { light(stoneId, null, el); return; }
      jumpTo(stoneId, null);
    });
  });
}

function toggleMap() {
  state.mapOpen = !state.mapOpen;
  confirmingClear = false;
  // Until the map has been opened once, the progress line wears its caption
  if (state.mapOpen && !prefs.mapSeen) {
    prefs.mapSeen = true;
    store('meditations_prefs_v1', prefs);
    document.body.classList.add('map-seen');
  }
  if (state.mapOpen) history.pushState({ ref: state.currentVerseRef, map: true }, '', `#${state.currentVerseRef}`);
  else history.replaceState({ ref: state.currentVerseRef, study: state.flipped }, '', `#${state.currentVerseRef}`);
  renderMap();
}
