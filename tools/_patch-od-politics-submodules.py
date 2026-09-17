#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
把政治刷题页的「考纲模块」筛选项明确降级为**政治学科下的二级分组**。

问题（用户反馈 + 截图）：
  资料库页顶部的学科 tab 是「政治 / 组成原理 / 操作系统 / 数据结构 / 计算机网络」五个，
  政治刷题页里又有「全部 / 马原 / 毛中特 / 史纲 / 思修」这些 chip。两组都是圆角小胶囊、
  字号也接近，视觉上连成一片，看起来像**十个平级的模块**，
  而实际上后一组是政治的下一级。

改法：
  1. 给模块区加一个**父级标题**「政治 · 考纲模块」，把归属写明白；
  2. 加 `.sub-chips` 容器：左边一条竖线 + 缩进，视觉上表示「挂在政治下面」；
  3. chip 基础样式换成更小、更轻的形态，与顶部学科 tab 拉开层级差；
  4. 顺手加一行说明文字，讲清「上面选学科，这里选模块」。

用「精确整行匹配 + 命中数断言」的方式改，任何锚点没命中就报错退出，绝不静默错改。
用法： python tools/_patch-od-politics-submodules.py <src.html> <out.html>
"""
import sys


class PatchError(RuntimeError):
    pass


def apply_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise PatchError(f'[{label}] 期望命中 1 次，实际 {n} 次\n  锚点: {old[:180]}')
    return text.replace(old, new)


def patch(src):
    t = src

    # ── 1) 模块区改成带父级标题的二级分组 ──
    # 原来：<div class="section-head"><h2 ...>按模块练习</h2><span>选择题 · 材料题</span></div>
    #       <div class="chip-row">${moduleChips}</div>
    # 现在：标题里点名「政治 · 考纲模块」，并套一层 .sub-chips 表示从属关系。
    old_module_block = (
        '<div class="section-head"><h2 data-od-id="politics-quiz-list-heading">按模块练习</h2>'
        '<span>选择题 · 材料题</span></div>\n'
        '<div class="chip-row">${moduleChips}</div>\n'
    )
    new_module_block = (
        '<div class="section-head"><h2 data-od-id="politics-quiz-list-heading">按考纲模块练习</h2>'
        '<span>选择题 · 材料题</span></div>\n'
        '<div class="sub-group" data-od-id="politics-module-group">\n'
        '<p class="sub-group-label">政治 · 考纲模块</p>\n'
        '<div class="chip-row sub-chips">${moduleChips}</div>\n'
        '</div>\n'
    )
    t = apply_once(t, old_module_block, new_module_block, '政治模块区改为二级分组')

    # ── 2) 在进度卡下方补一行「层级说明」，避免再被误读成平级 ──
    old_after_progress = (
        '<p class="quiet-note" style="margin-top:10px">已答对 ${correct} 题，正确率 ${rate}%</p></div>\n'
    )
    new_after_progress = (
        '<p class="quiet-note" style="margin-top:10px">已答对 ${correct} 题，正确率 ${rate}%</p></div>\n'
        '<p class="hint-note" data-od-id="politics-module-hint">'
        '上方切换学科，下面按政治的考纲模块筛题。</p>\n'
    )
    t = apply_once(t, old_after_progress, new_after_progress, '补层级说明')

    # ── 3) 样式：二级分组的外观 + 更轻的 chip ──
    old_chip_css = (
        '.chip-row { display: flex; flex-wrap: wrap; gap: 7px; margin: 4px 0 2px; }\n'
        '.chip { padding: 6px 11px; border-radius: 15px; border: 1px solid var(--border); '
        'background: var(--surface); color: var(--muted); font-size: 11px; line-height: 1.45; }\n'
        '.chip.active { background: var(--primary); border-color: var(--primary); color: #fff; }\n'
    )
    new_chip_css = (
        '.chip-row { display: flex; flex-wrap: wrap; gap: 7px; margin: 4px 0 2px; }\n'
        '.chip { padding: 6px 11px; border-radius: 15px; border: 1px solid var(--border); '
        'background: var(--surface); color: var(--muted); font-size: 11px; line-height: 1.45; }\n'
        '.chip.active { background: var(--primary); border-color: var(--primary); color: #fff; }\n'
        '\n'
        '/* 二级分组：政治下的考纲模块。左侧竖线 + 缩进，与顶部学科 tab 拉开层级 */\n'
        '.sub-group { margin: 2px 0 12px; padding: 10px 0 10px 11px; '
        'border-left: 2px solid var(--primary-soft); }\n'
        '.sub-group-label { font-size: 10px; letter-spacing: 0.6px; color: var(--muted); '
        'margin-bottom: 8px; }\n'
        '/* 二级 chip 比学科 tab 更小更轻，提示「我在政治里面」 */\n'
        '.sub-chips { margin: 0; }\n'
        '.sub-chips .chip { padding: 5px 9px; border-radius: 12px; font-size: 10.5px; '
        'background: transparent; }\n'
        '.sub-chips .chip.active { background: var(--primary); }\n'
        '.hint-note { font-size: 10px; color: var(--muted); line-height: 1.7; margin: 9px 0 0; }\n'
    )
    t = apply_once(t, old_chip_css, new_chip_css, '加二级分组样式')

    # ── 4) 去掉模块名的 6 字截断 ──
    # 原逻辑 `m.length>6 ? m.slice(0,6)+'…' : m` 会把每个模块名都切坏：
    #   马克思主义基本原理 → 马克思主义基…
    #   思想道德与法治     → 思想道德与法…
    # 六个里五个被截，读起来全是残句，比"层级不清"更难懂。
    # 现在 chip 变轻变小且已缩进，允许换行，不需要截断。
    old_truncate = (
        'data-od-id="quiz-module-${m}">'
        "${m.length>6?m.slice(0,6)+'…':m} ${stats[m].done}/${stats[m].total}</button>"
    )
    new_truncate = (
        'data-od-id="quiz-module-${m}">'
        '${m} ${stats[m].done}/${stats[m].total}</button>'
    )
    t = apply_once(t, old_truncate, new_truncate, '去掉模块名截断')

    return t


def main():
    if len(sys.argv) != 3:
        print('用法: python _patch-od-politics-submodules.py <src.html> <out.html>')
        return 2
    src_path, out_path = sys.argv[1], sys.argv[2]
    with open(src_path, encoding='utf-8') as f:
        src = f.read()
    try:
        out = patch(src)
    except PatchError as e:
        print(f'❌ 补丁失败：{e}')
        return 1
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(out)
    print(f'✅ 已写入 {out_path}')
    print(f'   {len(src)} → {len(out)} 字符 (+{len(out) - len(src)})')
    return 0


if __name__ == '__main__':
    sys.exit(main())
