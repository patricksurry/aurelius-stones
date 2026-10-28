# How the stones were made

The 488 passages of the *Meditations* (Farquharson's 1944 translation) are grouped into 48 **stones**. Each stone is a theme Marcus keeps coming back to. It has a one-line summary (the maxim) and 6–16 passages. This note explains how the grouping was made, so it can be checked, argued with, or redone.

The earlier grouping was discarded. It was a hand-written list of seed passages per stone, with the remaining ~90 passages placed by keyword scoring. That placed many of them badly, and 34 seed passages were claimed by two stones, where the first stone in the list silently won.

## 1. Framework: the three disciplines

Marcus states the structure himself. VIII.7 says a reasoning nature fares well when it:

- assents to nothing false or obscure;
- directs its impulses only to social ends;
- desires only what is in its power and welcomes all that Nature assigns.

XI.37, quoting Epictetus, names the same three: an art of *assent*, attention to the *impulses*, and right use of *desire* and aversion. Pierre Hadot builds his reading of the whole work on these three (*The Inner Citadel*, 1992), and it is the most widely accepted thematic framework for the book. The stones are arranged under them:

| Discipline | Hadot's term | Concerns | Stones |
|---|---|---|---|
| **Judgment** | assent | how you see: impressions, value judgments, the inner citadel | 10 |
| **Acceptance** | desire | what you want: fate, change, death, the cosmos | 17 |
| **Action** | impulse | what you do: duty, other people, the common good | 21 |

The literature offers no accepted finer grouping. Hadot discusses recurring *kephalaia* (key dogmas) but doesn't fix a list. So the stones within each discipline come from reading the text.

## 2. Reading and tagging every passage

Every passage was read in full, in book order, and given one short theme tag describing what that passage is mainly doing. Examples: `judgment-makes-harm`, `view-from-above`, `instruct-or-bear`. The tags were made up during reading, not chosen from a list fixed in advance. A passage that touches several themes got the tag for its main point. The result is in `tags.tsv`: 488 rows and 286 distinct tags.

## 3. Grouping tags into stones

The tags were gathered into stones by hand (`TAG_TO_STONE` in `stones.py`). The aim was a stone you could hold in mind as one idea, usually 6–16 passages. Larger clusters were split along a real distinction. Examples:

- **Death** became three stones: it is natural (`death-natural`); whether we are scattered or changed, there is nothing to fear (`death-either-way`); the length of a life doesn't matter (`whole-play`).
- **Change** became two: nature loves change (`change`); nothing is lost, only remade (`nothing-lost`).
- **Other people's wrongdoing** became three: they act from ignorance (`they-know-not`); teach them or bear with them (`teach-or-bear`); their wrong is theirs, so leave it (`leave-the-wrong`).
- **Book I** became two: family and the gods (`debts`); teachers, including Antoninus (`teachers`).

Where one tag covered passages that belonged in different stones, a per-passage `OVERRIDE` sends them to the right one. Short quotations (Book VII's run of verse lines, Book XI's sayings) were placed by what they say, not by the fact that they are quotations.

## 4. Embedding cross-check (advisory)

As an independent check, each passage was embedded with a sentence-embedding model (`BAAI/bge-base-en-v1.5`, run locally). Each passage was then compared with every stone's average vector, leaving itself out. Passages that sat clearly closer to another stone were re-read.

- About a dozen moves came out of that re-reading. VIII.41 (an obstacle can't hinder a mind that acts "with reservation") moved to `obstacle-way`. VII.66 (judge Socrates by his soul) moved to `sages`. The full list is the second block of `OVERRIDE`.
- The check also suggested a stone that was missing: Marcus measuring the emperor's life against the philosopher's (`purple`, after VI.30's "not dyed in the purple").
- Most flags were **not** acted on. Embeddings respond strongly to shared vocabulary, so passages about the same idea in different words look far apart, while passages that merely share words like "nature" or "death" look close. The human reading decided every case. `uv run clustering/affinity.py` prints the current flags (59 above a 0.05 margin).

## 5. The maxims

Each maxim was written after re-reading the stone's passages, under these rules:

- 12 words or fewer, which `stones.py` enforces;
- second person, plain modern English;
- it summarises the stone as a whole, rather than paraphrasing its most famous passage. Where one image says it best ("Be the headland", "as a vine bears grapes"), that image is used, because Marcus himself uses it as the summary.

The maxims are meant as a suggestion to replace. The app invites you to rewrite each one in your own words.

## 6. Relatedness and verification

`affinity.py` averages the passage embeddings of each stone and ranks every other stone by cosine similarity. The app shows the top few as related stones. Here the embeddings are used for what they're good at: rough closeness of meaning across many passages at once.

Two further checks verify the generated data:

- `affinity.py` embeds both Farquharson's and George Long's translations to check that each stone's centroid agrees across translations, and compares each stone's maxim embedding against all 48 stone centroids to flag any summary that sits closer to another stone than its own.
- `verify.py` (run automatically by `build_data.py`) checks that all 488 passages are partitioned across the 48 stones (6–16 passages each), every maxim is 4–12 words and shares core vocabulary with its passages, and every stone's TF-IDF profile in Farquharson's translation matches its own profile in Long's translation ahead of all other 47 stones.

## Reproducing

```sh
python3 clustering/stones.py      # tags.tsv + mapping -> stones.json
uv run clustering/affinity.py     # stones.json + passages -> affinity.json (downloads the model on first run)
python3 build_data.py             # -> data/meditations.json / .js (runs verify.py)
```

## Known limits

- **One reader.** The tags and groupings reflect one careful reading, not a scholarly consensus. Several passages could sit on two stones, and the choice between them is a judgment call. Changing a passage's stone is a one-line `OVERRIDE`.
- **One translation.** All of this rests on Farquharson's wording. The embeddings are of English only.
- **Order of stones.** Stones are listed by discipline. Within a discipline the order is loose, roughly from inner to outer.
