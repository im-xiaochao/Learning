"""
数学知识点内容审计：把 960 个知识点按「重复 / 体例 / 可疑模式」过一遍，输出报告。

为什么要这个：`data/math/lectures.ts` 是**规则生成器**（记忆里记着重复率 87.7%），
所以「内容是否正确」不能只看几条——得先看清哪些是模板批量生成的，
再逐个核对模板里塞进去的公式（公式错了会静默错一片）。

用法：python tools/_math_audit.py            # 打印摘要 + 写报告
     python tools/_math_audit.py --dump-anchors   # 额外打印去重后的公式清单，便于人工核对
"""
import glob
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KNOW = ROOT / 'data' / 'content' / 'knowledge'
SUBJECTS = ['calculus', 'algebra', 'probability']
SUBJECT_NAME = {'calculus': '高等数学', 'algebra': '线性代数', 'probability': '概率论与数理统计'}

# 注意：「略」单独一个字会命中「策略 / 忽略 / 省略」，必须带上上下文才判占位
PLACEHOLDER = re.compile(r'待补|待定|TODO|TBD|占位|见正文|同上|暂无|（略）|\(略\)|略。')


def norm(s: str) -> str:
    """归一化：去掉数字/空白/标点，用来识别「同一模板换了数字」的重复。"""
    s = re.sub(r'[0-9０-９]+(\.[0-9]+)?', '#', s)
    s = re.sub(r'[\s，。、；：,.;:()（）【】\[\]“”"\'’]+', '', s)
    return s


def load():
    out = []
    for subj in SUBJECTS:
        for f in sorted(glob.glob(str(KNOW / subj / '*.json'))):
            d = json.load(open(f, encoding='utf-8'))
            for kp in d['knowledge']:
                # 只留章节的几个标量字段：直接挂整个 chapter 会形成环（chapter.knowledge → kp._chapter）
                kp['_chapterId'] = d['chapterId']
                kp['_chapterTitle'] = d['title']
                kp['_subjectId'] = d['subjectId']
                kp['_module'] = d['module']
                out.append(kp)
    return out


def main():
    kps = load()
    print(f'数学知识点：{len(kps)} 个\n')

    # ── 1. 字段完整性与体例 ───────────────────────────────────────────
    empty_summary = [k for k in kps if not (k.get('summary') or '').strip()]
    no_anchor = [k for k in kps if not (k.get('anchor') or {}).get('content', '').strip()]
    no_points = [k for k in kps if not k.get('keyPoints')]
    no_examples = [k for k in kps if not k.get('examples')]
    print('【1】字段完整性')
    print(f'  summary 为空      : {len(empty_summary)}')
    print(f'  anchor 无内容     : {len(no_anchor)}')
    print(f'  keyPoints 为空    : {len(no_points)}')
    print(f'  examples 为空     : {len(no_examples)}')

    # keyPoints 的 body 是否只是把 title 重复一遍（体例问题，等于没写）
    body_eq_title = 0
    body_short = 0
    for k in kps:
        for p in k.get('keyPoints', []):
            t = (p.get('title') or '').strip()
            b = (p.get('bodyMarkdown') or '').strip()
            if b == t:
                body_eq_title += 1
            if len(b) < 12:
                body_short += 1
    total_points = sum(len(k.get('keyPoints', [])) for k in kps)
    print(f'  要点正文 == 标题  : {body_eq_title} / {total_points} 条要点')
    print(f'  要点正文 < 12 字  : {body_short} / {total_points} 条要点')

    # ── 2. 重复度（模板批量生成的痕迹） ───────────────────────────────
    print('\n【2】重复度')
    for field, getter in [
        ('summary', lambda k: k.get('summary', '')),
        ('anchor.content', lambda k: (k.get('anchor') or {}).get('content', '')),
        ('anchor.caption', lambda k: (k.get('anchor') or {}).get('caption', '')),
        ('examples[0].body', lambda k: (k.get('examples') or [{}])[0].get('bodyMarkdown', '')),
    ]:
        vals = [getter(k) for k in kps]
        exact = Counter(vals)
        normed = Counter(norm(v) for v in vals)
        uniq = len(exact)
        uniq_norm = len(normed)
        dup_norm = len(kps) - uniq_norm
        print(
            f'  {field:18} 去重后 {uniq:4} / 归一化去重 {uniq_norm:4}'
            f' → 模板重复 {dup_norm:4} 条（{dup_norm / len(kps) * 100:.1f}%）'
        )

    # 重复最多的模板 Top5
    print('\n  重复最多的 anchor.content（归一化后）Top 5：')
    cnt = Counter(norm((k.get('anchor') or {}).get('content', '')) for k in kps)
    for text, n in cnt.most_common(5):
        sample = next(k for k in kps if norm((k.get('anchor') or {}).get('content', '')) == text)
        print(f'    ×{n:3}  {sample["_chapterTitle"]} / {sample["title"]}: '
              f'{(sample.get("anchor") or {}).get("content", "")[:60]}')

    # ── 3. 可疑模式 ──────────────────────────────────────────────────
    print('\n【3】可疑模式')
    ph = [k for k in kps if PLACEHOLDER.search(json.dumps(k, ensure_ascii=False))]
    print(f'  含占位词（待补/略/见正文…）: {len(ph)}')
    for k in ph[:5]:
        print(f'    · {k["_chapterTitle"]} / {k["title"]}')

    # 公式本身的机械问题（**不含**中文标点——设计稿里公式就是中文标点的写法，别当缺陷）
    weird = []
    for k in kps:
        c = (k.get('anchor') or {}).get('content', '').strip()
        why = ''
        if len(c) < 5:
            why = '公式过短（可能是空壳）'
        elif c.count('（') != c.count('）') or c.count('(') != c.count(')'):
            why = '括号不配对'
        # 注意：`|` 是绝对值符号（|aₙ−A|<ε），不是 markdown 表格，别当残留
        elif re.search(r'(\*\*|^#{1,6}\s|\|\s*-{3,})', c):
            why = '混入 markdown 残留'
        elif re.search(r'[A-Za-z]{20,}', c):
            why = '疑似未渲染的英文串'
        if why:
            weird.append((k, why))
    print(f'  公式机械异常（空壳/括号/残留）: {len(weird)}')
    for k, why in weird[:8]:
        print(f'    · {k["_chapterTitle"]} / {k["title"]} → {why}：{(k.get("anchor") or {}).get("content","")}')

    # 章节内「一条公式被套到多少个不同知识点上」——套得越多，说明越多的点与内容不匹配
    print('\n【3.5】同一章节内，一条公式被复用到几个知识点（越多越说明内容与标题不符）')
    by_ch = defaultdict(list)
    for k in kps:
        by_ch[(k['_subjectId'], k['_chapterId'])].append(k)
    worst = []
    for (subj, cid), items in by_ch.items():
        seen = defaultdict(list)
        for k in items:
            seen[norm((k.get('anchor') or {}).get('content', ''))].append(k)
        worst.append((max(len(v) for v in seen.values()), len(items), len(seen), items[0]['_chapterTitle'], subj))
    worst.sort(reverse=True)
    for top, total, uniq, title, subj in worst[:8]:
        print(f'  {SUBJECT_NAME[subj]} / {title}：{total} 个知识点只用 {uniq} 条公式，最多一条被 {top} 个点共用')

    # 标题与 anchor 完全无关（公式里既没有标题关键词，也没有该章节的符号）
    print('\n【4】按章节列出「去重后的公式」，供人工核对数学正确性')
    by_chapter = defaultdict(list)
    for k in kps:
        by_chapter[(k['_subjectId'], k['_chapterId'])].append(k)
    anchors_by_chapter = {}
    for (subj, cid), items in sorted(by_chapter.items()):
        seen = {}
        for k in items:
            a = (k.get('anchor') or {}).get('content', '').strip()
            seen.setdefault(norm(a), []).append(k)
        anchors_by_chapter[(subj, cid)] = seen
        print(f'  {SUBJECT_NAME[subj]} / {items[0]["_chapterTitle"]}（{items[0]["_module"]}）'
              f'：{len(items)} 个知识点 → 去重公式 {len(seen)} 条')

    if '--dump-anchors' in sys.argv:
        for (subj, cid), seen in anchors_by_chapter.items():
            items = by_chapter[(subj, cid)]
            print(f'\n{"=" * 70}\n{SUBJECT_NAME[subj]} / {items[0]["_chapterTitle"]}')
            for normed, ks in seen.items():
                titles = '、'.join(k['title'] for k in ks)
                print(f'  [{len(ks)}] {titles}')
                print(f'        {(ks[0].get("anchor") or {}).get("content", "")}')


if __name__ == '__main__':
    main()
