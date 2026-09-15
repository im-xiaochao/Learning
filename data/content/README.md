# data/content — 内容数据说明

本目录是按《词数同行：知识点数据存放格式与实例》v1.0 落地的内容数据，由脚本从
`data/*.ts` 自动生成。**不要手工编辑本目录下的 JSON**，改数据请改源文件后重新生成。

## 目录结构

```text
data/
  content/
    catalog.json                          课程 / 学科 / 章节
    knowledge/<subjectId>/<chapterId>.json 知识点（按章节打包）
    vocabulary/words.json                  词库（整体打包）
  generated/
    knowledge-index.json                   知识点搜索索引
    vocabulary-index.json                  词库搜索索引
    app/                                   小程序运行数据（见下）
```

### generated/app —— 小程序运行数据

`data/content` 是给人看、给脚本维护的规范数据（3.4 MB），微信小程序主包上限 2 MB 装不下。
所以 `build-content.ts` 会再投影一份「只含界面实际渲染字段」的运行数据，并按分包边界摆放：

| 文件 | 内容 | 归属 | 体积 |
| --- | --- | --- | --- |
| `app/catalog.ts` | 课程 · 学科 · 章节 | 主包 | 9 KB |
| `app/knowledge.ts` | 知识点列表（标题 + 摘要 + 时长） | 主包 | 253 KB |
| `app/word-ids.ts` | 单词 id 清单（复习队列选取用） | 主包 | 84 KB |
| `pages-knowledge/content.ts` | 公式 · 要点 · 例题 | 分包 | 305 KB |
| `pages-words/words.ts` | 词库全量 | 分包 | 628 KB |

**⚠️ 分包数据必须物理放在分包目录内部。** 这是踩过的坑：正文原先放在
`data/generated/app/` 下时，uni-app 把它当公共模块**打回了主包**，分包里只剩一个
6 KB 的空页面，主包涨到 2103 KB（超限）。同时 `manifest.json` 里必须开
`mp-weixin.optimization.subPackages: true`。

**主包不能引用分包数据。** 所以：

- `composables/useContent.ts` 只导出「课程 / 学科 / 章节 / 知识点」，**不导出词库**；
- `stores/learning.ts` 只暴露 `favoriteWordIds`（id 清单），不解析词条；
- `stores/review.ts` 用 `appWordIds` 组队列，词条正文由分包内的复习页自己解析。

只要主包任意一个文件 import 了分包数据，那个数据就会被拉回主包，分包就白拆了。
`pages.json` 里配了 `preloadRule`：进资料库页预下载 `pages-knowledge`，
进单词页预下载 `pages-words`。

> 这些运行数据都由脚本生成，同源同版本，不要手改。

| 项 | 数量 |
| --- | --- |
| 课程 | 2（考研英语、考研数学） |
| 学科 | 3（高等数学、线性代数、概率统计） |
| 章节 | 35 |
| 小节 | 240 |
| 知识点 | 960 |
| 单词 | 5493 |

## 重新生成

```bash
cd tools
npx tsx build-content.ts            # 生成
npx tsx build-content.ts --dry-run  # 只看统计，不写文件
npx tsx validate-content.ts         # 按文档第 10 节体检
```

数据来源（只读，脚本不改动）：

- `data/math-data.ts` — 知识树：模块 → 部分 → 章 → 节 → 主题
- `data/math-lectures.ts` — 每个主题的讲义：解释 / 要点 / 步骤 / 公式 / 例题 / 易错点
- `data/words.ts` — 考研英语词汇

产出是**确定性**的：`updatedAt` 与 `generatedAt` 都取自源文件 mtime（而非当前时间），
所以源文件不变时重复生成的字节完全一致，`git diff` 干净。

## 字段来源对照

| 模板字段 | 来源 |
| --- | --- |
| `id` | 由章节 ID + 标题拼音生成，见下方「ID 规则」 |
| `contentVersion` | 固定 `1`，正文修改后需手工递增 |
| `subjectId` | 由 `part.title` 映射（高等数学 → `calculus` 等） |
| `chapterId` | `part.id` + 章号，如 `m1-p1-c1` |
| `sectionId` / `sectionTitle` | 见下方「对模板的扩展」 |
| `title` | 主题名，去掉编号前缀与末尾句号 |
| `summary` | 讲义 `explanation` 的完整首句（不足 30 字时续接下一句） |
| `tags` | 讲义 `tag` 单一标签 |
| `estimatedMinutes` | 按正文长度估算，钳制在 3～10 分钟 |
| `anchor` | 讲义 `formula`；`format` 按是否含 LaTeX 记法判定 `latex` / `text` |
| `anchor.caption` | 讲义 `explanation` 首句 |
| `keyPoints[]` | 讲义 `keyPoints`（固定 3 条）；`title` 取首个逗号前的短句 |
| `examples[]` | 讲义 `example`（1 条，标题统一为「讲解例子」） |
| `sources[]` | 讲义 `source`，如「张宇基础30讲·高数第1讲」（93 个知识点有） |
| `bodyMarkdown` | `explanation` + 解题步骤 + 易错点 + 来源，承载模板无独立字段的内容 |
| `status` | 固定 `published` |
| `updatedAt` | 源文件 mtime（秒级 ISO 8601 UTC） |
| `relatedKnowledgeIds` | 固定 `[]`（源数据没有关联关系，不猜） |

词库字段：`pronunciations` 由 `phonetic` 去斜杠得到，`accent` 统一记 `uk`；
`senses` 由 `meaning` 解析词性得到（支持 `n.` `v.` `a.` `ad.` `aux.v.` `(名)` `n．` 等写法，
`n./v.` 这类同义多词性保留为单个词性）；`tags` 为「考研英语」+ 词性中文标签。

## ID 规则

ID 只含小写英文、数字和连字符，**不使用数组下标**，同一内容始终生成同一 ID。

| 实体 | 规则 | 示例 |
| --- | --- | --- |
| 章节 | `<partId>-c<章号>` | `m1-p1-c1` |
| 小节 | `<chapterId>-s<节号>` | `m1-p1-c1-s1` |
| 知识点 | `kp-<chapterId>-<标题拼音>` | `kp-m1-p1-c1-han-shu-de-gai-nian` |
| 单词 | `word-<单词小写>` | `word-persist` |

- 源数据的 `chapter.id`（`m1-c1`）只在「部分」内唯一，跨部分重复，因此用 `part.id` 组合。
- 标题拼音超过 40 字符时截断到完整音节并追加内容哈希，保证稳定。
- 同章内标题重名（如三处「定义」）时追加 `-2` / `-3`，可用 `sectionId` 区分。

## 对模板的扩展

以下字段是模板之外的补充，用于保留源数据里模板没有承载的信息：

| 字段 | 位置 | 原因 |
| --- | --- | --- |
| `module` | `catalog.chapters[]`、章节文件顶层 | 区分「数学一 / 数学二」两个考纲范围；否则高数下会出现两个同名章节 |
| `sectionId`、`sectionTitle` | 知识点 | 模板只有「章节 → 知识点」两层，源数据多一层「小节」；丢掉会让 240 个小节的分组信息消失 |
| 章节文件顶层结构 | `knowledge/<subject>/<chapter>.json` | 模板假定「一知识点一文件」，此处按章节打包（文档 §2 允许「内容较多时再按章节打包」），顶层为 `{schemaVersion, chapterId, subjectId, module, title, sortOrder, knowledge[]}` |

## 已知缺口

1. **单词例句为空（5493 / 5493）** —— `words.ts` 只有 `word` / `phonetic` / `meaning`，
   没有例句字段，而模板要求「例句至少一项」。这是源数据缺口，不是转换错误。
   需要补例句后才能满足模板的必填约束。
2. **单词无词性标记（4 条）** —— `sophomore` / `they` / `cue` / `poster`，
   源释义本身没有词性标注，`partOfSpeech` 记空字符串。
3. **`status` 一律为 `published`** —— 这批内容已在应用中线上使用，故按已发布处理；
   摘要、标签等字段是机器派生的，如需人工复核可先改回 `draft` 并从索引中剔除。
4. **`contentVersion` 一律为 `1`** —— 首次导入，后续正文变更需手工递增。
5. **讲义内容重复率 87.7%** —— 960 个知识点只对应 **118 份不同讲义正文**。
   原因是 `math-lectures.ts` 的 `scopedBody()` 用 85 条正则规则按「小节 + 主题」生成讲义，
   同一小节下多个主题会拿到同一份正文。这是源数据的既有性质，转换如实反映；
   要真正区分需要逐个主题补写内容。

## 个人学习数据

本目录只放公共内容。个人记录（阅读进度、单词熟悉度、计划项、学习事件、目标）按文档
第 7 节约定，小程序本地版存本地存储、接入账号后入库，不放在这里。
