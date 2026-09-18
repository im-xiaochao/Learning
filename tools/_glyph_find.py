# -*- coding: utf-8 -*-
"""在生成文件里定位形近字，并判定它落在哪个字段。

用法：python tools/_glyph_find.py <文件> <串1> [串2 ...]
"""
import io
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

FIELDS = ("stem", "explanation", "answerPoints", "paragraphs", "text", "options")


def unescape(s: str) -> str:
    return (s.replace("\\\\", "\x00").replace('\\"', '"')
             .replace("\\n", "\n").replace("\x00", "\\"))


def field_at(raw: str, i: int) -> str:
    head = raw[max(0, i - 2000):i]
    best, pos = "?", -1
    for f in FIELDS:
        k = head.rfind(f + ":")
        if k > pos:
            best, pos = f, k
    return best


def main():
    path = sys.argv[1]
    raw = io.open(path, encoding="utf-8").read()
    for kw in sys.argv[2:]:
        hits = list(re.finditer(re.escape(kw), raw))
        print(f"=== {kw}  ({len(hits)} 处)")
        for m in hits:
            i = m.start()
            j = raw.rfind("id: ", 0, i)
            qid = raw[j + 4:raw.find('"', j + 4)] if j >= 0 else "?"
            print(f"   {qid} [{field_at(raw, i)}] …{raw[max(0, i-52):i+52]}…")
        print()


if __name__ == "__main__":
    main()
