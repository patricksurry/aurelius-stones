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
const READ_WPM = 160;
const READ_MIN_MS = 4000;
const IDLE_MS = 7000;


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

// #IV.3 opens that passage; #headland opens that stone at its first unread passage
function refFromHash(readSet) {
  const h = decodeURIComponent(location.hash.slice(1));
  if (VERSE_BY_ID[h]) return h;
  const stone = STONE_BY_ID[h];
  if (stone && stone.verseIds.length) {
    return (readSet && stone.verseIds.find(id => !readSet.has(id))) || stone.verseIds[0];
  }
  return null;
}

// theme: 'system' follows the machine; 'day' or 'night' once you choose
// mapView: 'stones' (the 48 stones grouped by theme with their passage ribbons) or 'books' (12 books + stone pebbles)
const prefs = { theme: 'system', greek: false, mapView: 'stones', ...load('meditations_prefs_v1', {}) };
const initialRead = new Set(load('meditations_read_v1', []));
const savedRef = load('meditations_pos_v1', 'I.1');
const hashRef = refFromHash(initialRead);
const startRef = hashRef || (VERSE_BY_ID[savedRef] ? savedRef : 'I.1');

let state = {
  currentVerseRef: startRef,
  currentStoneId: VERSE_BY_ID[startRef].stoneId,
  flipped: false,
  mapOpen: false,
  claimed: load('meditations_full_v1', {}),
  read: initialRead,
  // When progress was last cleared, so a clear reaches your other devices
  cleared: load('meditations_cleared_v1', 0),
  // Your shared snapshot, if any: { key, t }, with key null once you stop sharing (synced like progress)
  share: load('meditations_share_v1', null),
  // Someone's shared snapshot this link opened (?k=…): { key, stones }, fetched by sync.js
  baseline: load('meditations_baseline_v1', null)
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
  return { claimed: state.claimed, read: [...state.read], cleared: state.cleared, share: state.share };
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
  if (remote.share && remote.share.t > ((state.share && state.share.t) || 0)) {
    setShare(remote.share);
    changed = true;
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
  state.cleared = when;
  store('meditations_full_v1', state.claimed);
  store('meditations_read_v1', []);
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
  signIn: null, sendLink: null, confirm: null, signOut: null, share: null, unshare: null
};

// Today's stone: the same for everyone on a given (local) day. Stepping by 17, which shares
// no factor with 48, visits every stone in turn while moving between the three themes.
function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function todayStone(d = new Date()) {
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return STONES[(days * 17) % STONES.length];
}

// Whether today's stone has been visited yet today
function todaySeen() {
  return load('meditations_today_v1', '') === dayKey();
}

function isClaimed(stoneId) {
  const stone = STONE_BY_ID[stoneId];
  if (!stone) return false;
  const c = state.claimed[stoneId];
  if (!c) return false;
  if (typeof c.claimed === 'boolean') return c.claimed;
  return Boolean(c.maxim && c.maxim.trim() && c.maxim.trim() !== stone.defaultMaxim);
}

function getStoneHeadline(stone) {
  const c = state.claimed[stone.id];
  return (isClaimed(stone.id) && c.maxim.trim()) ? c.maxim : suggestedMaxim(stone);
}

// SHARING. Sharing publishes a snapshot of the stones you've claimed and your reflections
// (not what you've read) at shared/{key}, and puts ?k={key} in your address, so any link you copy
// carries it. Opening such a link makes that snapshot the baseline: its maxims become the suggested
// ones and its reflections show beside your own, while what you claim or write stays yours.

function linkKey() {
  return new URLSearchParams(location.search).get('k');
}

// The snapshot this page is showing as its baseline, unless it's your own
function sharedStones() {
  const k = linkKey();
  const b = state.baseline;
  return (k && b && b.key === k && k !== (state.share && state.share.key)) ? b.stones : null;
}

function sharedEntry(stone) {
  const stones = sharedStones();
  return (stones && stones[stone.id]) || null;
}

// The summary offered for a stone you haven't claimed: the shared one, else the book's
function suggestedMaxim(stone) {
  const e = sharedEntry(stone);
  return (e && e.maxim) || stone.defaultMaxim;
}

// What a snapshot holds: each stone you've claimed or written about
function shareSnapshot() {
  const stones = {};
  for (const [id, c] of Object.entries(state.claimed)) {
    const reflection = (c.reflection || '').trim();
    if (!STONE_BY_ID[id] || !(isClaimed(id) || reflection)) continue;
    stones[id] = { ...(isClaimed(id) ? { maxim: c.maxim } : {}), ...(reflection ? { reflection } : {}) };
  }
  return stones;
}

// Put a share key in the address, or take it out (null), keeping the passage
function setLinkKey(key) {
  const url = new URL(location.href);
  if (key) url.searchParams.set('k', key);
  else url.searchParams.delete('k');
  history.replaceState(history.state, '', url);
}

// Your own sharing turned on or off (here, or arriving from another device)
function setShare(share) {
  const old = state.share && state.share.key;
  state.share = share;
  store('meditations_share_v1', share);
  if (share.key && (!linkKey() || linkKey() === old)) setLinkKey(share.key);
  else if (!share.key && old && linkKey() === old) setLinkKey(null);
}

// The link to the passage you're on, with your share key
function shareLink() {
  const url = new URL(location.href);
  url.search = `?k=${state.share.key}`;
  return url.href;
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
