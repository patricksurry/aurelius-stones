// Optional cross-device sync: sign in with Google, GitHub or an emailed link, and your progress is kept
// in Firestore at progress/{uid}, readable only by you (see firestore.rules).
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

Object.assign(account, {
  ready: true,
  signIn: signInWith,
  sendLink,
  confirm: finishEmailLink,
  signOut: () => signOut(auth)
});

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
  if (state.mapOpen) renderMap();  // "on every device" in the clear prompt depends on this
  if (user) startSync(user);
});

// Arriving from a sign-in link: finish signing in. Opened in another browser
// than the one that asked for it, we need the address again to be sure it's yours.
if (isSignInWithEmailLink(auth, location.href)) {
  const email = load(EMAIL_KEY, null);
  if (email) {
    finishEmailLink(email);
  } else {
    if (!state.mapOpen) toggleMap();
    show({ mode: 'confirm', note: '' });
  }
}
