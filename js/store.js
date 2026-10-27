// The dataset, saved progress (localStorage) and the helpers everything else shares.
// Loaded first; the other scripts use its globals.

const DATA = window.MEDITATIONS_DATA;
const BOOKS = DATA.books;
const STONES = DATA.stones;
const VERSES = DATA.verses;
const PEOPLE = DATA.people;

const STONE_BY_ID = Object.fromEntries(STONES.map(s => [s.id, s]));
const VERSE_BY_ID = Object.fromEntries(VERSES.map(v => [v.id, v]));

// A passage counts as read after dwelling on it at a contemplative pace
const READ_WPM = 130;
const READ_MIN_MS = 10000;
const IDLE_MS = 2500;


function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function store(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

// theme: 'system' follows the machine; 'day' or 'night' once you choose
const prefs = { theme: 'system', greek: false, ...load('meditations_prefs_v1', {}) };
const startRef = VERSE_BY_ID[load('meditations_pos_v1', 'I.1')] ? load('meditations_pos_v1', 'I.1') : 'I.1';

let state = {
  currentVerseRef: startRef,
  currentStoneId: VERSE_BY_ID[startRef].stoneId,
  flipped: false,
  mapOpen: false,
  claimed: load('meditations_full_v1', {}),
  read: new Set(load('meditations_read_v1', [])),
  // Unfinished "in your own words" summaries, per stone
  drafts: load('meditations_drafts_v1', {}),
  // When progress was last cleared, so a clear reaches your other devices
  cleared: load('meditations_cleared_v1', 0)
};

function save() {
  store('meditations_full_v1', state.claimed);
  document.dispatchEvent(new Event('progress'));
}

// Cross-device sync (sync.js) exchanges this with the signed-in reader's copy.
// Passages read only accumulate; for each stone the latest edit wins,
// which is why an un-claimed stone keeps an entry with its time (t).
// A newer clear wipes everything older on either side.
function progressSnapshot() {
  return { claimed: state.claimed, read: [...state.read], cleared: state.cleared };
}

function mergeProgress(remote) {
  let changed = false;
  if ((remote.cleared || 0) < state.cleared) return false;  // theirs predates our clear; ours will replace it
  if ((remote.cleared || 0) > state.cleared) {
    wipeProgress(remote.cleared);
    changed = true;
  }
  for (const ref of remote.read || []) {
    if (VERSE_BY_ID[ref] && !state.read.has(ref)) { state.read.add(ref); changed = true; }
  }
  for (const [id, theirs] of Object.entries(remote.claimed || {})) {
    const ours = state.claimed[id];
    if (STONE_BY_ID[id] && (!ours || (theirs.t || 0) > (ours.t || 0))) { state.claimed[id] = theirs; changed = true; }
  }
  if (changed) {
    store('meditations_full_v1', state.claimed);
    store('meditations_read_v1', [...state.read]);
  }
  return changed;
}

function wipeProgress(when) {
  state.claimed = {};
  state.read = new Set();
  state.drafts = {};
  state.cleared = when;
  store('meditations_full_v1', state.claimed);
  store('meditations_read_v1', []);
  store('meditations_drafts_v1', state.drafts);
  store('meditations_cleared_v1', when);
}

// Start over: forget what's been read and claimed, here and (when signed in) everywhere
function clearProgress() {
  wipeProgress(Date.now());
  document.dispatchEvent(new Event('progress'));
}

// Sign-in state, shown by account.js and driven by sync.js once Firebase loads.
// mode: 'idle', 'email' (asking for an address) or 'confirm' (finishing a link opened elsewhere)
const account = {
  ready: false, user: null, mode: 'idle', note: '',
  signIn: null, sendLink: null, confirm: null, signOut: null
};

function isClaimed(stoneId) {
  const stone = STONE_BY_ID[stoneId];
  if (!stone) return false;
  const c = state.claimed[stoneId];
  return Boolean(c && c.maxim && c.maxim.trim() && c.maxim.trim() !== stone.defaultMaxim);
}

function getStoneHeadline(stone) {
  const c = state.claimed[stone.id];
  return (c && c.maxim && c.maxim.trim()) ? c.maxim : stone.defaultMaxim;
}

function autoResize(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function bookOf(verse) {
  return BOOKS.find(b => b.book === verse.book);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
