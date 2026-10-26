#!/usr/bin/env python3
"""
Parsers for the secondary sources archived under raw/ (see raw/SOURCES.md).

load_long():        George Long's 1862 translation, {book: {section: text}}.
                    Long's own footnotes and note markers are removed. His
                    numbering follows Gataker and matches Leopold's except that
                    Leopold splits V.36 in two.
load_commentary():  A. S. L. Farquharson's 1944 commentary, per book:
                    {"intro": [paragraphs], "notes": [{"label", "chapters", "paragraphs"}]}.
"""

import html
import json
import re

ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]
RAW = "/Users/psurry/meditations/raw"
PATH = f"{RAW}/gutenberg/long_pg15877.txt"


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

        def flush():
            if para:
                text = " ".join(para).strip()
                sections[current] = (sections.get(current, "") + " " + text).strip()
                para.clear()

        for ln in lines[lo:hi]:
            if ln.startswith("    "):  # Long's indented footnotes
                flush()
                continue
            if not ln.strip():
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
            v = re.sub(r"\s+", " ", v).strip()
            clean[k] = v
        books[b] = clean

    # Long's indexes follow the last section of Book XII
    books[12]["36"] = books[12]["36"].split(" INDEXES.")[0].strip()
    # Leopold splits Long's V.36 in two; V.37 begins at the 'fortunate man' saying
    head, tail = books[5]["36"].split("I was once a fortunate man", 1)
    books[5]["36"] = head.strip()
    books[5]["37"] = "I was once a fortunate man" + tail
    return books


def _chapters(spec):
    """'4–5' -> {4, 5};  '9, 12 and 14' -> {9, 12, 14};  '36, 42–43' -> {36, 42, 43}."""
    chapters = set()
    for part in re.split(r",|\band\b", spec):
        nums = [int(n) for n in re.findall(r"\d+", part)]
        if len(nums) == 2 and re.search(r"[–-]", part):
            chapters.update(range(nums[0], nums[1] + 1))
        else:
            chapters.update(nums)
    return chapters


def load_commentary():
    books = {}
    for b in range(1, 13):
        with open(f"{RAW}/wikisource/farquharson_commentary_{b}.json", encoding="utf-8") as f:
            text = json.load(f)["parse"]["text"]
        text = re.sub(r"<style.*?</style>", "", text, flags=re.S)
        text = re.sub(r'<sup[^>]*class="reference".*?</sup>', "", text, flags=re.S)   # footnote markers
        text = re.sub(r'<span[^>]*class="pagenum[^"]*".*?</span>', "", text, flags=re.S)  # page numbers
        text = re.sub(r"</p>|<br\s*/?>|</div>|</li>", "\n", text)
        text = html.unescape(re.sub(r"<[^>]+>", "", text)).replace("​", "")
        paras = [re.sub(r"\s+", " ", p).strip() for p in text.split("\n")]
        paras = [p for p in paras if p]

        # Body runs from the "BOOK N" heading to the footnotes (lines starting with ↑)
        start = next(i for i, p in enumerate(paras) if re.fullmatch(r"BOOK [IVX]+", p)) + 1
        end = next((i for i, p in enumerate(paras) if p.startswith("↑")), len(paras))

        intro, notes = [], []
        for p in paras[start:end]:
            m = re.match(r"^(Chs?\.\s*([\d–\-,\s]+(?:and\s+\d+)?)\.)\s*(.*)", p)
            if m:
                notes.append({"label": m.group(1), "chapters": sorted(_chapters(m.group(2))), "paragraphs": [m.group(3)]})
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
