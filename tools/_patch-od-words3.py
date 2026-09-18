"""原型补丁（第三轮，接 _patch-od-words.py / _patch-od-words2.py）：单词页内容整体往下移。

用户口径（2026-09-18）：「单词模块中整体往下移」——把单词页的内容整体下移，
顶部多留一点白（`.viewport` 本身有 19px 上内边距，这里再给单词页加 20px，合计约 39px）。

只作用于单词页：给 section 加一个 `.words-page` 钩子类，不动 `.viewport` 的全局定义
（其它页面不跟着动）。

用法：python tools/_patch-od-words3.py <输入.html> <输出.html>
"""
import sys

src_path, out_path = sys.argv[1], sys.argv[2]
s = open(src_path, encoding="utf-8").read()

HITS = {}


def apply_once(label, old, new, expect=1):
    global s
    n = s.count(old)
    if n != expect:
        raise SystemExit(f"[{label}] 期望命中 {expect} 次，实际 {n} 次")
    s = s.replace(old, new)
    HITS[label] = n


# ── 1. 单词页加钩子类 ─────────────────────────────────────────────────
A_SECTION = '<section class="page" data-od-id="vocabulary-home">'
apply_once("单词页钩子类", A_SECTION, '<section class="page words-page" data-od-id="vocabulary-home">')

# ── 2. CSS：只给单词页加顶部留白 ───────────────────────────────────────
A_CSS = ".page { animation: enter 180ms ease-out; }"
NEW_CSS = (
    A_CSS
    + "\n/* 单词页内容整体往下移：只动这一页，不动 .viewport 的全局内边距 */\n"
    ".words-page { padding-top: 20px; }"
)
apply_once("单词页顶部留白", A_CSS, NEW_CSS)

open(out_path, "w", encoding="utf-8", newline="").write(s)
print("补丁完成，各锚点命中：")
for k, v in HITS.items():
    print(f"  {k}: {v}")
print(f"输出 {out_path}（{len(s)} 字符）")
