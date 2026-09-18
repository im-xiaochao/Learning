"""删掉废弃稿 ci-shu-tong-xing-v2.html 背单词页里的「我的收藏」。

背景：用户报「原型图里单词模块下还有我的收藏」，但**生效稿** ci-shu-tong-xing.html
在 `_patch-od-words2.py` 里早就删掉了。查下来项目里还留着这份 9/14 的废弃稿
（87 KB），它的背单词页既有「继续复习」也有「我的收藏」——用户看到的很可能是它。

这里只做用户要求的那一件事（删「我的收藏」），不动这份废弃稿的其他内容；
真要彻底消除歧义，应该把整个 v2 删掉（已让用户决定）。

用法：python tools/_patch-od-v2-drop-favorites.py <输入.html> <输出.html>
"""
import sys

src_path, out_path = sys.argv[1], sys.argv[2]
s = open(src_path, encoding="utf-8").read()

ANCHOR = (
    '<div class="menu-list"><button class="menu-row" data-action="nav" data-route="favorites" '
    'data-od-id="vocabulary-favorites">${icon(\'star\')}<strong>我的收藏</strong>'
    "<small>${state.favorites.length} 个单词</small>${icon('chevron')}</button></div>"
)

n = s.count(ANCHOR)
if n != 1:
    raise SystemExit(f"[删我的收藏] 期望命中 1 次，实际 {n} 次")
s = s.replace(ANCHOR, "")

if "我的收藏" in s:
    raise SystemExit("[删我的收藏] 删完还残留「我的收藏」")

open(out_path, "w", encoding="utf-8", newline="").write(s)
print(f"✅ 已删除 v2 背单词页的「我的收藏」→ {out_path}（{len(s)} 字符）")
