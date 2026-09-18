"""
把一批单词深度内容写进 data/english/word-content.ts 的共用逻辑。

被各批次脚本调用（tools/_add-word-content-batchN.py）——新增批次时**只写数据**，
插入、排序、登记 BATCHES 这些机械活都在这里，别在每个批次里复制一遍。

用法（在批次脚本里）：
    from _word_content_insert import insert_batch
    insert_batch(ENTRIES, 'batch-4', '高频词第三批')

做三件事：
  1. 校验：词必须在 5493 词库里（不在的话 build 直接报错），且不能重复收录；
  2. 按字母序把条目插进 WORD_CONTENT（找第一个字母序更大的键插到它前面，
     从后往前插，避免前面的偏移量失效）；
  3. 把词清单登记进 BATCHES（构建与校验会打印覆盖率）。
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'data' / 'english' / 'word-content.ts'
WORDS = ROOT / 'pages-words' / 'words.ts'

# BATCHES 数组的收尾：新批次插到 ] 之前，且不破坏后面的 WORD_CONTENT 声明
BATCH_TAIL = '\n]\n\nexport const WORD_CONTENT'


def esc(s: str) -> str:
    return s.replace('\\', '\\\\').replace('"', '\\"')


def render(word: str, data) -> str:
    root, note, mnemonic, examples, collocations = data
    out = [f'  {word}: {{']
    out.append(f'    root: {{ display: "{esc(root)}", explanation: "{esc(note)}" }},')
    out.append(f'    mnemonic: "{esc(mnemonic)}",')
    out.append('    examples: [')
    for en, zh in examples:
        out.append(f'      {{ sentence: "{esc(en)}", translationZh: "{esc(zh)}" }},')
    out.append('    ],')
    out.append('    collocations: [')
    for phrase, meaning in collocations:
        out.append(f'      {{ phrase: "{esc(phrase)}", meaningZh: "{esc(meaning)}" }},')
    out.append('    ],')
    out.append('  },')
    return '\n'.join(out) + '\n'


def insert_batch(entries: dict, batch_id: str, batch_label: str) -> None:
    src = CONTENT.read_text(encoding='utf-8')
    vocab = set(re.findall(r'\{"id":"word-[^"]*","word":"([^"]+)"', WORDS.read_text(encoding='utf-8')))
    existing = re.findall(r'^  ([a-z]+): \{$', src, re.M)

    todo = [w for w in sorted(entries) if w not in set(existing)]
    skipped = [w for w in sorted(entries) if w in set(existing)]
    unknown = [w for w in todo if w not in vocab]
    if unknown:
        sys.exit(f'❌ 这些词不在词库里，写了构建会报错：{unknown}')
    if not todo:
        print('全部已收录，无需改动')
        return

    positions = [(m.group(1), m.start()) for m in re.finditer(r'^  ([a-z]+): \{$', src, re.M)]
    tail = src.rindex('\n}\n') + 1  # WORD_CONTENT 的收尾大括号
    inserts = []
    for word in todo:
        pos = next((start for key, start in positions if key > word), tail)
        inserts.append((pos, render(word, entries[word])))
    for pos, text in sorted(inserts, key=lambda x: -x[0]):
        src = src[:pos] + text + src[pos:]

    if src.count(BATCH_TAIL) != 1:
        sys.exit(f'❌ BATCHES 收尾锚点命中 {src.count(BATCH_TAIL)} 次，不敢乱插')
    rows = [', '.join(f"'{w}'" for w in todo[i:i + 6]) for i in range(0, len(todo), 6)]
    body = '\n'.join(f'    {r},' for r in rows)
    block = (
        '  {\n'
        f"    id: '{batch_id}',\n"
        f"    label: '{batch_label}',\n"
        '    words: [\n'
        f'{body}\n'
        '    ],\n'
        '  },'
    )
    src = src.replace(BATCH_TAIL, block + BATCH_TAIL)

    CONTENT.write_text(src, encoding='utf-8')
    print(f'✅ 新增 {len(todo)} 条 → {CONTENT.name}（累计 {len(existing) + len(todo)} 条）')
    if skipped:
        print(f'   跳过（已收录）：{skipped}')
    print('下一步：cd tools && npm run build:content && npm run validate:content')
