#!/usr/bin/env python3
"""Renders preview.html to preview.png (1200×630, for link previews) and icon.svg to
apple-touch-icon.png (180×180), using headless Chrome."""

import os
import subprocess
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")


def shot(src, out, w, h):
    subprocess.run([CHROME, "--headless", "--hide-scrollbars", "--virtual-time-budget=4000",
                    f"--window-size={w},{h}", f"--screenshot={os.path.join(HERE, out)}",
                    f"file://{os.path.join(HERE, src)}"], check=True, capture_output=True)


if __name__ == "__main__":
    shot("preview.html", "preview.png", 1200, 630)
    with tempfile.NamedTemporaryFile("w", suffix=".html", dir=HERE, delete=False) as f:
        f.write('<body style="margin:0"><img src="icon.svg" width="180" height="180" style="display:block">')
    try:
        shot(os.path.basename(f.name), "apple-touch-icon.png", 180, 180)
    finally:
        os.remove(f.name)
