"use strict";
const data_mathEnhancements = require("./math-enhancements.js");
const data_mathLectures = require("./math-lectures.js");
function cleanTitle(title) {
  return title.replace(/^第[一二三四五六七八九十0-9]+章\s*/, "").replace(/^\d+(?:\.\d+)+\s*/, "").replace(/^\d+[.、]\s*/, "");
}
function cleanLine(line) {
  return line.replace(/`/g, "").trim();
}
const VISUAL_LABELS = {
  mapping: "函数映射",
  limit: "函数极限",
  sequence: "数列收敛",
  infinitesimal: "无穷小比较",
  infinite: "无穷大趋势",
  comparison: "无穷小阶数",
  equivalent: "等价替换",
  continuity: "连续性",
  tangent: "导数与切线",
  theorem: "中值定理",
  taylor: "泰勒逼近",
  series: "级数收敛",
  extremum: "单调与极值",
  ode: "微分方程",
  integral: "积分面积",
  flow: "解题流程",
  matrix: "矩阵变换",
  "linear-system": "方程组几何",
  probability: "概率路径",
  distribution: "分布曲线",
  gradient: "梯度方向",
  plane: "空间几何",
  vector: "向量关系"
};
function pointVisualKind(point, section, fallback) {
  const pointValue = point.title;
  if (/等价无穷小/.test(pointValue))
    return "equivalent";
  if (/无穷小比较/.test(pointValue))
    return "comparison";
  if (/无穷大/.test(pointValue))
    return "infinite";
  if (/无穷小/.test(pointValue))
    return "infinitesimal";
  const value = section.title + " " + pointValue;
  if (/数列/.test(value))
    return "sequence";
  if (/等价无穷小/.test(value))
    return "equivalent";
  if (/无穷小比较/.test(value))
    return "comparison";
  if (/无穷大/.test(value))
    return "infinite";
  if (/无穷小/.test(value))
    return "infinitesimal";
  if (/间断|连续定义|连续性/.test(value))
    return "continuity";
  if (/级数|收敛半径|收敛区间|幂级数|傅里叶/.test(value))
    return "series";
  if (/微分方程|常微分|积分因子|齐次线性|非齐次线性/.test(value))
    return "ode";
  if (/极值|最值|最大值|最小值|单调性|凹凸|拐点|渐近线|曲率/.test(value))
    return "extremum";
  return fallback;
}
function pointDetail(point, section) {
  var _a, _b;
  const enhanced = data_mathEnhancements.getMathEnhancement(point.title);
  const lecture = data_mathLectures.getMathLecture(point.title, section.title);
  const visual = pointVisualKind(point, section, (enhanced == null ? void 0 : enhanced.visual) || lecture.visual);
  const visualUseful = Boolean(enhanced) || !lecture.generic;
  if (enhanced) {
    return {
      ...enhanced,
      visual,
      visualUseful,
      explanation: lecture.explanation,
      keyPoints: lecture.keyPoints,
      formula: enhanced.formula || lecture.formula,
      example: enhanced.example || lecture.example,
      trap: enhanced.trap || lecture.trap,
      steps: ((_a = enhanced.steps) == null ? void 0 : _a.length) ? enhanced.steps : lecture.steps
    };
  }
  const firstLine = (_b = point.blocks.find((block) => block.lines.length)) == null ? void 0 : _b.lines[0];
  return {
    tag: lecture.tag || (data_mathEnhancements.hasMathContent(point) ? "重点梳理" : "提纲补充"),
    summary: lecture.explanation || (firstLine ? cleanLine(firstLine) + " 先把定义、判定条件和典型题型串起来，再结合下方图示建立整体关系。" : "本卡围绕“" + cleanTitle(point.title) + "”建立基础框架，建议先看模块清单，再补充自己的例题与错因。"),
    explanation: lecture.explanation,
    keyPoints: lecture.keyPoints,
    formula: lecture.formula,
    example: lecture.example,
    trap: lecture.trap,
    visual,
    visualUseful,
    steps: lecture.steps
  };
}
function sectionLessons(section) {
  return (section.intro || []).map((topic) => data_mathLectures.getMathLecture(topic, section.title));
}
function isVisualBlock(label) {
  return /可视化|动画|核心动画|App 交互建议/.test(label);
}
function contentBlocks(point) {
  return point.blocks.filter((block) => block.lines.length > 0 && !isVisualBlock(block.label));
}
function visualHints(point) {
  return point.blocks.filter((block) => isVisualBlock(block.label)).flatMap((block) => block.lines.map(cleanLine));
}
function pointSteps(point, section) {
  return pointDetail(point, section).steps || [];
}
exports.VISUAL_LABELS = VISUAL_LABELS;
exports.cleanLine = cleanLine;
exports.cleanTitle = cleanTitle;
exports.contentBlocks = contentBlocks;
exports.pointDetail = pointDetail;
exports.pointSteps = pointSteps;
exports.sectionLessons = sectionLessons;
exports.visualHints = visualHints;
//# sourceMappingURL=../../.sourcemap/mp-weixin/data/math-detail.js.map
