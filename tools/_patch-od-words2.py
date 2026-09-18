"""原型补丁（第二轮，接 _patch-od-words.py）：音标保留 + 删掉背单词页的「我的收藏」。

用户补充口径（2026-09-18）：
  1. 「音标不要去掉啊」——第一轮把整块 .pronunciation 连音标一起删了，
     这里改成：只去掉喇叭图标和朗读功能，**音标（/ipa/ + 英音）保留**，
     且不再是按钮（.word-ipa 是纯展示元素，避免看起来还能点）。
  2. 背单词页底部「我的收藏」删掉——单词本已经能看到全部单词，这一行是重复的。

用法：python tools/_patch-od-words2.py <输入.html> <输出.html>
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


# ── 1. 音标组件：纯展示，不带喇叭、不可点 ──────────────────────────────
A_REVIEW = "function reviewPage() {"
NEW_REVIEW = """/** 音标是单词释义的一部分，不是「播放发音」的入口：只展示，不可点 */
function wordIpa(index) { return `<span class="word-ipa" data-od-id="word-ipa"><span lang="en">/${vocabulary[index].ipa}/</span><span class="accent-label">英音</span></span>`; }
function reviewPage() {"""
apply_once("音标组件", A_REVIEW, NEW_REVIEW)

# ── 2. 复习页 / 详情页：音标放回单词标题下面 ────────────────────────────
A_RTITLE = (
    '<h1 class="word-heading" lang="en" data-od-id="review-word">${w.word}</h1>'
)
apply_once("复习页音标", A_RTITLE, A_RTITLE + "${wordIpa(index)}")

A_DTITLE = (
    '<h1 class="word-heading" lang="en" data-od-id="word-detail-title">${w.word}</h1>'
)
apply_once("详情页音标", A_DTITLE, A_DTITLE + "${wordIpa(detailWord)}")

# ── 3. CSS：.word-ipa（沿用 .pronunciation 的字号与分隔线，去掉按钮感） ──
A_CSS = ".pronunciation:hover { background: var(--primary-soft); color: var(--primary-hover); }"
NEW_CSS = A_CSS + """
.word-ipa { display: inline-flex; align-items: center; gap: 9px; color: var(--muted); font-size: 13px; }
.word-ipa .accent-label { font-size: 9px; border-left: 1px solid var(--border); padding-left: 9px; }"""
apply_once("音标样式", A_CSS, NEW_CSS)

# ── 4. 背单词页：删掉底部「我的收藏」 ──────────────────────────────────
A_FAV = (
    '<div class="menu-list"><button class="menu-row" data-action="nav" data-route="favorites" '
    'data-od-id="vocabulary-favorites">${icon(\'star\')}<strong>我的收藏</strong>'
    "<small>${state.favorites.length} 个单词</small>${icon('chevron')}</button></div>"
)
apply_once("删我的收藏", A_FAV, "")

open(out_path, "w", encoding="utf-8", newline="").write(s)
print("补丁完成，各锚点命中：")
for k, v in HITS.items():
    print(f"  {k}: {v}")
print(f"输出 {out_path}（{len(s)} 字符）")
