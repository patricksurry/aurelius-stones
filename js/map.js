// The progress map: every passage by book and every stone, linked on hover.

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
        <span>
          ${account.note ? `<span class="map-note">${escapeHtml(account.note)}</span>` : ''}
          ${account.field ? `<input class="map-field" type="email" autocomplete="email" placeholder="${escapeHtml(account.field.placeholder)}">` : ''}
          ${account.links.map((l, i) => `<button class="quiet-btn" data-account="${i}" title="${escapeHtml(l.title || '')}">${escapeHtml(l.label)}</button>`).join(' ')}
          <button class="quiet-btn" id="mapAbout">about</button>
          <button class="quiet-btn" id="mapClose" title="Close (Esc)">close</button>
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
        ${STONES.map(s => `
          <button class="stone-ellipse ${isClaimed(s.id) ? 'claimed' : ''} ${s.id === state.currentStoneId ? 'current' : ''}"
                  data-stone-id="${s.id}" aria-label="${escapeHtml(getStoneHeadline(s))}"></button>
        `).join('')}
      </div>

      <div class="map-hover" id="mapHover"></div>
    </div>
  `;

  document.getElementById('mapClose').addEventListener('click', toggleMap);
  document.getElementById('mapAbout').addEventListener('click', () => { toggleMap(); showWelcome(); });
  mapEl.querySelectorAll('[data-account]').forEach(btn => {
    btn.addEventListener('click', () => account.links[btn.dataset.account].act());
  });
  const field = mapEl.querySelector('.map-field');
  if (field) {
    field.addEventListener('keydown', (e) => { if (e.key === 'Enter') account.field.submit(field.value.trim()); });
    field.focus();
  }

  // Pointing at a passage shows its opening and lights its stone; pointing at a stone lights its passages
  const hover = document.getElementById('mapHover');
  const hint = '<span class="hint">Point at a stone to see its passages, or at a passage to see its stone.</span>';
  const clear = () => {
    mapEl.querySelectorAll('.lit').forEach(el => el.classList.remove('lit'));
    mapEl.querySelectorAll('.dim').forEach(el => el.classList.remove('dim'));
    hover.innerHTML = hint;
  };
  const light = (stoneId, ref) => {
    clear();
    const stone = STONE_BY_ID[stoneId];
    stone.verseIds.forEach(id => mapEl.querySelector(`.map-dot[data-ref="${id}"]`).classList.add('lit'));
    mapEl.querySelector(`.stone-ellipse[data-stone-id="${stoneId}"]`).classList.add('lit');
    mapEl.querySelectorAll('.map-dots, .map-stones').forEach(el => el.classList.add('dim'));
    hover.innerHTML = ref
      ? `<span class="text"><span class="ref">${ref}</span>${escapeHtml(incipit(VERSE_BY_ID[ref]))}</span><span class="on-stone">${escapeHtml(getStoneHeadline(stone))}</span>`
      : `<span class="text">${escapeHtml(getStoneHeadline(stone))}</span><span class="on-stone">${stone.verseIds.length} passages</span>`;
  };
  const onPoint = (e) => {
    const dot = e.target.closest('.map-dot');
    const pebble = e.target.closest('.stone-ellipse');
    if (dot) light(VERSE_BY_ID[dot.dataset.ref].stoneId, dot.dataset.ref);
    else if (pebble) light(pebble.dataset.stoneId, null);
  };
  // Listen on the freshly built content, so reopening the map doesn't stack listeners
  const inner = mapEl.querySelector('.map-inner');
  inner.addEventListener('mouseover', onPoint);
  inner.addEventListener('focusin', onPoint);
  mapEl.querySelectorAll('.map-dots, .map-stones').forEach(el => el.addEventListener('mouseleave', clear));
  clear();
  mapEl.querySelectorAll('.map-dot').forEach(el => {
    el.addEventListener('click', () => { state.mapOpen = false; renderMap(); goToVerse(el.getAttribute('data-ref')); });
  });
  mapEl.querySelectorAll('.stone-ellipse').forEach(el => {
    el.addEventListener('click', () => { state.mapOpen = false; renderMap(); goToStone(el.getAttribute('data-stone-id')); });
  });
}

function toggleMap() {
  state.mapOpen = !state.mapOpen;
  renderMap();
}
