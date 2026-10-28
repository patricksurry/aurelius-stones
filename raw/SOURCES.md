# Sources

Every text in the app comes from one of the sources below. A copy of each is archived in this folder, so the dataset can be rebuilt (`python3 build_data.py`) without network access, and the exact versions used can be traced. All files were retrieved on 2026-10-25.

## Greek text: Leopold (Teubner, 1908)

- **Edition:** J. H. Leopold, *M. Antoninus Imperator Ad Se Ipsum* (Leipzig: Teubner, 1908).
- **Digital source:** Perseus Digital Library, `tlg0562.tlg001.perseus-grc2.xml` (release 2011-09-12), from <https://github.com/PerseusDL/canonical-greekLit/tree/master/data/tlg0562/tlg001>.
- **Licence:** CC BY-SA 4.0. Attribution: Perseus Project, Tufts University. Derived data must stay under the same licence.
- **Archived as:** `greek.xml`.

## Main English translation: Farquharson (Oxford, 1944)

- **Edition:** A. S. L. Farquharson, *The Meditations of the Emperor Marcus Antoninus* (Oxford: Clarendon Press, 1944).
- **Digital source:** Wikisource, <https://en.wikisource.org/wiki/The_Meditations_of_the_Emperor_Marcus_Antoninus>, proofread transcription of the 1944 scans.
- **Status:** public domain in the US (Wikisource hosts it as such; Farquharson died in 1942).
- **Archived as:** `farquharson_book_N.html` (rendered pages). Revisions used:

| Book | Text revision | Commentary revision |
|---|---|---|
| I | [9063624](https://en.wikisource.org/wiki/Special:Redirect/revision/9063624) | [9080743](https://en.wikisource.org/wiki/Special:Redirect/revision/9080743) |
| II | [9063625](https://en.wikisource.org/wiki/Special:Redirect/revision/9063625) | [9080745](https://en.wikisource.org/wiki/Special:Redirect/revision/9080745) |
| III | [9063627](https://en.wikisource.org/wiki/Special:Redirect/revision/9063627) | [9080747](https://en.wikisource.org/wiki/Special:Redirect/revision/9080747) |
| IV | [9063629](https://en.wikisource.org/wiki/Special:Redirect/revision/9063629) | [9080748](https://en.wikisource.org/wiki/Special:Redirect/revision/9080748) |
| V | [9064783](https://en.wikisource.org/wiki/Special:Redirect/revision/9064783) | [9080751](https://en.wikisource.org/wiki/Special:Redirect/revision/9080751) |
| VI | [9063632](https://en.wikisource.org/wiki/Special:Redirect/revision/9063632) | [9080757](https://en.wikisource.org/wiki/Special:Redirect/revision/9080757) |
| VII | [16135918](https://en.wikisource.org/wiki/Special:Redirect/revision/16135918) | [9080759](https://en.wikisource.org/wiki/Special:Redirect/revision/9080759) |
| VIII | [10231200](https://en.wikisource.org/wiki/Special:Redirect/revision/10231200) | [9080761](https://en.wikisource.org/wiki/Special:Redirect/revision/9080761) |
| IX | [9063638](https://en.wikisource.org/wiki/Special:Redirect/revision/9063638) | [9080763](https://en.wikisource.org/wiki/Special:Redirect/revision/9080763) |
| X | [9063640](https://en.wikisource.org/wiki/Special:Redirect/revision/9063640) | [9080764](https://en.wikisource.org/wiki/Special:Redirect/revision/9080764) |
| XI | [9064946](https://en.wikisource.org/wiki/Special:Redirect/revision/9064946) | [9080765](https://en.wikisource.org/wiki/Special:Redirect/revision/9080765) |
| XII | [9064957](https://en.wikisource.org/wiki/Special:Redirect/revision/9064957) | [9080766](https://en.wikisource.org/wiki/Special:Redirect/revision/9080766) |

**Book headings.** Only Books II and III carry headings in the manuscript tradition, and the app uses Farquharson's renderings: "Written among the Quadi on the river Gran" and "Written in Carnuntum". Every other book is just "Book N". An earlier mock-up had invented titles for all twelve books; those are gone.

## Commentary: Farquharson (Oxford, 1944)

- **Source:** the commentary volume of the same edition, per book at `https://en.wikisource.org/wiki/The_Meditations_of_the_Emperor_Marcus_Antoninus/Commentary_on_Book_N` (revisions in the table above).
- **Archived as:** `wikisource/farquharson_commentary_N.json` (MediaWiki API `action=parse` output).
- **Use:** each note opens "Ch. N." or "Chs. N–M." (including Oxford elided ranges such as "Chs. 25–6."); `sources.py` attaches it, verbatim, to the passages it covers (478 of 488). Each book's opening essay appears as "Farquharson on Book N". The commentary's own footnotes (mostly references) are left out.

## Comparison translation: George Long (1862)

- **Edition:** George Long, *The Thoughts of the Emperor Marcus Aurelius Antoninus* (1862).
- **Digital source:** Project Gutenberg eBook #15877, <https://www.gutenberg.org/ebooks/15877> (release 2005-05-22, updated 2020-12-14).
- **Status:** public domain.
- **Archived as:** `gutenberg/long_pg15877.txt`.
- **Use:** Long numbers sections after Gataker, which matches Leopold everywhere except that Leopold splits Long's V.36 into V.36–37; `sources.py` makes that split. Indented verse quotations are kept while Long's footnotes (`[A]`, `[B]`, …), textual corruption markers (`+`), illustration tags and index of Greek terms are left out.

## People: English Wikipedia

- **Source:** English Wikipedia's page summary API (`/api/rest_v1/page/summary/{title}`), for the 68 people listed in `people/people.json`.
- **Licence:** Wikipedia text is CC BY-SA 4.0. The app shows only each article's one-line description, plus a link.
- **Archived as:** `wikipedia/people.json`. For each person it holds the article title, URL, short description, opening extract and revision ID, retrieved 2026-10-26.
- **How identities were chosen:** see `people/README.md`.

## Verification

`verify.py` (also run automatically by `build_data.py`) checks the built dataset against these sources:

- All 12 books and 488 passages are present and aligned across Greek (Leopold), Farquharson and Long.
- No leftover MediaWiki/Gutenberg markup, footnote markers (`[A]`, `+`, `↑`, `Footnotes[edit]`) or illustration tags remain.
- Word-count ratios between Farquharson and Long are checked across every passage to catch dropped verse quotations or merged footnotes.
- All 383 commentary notes resolve to non-empty, in-range chapter sets (covering 478 of 488 passages; only VI.49, 52–54, 56–57 and VII.4, 6–7, 75 have no separate note in Farquharson).
- All 68 people in `people/people.json` match at least one passage, obey `only`/`except` rules, and carry a title, Wikipedia URL and description.

## Not used

- **Translation notes from the earlier mock-up:** removed. 18 of the 24 hand-written notes quoted phrases that aren't in Farquharson but credited them to him, and their comparisons with modern translations (Hammond, Hays, Long) couldn't be checked.
- **Haines (Loeb, 1916):** on Wikisource only as an unproofread transcription with no book pages: <https://en.wikisource.org/wiki/Marcus_Aurelius_(Haines_1916)>.
- **MIT Internet Classics Archive copy of Long** (<http://classics.mit.edu/Antoninus/meditations.html>): no section numbers and truncated partway through XII.27, so the Gutenberg edition is used instead.
