# Errata

The archived sources in `raw/` are kept exactly as downloaded. A few of their transcription errors (OCR slips on
Wikisource and Project Gutenberg) are corrected while building the dataset: `sources.py` reads the table below and
`python3 build_data.py` fails if any correction no longer matches its source text exactly once.

Columns:
- **Text:** `Farquharson` (his translation), `Commentary` (his commentary), or `Long`.
- **Where:** a passage such as `V.15`; for the commentary, the book (`IV`), optionally followed by a note.
- **Reads / Should read:** the exact text in the source, and its replacement.
- **Evidence:** how the correction was checked. "Scan p. N" is the printed page in
  [the 1944 scans](https://commons.wikimedia.org/wiki/File:Meditations_of_the_Emperor_Marcus_Antoninus_-_Volume_1_-_Farquharson_1944.pdf)
  that Wikisource was transcribed from. "MIT" is the independent transcription of Long at
  [classics.mit.edu](https://classics.mit.edu/Antoninus/meditations.html).

## Corrections

| Text | Where | Reads | Should read | Evidence |
|---|---|---|---|---|
| Farquharson | IV.50 | `in how weak a body Do not` | `in how weak a body. Do not` | Full stop missing in print too (scan p. 73) |
| Farquharson | VI.41 | `these things, If, however` | `these things. If, however` | Printer's comma (scan p. 115) |
| Farquharson | VIII.3 | `they were the servants,` | `they were the servants.` | Scan p. 149 |
| Farquharson | IX.1 | `docs so fight` | `does so fight` | OCR |
| Farquharson | X.25 | `heareafter` | `hereafter` | OCR |
| Farquharson | X.38 | `is the man, Never` | `is the man. Never` | Scan p. 213 |
| Farquharson | XI.27 | `say: Took up to the sky` | `say: 'Look up to the sky` | Scan p. 233 |
| Commentary | II | `now or herafter` | `now or hereafter` | OCR |
| Commentary | II | `whan a work of Nature` | `than a work of Nature` | OCR |
| Commentary | III ch. 4 | `if wc are careful` | `if we are careful` | OCR |
| Commentary | III ch. 4 | `why wc should` | `why we should` | OCR |
| Commentary | III ch. 5 | `ceux du patrioter` | `ceux du patriote` | Scan p. 302 |
| Commentary | III ch. 9 | `his imagination. and that` | `his imagination, and that` | Sense (the Wikisource page is a retyping, not the scan) |
| Commentary | III ch. 10 | `considère cc qu'il` | `considère ce qu'il` | Pascal, *Pensées* 72 |
| Commentary | III ch. 10 | `l'univers, is apprenne` | `l'univers, qu'il apprenne` | Pascal, *Pensées* 72 |
| Commentary | IV ch. 3 | `nature of goodness . . .?` | `nature of goodness . . .'` | Scan p. 310 |
| Commentary | IV ch. 4 | `principal of sufficient reason` | `principle of sufficient reason` | OCR |
| Commentary | IV chs. 6–8 | `(i) we cannot expect` | `(1) we cannot expect` | Scan p. 313 |
| Commentary | IV ch. 14 | `wrote: ' Jusqu` | `wrote: 'Jusqu` | Stray space |
| Commentary | IV ch. 22 | `control ot the` | `control of the` | OCR |
| Commentary | IV ch. 23 | `to out present purpose` | `to our present purpose` | OCR |
| Commentary | V ch. 16 | `hat the effect of repetition` | `that the effect of repetition` | OCR |
| Commentary | V chs. 19–20 | `xi. 1. n and 16` | `xi. 1. 11 and 16` | Scan p. 333 |
| Commentary | V ch. 32 | `chapter arc obscure` | `chapter are obscure` | OCR |
| Commentary | VI | `man s reason` | `man's reason` | OCR |
| Commentary | VII | `rhythm that rales a world` | `rhythm that rules a world` | OCR |
| Commentary | IX chs. 35–7 | `are cither a dialogue` | `are either a dialogue` | OCR |
| Commentary | XII ch. 6 | `is bom nearly` | `is born nearly` | OCR |
| Long | IV.29 | `who tears, his own soul` | `who tears his own soul` | MIT |
| Long | V.15 | `who snowed that` | `who showed that` | MIT |
| Long | V.29 | `when them art gone` | `when thou art gone` | MIT |
| Long | V.32 | `and though all time` | `and through all time` | MIT |
| Long | VI.27 | `to strive After` | `to strive after` | MIT |
| Long | VIII.1 | `How thou shall seem` | `How thou shalt seem` | MIT |
| Long | VIII.37 | `Panthea or Fergamus` | `Panthea or Pergamus` | MIT |
| Long | VIII.45 | `comformably` | `conformably` | MIT |
| Long | IX.34 | `their pool souls` | `their poor souls` | MIT |
| Long | XI.10 | `skill of art Now` | `skill of art. Now` | MIT |
| Long | XII.12 | `vii. 62; 18 viii. 17` | `vii. 62; viii. 17` | Stray number |
| Long | XII.27 | `Fabius Catellinus` | `Fabius Catullinus` | MIT |
| Long | XII.27 | `Stertinius at Briae` | `Stertinius at Baiae` | MIT |

## Checked and left as printed

These were flagged in proofreading but are what the authors wrote, so they stay:

- **Farquharson V.4** "which bears my footstep and my misusing it", V.6 (the unclosed quotation), XI.18 "how much more grievous are what fits of anger": as printed (scans pp. 77, 79, 227).
- **Farquharson XII.27** "Lusius Lupus": follows the Greek Λούσιος.
- **Commentary I.17**: no § 5 or § 6 headings; the printed note runs § 4, two unlabelled paragraphs, § 7 (scan p. 277).
- **Commentary I ch. 2** "Marcus was about 10 years old when he lost his father" (scan p. 270), **Book II introduction** "Sirmium (Mitrovitz) on the Saar" (the Sava; scan p. 279), **V ch. 8** "the excavations at Epidamnus" (Epidaurus; scan p. 330): Farquharson's own slips.
- **Commentary III ch. 16** "vii. 33. 64": as printed (scan p. 307).
- **Long VIII.37** "Chaurias" (Farquharson: Chabrias), the ellipses in VII.58 and XI.18, "[For let thy efforts be--]" in XII.17, and "[Ephesians]" in XI.26: Long's own text, as in MIT's transcription too.
