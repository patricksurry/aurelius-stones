// The stone card: its passage, neighbours, headline (yours to claim) and notes, the study side,
// and the related stones beneath it.

// Top corner: stones you've made your own and passages you've read; opens the map
function renderProgress() {
  const claimedCount = STONES.filter(st => isClaimed(st.id)).length;
  document.getElementById('progressLabel').textContent =
    `${claimedCount} of ${STONES.length} stones · ${state.read.size} of ${VERSES.length} passages · map`;
  document.getElementById('progressClaimed').style.width = `${(claimedCount / STONES.length) * 100}%`;
  document.getElementById('progressRead').style.width = `${(state.read.size / VERSES.length) * 100}%`;
  document.getElementById('progressBtn').title = 'Your progress: open the map (m)';
}

// Faint arrows either side of the card: back and on through the book, in Marcus's order
function renderBookSteps() {
  const idx = VERSES.findIndex(v => v.id === state.currentVerseRef);
  [['bookPrev', VERSES[idx - 1], 'Back through the book', '←', CHEVRON_LEFT],
   ['bookNext', VERSES[idx + 1], 'On through the book', '→', CHEVRON_RIGHT]]
    .forEach(([id, v, label, key, icon]) => {
      const btn = document.getElementById(id);
      if (!btn.innerHTML) btn.innerHTML = icon;
      btn.disabled = !v;
      btn.title = v ? `${label}: ${v.id} (${key})` : (id === 'bookPrev' ? 'The start of the book' : 'The end of the book');
    });
}

function verseHtml(v) {
  return `
    <div class="verse">
      <div class="verse-english">
        <span class="verse-ref ${state.read.has(v.id) ? 'read' : ''}" id="activeRef" title="Where this sits in the book (m)">${v.id}</span>${v.english}
      </div>
      <div class="verse-greek">${v.greek}</div>
    </div>
  `;
}

const CHEVRON_UP = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10l4.5-4.5 4.5 4.5"/></svg>';
const CHEVRON_DOWN = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 6l4.5 4.5 4.5-4.5"/></svg>';
const CHEVRON_LEFT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5L5.5 8l4.5 4.5"/></svg>';
const CHEVRON_RIGHT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5L10.5 8 6 12.5"/></svg>';
// The footer's two lenses: an open book to study, an alpha for the Greek
const BOOK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C10.2 5 7.6 4.5 4 4.5v13c3.6 0 6.2.5 8 2 1.8-1.5 4.4-2 8-2v-13c-3.6 0-6.2.5-8 2z"/><path d="M12 6.5v13"/></svg>';
const ALPHA_ICON = '<span class="glyph" aria-hidden="true">α</span>';

// The passage, with a glimpse of the start of the ones before and after it on this stone
function passageHtml(stone, activeV, entering) {
  const ids = stone.verseIds;
  if (ids.length < 2) return `<div class="passage ${entering ? 'fading' : ''}">${verseHtml(activeV)}</div>`;
  const idx = ids.indexOf(activeV.id);
  const prev = VERSE_BY_ID[ids[idx - 1]];
  const next = VERSE_BY_ID[ids[idx + 1]];
  return `
    <div class="passage ${entering ? 'fading' : ''}">
      <button class="neighbor prev chrome-soft" ${prev ? `data-ref="${prev.id}"` : 'disabled'} title="Previous passage on this stone (↑)">
        ${CHEVRON_UP}
        ${prev ? `<span class="neighbor-text">${escapeHtml(incipit(prev))}</span>` : ''}
      </button>
      ${verseHtml(activeV)}
      <button class="neighbor next chrome-soft" ${next ? `data-ref="${next.id}"` : 'disabled'} title="Next passage on this stone (↓)">
        ${CHEVRON_DOWN}
        ${next ? `<span class="neighbor-text">${escapeHtml(incipit(next))}</span>` : ''}
      </button>
    </div>`;
}

// First line of a passage, shown when hovering its dot in the stone pager
function incipit(v) {
  const words = v.english.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean);
  return words.length > 14 ? words.slice(0, 14).join(' ') + '…' : words.join(' ');
}

// Under the headline: once a passage is read, an offer to claim the stone in your own words;
// once you have, a way to revise yours or revert to the suggested summary
function maximLineHtml(stone, claimed, earned) {
  if (claimed) {
    return `<div class="suggested">
      <button class="quiet-btn" id="editMaxim">revise</button> · ${revertHtml(stone)}
    </div>`;
  }
  return `<div class="suggested" id="ownWordsOffer" ${earned ? '' : 'hidden'}>
    <button class="quiet-btn" id="editMaxim">claim in your own words</button>
  </div>`;
}

function revertHtml(stone) {
  return `<button class="quiet-btn" id="restoreMaxim">revert</button> to “${escapeHtml(stone.defaultMaxim)}”`;
}

// Called the moment a passage is read: on a stone not yet yours, the offer arrives
function offerOwnWords() {
  const offer = document.getElementById('ownWordsOffer');
  if (state.flipped || !offer || !offer.hidden) return;
  offer.hidden = false;
  offer.classList.add('arriving');
}

function render() {
  const stone = STONE_BY_ID[state.currentStoneId] || STONES[0];
  const claimed = isClaimed(stone.id);
  const user = state.claimed[stone.id] || {};
  // Claiming a stone in your own words is offered once you've read a passage on it
  const earned = stone.verseIds.some(id => state.read.has(id));

  renderProgress();
  renderBookSteps();
  if (stone.id === todayStone().id) store('meditations_today_v1', dayKey());

  const stoneVerses = stone.verseIds.map(id => VERSE_BY_ID[id]).filter(Boolean);
  const activeV = VERSE_BY_ID[state.currentVerseRef];

  const surface = document.getElementById('stoneSurface');
  surface.className = `stone ${claimed ? 'claimed' : ''} ${state.flipped ? 'underside' : ''}`;

  if (!state.flipped) {
    surface.innerHTML = `
      <div class="maxim-wrap">
        <h1 class="maxim">${escapeHtml(getStoneHeadline(stone))}</h1>
        ${maximLineHtml(stone, claimed, earned)}
      </div>

      ${passageHtml(stone, activeV, state.verseEntering)}

      <div class="divider"></div>

      <textarea id="reflectionField" class="reflection-input" rows="1"
                placeholder="Notes…">${escapeHtml(user.reflection || '')}</textarea>

      <div class="card-foot">
        <div class="pager-dots chrome">
          ${stoneVerses.map(v => `
            <button class="pager-dot ${state.read.has(v.id) ? 'read' : ''} ${v.id === activeV.id ? 'current' : ''}" ${v.id === activeV.id ? 'id="currentDot"' : ''}
                    data-ref="${v.id}" title="${v.id} — ${escapeHtml(incipit(v))}"></button>
          `).join('')}
        </div>
        <div class="lens chrome">
          <button class="quiet-btn lens-icon ${prefs.greek ? 'on' : ''}" id="greekToggle" title="The Greek alongside (g)" aria-label="Show the Greek">${ALPHA_ICON}</button>
          <button class="quiet-btn lens-icon" onclick="flipStone()" title="Study: another translation, commentary, the people named (f)" aria-label="Study">${BOOK_ICON}</button>
        </div>
      </div>
    `;

    surface.querySelectorAll('.verse .person').forEach(el => {
      const p = PEOPLE[el.dataset.person];
      el.title = p.description ? `${p.name} · ${p.description}` : p.name;
    });

    surface.querySelectorAll('.neighbor[data-ref], .pager-dot').forEach(el => {
      el.addEventListener('click', () => goToVerse(el.getAttribute('data-ref')));
    });

    document.getElementById('greekToggle').addEventListener('click', toggleGreek);

    const reflectionField = document.getElementById('reflectionField');
    autoResize(reflectionField);

    reflectionField.addEventListener('input', () => {
      autoResize(reflectionField);
      const c = state.claimed[stone.id] || {};
      state.claimed[stone.id] = { maxim: c.maxim || stone.defaultMaxim, reflection: reflectionField.value.trim(), t: Date.now() };
      save();
    });

    // A new headline redraws the card, so the stone, the progress line and its neighbours all follow
    const setMaxim = (words) => {
      const c = state.claimed[stone.id] || {};
      const changed = Boolean(words) && words !== stone.defaultMaxim;
      state.claimed[stone.id] = { maxim: changed ? words : stone.defaultMaxim, reflection: c.reflection || '', t: Date.now() };
      save();
      render();
    };

    const restore = document.getElementById('restoreMaxim');
    if (restore) restore.addEventListener('click', () => setMaxim(stone.defaultMaxim));

    // Claiming or revising: the headline becomes a field, with the suggested summary beneath it.
    // Enter or leaving the field keeps what you wrote; Esc, or leaving it empty or unchanged, keeps what was there.
    document.getElementById('editMaxim').addEventListener('click', () => {
      const wrap = surface.querySelector('.maxim-wrap');
      wrap.innerHTML = `
        <textarea class="maxim editing" id="maximField" rows="1" spellcheck="false"
                  placeholder="In your own words…" aria-label="This stone in your own words">${claimed ? escapeHtml(getStoneHeadline(stone)) : ''}</textarea>
        <div class="suggested">
          ${claimed ? revertHtml(stone) : `suggested: “${escapeHtml(stone.defaultMaxim)}”`}
        </div>`;
      const field = document.getElementById('maximField');
      let cancelled = false;
      autoResize(field);
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
      field.addEventListener('input', () => autoResize(field));
      field.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); field.blur(); }
        if (e.key === 'Escape') cancelled = true;
      });
      field.addEventListener('blur', () => {
        const words = field.value.trim();
        if (!cancelled && words && words !== getStoneHeadline(stone)) setMaxim(words);
        else render();
      });
      const use = document.getElementById('restoreMaxim');
      if (use) {
        // Keep the field focused until the click lands, so leaving it doesn't redraw the button away
        use.addEventListener('mousedown', (e) => e.preventDefault());
        use.addEventListener('click', () => { cancelled = true; setMaxim(stone.defaultMaxim); });
      }
    });

  } else {
    // UNDERSIDE: study this passage through other sources (see raw/SOURCES.md).
    // The Greek isn't repeated here: it sits alongside the English on the card (g).
    const book = bookOf(activeV);
    surface.innerHTML = `
      <div class="study-ref">${activeV.id} · ${escapeHtml(stone.discipline)}</div>
      <div class="study-title">“${escapeHtml(getStoneHeadline(stone))}”</div>

      <section class="study-section">
        <h2 class="study-head">George Long's translation, 1862</h2>
        <p>${escapeHtml(activeV.long)}</p>
      </section>

      ${activeV.commentary.length ? `
        <section class="study-section">
          <h2 class="study-head">Farquharson's commentary</h2>
          ${activeV.commentary.map(c => c.paragraphs.map((p, i) => `
            <p>${i === 0 ? `<span class="study-label">${escapeHtml(c.label)}</span>` : ''}${escapeHtml(p)}</p>
          `).join('')).join('')}
        </section>
      ` : ''}

      ${activeV.people.length ? `
        <section class="study-section" id="studyPeople">
          <h2 class="study-head">People in this passage</h2>
          ${activeV.people.map(id => `
            <p class="person-entry" data-person="${id}">
              <a href="${PEOPLE[id].url}" target="_blank" rel="noopener">${escapeHtml(PEOPLE[id].name)}</a>${PEOPLE[id].description ? ` · <span class="person-desc">${escapeHtml(PEOPLE[id].description)}</span>` : ''}
            </p>
          `).join('')}
        </section>
      ` : ''}

      ${book.intro.length ? `
        <section class="study-section">
          <details>
            <summary>Farquharson on Book ${book.roman}${book.heading ? ` · ${escapeHtml(book.heading)}` : ''}</summary>
            ${book.intro.map(p => `<p>${escapeHtml(p)}</p>`).join('')}
          </details>
        </section>
      ` : ''}

      <p class="study-sources">
        Translation and commentary: A. S. L. Farquharson, <i>The Meditations of the Emperor Marcus Antoninus</i> (Oxford, 1944), via
        <a href="https://en.wikisource.org/wiki/The_Meditations_of_the_Emperor_Marcus_Antoninus" target="_blank" rel="noopener">Wikisource</a>.
        George Long (1862), via <a href="https://www.gutenberg.org/ebooks/15877" target="_blank" rel="noopener">Project Gutenberg</a>.
        Greek: J. H. Leopold (Teubner, 1908), via the
        <a href="https://github.com/PerseusDL/canonical-greekLit/tree/master/data/tlg0562/tlg001" target="_blank" rel="noopener">Perseus Digital Library</a> (CC BY-SA 4.0).
        People: <a href="https://en.wikipedia.org/" target="_blank" rel="noopener">Wikipedia</a>.
      </p>

      <div class="card-foot">
        <div class="lens chrome">
          <button class="quiet-btn lens-icon on" onclick="flipStone()" title="Back to the text (f)" aria-label="Back to the text">${BOOK_ICON}</button>
        </div>
      </div>
    `;
  }

  renderRelated(stone);
}

// Three nearest stones by affinity, preferring ones you haven't yet made your own.
// Until you've visited today's stone, it takes the first place.
function relatedPicks(currentStone) {
  const today = todayStone();
  const offerToday = today.id !== currentStone.id && !todaySeen();
  const nearest = (currentStone.affinity || [])
    .map(id => STONE_BY_ID[id])
    .filter(s => s && s.id !== currentStone.id && !(offerToday && s.id === today.id))
    .slice(0, 6);
  const picks = [
    ...nearest.filter(s => !isClaimed(s.id)),
    ...nearest.filter(s => isClaimed(s.id))
  ];
  return offerToday ? [today, ...picks.slice(0, 2)] : picks.slice(0, 3);
}

function renderRelated(currentStone) {
  const row = document.getElementById('relatedRow');
  const picks = relatedPicks(currentStone);

  const today = todayStone();
  row.innerHTML = picks.map(s => `
    <button class="mini-stone ${isClaimed(s.id) ? 'claimed' : ''}" data-stone-id="${s.id}">
      ${s.id === today.id && !todaySeen() ? '<span class="mini-tag">today</span>' : ''}
      ${escapeHtml(getStoneHeadline(s))}
    </button>
  `).join('');

  row.querySelectorAll('.mini-stone').forEach(btn => {
    btn.addEventListener('click', () => goToStone(btn.getAttribute('data-stone-id')));
  });
}
