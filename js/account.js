// Sign-in, sharing and clearing progress: two small menus in the header (account and, once signed in,
// share), the sign-in prompt under Begin on the welcome page, and at the map's foot a note when this page
// came from someone's shared link. Each spot is an element with class "account"; renderAccount() redraws them all.

const ICONS = {
  google: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/></svg>',
  person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c1.2-3.9 4-5.8 7.5-5.8s6.3 1.9 7.5 5.8"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16"/></svg>'
};

const ACCOUNT_PROMPT = {
  menu: 'Saved in this browser · sign in to keep it across devices',
  welcome: 'Reading on another device? Sign in'
};

// Clearing asks first, in place
let confirmingClear = false;

function clearHtml() {
  const claimedCount = STONES.filter(s => isClaimed(s.id)).length;
  if (!state.read.size && !claimedCount) return '';
  if (!confirmingClear) return '<div class="menu-row"><button class="quiet-btn" data-acct="clear-ask">clear progress</button></div>';
  const what = [
    state.read.size ? `${state.read.size} passage${state.read.size === 1 ? '' : 's'} read` : '',
    claimedCount ? `${claimedCount} stone${claimedCount === 1 ? '' : 's'} claimed` : ''
  ].filter(Boolean).join(' and ');
  return `<div class="menu-row"><span class="acct-note">Forget ${what}${account.user ? ', on every device' : ''}?</span>
    <button class="quiet-btn" data-acct="clear-yes">clear</button>
    <button class="quiet-btn" data-acct="clear-no">keep</button></div>`;
}

// Sharing (see store.js): publish a snapshot of your stones and copy links to it
function shareHtml() {
  if (state.share && state.share.key) {
    return `<p class="acct-note">Anyone with your link can read the stones you'd claimed and your reflections when you shared them.</p>
      <div class="menu-row"><button class="quiet-btn" data-acct="copy">copy link</button> ·
      <button class="quiet-btn" data-acct="unshare">stop sharing</button></div>`;
  }
  return `<p class="acct-note">Share a snapshot of the stones you've claimed and your reflections. Anyone with the link can read it; your reading history stays private.</p>
    <div class="menu-row"><button class="quiet-btn" data-acct="share">share your stones</button></div>`;
}

// At the map's foot, a page opened from someone's link says so and can let it go
function sharedNoteHtml() {
  return sharedStones()
    ? `<span class="acct-note">Reading with someone's shared stones</span>
      <button class="quiet-btn" data-acct="leave">set them aside</button>`
    : '';
}

function signInHtml(place) {
  if (account.mode !== 'idle') {
    const note = account.note || (account.mode === 'confirm' ? 'Confirm your email to finish signing in' : '');
    return `${note ? `<span class="acct-note">${escapeHtml(note)}</span>` : ''}
      <input class="acct-field" type="email" autocomplete="email" placeholder="your email">
      <button class="quiet-btn" data-acct="send">${account.mode === 'confirm' ? 'sign in' : 'send link'}</button>
      <button class="quiet-btn" data-acct="cancel" title="Cancel">×</button>`;
  }
  return `<span class="acct-note">${escapeHtml(account.note || ACCOUNT_PROMPT[place])}</span>
    <span class="acct-icons">
      <button class="acct-icon" data-acct="google" title="Sign in with Google" aria-label="Sign in with Google">${ICONS.google}</button>
      <button class="acct-icon" data-acct="github" title="Sign in with GitHub" aria-label="Sign in with GitHub">${ICONS.github}</button>
      <button class="acct-icon" data-acct="email" title="Sign in with a link by email" aria-label="Sign in by email">${ICONS.email}</button>
    </span>`;
}

function accountHtml(place) {
  if (place === 'map') return sharedNoteHtml();
  if (place === 'share') return account.user ? shareHtml() : '';
  if (place === 'welcome') return account.ready && !account.user ? signInHtml(place) : '';
  // The account menu
  const who = !account.ready ? ''
    : account.user
      ? `<div class="menu-row"><span class="acct-note">${escapeHtml(account.note || `Signed in as ${account.user}`)}</span>
          <button class="quiet-btn" data-acct="out">sign out</button></div>`
      : `<div class="menu-row">${signInHtml(place)}</div>`;
  return who + clearHtml();
}

function accountAction(what, el) {
  const field = el.querySelector('.acct-field');
  if (what === 'google' || what === 'github') account.signIn(what);
  else if (what === 'email') { account.mode = 'email'; account.note = ''; renderAccount(); }
  else if (what === 'cancel') { account.mode = 'idle'; account.note = ''; renderAccount(); }
  else if (what === 'out') account.signOut();
  else if (what === 'share') account.share();
  else if (what === 'unshare') account.unshare();
  else if (what === 'copy') {
    navigator.clipboard.writeText(shareLink())
      .then(() => { account.note = 'Link copied'; renderAccount(); setTimeout(() => { account.note = ''; renderAccount(); }, 2500); })
      .catch(() => { account.note = shareLink(); renderAccount(); });
  }
  else if (what === 'leave') { setLinkKey((state.share && state.share.key) || null); render(); if (state.mapOpen) renderMap(); }
  else if (what === 'clear-ask') { confirmingClear = true; renderAccount(); }
  else if (what === 'clear-no') { confirmingClear = false; renderAccount(); }
  else if (what === 'clear-yes') { confirmingClear = false; clearProgress(); render(); renderAccount(); }
  else if (what === 'send') {
    const email = field.value.trim();
    if (!email.includes('@')) { field.focus(); return; }
    if (account.mode === 'confirm') account.confirm(email);
    else account.sendLink(email);
  }
}

function renderAccount() {
  document.getElementById('shareWrap').hidden = !(account.user && account.share);
  document.getElementById('accountBtn').classList.toggle('on', Boolean(account.user));
  document.querySelectorAll('.account').forEach(el => {
    el.innerHTML = accountHtml(el.dataset.place);
    el.querySelectorAll('[data-acct]').forEach(btn => {
      btn.addEventListener('click', () => accountAction(btn.dataset.acct, el));
    });
    const field = el.querySelector('.acct-field');
    if (field) {
      field.addEventListener('keydown', (e) => { if (e.key === 'Enter') accountAction('send', el); });
      if (el.offsetParent) field.focus();
    }
  });
}

// The header's menus: a button opens its menu; a click elsewhere, Esc, or the other menu closes it
function openMenu(id) {
  closeMenus(id);
  const menu = document.getElementById(id);
  menu.hidden = false;
  menu.previousElementSibling.setAttribute('aria-expanded', 'true');
  renderAccount();
}

function closeMenus(except) {
  let closed = false;
  document.querySelectorAll('.menu').forEach(menu => {
    if (menu.id === except || menu.hidden) return;
    menu.hidden = true;
    menu.previousElementSibling.setAttribute('aria-expanded', 'false');
    closed = true;
  });
  if (closed) confirmingClear = false;
  return closed;
}

[['shareBtn', 'shareMenu', ICONS.share], ['accountBtn', 'accountMenu', ICONS.person]].forEach(([btn, menu, icon]) => {
  const el = document.getElementById(btn);
  el.innerHTML = icon;
  el.addEventListener('click', () => {
    if (document.getElementById(menu).hidden) openMenu(menu);
    else closeMenus();
  });
});

// (The click's path, not its target: a menu redraws itself when one of its buttons is used)
document.addEventListener('click', (e) => {
  if (!e.composedPath().some(n => n.classList && n.classList.contains('menu-wrap'))) closeMenus();
});
