#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
修复：资料库页选中政治时，学科 tab 消失，导致切不到计算机的四门课。

问题
----
上一版改造里，知识库渲染函数是这样写的：

    if (subjects[subjectIndex] && subjects[subjectIndex].quiz) return politicsQuizPage();

这里是**整个页面提前 return**。而 `politicsQuizPage()` 自己返回一个完整的
`<section class="page">`，里面**没有学科 tab**。后果：

  - 选中政治时，顶部「政治 / 组成原理 / 操作系统 / 数据结构 / 计算机网络」
    这一排学科切换器被整个替换掉了；
  - 用户**无法再切走**，资料库看起来「只有政治」；
  - 更讽刺的是，刷题页自己还写着「上方切换学科」——上方根本没有东西。

改法
----
把「页面骨架」和「页面内容」拆开：
  1. `politicsQuizPage()` 改成返回**内容片段**（不再带 `<section class="page">` 外壳）；
  2. 知识库渲染函数永远渲染骨架（eyebrow + 标题 + 搜索框 + 学科 tab），
     只在 `#knowledge-results` 里按学科分流：
        政治 → 刷题内容
        其它 → 知识点结果
  3. 数学 tab（没有政治）不受影响，行为不变。

用「整行精确匹配 + 命中数断言」，任何锚点没命中就抛错退出。
用法： python tools/_patch-od-library-keep-subject-tabs.py <src.html> <out.html>
"""
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


class PatchError(RuntimeError):
    pass


def apply_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise PatchError(f'[{label}] 期望命中 1 次，实际 {n} 次\n  锚点: {old[:200]}')
    return text.replace(old, new)


def patch(src):
    t = src

    # ── 1) 去掉整个页面的提前 return，改成只替换内容区 ──
    # 原：政治直接 return 整个刷题页，把学科 tab 一起吞掉
    old_branch = (
        "  if (subjects[subjectIndex] && subjects[subjectIndex].quiz) "
        "return politicsQuizPage(); const tab=activeTab(), list=tabSubjects(tab), "
        "s=subjects[subjectIndex]; return `<section class=\"page\" data-od-id=\"knowledge-library\">"
    )
    new_branch = (
        "  const tab=activeTab(), list=tabSubjects(tab), s=subjects[subjectIndex]; "
        "const isQuiz = !!(s && s.quiz); "
        "return `<section class=\"page\" data-od-id=\"knowledge-library\">"
    )
    t = apply_once(t, old_branch, new_branch, '去掉政治的整页提前 return')

    # ── 1b) 标题与 eyebrow 要跟着学科性质走 ──
    # 政治没有知识点，套「把知识点，讲明白。」是错的。
    old_head = (
        '<p class="eyebrow">${tab===\'library\'?\'资料库\':\'数学\'} · ${s.name}</p>'
        '<h1 class="page-title" data-od-id="knowledge-title">把知识点，讲明白。</h1>'
    )
    new_head = (
        '<p class="eyebrow">${tab===\'library\'?\'资料库\':\'数学\'} · '
        '${isQuiz?\'政治 · 题库\':s.name}</p>'
        '<h1 class="page-title" data-od-id="knowledge-title">'
        '${isQuiz?\'先刷题，再回头看理论。\':\'把知识点，讲明白。\'}</h1>'
    )
    t = apply_once(t, old_head, new_head, '标题按学科性质分流')

    # ── 2) 搜索框与学科 tab 对刷题学科也保留，但搜索框隐藏（政治没有知识点可搜） ──
    old_search = (
        '<label class="search-box" data-od-id="knowledge-search">${icon(\'search\')}'
        '<input id="knowledge-search" type="search" placeholder="搜索知识点，如：极限、进程" '
        'value="${esc(searchTerm)}" aria-label="搜索知识点" autocomplete="off"></label>'
    )
    new_search = (
        '${isQuiz ? \'\' : `<label class="search-box" data-od-id="knowledge-search">'
        '${icon(\'search\')}<input id="knowledge-search" type="search" '
        'placeholder="搜索知识点，如：极限、进程" value="${esc(searchTerm)}" '
        'aria-label="搜索知识点" autocomplete="off"></label>`}'
    )
    t = apply_once(t, old_search, new_search, '刷题学科隐藏搜索框（保留学科 tab）')

    # ── 3) 内容区按学科分流 ──
    old_results = '<div id="knowledge-results">${knowledgeResults()}</div></section>`; }'
    new_results = (
        '<div id="knowledge-results">${isQuiz ? politicsQuizBody() : knowledgeResults()}</div></section>`; }'
    )
    t = apply_once(t, old_results, new_results, '内容区按学科分流')

    # ── 4) 刷题页改成「内容片段」：去掉 <section class="page"> 外壳与自带的 eyebrow/标题 ──
    # 原：返回完整页面，含自己的 eyebrow「考研政治 · 题库」和大标题
    old_empty = (
        "  if (!total) return `<section class=\"page\" data-od-id=\"politics-quiz-empty\">"
        "<p class=\"eyebrow\">考研政治 · 题库</p><h1 class=\"page-title\">题目还在录入。</h1>"
        "<div class=\"panel mt20\"><p class=\"subtext\">这个模块暂时没有可练习的题目。"
        "题库补充后会自动出现在这里。</p></div></section>`;"
    )
    new_empty = (
        "  if (!total) return `<div data-od-id=\"politics-quiz-empty\">"
        "<div class=\"panel mt20\"><p class=\"subtext\">这个模块暂时没有可练习的题目。"
        "题库补充后会自动出现在这里。</p></div></div>`;"
    )
    t = apply_once(t, old_empty, new_empty, '刷题空态改成内容片段')

    old_return = (
        "  return `<section class=\"page\" data-od-id=\"politics-quiz-home\">"
        "<p class=\"eyebrow\">考研政治 · 题库</p><h1 class=\"page-title\" "
        "data-od-id=\"politics-quiz-title\">先刷题，再回头看理论。</h1>\n"
    )
    new_return = (
        "  return `<div data-od-id=\"politics-quiz-home\">\n"
    )
    t = apply_once(t, old_return, new_return, '刷题正文改成内容片段（去外壳）')

    # ── 5) 收尾：把刷题正文的 </section>` 改成 </div>` ──
    old_tail = (
        "<p class=\"quiet-note\">政治暂无可发布的知识点讲解，先做题，讲解之后会补上。</p></section>`;\n}"
    )
    new_tail = (
        "<p class=\"quiet-note\">政治暂无可发布的知识点讲解，先做题，讲解之后会补上。</p></div>`;\n}"
    )
    t = apply_once(t, old_tail, new_tail, '刷题正文收尾闭合标签')

    # ── 6) 函数改名：politicsQuizPage → politicsQuizBody（它不再是一个"页"） ──
    n = t.count('function politicsQuizPage()')
    if n != 1:
        raise PatchError(f'[函数改名] 期望命中 1 次，实际 {n} 次')
    t = t.replace('function politicsQuizPage()', 'function politicsQuizBody()')

    # ── 7) 路由表里的 'quiz' 仍然指向列表 —— 用新的 body 函数包装一个真页面 ──
    # 首页「接着上次学」与路由都可能直接跳 quiz，需要一个带学科 tab 的完整页
    old_route = "const extraPages={'review':reviewPage,'word-detail':wordDetailPage,"
    if t.count(old_route) != 1:
        raise PatchError('[路由包装] 找不到 extraPages 定义')
    t = t.replace(
        old_route,
        "const politicsQuizPage = () => `<section class=\"page\" data-od-id=\"politics-quiz-standalone\">"
        "`+politicsQuizBody()+`</section>`;\n"
        + old_route,
    )

    return t


def main():
    if len(sys.argv) != 3:
        print('用法: python _patch-od-library-keep-subject-tabs.py <src.html> <out.html>')
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
    print(f'   {len(src)} → {len(out)} 字符 ({len(out) - len(src):+d})')
    return 0


if __name__ == '__main__':
    sys.exit(main())
