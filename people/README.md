# People

Marcus names about a hundred people. Of those, 67 are linked: each is marked with a faint dotted underline in the passage and listed under "People in this passage" on the study side, with a one-line description and a link to their English Wikipedia article.

## How the list was made

1. **Candidates.** Every capitalised name in Farquharson's text was extracted and checked by hand. Gods, places, schools ("Stoics") and words like *Nature* were left out.
2. **Identities.** Where a name is ambiguous, Farquharson's 1944 commentary decides:
   - **Verus** is Marcus's grandfather in I.1, his father in VIII.25, and the co-emperor Lucius Verus in VIII.37.
   - **Alexander** is the grammarian of Cotiaeum in I.10, the rhetorician of Seleucia in I.12, and Alexander the Great elsewhere.
   - **Cato** is Cato the Younger in I.14 and Cato the Elder in IV.33.
   - **Antoninus** is linked only where it means Antoninus Pius, not where Marcus means himself (VI.26, VI.44).

   `only` and `except` in `people.json` pin these.
3. **Not linked:** mythological figures (Nestor, Clotho, Aesculapius), and people with no Wikipedia article (Diognetus the painting master, Cinna Catulus, and most of the obscure contemporaries in VIII.25, VIII.31, X.31 and XII.27). Farquharson's commentary often says who they were.
4. **Descriptions.** `fetch_wikipedia.py` checks that each article exists and isn't a disambiguation page, then archives its one-line description in `raw/wikipedia/people.json`. The build reads only that copy.

## Changing it

- **Add a person, or fix an identification:** edit `people.json`, then run:

  ```sh
  python3 people/fetch_wikipedia.py
  python3 build_data.py
  ```

  The fetch is resumable: it re-requests only people whose article title changed.
- **Match an alternative spelling:** add it to that person's `forms`. Longer forms win, so "Alexander the Great" is matched before "Alexander".
