// The stone card: its passage, neighbours, headline (yours to claim) and reflections, the study side,
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

// One passage on the stone's column: its place in the book, then the text. Only the current
// passage shows the ‹ › back and on through the book; the others keep the space so nothing shifts.
function leafHtml(v, current) {
  const idx = VERSES.indexOf(v);
  const prev = VERSES[idx - 1];
  const next = VERSES[idx + 1];
  return `
    <div class="leaf ${current ? 'current' : ''}" data-ref="${v.id}" ${current ? '' : `title="${v.id} on this stone"`}>
      <div class="verse-head">
        <button class="book-step chrome-soft" ${prev ? `data-step="-1" title="Back through the book: ${prev.id} (←)"` : 'disabled'} aria-label="Back through the book">${CHEVRON_LEFT}</button>
        <span class="verse-ref ${state.read.has(v.id) ? 'read' : ''}" ${current ? 'id="activeRef"' : ''} title="Where this sits in the book (m)">${v.id}</span>
        <button class="book-step chrome-soft" ${next ? `data-step="1" title="On through the book: ${next.id} (→)"` : 'disabled'} aria-label="On through the book">${CHEVRON_RIGHT}</button>
      </div>
      <div class="verse">
        <div class="verse-english">${v.english}</div>
        <div class="verse-greek">${v.greek}</div>
      </div>
    </div>
  `;
}

const CHEVRON_LEFT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5L5.5 8l4.5 4.5"/></svg>';
const CHEVRON_RIGHT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5L10.5 8 6 12.5"/></svg>';
// The footer's two lenses: an open book to study, an alpha for the Greek
const BOOK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C10.2 5 7.6 4.5 4 4.5v13c3.6 0 6.2.5 8 2 1.8-1.5 4.4-2 8-2v-13c-3.6 0-6.2.5-8 2z"/><path d="M12 6.5v13"/></svg>';
const ALPHA_ICON = '<span class="glyph" aria-hidden="true">α</span>';

// The stone: all its passages in one column, seen through a window sized to the current one,
// with a glimpse of the passages either side fading at its edges
function passageHtml(stone, activeV) {
  return `
    <div class="passage">
      <div class="stone-window" id="stoneWindow">
        <div class="stone-column">
          ${stone.verseIds.map(id => leafHtml(VERSE_BY_ID[id], id === activeV.id)).join('')}
        </div>
      </div>
    </div>`;
}

// Down the card's right margin, a ribbon of dots: one per passage on the stone, filled in as each
// is read. It stays in view down a long passage.
function pagerHtml(stone, activeV) {
  return `
    <div class="pager-rail">
      <div class="pager chrome">
        ${stone.verseIds.map(id => VERSE_BY_ID[id]).map(v => `
          <button class="pager-dot ${state.read.has(v.id) ? 'read' : ''} ${v.id === activeV.id ? 'current' : ''}" ${v.id === activeV.id ? 'id="currentDot"' : ''}
                  data-ref="${v.id}" title="${v.id} — ${escapeHtml(incipit(v))}"></button>
        `).join('')}
      </div>
    </div>`;
}

// Move the current passage to ref without redrawing the stone: the inks, ids and ribbon follow
function setCurrentLeaf(ref) {
  document.querySelectorAll('.leaf').forEach(el => {
    const on = el.dataset.ref === ref;
    el.classList.toggle('current', on);
    el.title = on ? '' : `${el.dataset.ref} on this stone`;
    el.querySelector('.verse-ref').id = on ? 'activeRef' : '';
  });
  document.querySelectorAll('.pager-dot').forEach(el => {
    const on = el.dataset.ref === ref;
    el.classList.toggle('current', on);
    el.id = on ? 'currentDot' : '';
    if (!on) el.style.removeProperty('--dwell');
  });
}

// Size the window to the current passage plus an edge either side, and slide the column so
// that passage sits in it. Animated, the column and the window glide together over `ms`.
const WINDOW_EDGE_REM = 3.6;
const WINDOW_END_REM = 0.6;
function layoutWindow(ms = 0) {
  const win = document.getElementById('stoneWindow');
  const leaf = win && win.querySelector('.leaf.current');
  if (!leaf) return;
  const column = win.firstElementChild;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  // At either end of the stone there's nothing to glimpse, so the window closes in
  const prev = leaf.previousElementSibling;
  const next = leaf.nextElementSibling;
  const top = (prev ? WINDOW_EDGE_REM : WINDOW_END_REM) * rem;
  // Below, reach past the next passage's reference to its opening lines
  const bottom = next
    ? WINDOW_EDGE_REM * rem + next.querySelector('.verse').offsetTop - next.offsetTop
    : WINDOW_END_REM * rem;
  const ease = ms ? `${ms}ms cubic-bezier(0.45, 0.05, 0.25, 1)` : 'none';
  win.style.transition = ms ? `height ${ease}, --edge-top ${ease}, --edge-bottom ${ease}` : 'none';
  win.style.setProperty('--edge-top', `${top}px`);
  win.style.setProperty('--edge-bottom', `${bottom}px`);
  column.style.transition = ms ? `transform ${ease}` : 'none';
  win.style.height = `${leaf.offsetHeight + top + bottom}px`;
  column.style.transform = `translateY(${top - leaf.offsetTop}px)`;
}

// First line of a passage, shown when hovering its dot in the stone's ribbon or on the map
function incipit(v) {
  const words = v.english
    .replace(/<[^>]*>/g, '')
    .replace(/\s*(?:\.\s*){3,}/g, '… ')
    .split(/\s+/)
    .filter(Boolean);
  return words.length > 14 ? words.slice(0, 14).join(' ') + '…' : words.join(' ');
}

// Under the headline: an offer to claim the stone in your own words or keep the suggested summary as-is;
// once claimed, a way to revise or revert/unclaim
function maximLineHtml(stone, claimed, earned) {
  if (claimed) {
    const custom = getStoneHeadline(stone) !== stone.defaultMaxim;
    return `<div class="suggested">
      <button class="quiet-btn" id="editMaxim">${custom ? 'revise' : 'in your own words'}</button> · ${revertHtml(stone, custom)}
    </div>`;
  }
  return `<div class="suggested ${earned ? '' : 'unearned'}" id="ownWordsOffer">
    <button class="quiet-btn" id="editMaxim">claim in your own words</button> · <button class="quiet-btn" id="claimAsIs">keep as is</button>
  </div>`;
}

function revertHtml(stone, custom = true) {
  return custom
    ? `<button class="quiet-btn" id="restoreMaxim">revert</button> to “${escapeHtml(stone.defaultMaxim)}”`
    : `<button class="quiet-btn" id="restoreMaxim">unclaim</button>`;
}

// Called the moment a passage is read: on a stone not yet yours, the offer stays in view
function offerOwnWords() {
  const offer = document.getElementById('ownWordsOffer');
  if (state.flipped || !offer || !offer.classList.contains('unearned')) return;
  offer.classList.remove('unearned');
  offer.classList.add('arriving');
}

function render() {
  const stone = STONE_BY_ID[state.currentStoneId] || STONES[0];
  const claimed = isClaimed(stone.id);
  const user = state.claimed[stone.id] || {};
  // Claiming a stone is offered permanently once you've read a passage on it
  const earned = stone.verseIds.some(id => state.read.has(id));

  renderProgress();
  if (stone.id === todayStone().id) store('meditations_today_v1', dayKey());

  const activeV = VERSE_BY_ID[state.currentVerseRef];

  const surface = document.getElementById('stoneSurface');
  surface.className = `stone ${claimed ? 'claimed' : ''} ${state.flipped ? 'underside' : ''}`;

  if (!state.flipped) {
    surface.innerHTML = `
      <div class="maxim-wrap">
        <h1 class="maxim" id="maximTitle" title="Put this stone in your own words">${escapeHtml(getStoneHeadline(stone))}</h1>
        ${maximLineHtml(stone, claimed, earned)}
      </div>

      ${passageHtml(stone, activeV)}
      ${pagerHtml(stone, activeV)}

      <div class="divider"></div>

      <textarea id="reflectionField" class="reflection-input" rows="1"
                placeholder="Reflections…">${escapeHtml(user.reflection || '')}</textarea>

      <div class="card-foot">
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

    layoutWindow();
    surface.querySelectorAll('.pager-dot').forEach(el => {
      el.addEventListener('click', () => goToVerse(el.getAttribute('data-ref')));
    });
    // A glimpsed passage at the window's edge: click it to bring it into view
    surface.querySelectorAll('.leaf').forEach(el => {
      el.addEventListener('click', (e) => {
        if (el.classList.contains('current')) return;
        e.stopPropagation();
        goToVerse(el.dataset.ref);
      });
    });
    surface.querySelectorAll('.book-step[data-step]').forEach(el => {
      el.addEventListener('click', () => stepLinear(Number(el.getAttribute('data-step'))));
    });

    document.getElementById('greekToggle').addEventListener('click', toggleGreek);

    const reflectionField = document.getElementById('reflectionField');
    autoResize(reflectionField);

    reflectionField.addEventListener('input', () => {
      autoResize(reflectionField);
      const c = state.claimed[stone.id] || {};
      state.claimed[stone.id] = {
        maxim: c.maxim || stone.defaultMaxim,
        claimed: isClaimed(stone.id),
        reflection: reflectionField.value.trim(),
        t: Date.now()
      };
      save();
    });

    // Update the stone's headline and claimed state, then redraw
    const setMaxim = (words, claim = true) => {
      const c = state.claimed[stone.id] || {};
      const clean = (words && words.trim()) || stone.defaultMaxim;
      state.claimed[stone.id] = {
        maxim: claim ? clean : stone.defaultMaxim,
        claimed: Boolean(claim),
        reflection: c.reflection || '',
        t: Date.now()
      };
      save();
      render();
    };

    const restore = document.getElementById('restoreMaxim');
    if (restore) restore.addEventListener('click', () => setMaxim(stone.defaultMaxim, false));

    const claimAsIs = document.getElementById('claimAsIs');
    if (claimAsIs) claimAsIs.addEventListener('click', () => setMaxim(stone.defaultMaxim, true));

    // Claiming or revising: the headline becomes a field, with the suggested summary beneath it.
    // Enter keeps what you wrote (or claims the suggested summary if left blank); Esc cancels.
    const startEditingMaxim = () => {
      if (window.getSelection && window.getSelection().toString()) return;
      const custom = claimed && getStoneHeadline(stone) !== stone.defaultMaxim;
      const wrap = surface.querySelector('.maxim-wrap');
      wrap.innerHTML = `
        <textarea class="maxim editing" id="maximField" rows="1" spellcheck="false"
                  placeholder="In your own words…" aria-label="This stone in your own words">${custom ? escapeHtml(getStoneHeadline(stone)) : ''}</textarea>
        <div class="suggested">
          ${claimed
            ? revertHtml(stone, custom)
            : `suggested: “${escapeHtml(stone.defaultMaxim)}” · <button class="quiet-btn" id="keepSuggested">keep as is</button>`}
        </div>`;
      const field = document.getElementById('maximField');
      let cancelled = false;
      let enterPressed = false;
      autoResize(field);
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
      field.addEventListener('input', () => autoResize(field));
      field.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); enterPressed = true; field.blur(); }
        if (e.key === 'Escape') cancelled = true;
      });
      field.addEventListener('blur', () => {
        if (cancelled) { render(); return; }
        const words = field.value.trim();
        if (words) setMaxim(words, true);
        else if (enterPressed && !claimed) setMaxim(stone.defaultMaxim, true);
        else render();
      });
      const use = document.getElementById('restoreMaxim');
      if (use) {
        use.addEventListener('mousedown', (e) => e.preventDefault());
        use.addEventListener('click', () => { cancelled = true; setMaxim(stone.defaultMaxim, false); });
      }
      const keep = document.getElementById('keepSuggested');
      if (keep) {
        keep.addEventListener('mousedown', (e) => e.preventDefault());
        keep.addEventListener('click', () => { cancelled = true; setMaxim(stone.defaultMaxim, true); });
      }
    };

    document.getElementById('editMaxim').addEventListener('click', startEditingMaxim);
    document.getElementById('maximTitle').addEventListener('click', startEditingMaxim);

  } else {
    // UNDERSIDE: study this passage alongside the rest of the stone, Long's translation,
    // Farquharson's commentary and the people named (see raw/SOURCES.md).
    const book = bookOf(activeV);
    const stoneVerses = stone.verseIds.map(id => VERSE_BY_ID[id]);
    surface.innerHTML = `
      <div class="study-ref">${escapeHtml(stone.discipline)}</div>
      <div class="study-title">“${escapeHtml(getStoneHeadline(stone))}”</div>

      <section class="study-section study-passages">
        <h2 class="study-head">Passages on this stone · Farquharson, 1944</h2>
        <div class="study-verse-list">
          ${stoneVerses.map(v => v.id === activeV.id ? `
            <div class="study-verse active">
              <div class="study-verse-head">
                <span class="verse-ref ${state.read.has(v.id) ? 'read' : ''}" id="activeRef" title="Where this sits in the book (m)">${v.id}</span>
              </div>
              <div class="verse">
                <div class="verse-english">${v.english}</div>
                <div class="verse-greek">${v.greek}</div>
              </div>
            </div>
          ` : `
            <button class="study-verse-line ${state.read.has(v.id) ? 'read' : ''}" data-ref="${v.id}" title="Study ${v.id}">
              <span class="study-verse-ref">${v.id}</span>
              <span class="study-verse-incipit">${escapeHtml(incipit(v))}</span>
            </button>
          `).join('')}
        </div>
      </section>

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
          <button class="quiet-btn lens-icon ${prefs.greek ? 'on' : ''}" id="greekToggle" title="The Greek alongside (g)" aria-label="Show the Greek">${ALPHA_ICON}</button>
          <button class="quiet-btn lens-icon on" onclick="flipStone()" title="Back to the text (f)" aria-label="Back to the text">${BOOK_ICON}</button>
        </div>
      </div>
    `;

    surface.querySelectorAll('.verse .person').forEach(el => {
      const p = PEOPLE[el.dataset.person];
      el.title = p.description ? `${p.name} · ${p.description}` : p.name;
    });

    surface.querySelectorAll('.study-verse-line[data-ref]').forEach(el => {
      el.addEventListener('click', () => goToVerse(el.getAttribute('data-ref'), false, true));
    });

    document.getElementById('greekToggle').addEventListener('click', toggleGreek);
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
