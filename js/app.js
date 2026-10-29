// Moving around (book order, within a stone, study, Greek), earning reads,
// fading controls, theme, the welcome page, and start-up. Loaded last.

function toggleGreek() {
  prefs.greek = !prefs.greek;
  store('meditations_prefs_v1', prefs);
  document.body.classList.toggle('show-greek', prefs.greek);
  layoutWindow();
  const btn = document.getElementById('greekToggle');
  if (btn) btn.classList.toggle('on', prefs.greek);
}

// Along the stone: the column slides under the window as the window resizes to the new passage,
// taking a little longer the further it travels
function rollWindow(ref) {
  const win = document.getElementById('stoneWindow');
  const from = win.querySelector('.leaf.current');
  const to = win.querySelector(`.leaf[data-ref="${ref}"]`);
  const travel = Math.abs(to.offsetTop - from.offsetTop) + Math.abs(to.offsetHeight - from.offsetHeight);
  const ms = Math.round(Math.min(1300, 560 + travel * 0.45));
  setCurrentLeaf(ref);
  layoutWindow(ms);
  // A long passage may have carried the window's top off the screen: bring it back as it moves
  const top = win.getBoundingClientRect().top;
  if (top < 0) window.scrollBy({ top: top - 24, behavior: 'smooth' });
}

function goToVerse(ref, fromHistory = false, toStudy = false, linearDelta = 0) {
  const vObj = VERSE_BY_ID[ref];
  if (!vObj || (vObj.id === state.currentVerseRef && state.flipped === toStudy)) return;
  const newStone = vObj.stoneId !== state.currentStoneId;
  state.currentVerseRef = vObj.id;
  state.currentStoneId = vObj.stoneId;
  const wasFlipped = state.flipped;
  state.flipped = toStudy;
  store('meditations_pos_v1', vObj.id);
  if (!fromHistory) {
    const fn = (history.state && (history.state.map || history.state.study !== toStudy)) ? 'replaceState' : 'pushState';
    history[fn](toStudy ? { ref: vObj.id, study: true } : { ref: vObj.id }, '', `#${vObj.id}`);
  }

  const surface = document.getElementById('stoneSurface');
  const related = document.getElementById('relatedRow');
  const oldPassage = surface.querySelector('.passage');

  // Along this stone (including ←/→ when the next/prev book passage rests on it too): roll the column
  if (!newStone && !wasFlipped && !toStudy && oldPassage) {
    rollWindow(vObj.id);
    return;
  }

  // Moving to another stone in book order (←/→ or swipe left/right): slide the stone and footer stones horizontally
  if (newStone && linearDelta) {
    const outCls = linearDelta > 0 ? 'slide-out-left' : 'slide-out-right';
    const inCls = linearDelta > 0 ? 'slide-in-right' : 'slide-in-left';
    surface.classList.add(outCls);
    if (related) related.classList.add(outCls);
    setTimeout(() => {
      render();
      surface.classList.remove(outCls);
      surface.classList.add(inCls);
      if (related) {
        related.classList.remove(outCls);
        related.classList.add(inCls);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        surface.classList.remove(inCls);
        if (related) related.classList.remove(inCls);
      }));
    }, 300);
    return;
  }

  // Moving to another stone from the map / related stones (or switching passage on the study side): crossfade
  surface.classList.add('fading');
  if (newStone && related) related.classList.add('fading');
  setTimeout(() => {
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    requestAnimationFrame(() => {
      surface.classList.remove('fading');
      if (related) related.classList.remove('fading');
    });
  }, 320);
}

// Enter a stone at its first unread passage
function goToStone(stoneId) {
  const stone = STONE_BY_ID[stoneId];
  if (!stone || !stone.verseIds.length) return;
  goToVerse(stone.verseIds.find(id => !state.read.has(id)) || stone.verseIds[0]);
}

// Through the book, in Marcus's order, stopping at either end
function stepLinear(delta) {
  const idx = VERSES.findIndex(v => v.id === state.currentVerseRef);
  const target = VERSES[idx + delta];
  if (target) goToVerse(target.id, false, false, delta);
}

// Through the passages resting on the current stone, stopping at either end
function stepStone(delta) {
  const ids = STONE_BY_ID[state.currentStoneId].verseIds;
  const target = ids[ids.indexOf(state.currentVerseRef) + delta];
  if (target) goToVerse(target, false, state.flipped);
}

function focusPerson(personId) {
  const entry = personId && document.querySelector(`.person-entry[data-person="${personId}"]`);
  if (!entry) return false;
  document.querySelectorAll('.person-entry.focused').forEach(el => el.classList.remove('focused'));
  entry.classList.add('focused');
  entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
}

function flipStone(personId) {
  if (state.flipped && personId && focusPerson(personId)) return;
  state.flipped = !state.flipped;
  if (state.flipped) history.pushState({ ref: state.currentVerseRef, study: true }, '', `#${state.currentVerseRef}`);
  else history.replaceState({ ref: state.currentVerseRef }, '', `#${state.currentVerseRef}`);
  render();
  if (!focusPerson(personId)) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// =====================================================
// READING: EARN PROGRESS BY DWELLING ON THE PASSAGE
// Time accrues on both sides of the stone while the page
// is visible and the map is closed.
// =====================================================
function readThresholdMs(verse) {
  const words = verse.english.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
  return Math.max(READ_MIN_MS, (words / READ_WPM) * 60000);
}

const dwell = { ref: null, ms: 0, last: performance.now() };

// Replay a one-off CSS animation on an element
function flash(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function markRead(ref) {
  state.read.add(ref);
  store('meditations_read_v1', [...state.read]);
  document.dispatchEvent(new Event('progress'));
  const activeRef = document.getElementById('activeRef');
  if (activeRef) activeRef.classList.add('read');
  const currentDot = document.getElementById('currentDot');
  if (currentDot) currentDot.classList.add('read');
  renderProgress();
  offerOwnWords();
  // Earned: the ribbon of dots shows itself for a moment, the dot swells and settles; the reading line glows
  const dots = document.querySelector('.pager');
  if (dots) {
    dots.classList.add('revealed');
    setTimeout(() => dots.classList.remove('revealed'), 2600);
  }
  flash(currentDot, 'earned');
  flash(document.getElementById('progressRead'), 'earned');
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
  if (document.hidden || state.mapOpen || !document.getElementById('welcome').hidden) return;
  dwell.ms += dt;
  const threshold = readThresholdMs(VERSE_BY_ID[dwell.ref]);
  // As the passage is read, its dot in the ribbon slowly fills in
  const currentDot = document.getElementById('currentDot');
  if (currentDot) currentDot.style.setProperty('--dwell', Math.min(1, dwell.ms / threshold).toFixed(3));
  if (dwell.ms >= threshold) markRead(dwell.ref);
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
// The window follows its passage as the text reflows
window.addEventListener('resize', () => layoutWindow());
if (document.fonts) document.fonts.ready.then(() => layoutWindow());
const stoneEl = document.getElementById('stoneSurface');
stoneEl.addEventListener('click', (e) => {
  if (e.target.id === 'activeRef') toggleMap();
  const person = e.target.closest('.verse .person');
  if (person) flipStone(person.dataset.person);
});

// Touch: swipe left/right steps through the book; swipe up/down steps through this stone
let swipeStart = null;
stoneEl.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1 || e.target.tagName === 'TEXTAREA') { swipeStart = null; return; }
  swipeStart = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY,
    atTop: window.scrollY <= 8,
    atBottom: window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8,
    onNeighbor: Boolean(e.target.closest('.leaf:not(.current)'))
  };
}, { passive: true });
stoneEl.addEventListener('touchend', (e) => {
  if (!swipeStart || state.flipped || e.changedTouches.length !== 1) return;
  const dx = e.changedTouches[0].clientX - swipeStart.x;
  const dy = e.changedTouches[0].clientY - swipeStart.y;
  const { atTop, atBottom, onNeighbor } = swipeStart;
  swipeStart = null;
  if (window.getSelection()?.toString()) return;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.8) {
    stepLinear(dx < 0 ? 1 : -1);
  } else if (Math.abs(dy) > 45 && Math.abs(dy) > Math.abs(dx) * 1.6) {
    if (dy < 0 && (atBottom || onNeighbor)) stepStone(1);
    else if (dy > 0 && (atTop || onNeighbor)) stepStone(-1);
  }
}, { passive: true });

window.addEventListener('keydown', (e) => {
  // Writing: arrows move the cursor as usual. Esc, or an arrow pressed with the cursor
  // already at that end of the text, hands the keyboard back to the card.
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
    const field = e.target;
    const plain = !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
    const atStart = field.selectionStart === 0 && field.selectionEnd === 0;
    const atEnd = field.selectionStart === field.value.length && field.selectionEnd === field.value.length;
    const leaving = field.tagName === 'TEXTAREA' && plain &&
      ((atStart && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) ||
       (atEnd && (e.key === 'ArrowRight' || e.key === 'ArrowDown')));
    if (leaving || e.key === 'Escape') {
      e.preventDefault();
      field.blur();
      return;
    }
    // Let the controls fall away
    document.body.classList.add('idle');
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (!document.getElementById('welcome').hidden) {
    if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); hideWelcome(); }
    return;
  }
  if (e.key === 'Escape') {
    if (closeMenus()) return;
    if (state.mapOpen) toggleMap();
    else if (state.flipped) flipStone();
    return;
  }
  if (state.mapOpen && e.key !== 'm') return;
  wake();
  if (e.key === 'ArrowLeft') stepLinear(-1);
  if (e.key === 'ArrowRight') stepLinear(1);
  if (e.key === 'ArrowUp') { e.preventDefault(); stepStone(-1); }
  if (e.key === 'ArrowDown') { e.preventDefault(); stepStone(1); }
  if (e.key === 'f') flipStone();
  if (e.key === 'g') toggleGreek();
  if (e.key === 'm') toggleMap();
});

// Browser back/forward and #ref links
window.addEventListener('popstate', (e) => {
  const st = e.state || {};
  const targetRef = st.ref || refFromHash(state.read) || state.currentVerseRef;
  const wantMap = Boolean(st.map);
  const wantStudy = Boolean(st.study);
  if (state.mapOpen !== wantMap) {
    state.mapOpen = wantMap;
    closeMenus();
    renderMap();
  }
  if (targetRef !== state.currentVerseRef) {
    goToVerse(targetRef, true, wantStudy);
  } else if (state.flipped !== wantStudy) {
    state.flipped = wantStudy;
    render();
  }
});

// Welcome: once on first visit; Begin (or Enter / Esc) leads into the reading
function showWelcome() {
  const el = document.getElementById('welcome');
  el.classList.remove('leaving');
  el.hidden = false;
  renderAccount();
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
document.body.classList.toggle('map-seen', Boolean(prefs.mapSeen));
history.replaceState({ ref: state.currentVerseRef }, '', `#${state.currentVerseRef}`);
if (state.share && state.share.key && !linkKey()) setLinkKey(state.share.key);  // your links carry your share key
render();
wake();
if (!load('meditations_welcomed_v1', false) && !hashRef) showWelcome();
