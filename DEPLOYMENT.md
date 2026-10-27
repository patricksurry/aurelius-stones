# Deployment

**Live:** <https://patricksurry.github.io/aurelius-stones/>

The app is static files served by GitHub Pages. Optional sign-in and cross-device progress use Firebase (Auth + Firestore) in the GCP project `aurelius-stones`. Reading needs no account. Without Firebase, the app still works and keeps progress in the browser.

## Publish

Push to `main`. GitHub Pages serves the repo root as is (`.nojekyll` turns off Jekyll) and is live a minute or so later.

Before pushing:
- after changing CSS or JS, run `python3 stamp.py`. It puts a hash of each file's contents into its link in `index.html`, so browsers don't mix a new page with stale cached files.
- after changing anything that feeds the dataset, run `python3 build_data.py`. It rewrites `data/meditations.js`, then stamps everything the same way.

## Firebase setup

All of this is in the [Firebase console](https://console.firebase.google.com/project/aurelius-stones), on the free Spark plan with no billing. The web app's config, which is public by design, is in `js/sync.js`.

| What | Where | Setting |
|---|---|---|
| Sign-in providers | Authentication → Sign-in method | Google; GitHub; Email/Password with **Email link** on. The app has no password form. |
| GitHub provider | github.com → Settings → Developer settings → OAuth Apps | Callback URL `https://aurelius-stones.firebaseapp.com/__/auth/handler`. The client ID and secret are entered only in Firebase. |
| Authorized domains | Authentication → Settings | `localhost`, `patricksurry.github.io` (plus Firebase's own two) |
| Database | Firestore Database | Production mode, rules from `firestore.rules`: each user can read and write only `progress/{uid}` |
| API key restriction | [GCP console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials?project=aurelius-stones) → browser key | Websites `https://patricksurry.github.io/*`, `http://localhost:8765/*`, `https://aurelius-stones.firebaseapp.com/*`. The last one is required, because Firebase's sign-in pages use the key. |
| Sign-in email | Authentication → Templates | Sent from `noreply@aurelius-stones.firebaseapp.com` |

If you change `firestore.rules`, paste the new version into Firestore → Rules and publish it there. It isn't deployed automatically.

## How sync works

`js/sync.js` loads Firebase from Google's CDN, and `js/account.js` draws the sign-in choices it provides. They work with the rest of the app (`js/store.js`) through `progressSnapshot()`, `mergeProgress()`, a `progress` event and the `account` object.

- Each signed-in user has one document in Firestore, `progress/{uid}`: `{claimed, read, cleared, updated}`.
- When you sign in, the browser's own progress is merged with the saved copy:
  - passages read on either side are kept;
  - for each stone, the latest edit wins (every entry carries a timestamp `t`);
  - "clear progress" records when it happened (`cleared`), and a newer clear wipes everything older on either side, so it reaches every device.
- Changes are saved about 2 seconds after the last edit, and straight away if the tab is hidden.
- Not synced, kept per browser in `localStorage`: your place in the book, theme, the Greek toggle, and whether you've opened the map.
- One account per email: if someone who first used one provider tries another with the same email, they're asked to use the first, and the new provider is then linked to the same account.

## Run locally

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open <http://localhost:8765/index.html>. Use `localhost`, not `127.0.0.1`, which isn't an authorized domain, so sign-in would fail there.
