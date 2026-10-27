// Optional cross-device sync: sign in with Google or GitHub, and your progress is kept
// in Firestore at progress/{uid}, readable only by you (see firestore.rules).
// Reading needs no account; this module only adds sign-in links to the map.
// It talks to index.html through progressSnapshot(), mergeProgress(), the
// 'progress' event and the account object, all defined there.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithPopup, signOut, linkWithCredential,
  GoogleAuthProvider, GithubAuthProvider
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';

// Public by design: access is controlled by the Firestore rules, not this key
const app = initializeApp({
  apiKey: 'AIzaSyBYgb-5jvqTVFqg-2aRaGMjhvGUOmUbKfI',
  authDomain: 'aurelius-stones.firebaseapp.com',
  projectId: 'aurelius-stones',
  storageBucket: 'aurelius-stones.firebasestorage.app',
  messagingSenderId: '159703210262',
  appId: '1:159703210262:web:79a93f707db9afe6d7d837'
});
const auth = getAuth(app);

const PUSH_DELAY_MS = 2000;
let stopListening = null;
let pushTimer = null;
let push = null;

const PROVIDERS = [
  { label: 'Google', make: () => new GoogleAuthProvider(), cls: GoogleAuthProvider },
  { label: 'GitHub', make: () => new GithubAuthProvider(), cls: GithubAuthProvider }
];

// One account per email: signing in with GitHub after first using Google (same email)
// is refused, so we keep that GitHub credential and link it after the original sign-in.
let pendingLink = null;

function showLinks(links, note = '') {
  account.links = links;
  account.note = note;
  if (state.mapOpen) renderMap();
}

function showSignedOut(note) {
  showLinks([{ label: 'sign in', title: 'Keep your progress across devices', act: showChoice }], note);
}

function showChoice(note = 'sign in with') {
  showLinks(PROVIDERS.map(p => ({ label: p.label, act: () => signInWith(p) })), note);
}

async function signInWith(p) {
  try {
    const { user } = await signInWithPopup(auth, p.make());
    if (pendingLink) {
      await linkWithCredential(user, pendingLink).catch(e => console.warn('Linking failed', e));
      pendingLink = null;
    }
  } catch (e) {
    if (e.code === 'auth/account-exists-with-different-credential') {
      pendingLink = p.cls.credentialFromError(e);
      const others = PROVIDERS.filter(o => o !== p).map(o => o.label).join(' or ');
      showChoice(`You've signed in with ${others} before; use that once, and ${p.label} will work too`);
    } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      console.warn('Sign-in failed', e);
      showSignedOut('Sign-in didn’t work');
    }
  }
}

function showAccount(user) {
  if (user) {
    showLinks([{
      label: 'sign out',
      title: `Signed in as ${user.email || user.displayName}; your progress is kept across devices`,
      act: () => signOut(auth)
    }]);
  } else {
    showSignedOut();
  }
}

// Re-rendering the stone would interrupt someone typing, so then only the progress updates
function refresh() {
  const typing = document.activeElement && document.activeElement.tagName === 'TEXTAREA';
  if (typing) renderProgress();
  else render();
}

async function startSync(user) {
  const { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } =
    await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js');
  const ref = doc(getFirestore(app), 'progress', user.uid);
  let loaded = false;

  push = () => setDoc(ref, { ...progressSnapshot(), updated: serverTimestamp() })
    .catch(e => console.warn('Saving progress failed', e));

  stopListening = onSnapshot(ref, (snap) => {
    if (snap.metadata.hasPendingWrites) return;  // our own write echoing back
    const remote = snap.data() || {};
    if (mergeProgress(remote)) refresh();
    // On arrival, send up anything done on this device while signed out
    if (!loaded) push();
    loaded = true;
  }, e => console.warn('Sync stopped', e));
}

function stopSync() {
  if (stopListening) stopListening();
  stopListening = null;
  push = null;
  clearTimeout(pushTimer);
}

document.addEventListener('progress', () => {
  if (!push) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, PUSH_DELAY_MS);
});

// Don't lose the last few seconds of typing when the tab closes
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && push && pushTimer) { clearTimeout(pushTimer); pushTimer = null; push(); }
});

onAuthStateChanged(auth, (user) => {
  stopSync();
  showAccount(user);
  if (user) startSync(user);
});
