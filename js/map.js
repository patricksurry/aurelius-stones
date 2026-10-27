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

function renderMap() {
  const mapEl = document.getElementById('map');
  mapEl.hidden = !state.mapOpen;
  if (!state.mapOpen) return;

  const claimedCount = STONES.filter(s => isClaimed(s.id)).length;
  const current = VERSE_BY_ID[state.currentVerseRef];

  mapEl.innerHTML = `
    <div class="map-inner">
      <div class="map-head">
        <span>${state.read.size} of ${VERSES.length} passages read · ${claimedCount} of ${STONES.length} stones claimed</span>
        <span class="map-actions">
          <button class="quiet-btn map-icon" id="mapAbout" title="About" aria-label="About"><span class="glyph circled" aria-hidden="true">?</span></button>
          <button class="quiet-btn map-icon" id="mapClose" title="Close (Esc)" aria-label="Close">${CLOSE_ICON}</button>
        </span>
      </div>

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
                <button class="stone-ellipse ${isClaimed(s.id) ? 'claimed' : ''} ${s.id === state.currentStoneId ? 'current' : ''}"
                        data-stone-id="${s.id}" aria-label="${escapeHtml(getStoneHeadline(s))}"></button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>

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
  renderAccount();
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  on('clearAsk', () => { confirmingClear = true; renderMap(); });
  on('clearNo', () => { confirmingClear = false; renderMap(); });
  on('clearYes', () => { confirmingClear = false; clearProgress(); render(); renderMap(); });

  // Pointing at a passage shows its opening beside it and lights its stone; pointing at a stone lights its passages.
  // On touch screens (no hover), the preview sits at the foot instead: the first tap previews and lights;
  // a second tap (or tapping the preview) goes there.
  const hover = document.getElementById('mapHover');
  const touchOnly = window.matchMedia('(hover: none)').matches;
  const hintText = `${touchOnly ? 'Tap' : 'Point at'} a stone to see its passages, or a passage to see its stone.`;
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
    stone.verseIds.forEach(id => mapEl.querySelector(`.map-dot[data-ref="${id}"]`).classList.add('lit'));
    mapEl.querySelector(`.stone-ellipse[data-stone-id="${stoneId}"]`).classList.add('lit');
    mapEl.querySelectorAll('.map-dots, .map-stones').forEach(el => el.classList.add('dim'));
    const goHint = touchOnly ? ' · tap again to open' : '';
    hover.innerHTML = ref
      ? `<span class="text"><span class="ref">${ref}</span>${escapeHtml(incipit(VERSE_BY_ID[ref]))}</span><span class="on-stone">${escapeHtml(getStoneHeadline(stone))}${goHint}</span>`
      : `<span class="text">${escapeHtml(getStoneHeadline(stone))}</span><span class="on-stone">${stone.discipline} · ${stone.verseIds.length} passages${goHint}</span>`;
    if (!touchOnly && el) place(el);
  };
  const onPoint = (e) => {
    const dot = e.target.closest('.map-dot');
    const pebble = e.target.closest('.stone-ellipse');
    if (dot) light(VERSE_BY_ID[dot.dataset.ref].stoneId, dot.dataset.ref, dot);
    else if (pebble) light(pebble.dataset.stoneId, null, pebble);
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
  if (!touchOnly) mapEl.querySelectorAll('.map-dots, .map-stones').forEach(el => el.addEventListener('mouseleave', clear));
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
  mapEl.querySelectorAll('.stone-ellipse').forEach(el => {
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
