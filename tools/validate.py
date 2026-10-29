#!/usr/bin/env python3
"""ha-tv-kit · check the kit before you commit.

  python tools/validate.py

1. Every .yaml file parses (Home Assistant tags like !input, !secret and !include are accepted).
2. Every .json file parses.
3. The house-twin panel passes `node --check` (if Node.js is installed).
4. A privacy scan: no real-looking private IPs, MAC addresses, e-mail addresses or tokens.
   Placeholders in this kit use 192.168.1.50 (Home Assistant) and 192.168.1.60-69 (TVs).
   If you fork the kit for your own home, keep your real values out of a public repo.
Exit code 1 if anything fails.
"""
import json
import pathlib
import re
import shutil
import subprocess
import sys

try:
    import yaml
except ImportError:
    sys.exit("PyYAML is missing: pip install pyyaml")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", "node_modules", "backups"}
TEXT_EXT = {".yaml", ".yml", ".json", ".js", ".md", ".ps1", ".sh", ".py", ".txt", ".example"}


class HALoader(yaml.SafeLoader):
    pass


def _any_tag(loader, suffix, node):
    if isinstance(node, yaml.ScalarNode):
        return loader.construct_scalar(node)
    if isinstance(node, yaml.SequenceNode):
        return loader.construct_sequence(node)
    return loader.construct_mapping(node)


HALoader.add_multi_constructor("!", _any_tag)


def files():
    for p in ROOT.rglob("*"):
        if p.is_file() and not (SKIP_DIRS & set(p.relative_to(ROOT).parts)):
            yield p


PLACEHOLDER_IPS = re.compile(r"^192\.168\.1\.(50|6\d)$|^127\.0\.0\.1$|^0\.0\.0\.0$")
CHECKS = [
    ("private IP", re.compile(r"\b(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))(?:\.\d{1,3}){2,3}\b")),
    ("MAC address", re.compile(r"\b[0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}\b")),
    ("e-mail", re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")),
    ("token/key", re.compile(r"\b(?:eyJ[\w-]{20,}|sk-[\w-]{20,}|ghp_\w{20,}|AKIA[0-9A-Z]{16})\b")),
    ("ha-mcp secret URL", re.compile(r"private_(?!dns)[A-Za-z0-9_-]{12,}")),
]


def main():
    problems = []
    for p in files():
        rel = p.relative_to(ROOT).as_posix()
        if p.suffix in {".yaml", ".yml"}:
            try:
                list(yaml.load_all(p.read_text(encoding="utf-8"), Loader=HALoader))
            except yaml.YAMLError as e:
                problems.append(f"{rel}: YAML error: {e}")
        if p.suffix == ".json":
            try:
                json.loads(p.read_text(encoding="utf-8"))
            except ValueError as e:
                problems.append(f"{rel}: JSON error: {e}")
        if p.suffix in TEXT_EXT and p.name != "validate.py":
            for n, line in enumerate(p.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
                for label, rx in CHECKS:
                    for m in rx.finditer(line):
                        v = m.group(0)
                        if label == "private IP" and PLACEHOLDER_IPS.match(v.split("/")[0]):
                            continue
                        problems.append(f"{rel}:{n}: possible {label}: {v}")

    js = ROOT / "dashboard" / "house-twin" / "house-twin.js"
    if shutil.which("node"):
        r = subprocess.run(["node", "--check", str(js)], capture_output=True, text=True)
        if r.returncode:
            problems.append(f"house-twin.js: node --check failed: {r.stderr.strip()}")
    else:
        print("note: Node.js not found, skipped node --check")

    for msg in problems:
        print(msg)
    print("OK" if not problems else f"{len(problems)} problem(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
