// Moving around (book order, within a stone, study, Greek), earning reads,
// fading controls, theme, the welcome page, and start-up. Loaded last.

function toggleGreek() {
  prefs.greek = !prefs.greek;
  store('meditations_prefs_v1', prefs);
  document.body.classList.toggle('show-greek', prefs.greek);
  const btn = document.getElementById('greekToggle');
  if (btn) btn.classList.toggle('on', prefs.greek);
}

function goToVerse(ref) {
  const vObj = VERSE_BY_ID[ref];
  if (!vObj || vObj.id === state.currentVerseRef) return;
  const newStone = vObj.stoneId !== state.currentStoneId;
  state.currentVerseRef = vObj.id;
  state.currentStoneId = vObj.stoneId;
  const wasFlipped = state.flipped;
  state.flipped = false;
  // Clear the old stone's neighbours at once, so they never linger beside the new stone
  if (newStone) document.getElementById('relatedRow').innerHTML = '';
  store('meditations_pos_v1', vObj.id);

  const surface = document.getElementById('stoneSurface');
  const oldPassage = surface.querySelector('.passage');

  // Paging within a stone: only the passage crossfades; the stone stays put
  if (!newStone && !wasFlipped && oldPassage) {
    oldPassage.classList.add('fading');
    setTimeout(() => {
      state.verseEntering = true;
      render();
      state.verseEntering = false;
      const fresh = surface.querySelector('.passage');
      requestAnimationFrame(() => requestAnimationFrame(() => fresh.classList.remove('fading')));
      if (fresh.getBoundingClientRect().top < 0) fresh.scrollIntoView({ behavior: 'smooth' });
    }, 220);
    return;
  }

  // Moving to another stone: the whole stone crossfades
  surface.classList.add('fading');
  setTimeout(() => {
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    requestAnimationFrame(() => surface.classList.remove('fading'));
  }, 220);
}

// Enter a stone at its first unread passage
function goToStone(stoneId) {
  const stone = STONE_BY_ID[stoneId];
  if (!stone || !stone.verseIds.length) return;
  goToVerse(stone.verseIds.find(id => !state.read.has(id)) || stone.verseIds[0]);
}

// Through the book, in Marcus's order
function stepLinear(delta) {
  const idx = VERSES.findIndex(v => v.id === state.currentVerseRef);
  goToVerse(VERSES[(idx + delta + VERSES.length) % VERSES.length].id);
}

// Through the passages resting on the current stone, stopping at either end
function stepStone(delta) {
  const ids = STONE_BY_ID[state.currentStoneId].verseIds;
  const target = ids[ids.indexOf(state.currentVerseRef) + delta];
  if (target) goToVerse(target);
}

function flipStone(personId) {
  state.flipped = !state.flipped;
  render();
  const entry = personId && document.querySelector(`.person-entry[data-person="${personId}"]`);
  if (entry) {
    entry.classList.add('focused');
    entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// =====================================================
// READING: EARN PROGRESS BY DWELLING ON THE PASSAGE
// Time only accrues while the page is visible and focused,
// the stone is face up, and the map is closed.
// =====================================================
function readThresholdMs(verse) {
  const words = verse.english.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(READ_MIN_MS, (words / READ_WPM) * 60000);
}

const dwell = { ref: null, ms: 0, last: performance.now() };

function markRead(ref) {
  state.read.add(ref);
  store('meditations_read_v1', [...state.read]);
  document.dispatchEvent(new Event('progress'));
  const activeRef = document.getElementById('activeRef');
  if (activeRef) activeRef.classList.add('read');
  const currentDot = document.querySelector('.pager-dot.current');
  if (currentDot) currentDot.classList.add('read');
  renderProgress();
}

setInterval(() => {
  const now = performance.now();
  const dt = Math.min(now - dwell.last, 1000);
  dwell.last = now;
  if (dwell.ref !== state.currentVerseRef) {
    dwell.ref = state.currentVerseRef;
    dwell.ms = 0;
    return;
  }
  if (state.read.has(dwell.ref)) return;
  if (document.hidden || !document.hasFocus() || state.flipped || state.mapOpen || !document.getElementById('welcome').hidden) return;
  dwell.ms += dt;
  if (dwell.ms >= readThresholdMs(VERSE_BY_ID[dwell.ref])) markRead(dwell.ref);
}, 500);

// =====================================================
// QUIET CHROME: CONTROLS FADE WHEN YOU'RE STILL OR WRITING
// =====================================================
let idleTimer = null;

function wake() {
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => document.body.classList.add('idle'), IDLE_MS);
}

['mousemove', 'mousedown', 'touchstart'].forEach(evt => window.addEventListener(evt, wake, { passive: true }));

// After a pause in writing, hand the keyboard back to the card so the arrows move between passages again
const RELEASE_MS = 5000;
let releaseTimer = null;
const armRelease = (e) => {
  if (e.target.tagName !== 'TEXTAREA') return;
  clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    if (document.activeElement === e.target) e.target.blur();
  }, RELEASE_MS);
};
document.addEventListener('focusin', armRelease);
document.addEventListener('keydown', armRelease);

// =====================================================
// WIRING
// =====================================================
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5"/></svg>';

function isNight() {
  return prefs.theme === 'system' ? systemDark.matches : prefs.theme === 'night';
}

function applyTheme() {
  const night = isNight();
  if (night) document.body.setAttribute('data-theme', 'night');
  else document.body.removeAttribute('data-theme');
  const btn = document.getElementById('themeToggle');
  btn.innerHTML = night ? SUN : MOON;
  btn.title = night ? 'Switch to day' : 'Switch to night';
}

// Choosing the machine's own setting goes back to following it
document.getElementById('themeToggle').addEventListener('click', () => {
  const wantNight = !isNight();
  prefs.theme = wantNight === systemDark.matches ? 'system' : (wantNight ? 'night' : 'day');
  store('meditations_prefs_v1', prefs);
  applyTheme();
});
systemDark.addEventListener('change', applyTheme);

document.getElementById('progressBtn').addEventListener('click', toggleMap);
document.getElementById('stoneSurface').addEventListener('click', (e) => {
  if (e.target.id === 'activeRef') toggleMap();
  const person = e.target.closest('.verse .person');
  if (person) flipStone(person.dataset.person);
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
    // Writing: let the controls fall away
    document.body.classList.add('idle');
    if (e.key === 'Escape') e.target.blur();
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (!document.getElementById('welcome').hidden) {
    if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); hideWelcome(); }
    return;
  }
  if (e.key === 'Escape') {
    if (state.mapOpen) toggleMap();
    else if (state.flipped) flipStone();
    return;
  }
  if (state.mapOpen && e.key !== 'm') return;
  wake();
  if (e.key === 'ArrowLeft') stepLinear(-1);
  if (e.key === 'ArrowRight') stepLinear(1);
  if (e.key === 'ArrowUp' && !state.flipped) { e.preventDefault(); stepStone(-1); }
  if (e.key === 'ArrowDown' && !state.flipped) { e.preventDefault(); stepStone(1); }
  if (e.key === 'f') flipStone();
  if (e.key === 'g') toggleGreek();
  if (e.key === 'm') toggleMap();
});

// Welcome: once on first visit; Begin (or Enter / Esc) leads into the reading
function showWelcome() {
  const el = document.getElementById('welcome');
  el.classList.remove('leaving');
  el.hidden = false;
}

function hideWelcome() {
  const el = document.getElementById('welcome');
  if (el.hidden) return;
  store('meditations_welcomed_v1', true);
  el.classList.add('leaving');
  setTimeout(() => { el.hidden = true; }, 600);
}

document.getElementById('welcomeBegin').addEventListener('click', hideWelcome);

applyTheme();
document.body.classList.toggle('show-greek', prefs.greek);
render();
wake();
if (!load('meditations_welcomed_v1', false)) showWelcome();
