#!/usr/bin/env python3
"""
Builds the complete Meditations dataset (12 Books, 488 Verses, 48 Stones)
with aligned Koine Greek (Leopold/Perseus) and English (Farquharson), stones
from clustering/, and for each passage George Long's translation and
Farquharson's commentary. Sources are listed in raw/SOURCES.md.
"""

import html
import json
import os
import re
import xml.etree.ElementTree as ET

from sources import check_errata, correct, load_commentary, load_long
from stamp import stamp
from verify import verify

ROOT = os.path.dirname(os.path.abspath(__file__))

ROMAN = {
    1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI",
    7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII"
}

# Only Books II and III carry headings in the manuscript tradition (Farquharson's wording)
BOOK_HEADINGS = {
    2: "Written among the Quadi on the river Gran",
    3: "Written in Carnuntum",
}

# Stones (thematic groupings) and their relatedness come from clustering/;
# see clustering/PROCESS.md for how they were made.
CLUSTERING_DIR = os.path.join(ROOT, "clustering")
RAW_DIR = os.path.join(ROOT, "raw")


def load_aligned_verses():
    tree = ET.parse(os.path.join(ROOT, "raw/greek.xml"))
    root = tree.getroot()
    ns = {"tei": "http://www.tei-c.org/ns/1.0"}
    g_books = root.findall(".//tei:div[@subtype='book']", ns)

    verses = []
    for b in range(1, 13):
        g_chaps = {}
        for c in g_books[b - 1].findall("./tei:div[@subtype='chapter']", ns):
            n = c.attrib.get("n")
            txt = re.sub(r"\s+", " ", "".join(c.itertext())).strip()
            if b == 5 and n == "36" and "Ἐγενόμην ποτέ" in txt:
                parts = txt.split("ἀγαθαὶ δὲ μοῖραι", 1)
                g_chaps["36"] = parts[0].strip()
                g_chaps["37"] = "Ἀγαθαὶ δὲ μοῖραι" + parts[1]
            elif b == 12 and n == "17" and "ιη′" in txt:
                parts = txt.split("ιη′", 1)
                g_chaps["17"] = parts[0].strip()
                g_chaps["18"] = parts[1].strip()
            else:
                g_chaps[n] = txt

        with open(os.path.join(ROOT, f"raw/farquharson_book_{b}.html")) as f:
            s = f.read()
        s = re.sub(r"<style.*?</style>", "", s, flags=re.S)
        # MediaWiki data-mw attributes hold JSON with literal "/>", which breaks naive tag stripping
        s = re.sub(r"\sdata-mw='[^']*'", "", s)
        s = re.sub(r'\sdata-mw="[^"]*"', "", s)
        s = re.sub(r"<div class=\"mw-references-wrap.*?</div>", "", s, flags=re.S)
        s = re.sub(r"<sup.*?</sup>", "", s, flags=re.S)
        s = re.sub(r"</p>|<p[^>]*>|<br\s*/?>", "\n", s)
        s = re.sub(r"<[^>]+>", "", s).replace("\u200b", "")
        lines = [html.unescape(re.sub(r"\s+", " ", ln)).strip() for ln in s.split("\n")]

        f_chaps = {}
        curr_num = None
        for txt in lines:
            if not txt or txt.startswith("For Farquharson") or txt in ("Layout 2", "THE MEDITATIONS OF THE EMPEROR MARCUS ANTONINUS") or re.match(r"^BOOK [IVX]+$", txt):
                continue
            if b == 12 and txt.startswith("14–15."):
                body = txt[len("14–15."):].strip()
                p1, p2 = body.split("Does the light of the lamp", 1)
                f_chaps["14"] = p1.strip()
                f_chaps["15"] = "Does the light of the lamp" + p2
                curr_num = "15"
                continue
            if b == 12 and txt.startswith("17–18."):
                body = txt[len("17–18."):].strip()
                p1, p2 = body.split("Let your impulse be", 1)
                f_chaps["17"] = p1.strip()
                f_chaps["18"] = "Let your impulse be" + p2
                curr_num = "18"
                continue
            m = re.match(r"^(\d+)\.\s*(.*)", txt)
            if m:
                curr_num = m.group(1)
                f_chaps[curr_num] = m.group(2)
            elif curr_num:
                f_chaps[curr_num] += " " + txt

        for k in sorted(list(f_chaps.keys()), key=lambda x: int(x)):
            nxt = str(int(k) + 1)
            while nxt not in f_chaps and f" {nxt}. " in f_chaps[k]:
                parts = f_chaps[k].split(f" {nxt}. ", 1)
                f_chaps[k] = parts[0].strip()
                f_chaps[nxt] = parts[1].strip()
                k = nxt
                nxt = str(int(k) + 1)

        # Clean trailing book colophons attached to final verse
        for n in sorted(g_chaps.keys(), key=lambda x: int(x)):
            eng = f_chaps[n]
            eng = re.sub(r"\s*Footnotes\b.*$", "", eng)
            eng = re.sub(r"\s*BOOK [IVX]+\s*$", "", eng).strip()
            ref = f"{ROMAN[b]}.{n}"
            eng = correct("Farquharson", ref, eng)
            verses.append({
                "id": ref,
                "book": b,
                "section": int(n),
                "english": eng,
                "greek": g_chaps[n]
            })
    return verses


def load_stones(verses):
    with open(f"{CLUSTERING_DIR}/stones.json", encoding="utf-8") as f:
        stones = json.load(f)
    by_id = {v["id"]: v for v in verses}
    for st in stones:
        for vid in st["verseIds"]:
            assert "stoneId" not in by_id[vid], f"{vid} is on two stones"
            by_id[vid]["stoneId"] = st["id"]
    missing = [v["id"] for v in verses if "stoneId" not in v]
    assert not missing, f"passages on no stone: {missing}"
    return stones


def attach_sources(verses):
    """Long's translation and Farquharson's commentary for each passage (see raw/SOURCES.md)."""
    long = load_long()
    commentary = load_commentary()
    for v in verses:
        v["long"] = long[v["book"]].get(str(v["section"]), "")
        v["commentary"] = [
            {"label": n["label"], "paragraphs": n["paragraphs"]}
            for n in commentary[v["book"]]["notes"] if v["section"] in n["chapters"]
        ]
    return {b: c["intro"] for b, c in commentary.items()}


def link_people(verses):
    """Mark historical people in each passage and list them (people/people.json, raw/wikipedia/people.json)."""
    with open(os.path.join(ROOT, "people/people.json"), encoding="utf-8") as f:
        spec = json.load(f)["people"]
    with open(f"{RAW_DIR}/wikipedia/people.json", encoding="utf-8") as f:
        wiki = json.load(f)["people"]

    # Longest names first, so "Alexander the Great" wins over "Alexander"
    forms = sorted(((form, p) for p in spec for form in p["forms"]), key=lambda fp: -len(fp[0]))
    for v in verses:
        text, taken, found = v["english"], [], []
        for form, p in forms:
            if ("only" in p and v["id"] not in p["only"]) or v["id"] in p.get("except", []):
                continue
            for m in re.finditer(rf"\b{re.escape(form)}\b", text):
                if any(m.start() < b and a < m.end() for a, b in taken):
                    continue
                taken.append((m.start(), m.end()))
                found.append((m.start(), m.end(), p["id"]))
        for start, end, pid in sorted(found, reverse=True):
            text = f'{text[:start]}<span class="person" data-person="{pid}">{text[start:end]}</span>{text[end:]}'
        v["english"] = text
        v["people"] = list(dict.fromkeys(pid for _, _, pid in sorted(found)))

    return {
        p["id"]: {
            "name": wiki[p["id"]]["title"],
            "url": wiki[p["id"]]["url"],
            "description": wiki[p["id"]]["description"] or p.get("description", ""),
        }
        for p in spec if p["id"] in wiki
    }


def load_affinities():
    try:
        with open(f"{CLUSTERING_DIR}/affinity.json", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print("No clustering/affinity.json yet; run `uv run clustering/affinity.py` and rebuild.")
        return {}


def main():
    verses = load_aligned_verses()
    stones = load_stones(verses)
    book_intros = attach_sources(verses)
    check_errata()
    people = link_people(verses)
    affinities = load_affinities()

    books_out = []
    for b in range(1, 13):
        books_out.append({
            "book": b,
            "roman": ROMAN[b],
            "heading": BOOK_HEADINGS.get(b),
            "intro": book_intros[b],
            "verseCount": sum(1 for v in verses if v["book"] == b)
        })

    stones_out = []
    for idx, st in enumerate(stones, 1):
        sid = st["id"]
        stones_out.append({
            "id": sid,
            "order": idx,
            "discipline": st["discipline"],
            "defaultMaxim": st["maxim"],
            "verseIds": st["verseIds"],
            "affinity": affinities.get(sid, [])
        })

    dataset = {
        "meta": {
            "title": "Meditations (Τὰ εἰς ἑαυτόν)",
            "author": "Marcus Aurelius",
            "englishTranslator": "A. S. L. Farquharson (Oxford, 1944)",
            "greekEdition": "J. H. Leopold (Teubner, 1908)",
            "comparisonTranslator": "George Long (1862)",
            "commentary": "A. S. L. Farquharson, commentary (Oxford, 1944)",
            "sources": "raw/SOURCES.md",
            "bookCount": len(books_out),
            "verseCount": len(verses),
            "stoneCount": len(stones_out)
        },
        "books": books_out,
        "stones": stones_out,
        "people": people,
        "verses": verses
    }

    with open(os.path.join(ROOT, "data/meditations.json"), "w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)

    with open(os.path.join(ROOT, "data/meditations.js"), "w", encoding="utf-8") as f:
        f.write("window.MEDITATIONS_DATA = ")
        json.dump(dataset, f, ensure_ascii=False)
        f.write(";\n")

    # Version the data file's URL by its content, so browsers never pair new code with a stale cached copy
    stamp()  # version index.html's links to the data, CSS and JS
    verify()

    print(f"Built dataset: {len(books_out)} books, {len(verses)} verses, {len(stones_out)} stones.")
    for s in stones_out[:10]:
        print(f"  {s['id']} ({len(s['verseIds'])} verses): {s['defaultMaxim'][:60]}...")


if __name__ == "__main__":
    main()
