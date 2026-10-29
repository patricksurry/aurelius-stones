#!/usr/bin/env python3
"""
Parsers for the secondary sources archived under raw/ (see raw/SOURCES.md).

load_long():        George Long's 1862 translation, {book: {section: text}}.
                    Long's own footnotes and note markers are removed. His
                    numbering follows Gataker and matches Leopold's except that
                    Leopold splits V.36 in two.
load_commentary():  A. S. L. Farquharson's 1944 commentary, per book:
                    {"intro": [paragraphs], "notes": [{"label", "chapters", "paragraphs"}]}.
correct():          applies the transcription corrections listed in ERRATA.md.
"""

import html
import json
import os
import re

ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]
RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw")
PATH = f"{RAW}/gutenberg/long_pg15877.txt"
ERRATA_PATH = os.path.join(os.path.dirname(RAW), "ERRATA.md")


def load_errata():
    """The rows of the Corrections table in ERRATA.md."""
    rows, in_table = [], False
    with open(ERRATA_PATH, encoding="utf-8") as f:
        for ln in f:
            if ln.startswith("## "):
                in_table = ln.strip() == "## Corrections"
            elif in_table and ln.startswith("|") and not re.match(r"^\|\s*(Text|-)", ln):
                cells = [c.strip().strip("`") for c in ln.strip().strip("|").split("|")]
                rows.append(dict(zip(("text", "where", "reads", "should", "evidence"), cells)))
    return rows


ERRATA = load_errata()


def correct(text, where, s):
    """Apply ERRATA.md's corrections for one text ('Farquharson', 'Commentary' or 'Long') at one place."""
    for e in ERRATA:
        if e["text"] == text and e["where"].split()[0] == where and e["reads"] in s:
            assert s.count(e["reads"]) == 1, f"ERRATA.md: {e['reads']!r} is ambiguous in {text} {where}"
            s = s.replace(e["reads"], e["should"])
            e["applied"] = True
    return s


def check_errata():
    """Every correction must have found its text, or the source has changed under it."""
    missed = [f"{e['text']} {e['where']}: {e['reads']!r}" for e in ERRATA if not e.get("applied")]
    assert not missed, "ERRATA.md corrections that matched nothing:\n  " + "\n  ".join(missed)


def load_long():
    with open(PATH, encoding="utf-8") as f:
        lines = f.read().replace("\r\n", "\n").split("\n")

    # The translation proper starts at the first bare "I." heading after the introduction
    starts = {}
    for i, ln in enumerate(lines):
        m = re.match(r"^([IVX]+)\.$", ln.strip())
        if m and m.group(1) in ROMAN and ln == ln.strip():
            book = ROMAN.index(m.group(1)) + 1
            if book == len(starts) + 1:
                starts[book] = i
    end = next(i for i, ln in enumerate(lines) if ln.startswith("*** END OF THE PROJECT GUTENBERG"))

    books = {}
    for b in range(1, 13):
        lo = starts[b] + 1
        hi = starts.get(b + 1, end)
        sections, current, para = {}, "1", []
        in_footnote = False

        def flush():
            if para:
                text = " ".join(para).strip()
                sections[current] = (sections.get(current, "") + " " + text).strip()
                para.clear()

        for ln in lines[lo:hi]:
            if not ln.strip():
                flush()
                continue
            # Footnotes start with [A], [B], ... (usually indented by 4 spaces,
            # though three after VII.45 are unindented) and may continue for
            # several indented paragraphs. Verse quotations are also indented,
            # so only skip indented lines while inside a footnote block.
            if re.match(r"^\s*\[[A-Z]\]\s", ln):
                flush()
                in_footnote = True
                continue
            if not ln.startswith(" "):
                in_footnote = False
            if in_footnote:
                continue
            # Skip Gutenberg's illustration captions and Long's right-aligned verse source lines
            if re.match(r"^\[Illustration:.*\]$", ln.strip()) or ln.startswith(" " * 15):
                flush()
                continue
            m = re.match(r"^(\d+)\.\s+(.*)", ln)
            if m and not para:
                flush()
                current = m.group(1)
                para.append(m.group(2))
            else:
                para.append(ln.strip())
        flush()

        clean = {}
        for k, v in sections.items():
            v = re.sub(r"\[[A-Z]\]", "", v)            # footnote markers
            v = v.replace("+", "")                     # Long's obelus (+) for corrupt Greek
            v = re.sub(r"\s+", " ", v).strip()
            clean[k] = correct("Long", f"{ROMAN[b - 1]}.{k}", v)
        books[b] = clean

    # Long's indexes follow the last section of Book XII
    books[12]["36"] = books[12]["36"].split(" INDEXES.")[0].strip()
    # Leopold splits Long's V.36 in two; V.37 begins at the 'fortunate man' saying
    head, tail = books[5]["36"].split("I was once a fortunate man", 1)
    books[5]["36"] = head.strip()
    books[5]["37"] = "I was once a fortunate man" + tail
    return books


def _chapters(spec):
    """'4–5' -> {4, 5}; '25–6' -> {25, 26}; '9, 12 and 14' -> {9, 12, 14}."""
    chapters = set()
    for part in re.split(r",|\band\b", spec):
        nums = re.findall(r"\d+", part)
        if len(nums) == 2 and re.search(r"[–-]", part):
            lo, hi_s = int(nums[0]), nums[1]
            # Expand Oxford-style elided ranges such as '25–6' -> 25..26 or '32–7' -> 32..37
            hi = int(nums[0][:-len(hi_s)] + hi_s) if int(hi_s) < lo and len(nums[0]) > len(hi_s) else int(hi_s)
            chapters.update(range(lo, hi + 1))
        else:
            chapters.update(int(n) for n in nums)
    return chapters


def load_commentary():
    books = {}
    for b in range(1, 13):
        with open(f"{RAW}/wikisource/farquharson_commentary_{b}.json", encoding="utf-8") as f:
            text = json.load(f)["parse"]["text"]
        text = re.sub(r"<style.*?</style>", "", text, flags=re.S)
        text = re.sub(r"\s+", " ", text)  # line breaks in the HTML source are not paragraph breaks
        # Footnote markers; a few sit between a full stop and the next sentence with no space around them
        text = re.sub(r'<sup[^>]*class="reference"(?:(?!</sup>).)*</sup>(?=[A-Za-z])', " ", text)
        text = re.sub(r'<sup[^>]*class="reference".*?</sup>', "", text)
        text = re.sub(r'<span[^>]*class="pagenum[^"]*".*?</span>', "", text, flags=re.S)  # page numbers
        # Verse quotations sit in centred blocks: keep each as one paragraph, "> " then its lines joined by " / ".
        # Centred all-caps lines are headings ("BOOK IV"), not verse.
        def centred(m):
            if not re.search(r"[a-z]", re.sub(r"<[^>]+>", "", m.group(1))):
                return m.group(1)
            return "<p>> " + re.sub(r"</p>|<br\s*/?>", " / ", m.group(1)) + "</p>"
        text = re.sub(r'<div class="wst-(?:block-)?center[^"]*"[^>]*>(.*?)</div>', centred, text)
        text = re.sub(r"</p>|<br\s*/?>|</div>|</li>", "\n", text)
        text = html.unescape(re.sub(r"<[^>]+>", "", text)).replace("​", "")
        paras = [re.sub(r"\s+", " ", p).strip() for p in text.split("\n")]
        paras = [p for p in paras if p]
        paras = [("> " + " / ".join(ln for ln in re.split(r"\s*(?:^|\s)/(?:\s|$)\s*", p[2:]) if ln)) if p.startswith("> ") else p
                 for p in paras]
        for i in range(len(paras) - 1, 0, -1):  # consecutive quotations are one passage of verse
            if paras[i].startswith("> ") and paras[i - 1].startswith("> "):
                paras[i - 1] += " / " + paras.pop(i)[2:]
        paras = [correct("Commentary", ROMAN[b - 1], p) for p in paras]

        # Body runs from the "BOOK N" heading to the footnotes section ("Footnotes[edit]" or lines starting with ↑)
        start = next(i for i, p in enumerate(paras) if re.fullmatch(r"BOOK [IVX]+", p)) + 1
        end = next((i for i, p in enumerate(paras) if p.startswith("↑") or p == "Footnotes[edit]"), len(paras))

        intro, notes = [], []
        for p in paras[start:end]:
            # Wikisource has three OCR commas ('Ch, 29.', 'Ch, 8.', 'Ch, 32.'); accept both '.' and ','
            m = re.match(r"^(Chs?[.,]\s*([\d–\-,\s]+(?:and\s+\d+)?)\.)\s*(.*)", p)
            if m:
                label = re.sub(r"^(Chs?),", r"\1.", m.group(1))
                chapters = sorted(_chapters(m.group(2)))
                if b == 5 and chapters == [36]:
                    chapters = [36, 37]  # Leopold splits V.36 into V.36–37; Farquharson's note covers both
                notes.append({"label": label, "chapters": chapters, "paragraphs": [m.group(3)]})
            elif notes:
                notes[-1]["paragraphs"].append(p)
            else:
                intro.append(p)
        books[b] = {"intro": intro, "notes": notes}
    return books


if __name__ == "__main__":
    long = load_long()
    commentary = load_commentary()
    for b in range(1, 13):
        secs = long[b]
        nums = sorted(int(k) for k in secs)
        covered = set().union(*[n["chapters"] for n in commentary[b]["notes"]])
        print(f"{ROMAN[b - 1]:>4}: Long {len(secs)} sections; commentary {len(commentary[b]['notes'])} notes "
              f"covering {len(covered)} chapters; intro {len(commentary[b]['intro'])} paras")
