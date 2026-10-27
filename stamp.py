#!/usr/bin/env python3
"""
Stamp each local CSS and JS file referenced by index.html with a hash of its
contents (style.css?v=…), so a browser never mixes a new page with stale files.
Run before pushing; build_data.py runs it too.
"""

import hashlib
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))


def stamp():
    path = os.path.join(ROOT, "index.html")
    page = open(path, encoding="utf-8").read()

    def versioned(m):
        attr, asset = m.group(1), m.group(2)
        with open(os.path.join(ROOT, asset), "rb") as f:
            version = hashlib.sha1(f.read()).hexdigest()[:10]
        return f'{attr}="{asset}?v={version}"'

    page = re.sub(r'(src|href)="((?:css|js|data)/[^"?]+)(?:\?v=[0-9a-f]+)?"', versioned, page)
    with open(path, "w", encoding="utf-8") as f:
        f.write(page)


if __name__ == "__main__":
    stamp()
