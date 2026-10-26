# /// script
# dependencies = ["sentence-transformers", "numpy"]
# ///
"""
Relatedness between stones, from sentence embeddings of their passages.

Each passage's English text is embedded with BAAI/bge-base-en-v1.5; a stone's
vector is the normalised mean of its passages. Every stone's affinity list is
all other stones, most similar first. Also prints the passages whose embedding
sits closer to another stone than their own, as prompts for a human re-read.

Run with:  uv run clustering/affinity.py
Reads data/meditations.json (for passage text) and clustering/stones.json;
writes clustering/affinity.json.
"""

import json
import os
import re

import numpy as np
from sentence_transformers import SentenceTransformer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def main():
    verses = json.load(open(os.path.join(ROOT, "data", "meditations.json"), encoding="utf-8"))["verses"]
    stones = json.load(open(os.path.join(HERE, "stones.json"), encoding="utf-8"))

    texts = [re.sub(r"<[^>]+>", "", v["english"]) for v in verses]
    model = SentenceTransformer("BAAI/bge-base-en-v1.5")
    emb = model.encode(texts, normalize_embeddings=True, batch_size=32, show_progress_bar=False)
    row = {v["id"]: i for i, v in enumerate(verses)}

    centroids = {}
    for s in stones:
        c = emb[[row[r] for r in s["verseIds"]]].mean(0)
        centroids[s["id"]] = c / np.linalg.norm(c)

    affinity = {}
    for s in stones:
        sims = [(float(centroids[s["id"]] @ centroids[o["id"]]), o["id"]) for o in stones if o["id"] != s["id"]]
        affinity[s["id"]] = [sid for _, sid in sorted(sims, reverse=True)]

    with open(os.path.join(HERE, "affinity.json"), "w", encoding="utf-8") as f:
        json.dump(affinity, f, ensure_ascii=False, indent=2)

    # Advisory: passages that look closer to another stone (leave-one-out centroids)
    home = {r: s["id"] for s in stones for r in s["verseIds"]}
    flagged = []
    for ref, i in row.items():
        best, best_sim, own_sim = None, -1.0, None
        for s in stones:
            members = [row[r] for r in s["verseIds"] if r != ref]
            c = emb[members].mean(0)
            sim = float(emb[i] @ (c / np.linalg.norm(c)))
            if s["id"] == home[ref]:
                own_sim = sim
            elif sim > best_sim:
                best, best_sim = s["id"], sim
        if best_sim - own_sim > 0.05:
            flagged.append((best_sim - own_sim, ref, home[ref], best))
    for d, ref, own, best in sorted(flagged, reverse=True):
        print(f"{d:.3f}  {ref:8s} {own:22s} -> {best}")
    print(f"Wrote affinity for {len(stones)} stones; {len(flagged)} passages flagged for review.")


if __name__ == "__main__":
    main()
