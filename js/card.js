// The stone card: its passage, neighbours, own-words and notes, the study side,
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

function render() {
  const stone = STONE_BY_ID[state.currentStoneId] || STONES[0];
  const claimed = isClaimed(stone.id);
  const user = state.claimed[stone.id] || {};
  const hasCustomMaxim = Boolean(user.maxim && user.maxim.trim() && user.maxim.trim() !== stone.defaultMaxim);

  renderProgress();

  const stoneVerses = stone.verseIds.map(id => VERSE_BY_ID[id]).filter(Boolean);
  const activeV = VERSE_BY_ID[state.currentVerseRef];

  const surface = document.getElementById('stoneSurface');
  surface.className = `stone ${claimed ? 'claimed' : ''} ${state.flipped ? 'underside' : ''}`;

  if (!state.flipped) {
    surface.innerHTML = `
      <div class="maxim-wrap">
        <textarea class="maxim" id="maximField" rows="1" spellcheck="false"
                  aria-label="This stone's summary: rewrite it in your own words">${escapeHtml(getStoneHeadline(stone))}</textarea>
        <div class="suggested" id="suggestedMaxim" ${hasCustomMaxim ? '' : 'hidden'}>
          suggested: “${escapeHtml(stone.defaultMaxim)}”<button class="quiet-btn" id="restoreMaxim">use this</button>
        </div>
      </div>

      ${passageHtml(stone, activeV, state.verseEntering)}

      <div class="divider"></div>

      <textarea id="ownWordsField" class="own-words" rows="1" ${hasCustomMaxim ? 'hidden' : ''}
                placeholder="In your own words…" title="Press Enter to make this the stone's summary">${escapeHtml(state.drafts[stone.id] || '')}</textarea>
      <textarea id="reflectionField" class="reflection-input" rows="1"
                placeholder="Notes…">${escapeHtml(user.reflection || '')}</textarea>

      <div class="card-foot chrome">
        <div class="pager-dots">
          ${stoneVerses.length > 1 ? stoneVerses.map(v => `
            <button class="pager-dot ${state.read.has(v.id) ? 'read' : ''} ${v.id === activeV.id ? 'current' : ''}"
                    data-ref="${v.id}" title="${v.id} — ${escapeHtml(incipit(v))}"></button>
          `).join('') : ''}
        </div>
        <div class="lens">
          <button class="quiet-btn greek-label ${prefs.greek ? 'on' : ''}" id="greekToggle" title="Show the Greek (g)">ἑλληνιστί</button>
          <button class="quiet-btn" onclick="flipStone()" title="Commentary, another translation, the Greek (f)">Study</button>
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

    const maximField = document.getElementById('maximField');
    const ownWordsField = document.getElementById('ownWordsField');
    const reflectionField = document.getElementById('reflectionField');
    autoResize(maximField);
    autoResize(reflectionField);

    const persist = () => {
      const mVal = maximField.value.trim();
      const rVal = reflectionField.value.trim();
      const changedMaxim = Boolean(mVal) && mVal !== stone.defaultMaxim;
      state.claimed[stone.id] = { maxim: changedMaxim ? mVal : stone.defaultMaxim, reflection: rVal, t: Date.now() };
      save();
      document.getElementById('suggestedMaxim').hidden = !changedMaxim;
      ownWordsField.hidden = changedMaxim;
      surface.classList.toggle('claimed', isClaimed(stone.id));
      renderRelated(stone);
      renderProgress();
    };

    // The summary is edited in place; the first keystroke replaces a suggested one
    maximField.addEventListener('focus', () => {
      if (!isClaimed(stone.id)) maximField.select();
    });
    maximField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); maximField.blur(); }
    });
    maximField.addEventListener('input', () => { autoResize(maximField); persist(); });
    maximField.addEventListener('blur', () => {
      if (!maximField.value.trim()) { maximField.value = stone.defaultMaxim; autoResize(maximField); persist(); }
    });
    document.getElementById('restoreMaxim').addEventListener('click', () => {
      maximField.value = stone.defaultMaxim;
      autoResize(maximField);
      persist();
    });
    reflectionField.addEventListener('input', () => { autoResize(reflectionField); persist(); });

    // After studying, write the summary in your own words; Enter puts it at the top.
    // Until then it's a draft that survives leaving the field or the stone.
    const saveDraft = () => {
      const words = ownWordsField.value;
      if (words.trim()) state.drafts[stone.id] = words;
      else delete state.drafts[stone.id];
      store('meditations_drafts_v1', state.drafts);
    };
    const commitOwnWords = () => {
      const words = ownWordsField.value.trim();
      if (!words || words === stone.defaultMaxim) return;
      maximField.value = words;
      ownWordsField.value = '';
      saveDraft();
      autoResize(maximField);
      persist();
      ownWordsField.blur();
    };
    autoResize(ownWordsField);
    ownWordsField.addEventListener('input', () => { autoResize(ownWordsField); saveDraft(); });
    ownWordsField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commitOwnWords(); }
    });

  } else {
    // UNDERSIDE: study this passage through other sources (see raw/SOURCES.md)
    const book = bookOf(activeV);
    surface.innerHTML = `
      <div class="study-ref">${activeV.id}</div>
      <div class="study-title">“${escapeHtml(getStoneHeadline(stone))}”</div>

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

      <section class="study-section">
        <h2 class="study-head">George Long's translation, 1862</h2>
        <p>${escapeHtml(activeV.long)}</p>
      </section>

      <section class="study-section">
        <h2 class="study-head">Greek</h2>
        <p class="greek">${activeV.greek}</p>
      </section>

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

      <div class="card-foot lens chrome">
        <button class="quiet-btn on" onclick="flipStone()" title="Back to the text (f)">Study</button>
      </div>
    `;
  }

  renderRelated(stone);
}

// Three nearest stones by affinity, preferring ones you haven't yet made your own
function relatedPicks(currentStone) {
  const nearest = (currentStone.affinity || [])
    .map(id => STONE_BY_ID[id])
    .filter(s => s && s.id !== currentStone.id)
    .slice(0, 6);
  return [
    ...nearest.filter(s => !isClaimed(s.id)),
    ...nearest.filter(s => isClaimed(s.id))
  ].slice(0, 3);
}

function renderRelated(currentStone) {
  const row = document.getElementById('relatedRow');
  const picks = relatedPicks(currentStone);

  row.innerHTML = picks.map(s => `
    <button class="mini-stone ${isClaimed(s.id) ? 'claimed' : ''}" data-stone-id="${s.id}">
      ${escapeHtml(getStoneHeadline(s))}
    </button>
  `).join('');

  row.querySelectorAll('.mini-stone').forEach(btn => {
    btn.addEventListener('click', () => goToStone(btn.getAttribute('data-stone-id')));
  });
}
