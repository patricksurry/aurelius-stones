#!/usr/bin/env python3
"""
Fetch a short description of each person in people.json from English Wikipedia
and archive it at raw/wikipedia/people.json (see raw/SOURCES.md).

Uses the REST summary endpoint, which follows redirects and reports
disambiguation pages, so a wrong title is caught here rather than in the app.
Run occasionally; build_data.py reads only the archived copy.
"""

import json
import os
import time
import urllib.parse
import urllib.error
import urllib.request
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "MeditationsExplorer/0.1 (personal research tool)"


def summary(title):
    url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(title.replace(" ", "_"), safe="")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for wait in (5, 15, 45, None):  # back off when rate-limited
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code != 429 or wait is None:
                raise
            time.sleep(wait)


def main():
    people = json.load(open(os.path.join(ROOT, "people", "people.json"), encoding="utf-8"))["people"]
    path = os.path.join(ROOT, "raw", "wikipedia", "people.json")
    # Resumable: keep what was already fetched for the same title
    previous = json.load(open(path, encoding="utf-8"))["people"] if os.path.exists(path) else {}
    out, problems = {}, []
    for p in people:
        if p["id"] in previous and previous[p["id"]].get("requested") == p["wiki"]:
            out[p["id"]] = previous[p["id"]]
            continue
        try:
            s = summary(p["wiki"])
        except Exception as e:  # noqa: BLE001 - report and carry on
            problems.append(f"{p['id']}: {p['wiki']} -> {e}")
            continue
        if s.get("type") != "standard":
            problems.append(f"{p['id']}: {p['wiki']} is a {s.get('type')} page")
        out[p["id"]] = {
            "title": s.get("title"),
            "url": s.get("content_urls", {}).get("desktop", {}).get("page"),
            "description": s.get("description", ""),
            "extract": s.get("extract", ""),
            "revision": s.get("revision"),
            "requested": p["wiki"],
        }
        time.sleep(1.5)

    os.makedirs(os.path.join(ROOT, "raw", "wikipedia"), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"retrieved": date.today().isoformat(), "people": out}, f, ensure_ascii=False, indent=2)
    print(f"Fetched {len(out)} of {len(people)} people.")
    for line in problems:
        print("  PROBLEM", line)


if __name__ == "__main__":
    main()
