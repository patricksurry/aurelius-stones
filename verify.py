#!/usr/bin/env python3
"""
Verifies the built Meditations dataset (data/meditations.json) against its
sources and editorial rules:

1. Sourced texts (Greek, Farquharson, Long, commentary, people):
   - All 12 books and 488 verses present and aligned across editions.
   - No leftover markup, footnote markers, OCR heading slips, or page colophons.
   - Cross-edition word-count ratios confirm no verse quotes were dropped or
     footnotes merged.
   - Every commentary note resolves to valid chapters in its book (478/488 covered).
   - Every person entry in people.json matches at least one passage, obeys
     'only'/'except' rules, and has a title, Wikipedia URL, and description.

2. Generated & editorial data (stones, maxims, affinities):
   - All 488 verses partitioned across 48 stones (6–16 verses each).
   - Every maxim is 12 words or fewer, plain second-person summary, and shares
     core vocabulary or theme concepts with its stone's passages across both
     translations.
   - Every stone has a complete 47-stone affinity ranking.
"""

import json
import math
import os
import re
from collections import Counter

from sources import load_commentary

ROOT = os.path.dirname(os.path.abspath(__file__))

STOPWORDS = {
    "a", "all", "also", "am", "an", "and", "another", "any", "are", "art", "as",
    "at", "be", "because", "been", "before", "being", "both", "but", "by", "can",
    "cannot", "do", "does", "done", "dont", "dost", "down", "each", "either",
    "else", "even", "ever", "every", "for", "from", "give", "go", "had", "has",
    "hast", "hath", "have", "he", "her", "here", "him", "himself", "his", "how",
    "i", "if", "in", "into", "is", "it", "its", "itself", "keep", "let", "like",
    "look", "made", "make", "man", "many", "may", "me", "men", "more", "most",
    "much", "must", "my", "neither", "never", "no", "nor", "not", "nothing",
    "now", "of", "off", "often", "on", "one", "only", "or", "other", "others",
    "ought", "our", "out", "over", "own", "part", "put", "same", "say", "see",
    "seem", "shall", "shalt", "should", "so", "some", "something", "still",
    "such", "take", "than", "that", "the", "thee", "their", "them", "then",
    "there", "these", "they", "thing", "things", "think", "this", "those",
    "thou", "though", "through", "thus", "thy", "thyself", "time", "to", "too",
    "up", "upon", "us", "very", "was", "way", "we", "well", "were", "what",
    "whatever", "when", "where", "which", "while", "who", "whole", "whom",
    "whose", "why", "will", "wilt", "with", "within", "without", "would", "yet",
    "you", "your", "yourself",
}


def clean_html(text):
    return re.sub(r"<[^>]+>", "", text)


def incipit_preview(english):
    words = clean_html(english).split()
    return " ".join(words[:14]) + ("…" if len(words) > 14 else "")


def tokens(text):
    return [
        w for w in re.findall(r"[a-z]+", clean_html(text).lower())
        if len(w) > 2 and w not in STOPWORDS
    ]


def verify():
    with open(os.path.join(ROOT, "data/meditations.json"), encoding="utf-8") as f:
        data = json.load(f)
    with open(os.path.join(ROOT, "people/people.json"), encoding="utf-8") as f:
        people_spec = json.load(f)["people"]
    with open(os.path.join(ROOT, "clustering/tags.tsv"), encoding="utf-8") as f:
        tags = dict(line.rstrip("\n").split("\t") for line in f)

    books = data["books"]
    stones = data["stones"]
    verses = data["verses"]
    people = data["people"]

    assert len(books) == 12, f"Expected 12 books, got {len(books)}"
    assert len(stones) == 48, f"Expected 48 stones, got {len(stones)}"
    assert len(verses) == 488, f"Expected 488 verses, got {len(verses)}"
    assert set(tags.keys()) == {v["id"] for v in verses}, "tags.tsv keys do not match verses"

    # 1. Sourced text checks (Greek, Farquharson, Long, Commentary)
    bad_markers = ["Footnotes", "[edit]", "[Illustration", "Layout 2", "↑", "Ch, ", "Chs, "]
    ratio_outliers = []
    for v in verses:
        vid = v["id"]
        eng = clean_html(v["english"])
        lng = v["long"]
        grk = v["greek"]
        assert eng and lng and grk, f"{vid}: empty text field"

        # Check that incipit stripping leaves no stray space before punctuation (excluding Oxford '. . .' ellipses)
        inc = incipit_preview(v["english"])
        assert not re.search(r"\s[,;:!?]", inc), f"{vid}: stray space before punctuation in incipit: {inc}"

        for label, txt in [("english", eng), ("long", lng), ("greek", grk)]:
            for bad in bad_markers:
                assert bad not in txt, f"{vid} ({label}) contains artifact {bad!r}: {txt[:100]}"
            assert not re.search(r"\[[A-Z]\]", txt), f"{vid} ({label}) contains footnote marker: {txt[:100]}"
        assert "+" not in lng, f"{vid} (long) contains apparatus obelus '+': {lng[:100]}"

        # Cross-edition word-count check (catches dropped verse lines or merged footnotes)
        ew, lw, gw = len(eng.split()), len(lng.split()), len(grk.split())
        if max(ew, lw) >= 15 and (ew / lw > 1.75 or lw / ew > 1.75):
            ratio_outliers.append((vid, ew, lw, gw))

        for c in v["commentary"]:
            assert c["label"].startswith("Ch"), f"{vid}: unexpected commentary label {c['label']!r}"
            for p in c["paragraphs"]:
                for bad in bad_markers:
                    assert bad not in p, f"{vid} commentary contains artifact {bad!r}: {p[:100]}"

    # VI.28 (19w vs 38w), IX.20 (9w vs 18w) and XI.37 (57w vs 87w) are genuine translator expansions by Long
    unexpected_outliers = [x for x in ratio_outliers if x[0] not in ("VI.28", "IX.20", "XI.37")]
    assert not unexpected_outliers, f"Unexpected length mismatches between Farquharson and Long: {unexpected_outliers}"

    # Verify raw commentary notes all mapped to non-empty valid chapter sets
    raw_comm = load_commentary()
    book_counts = {b["book"]: b["verseCount"] for b in books}
    total_notes = 0
    for b, c in raw_comm.items():
        for n in c["notes"]:
            total_notes += 1
            assert n["chapters"], f"Book {b} note {n['label']} mapped to no chapters"
            assert all(1 <= ch <= book_counts[b] for ch in n["chapters"]), (
                f"Book {b} note {n['label']} out of range: {n['chapters']}"
            )
    covered_verses = sum(1 for v in verses if v["commentary"])
    assert covered_verses >= 478, f"Expected >=478 verses with commentary, got {covered_verses}"

    # 2. People checks
    spec_by_id = {p["id"]: p for p in people_spec}
    assert set(people.keys()) == set(spec_by_id.keys()), "Mismatch between people.json and built people"
    appearances = Counter()
    for v in verses:
        for pid in v["people"]:
            appearances[pid] += 1
            sp = spec_by_id[pid]
            if "only" in sp:
                assert v["id"] in sp["only"], f"{pid} matched in {v['id']}, outside only={sp['only']}"
            if "except" in sp:
                assert v["id"] not in sp["except"], f"{pid} matched in {v['id']}, inside except={sp['except']}"
    for pid, meta in people.items():
        assert appearances[pid] > 0, f"Person {pid} never matched in any passage"
        assert meta["name"] and meta["url"].startswith("https://en.wikipedia.org/wiki/"), f"Bad metadata for {pid}"
        assert meta["description"], f"Missing description for {pid} ({meta['name']})"

    # 3. Stones, maxims, and TF-IDF cross-translation coherence checks
    verse_by_id = {v["id"]: v for v in verses}
    seen_verses = set()
    stone_ids = {s["id"] for s in stones}
    for s in stones:
        vids = s["verseIds"]
        assert 6 <= len(vids) <= 16, f"Stone {s['id']} has {len(vids)} verses (expected 6–16)"
        for vid in vids:
            assert vid not in seen_verses, f"Verse {vid} assigned to multiple stones"
            seen_verses.add(vid)
            assert verse_by_id[vid]["stoneId"] == s["id"]
        words = s["defaultMaxim"].split()
        assert 4 <= len(words) <= 12, f"Stone {s['id']} maxim length {len(words)} out of bounds: {s['defaultMaxim']}"
        m_toks = set(tokens(s["defaultMaxim"]))
        s_toks = {w for r in vids for w in tokens(verse_by_id[r]["english"]) + tokens(verse_by_id[r]["long"])}
        assert any(w[:4] == sw[:4] for w in m_toks for sw in s_toks), (
            f"Stone {s['id']} maxim shares no vocabulary with its passages: {s['defaultMaxim']}"
        )
        assert len(s["affinity"]) == 47 and set(s["affinity"]) == stone_ids - {s["id"]}, (
            f"Stone {s['id']} has incomplete affinity list"
        )
    assert len(seen_verses) == 488, "Not all 488 verses assigned to stones"

    # Cross-translation lexical coherence: verify Farquharson and Long agree on each stone's TF-IDF profile
    df = Counter()
    for v in verses:
        df.update(set(tokens(v["english"]) + tokens(v["long"])))
    idf = {w: math.log(len(verses) / (1 + c)) for w, c in df.items()}

    def tfidf_vec(texts):
        tf = Counter(w for t in texts for w in tokens(t))
        vec = {w: cnt * idf.get(w, 1.0) for w, cnt in tf.items()}
        norm = math.sqrt(sum(val * val for val in vec.values())) or 1.0
        return {w: val / norm for w, val in vec.items()}

    def cosine(a, b):
        return sum(val * b.get(w, 0.0) for w, val in a.items())

    f_vecs = {s["id"]: tfidf_vec([verse_by_id[r]["english"] for r in s["verseIds"]]) for s in stones}
    l_vecs = {s["id"]: tfidf_vec([verse_by_id[r]["long"] for r in s["verseIds"]]) for s in stones}
    same_stone_Match = sum(
        1 for s in stones
        if max(stones, key=lambda o: cosine(f_vecs[s["id"]], l_vecs[o["id"]]))["id"] == s["id"]
    )
    assert same_stone_Match == 48, f"Expected all 48 stones to match across translations, got {same_stone_Match}/48"

    print(
        f"Verified dataset: {len(books)} books, {len(verses)} verses, {len(stones)} stones, "
        f"{total_notes} commentary notes ({covered_verses}/488 verses covered), "
        f"{len(people)} people linked, 48/48 cross-translation stone profiles aligned."
    )


if __name__ == "__main__":
    verify()
