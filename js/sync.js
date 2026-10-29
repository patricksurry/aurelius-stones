// Optional cross-device sync: sign in with Google, GitHub or an emailed link, and your progress is kept
// in Firestore at progress/{uid}, readable only by you (see firestore.rules).
// Sharing (see store.js) publishes a snapshot at shared/{key}, readable by anyone with the link.
// Reading needs no account; account.js shows the sign-in choices this module provides.
// It talks to index.html through progressSnapshot(), mergeProgress(), the
// 'progress' event and the account object, defined in store.js.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithPopup, signOut, linkWithCredential,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
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
// Where we remember the address a sign-in link was sent to, to finish signing in when it's opened
const EMAIL_KEY = 'meditations_signin_email';
let stopListening = null;
let pushTimer = null;
let push = null;

const PROVIDERS = {
  google: { label: 'Google', make: () => new GoogleAuthProvider(), cls: GoogleAuthProvider },
  github: { label: 'GitHub', make: () => new GithubAuthProvider(), cls: GithubAuthProvider }
};

// One account per email: signing in with GitHub after first using Google (same email)
// is refused, so we keep that GitHub credential and link it after the original sign-in.
let pendingLink = null;

function show(changes) {
  Object.assign(account, changes);
  renderAccount();
}

async function sendLink(email) {
  try {
    await sendSignInLinkToEmail(auth, email, { url: location.origin + location.pathname, handleCodeInApp: true });
    store(EMAIL_KEY, email);
    show({ mode: 'idle', note: `A sign-in link is on its way to ${email}` });
  } catch (e) {
    console.warn('Sending the sign-in link failed', e);
    show({ note: 'That didn’t send; check the address' });
  }
}

async function finishEmailLink(email) {
  try {
    const { user } = await signInWithEmailLink(auth, email, location.href);
    await afterSignIn(user);
  } catch (e) {
    console.warn('Email sign-in failed', e);
    show({ mode: 'idle', note: 'That link has expired or was already used; ask for a new one' });
  }
  localStorage.removeItem(EMAIL_KEY);
  history.replaceState(history.state, '', location.pathname + location.hash);
}

async function afterSignIn(user) {
  if (!pendingLink) return;
  await linkWithCredential(user, pendingLink).catch(e => console.warn('Linking failed', e));
  pendingLink = null;
}

async function signInWith(id) {
  const p = PROVIDERS[id];
  try {
    const { user } = await signInWithPopup(auth, p.make());
    await afterSignIn(user);
  } catch (e) {
    if (e.code === 'auth/account-exists-with-different-credential') {
      pendingLink = p.cls.credentialFromError(e);
      show({ mode: 'idle', note: `You've used this email another way before; sign in that way once, and ${p.label} will work too` });
    } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      console.warn('Sign-in failed', e);
      show({ mode: 'idle', note: 'Sign-in didn’t work; try again' });
    }
  }
}

const firestore = () => import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js');

// About 60 random bits, in letters and digits: unguessable, and short enough for a link
function newKey() {
  const abc = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(11)), b => abc[b % abc.length]).join('');
}

async function share() {
  const { getFirestore, doc, setDoc, serverTimestamp } = await firestore();
  const key = newKey();
  try {
    await setDoc(doc(getFirestore(app), 'shared', key),
      { owner: auth.currentUser.uid, stones: shareSnapshot(), created: serverTimestamp() });
  } catch (e) {
    console.warn('Sharing failed', e);
    show({ note: 'Sharing didn’t work; try again' });
    return;
  }
  setShare({ key, t: Date.now() });
  save();
  show({ note: '' });
}

async function unshare() {
  const { getFirestore, doc, deleteDoc } = await firestore();
  const key = state.share && state.share.key;
  if (key) await deleteDoc(doc(getFirestore(app), 'shared', key)).catch(e => console.warn('Unsharing failed', e));
  setShare({ key: null, t: Date.now() });
  save();
  renderAccount();
}

// Opened from someone's link: fetch their snapshot (no sign-in needed). If it's gone, drop the key.
async function loadShared() {
  const key = linkKey();
  if (!key || key === (state.share && state.share.key)) return;
  const { getFirestore, doc, getDoc } = await firestore();
  try {
    const snap = await getDoc(doc(getFirestore(app), 'shared', key));
    if (snap.exists()) {
      state.baseline = { key, stones: snap.data().stones || {} };
      store('meditations_baseline_v1', state.baseline);
    } else {
      setLinkKey(null);
    }
    refresh();
    if (state.mapOpen) renderMap();
  } catch (e) {
    console.warn('Loading the shared stones failed', e);
  }
}

Object.assign(account, {
  ready: true,
  signIn: signInWith,
  sendLink,
  confirm: finishEmailLink,
  signOut: () => signOut(auth),
  share,
  unshare
});

// Re-rendering the stone would interrupt someone typing, so then only the progress updates
function refresh() {
  const typing = document.activeElement && document.activeElement.tagName === 'TEXTAREA';
  if (typing) renderProgress();
  else render();
}

async function startSync(user) {
  const { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } = await firestore();
  const ref = doc(getFirestore(app), 'progress', user.uid);
  let loaded = false;

  push = () => setDoc(ref, { ...progressSnapshot(), updated: serverTimestamp() })
    .catch(e => console.warn('Saving progress failed', e));

  stopListening = onSnapshot(ref, (snap) => {
    if (snap.metadata.hasPendingWrites) return;  // our own write echoing back
    const remote = snap.data() || {};
    if (mergeProgress(remote)) refresh();
    // On arrival, send up anything done on this device while signed out;
    // and if this device cleared more recently, its (empty) copy wins
    if (!loaded || (remote.cleared || 0) < state.cleared) push();
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
  // (Signed out, keep any "confirm your email" step from a sign-in link in progress)
  show({ user: user ? (user.email || user.displayName || 'you') : null, ...(user ? { mode: 'idle', note: '' } : {}) });
  if (user) startSync(user);
});

// Arriving from a sign-in link: finish signing in. Opened in another browser
// than the one that asked for it, we need the address again to be sure it's yours.
if (isSignInWithEmailLink(auth, location.href)) {
  const email = load(EMAIL_KEY, null);
  if (email) {
    finishEmailLink(email);
  } else {
    show({ mode: 'confirm', note: '' });
    openMenu('accountMenu');
  }
}

loadShared();
