// Moving around (book order, within a stone, study, Greek), earning reads,
// fading controls, theme, the welcome page, and start-up. Loaded last.

function toggleGreek() {
  prefs.greek = !prefs.greek;
  store('meditations_prefs_v1', prefs);
  document.body.classList.toggle('show-greek', prefs.greek);
  positionPager();
  const btn = document.getElementById('greekToggle');
  if (btn) btn.classList.toggle('on', prefs.greek);
}

let rollTimer = null;

function animateStoneRoll(surface, dir, prevMetrics) {
  const passage = surface.querySelector('.passage');
  const track = passage && passage.querySelector('.passage-track');
  const verseClip = passage && passage.querySelector('.verse-current .verse-clip');
  const verseEl = passage && passage.querySelector('.verse-current .verse');
  const headEl = passage && passage.querySelector('.verse-current .verse-head');
  const outNeighbor = passage && passage.querySelector(dir > 0 ? '.neighbor.prev' : '.neighbor.next');
  const outClip = outNeighbor && outNeighbor.querySelector('.neighbor-clip');
  const outBody = outNeighbor && outNeighbor.querySelector('.neighbor-body');
  const inNeighbor = passage && passage.querySelector(dir > 0 ? '.neighbor.next' : '.neighbor.prev');
  const inClip = inNeighbor && inNeighbor.querySelector('.neighbor-clip');
  if (!passage || !track || !verseClip || !verseEl) return;

  clearTimeout(rollTimer);
  const newPassageH = passage.offsetHeight;
  const newVerseH = verseEl.offsetHeight;
  const neighH = (outClip && outClip.offsetHeight) || (inClip && inClip.offsetHeight) || 44;
  const origin = dir > 0 ? 'left top' : 'left bottom';

  // Lock the passage container to its previous height so the stone's bottom edge
  // and footer stones resize smoothly instead of jumping at frame 0
  passage.style.transition = 'none';
  passage.style.height = `${prevMetrics.passageH}px`;
  passage.style.clipPath = 'inset(0 -3.5rem 0 -2rem)';

  // Anchor the incoming verse to the edge that was already visible in its glimpse
  // (bottom edge when pulling down from prev, top edge when pulling up from next)
  // and use GPU scale + partial opacity instead of font-size so text never re-wraps mid-scroll
  verseClip.style.transition = 'none';
  verseClip.style.justifyContent = dir > 0 ? 'flex-start' : 'flex-end';
  verseClip.style.height = `${Math.min(prevMetrics.targetH || neighH, newVerseH)}px`;
  verseClip.style.overflow = 'hidden';

  verseEl.style.transition = 'none';
  verseEl.style.opacity = '0.28';
  verseEl.style.transformOrigin = origin;
  verseEl.style.transform = 'scale(0.92)';

  if (outClip && outBody && outNeighbor) {
    outClip.style.transition = 'none';
    outClip.style.height = `${Math.max(neighH, prevMetrics.verseH)}px`;
    outNeighbor.style.transition = 'none';
    outNeighbor.style.color = 'var(--ink-mid)';
    outBody.style.transition = 'none';
    outBody.style.opacity = '0.88';
    outBody.style.transformOrigin = origin;
    outBody.style.transform = 'scale(1.06)';
  }
  if (inNeighbor) {
    inNeighbor.style.transition = 'none';
    inNeighbor.style.opacity = '0';
  }
  if (headEl) {
    headEl.style.transition = 'none';
    headEl.style.opacity = '0';
  }

  // FLIP: align the incoming verse with the exact screen Y where its preview sat before render()
  track.style.transition = 'none';
  track.style.transform = 'translateY(0)';
  track.style.opacity = '0.45';
  const newTargetTop = verseClip.getBoundingClientRect().top;
  const shiftY = prevMetrics.targetTop != null ? (prevMetrics.targetTop - newTargetTop) : (dir > 0 ? 54 : -76);
  track.style.transform = `translateY(${shiftY}px)`;

  positionPager();
  void passage.offsetHeight;

  // Scale duration with the vertical travel and stone height change so large resizes
  // glide at roughly the same physical rate as small ones, with a gentle acceleration out of rest
  const heightDelta = Math.abs(newPassageH - prevMetrics.passageH);
  const scrollDelta = Math.max(Math.abs(newVerseH - neighH), Math.abs(prevMetrics.verseH - neighH));
  const effectiveDelta = Math.max(heightDelta, scrollDelta * 0.75);
  const dur = Math.round(Math.min(1150, Math.max(430, 380 + effectiveDelta * 1.45)));
  const fadeDur = Math.round(dur * 0.75);
  const fadeDelay = Math.round(dur * 0.2);
  const ease = `${dur}ms cubic-bezier(0.42, 0.08, 0.22, 1)`;

  passage.style.transition = `height ${ease}`;
  passage.style.height = `${newPassageH}px`;

  track.style.transition = `transform ${ease}, opacity ${fadeDur}ms ease`;
  track.style.transform = 'translateY(0)';
  track.style.opacity = '1';

  verseClip.style.transition = `height ${ease}`;
  verseClip.style.height = `${newVerseH}px`;
  verseEl.style.transition = `opacity ${fadeDur}ms ease, transform ${ease}`;
  verseEl.style.opacity = '1';
  verseEl.style.transform = 'scale(1)';

  if (outClip && outBody && outNeighbor) {
    outClip.style.transition = `height ${ease}`;
    outClip.style.height = `${neighH}px`;
    outNeighbor.style.transition = `color ${ease}`;
    outNeighbor.style.color = '';
    outBody.style.transition = `opacity ${fadeDur}ms ease, transform ${ease}`;
    outBody.style.opacity = '1';
    outBody.style.transform = 'scale(1)';
  }
  if (inNeighbor) {
    inNeighbor.style.transition = `opacity ${fadeDur}ms ease ${fadeDelay}ms`;
    inNeighbor.style.opacity = '';
  }
  if (headEl) {
    headEl.style.transition = `opacity ${fadeDur}ms ease ${fadeDelay}ms`;
    headEl.style.opacity = '1';
  }

  // Keep the right-margin dot ribbon gliding with the verse as it scrolls and resizes
  const t0 = performance.now();
  const syncPager = (now) => {
    positionPager();
    if (now - t0 < dur + 20) requestAnimationFrame(syncPager);
  };
  requestAnimationFrame(syncPager);

  rollTimer = setTimeout(() => {
    passage.style.transition = '';
    passage.style.height = '';
    passage.style.clipPath = '';
    track.style.transition = '';
    track.style.transform = '';
    track.style.opacity = '';
    verseClip.style.transition = '';
    verseClip.style.height = '';
    verseClip.style.overflow = '';
    verseClip.style.justifyContent = '';
    verseEl.style.transition = '';
    verseEl.style.opacity = '';
    verseEl.style.transform = '';
    verseEl.style.transformOrigin = '';
    if (outClip && outBody && outNeighbor) {
      outClip.style.transition = '';
      outClip.style.height = '';
      outNeighbor.style.transition = '';
      outBody.style.transition = '';
      outBody.style.opacity = '';
      outBody.style.transform = '';
      outBody.style.transformOrigin = '';
    }
    if (inNeighbor) {
      inNeighbor.style.transition = '';
    }
    if (headEl) { headEl.style.transition = ''; headEl.style.opacity = ''; }
    positionPager();
    if (passage.getBoundingClientRect().top < 0) passage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, dur + 20);
}

function goToVerse(ref, fromHistory = false, toStudy = false, linearDelta = 0) {
  const vObj = VERSE_BY_ID[ref];
  if (!vObj || (vObj.id === state.currentVerseRef && state.flipped === toStudy)) return;
  const oldRef = state.currentVerseRef;
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

  // Paging within a stone (including ←/→ when the next/prev book verse is on this same stone):
  // scroll the strip vertically while shrinking the outgoing verse and expanding the incoming one
  if (!newStone && !wasFlipped && !toStudy && oldPassage) {
    const ids = STONE_BY_ID[state.currentStoneId].verseIds;
    const dir = ids.indexOf(vObj.id) >= ids.indexOf(oldRef) ? 1 : -1;
    const oldVerseEl = oldPassage.querySelector('.verse-current .verse');
    const targetClip = oldPassage.querySelector(dir > 0 ? '.neighbor.next .neighbor-clip' : '.neighbor.prev .neighbor-clip');
    const prevMetrics = {
      passageH: oldPassage.offsetHeight,
      verseH: oldVerseEl ? oldVerseEl.offsetHeight : 80,
      targetH: targetClip ? targetClip.offsetHeight : 44,
      targetTop: targetClip ? targetClip.getBoundingClientRect().top : null
    };
    render();
    animateStoneRoll(surface, dir, prevMetrics);
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
  // As the passage is read, its dot in the pager slowly fills in
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
// The ribbon follows its reference as the text reflows
window.addEventListener('resize', positionPager);
if (document.fonts) document.fonts.ready.then(positionPager);
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
    onNeighbor: Boolean(e.target.closest('.neighbor'))
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
    confirmingClear = false;
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
render();
wake();
if (!load('meditations_welcomed_v1', false) && !hashRef) showWelcome();
