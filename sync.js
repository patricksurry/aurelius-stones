// Optional cross-device sync: sign in with Google, and your progress is kept
// in Firestore at progress/{uid}, readable only by you (see firestore.rules).
// Reading needs no account; this module only adds a "sign in" link to the map.
// It talks to index.html through progressSnapshot(), mergeProgress(), the
// 'progress' event and the account object, all defined there.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider
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

function showAccount(user) {
  if (user) {
    account.label = 'sign out';
    account.title = `Signed in as ${user.email}; your progress is kept across devices`;
    account.toggle = () => signOut(auth);
  } else {
    account.label = 'sign in';
    account.title = 'Sign in with Google to keep your progress across devices';
    account.toggle = () => signInWithPopup(auth, new GoogleAuthProvider()).catch(e => console.warn('Sign-in failed', e));
  }
  if (state.mapOpen) renderMap();
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
