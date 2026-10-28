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
    long_texts = [v["long"] for v in verses]
    maxims = [s["maxim"] for s in stones]
    model = SentenceTransformer("BAAI/bge-base-en-v1.5")
    emb = model.encode(texts, normalize_embeddings=True, batch_size=32, show_progress_bar=False)
    emb_long = model.encode(long_texts, normalize_embeddings=True, batch_size=32, show_progress_bar=False)
    emb_maxim = model.encode(maxims, normalize_embeddings=True, batch_size=32, show_progress_bar=False)
    row = {v["id"]: i for i, v in enumerate(verses)}

    centroids, centroids_long = {}, {}
    for s in stones:
        idx = [row[r] for r in s["verseIds"]]
        c = emb[idx].mean(0)
        centroids[s["id"]] = c / np.linalg.norm(c)
        cl = emb_long[idx].mean(0)
        centroids_long[s["id"]] = cl / np.linalg.norm(cl)

    affinity = {}
    for s in stones:
        sims = [(float(centroids[s["id"]] @ centroids[o["id"]]), o["id"]) for o in stones if o["id"] != s["id"]]
        affinity[s["id"]] = [sid for _, sid in sorted(sims, reverse=True)]

    with open(os.path.join(HERE, "affinity.json"), "w", encoding="utf-8") as f:
        json.dump(affinity, f, ensure_ascii=False, indent=2)

    # Check 1: Cross-translation stability (Farquharson vs. Long stone centroids)
    cross_sims = [float(centroids[s["id"]] @ centroids_long[s["id"]]) for s in stones]
    print(f"Cross-translation centroid agreement (Farquharson vs. Long): mean {np.mean(cross_sims):.3f}, min {np.min(cross_sims):.3f}")

    # Check 2: Maxim entailment against stone centroids
    maxim_off = []
    for idx_s, s in enumerate(stones):
        m_vec = emb_maxim[idx_s]
        own_sim = float(m_vec @ centroids[s["id"]])
        best_id, best_sim = max(((o["id"], float(m_vec @ centroids[o["id"]])) for o in stones), key=lambda x: x[1])
        if best_id != s["id"] and best_sim - own_sim > 0.03:
            maxim_off.append((best_sim - own_sim, s["id"], best_id, s["maxim"]))
    if maxim_off:
        print(f"\nMaxims closer to another stone's centroid (>0.03 margin): {len(maxim_off)}")
        for d, sid, best, m in sorted(maxim_off, reverse=True):
            print(f"  {d:.3f}  {sid:22s} -> {best:22s} ({m})")

    # Check 3: Passages that look closer to another stone (leave-one-out centroids)
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
    print(f"\nPassages closer to another stone (>0.05 margin): {len(flagged)}")
    for d, ref, own, best in sorted(flagged, reverse=True):
        print(f"  {d:.3f}  {ref:8s} {own:22s} -> {best}")
    print(f"Wrote affinity for {len(stones)} stones.")


if __name__ == "__main__":
    main()
