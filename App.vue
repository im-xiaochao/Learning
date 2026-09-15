<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  /* 应用启动：内容数据为静态生成物，个人进度按需从本地存储读取 */
})
</script>

<style>
/* ══════════════════════════════════════════════════════════
   全局样式：设计稿 ci-shu-tong-xing.html 的样式系统移植
   设计稿用 oklch 与 div/h1/p，这里换成 hex 与 view/text，
   并去掉「手机外壳」——真机上应用本身就是全屏。
   ══════════════════════════════════════════════════════════ */

page {
  background: #f9f7f3;
  color: #162928;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

/* 小程序原生 button 默认带边框和背景，统一重置 */
button {
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  color: inherit;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  text-align: left;
  overflow: visible;
}
button::after {
  border: none;
}

view,
text,
button,
input,
image,
picker,
scroll-view {
  box-sizing: border-box;
}

/* ── 设计变量：挂页面根节点（小程序没有 :root） ── */
.page {
  --bg: #f9f7f3;
  --surface: #ffffff;
  --fg: #162928;
  --muted: #506260;
  --border: #d6e1de;
  --primary: #005d55;
  --primary-hover: #00463f;
  --primary-soft: #ddf2eb;
  --accent: #db7452;
  --accent-ink: #8a3e29;
  --accent-soft: #ffebe3;
  --ring: #faab8c;
  --display: 'Songti SC', 'STSong', 'SimSun', serif;
  --body: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;

  background: var(--bg);
  color: var(--fg);
  min-height: 100vh;
  font-family: var(--body);
}

/* ── 顶栏 ── */
.appbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  height: 45px;
  padding: 0 17px 0 19px;
  padding-top: var(--status-bar-height);
  box-sizing: content-box;
  background: var(--bg);
  position: relative;
  z-index: 5;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 1px;
  min-width: 0;
}
.brand-logo {
  width: 27px;
  height: 27px;
}
.brand.sub {
  letter-spacing: 0;
  font-size: 15px;
  gap: 2px;
}

.back-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -9px;
  margin-right: 3px;
}

/* 注意：这里【没有】.capsule 样式。
   设计稿的右上角胶囊是原型模拟的，微信小程序会自己绘制原生胶囊，
   页面里再画一个就会重复，所以顶栏不含胶囊。 */

/* ── 内容区 ── */
.viewport {
  padding: 19px 20px 28px;
}

/* ── 通用排版 ── */
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.eyebrow {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.6;
  letter-spacing: 0.6px;
}
.page-title {
  font-family: var(--display);
  font-weight: 700;
  font-size: 27px;
  line-height: 1.45;
  letter-spacing: -0.4px;
  margin-top: 4px;
  display: block;
}
.subtext {
  color: var(--muted);
  line-height: 1.7;
  font-size: 12px;
  display: block;
}
.quiet-note {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.7;
  text-align: center;
  margin-top: 16px;
  display: block;
}
.mt12 {
  margin-top: 12px;
}
.mt16 {
  margin-top: 16px;
}
.mt20 {
  margin-top: 20px;
}

/* ── 连续学习徽标 ── */
.streak {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--accent-ink);
  background: var(--accent-soft);
  border-radius: 20px;
  padding: 6px 9px;
  flex: 0 0 auto;
}
.streak image {
  width: 13px;
  height: 13px;
}

/* ── 今日进度卡 ── */
.daily-card {
  margin-top: 14px;
  background: var(--primary);
  color: #ffffff;
  border-radius: 23px;
  padding: 17px 20px;
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.daily-card .eyebrow {
  color: rgba(255, 255, 255, 0.78);
  font-size: 10px;
  letter-spacing: 1.5px;
}
.daily-title {
  font-family: var(--display);
  font-size: 22px;
  line-height: 1.35;
  margin: 6px 0 8px;
  letter-spacing: 0.5px;
  display: block;
  color: #ffffff;
}
.daily-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.86);
}
.daily-meta image {
  width: 12px;
  height: 12px;
}
.daily-text {
  min-width: 0;
  flex: 1;
}

.progress-ring {
  position: relative;
  width: 100px;
  height: 100px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ring-svg {
  position: absolute;
  left: 0;
  top: 0;
  width: 100px;
  height: 100px;
  transform: rotate(-90deg);
}
.ring-track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.32);
  stroke-width: 7;
}
.ring-fill {
  fill: none;
  stroke: var(--ring);
  stroke-width: 7;
  stroke-linecap: round;
}
.ring-label {
  text-align: center;
  position: relative;
  z-index: 1;
}
.ring-num {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -1px;
  color: #ffffff;
}
.ring-unit {
  font-size: 13px;
  margin-left: 1px;
  color: #ffffff;
}
.ring-cap {
  display: block;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.86);
  margin-top: 3px;
}

/* ── 分节标题 ── */
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 21px 0 11px;
  min-height: 23px;
}
.head-title {
  font-size: 16px;
  font-weight: 650;
  letter-spacing: 0.2px;
}
.head-note {
  color: var(--muted);
  font-size: 10px;
}

/* ── 学习入口卡片 ── */
.learning-grid {
  display: flex;
  gap: 12px;
}
.study-card {
  flex: 1;
  min-width: 0;
  text-align: left;
  padding: 13px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 19px;
  min-height: 151px;
  display: block;
}
.card-icon {
  width: 22px;
  height: 22px;
}
.card-kicker {
  font-size: 9px;
  color: var(--muted);
}
.card-title {
  font-size: 15px;
  font-weight: 650;
  margin: 8px 0 3px;
  display: block;
}
.study-numbers {
  font-size: 12px;
  color: var(--muted);
  display: block;
}
.study-numbers .num {
  font-size: 23px;
  color: var(--fg);
  font-weight: 600;
  letter-spacing: -0.8px;
  margin-right: 3px;
}
.card-link {
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  min-height: 18px;
}
.card-link image {
  width: 15px;
  height: 15px;
}

.small-progress {
  height: 4px;
  background: var(--primary-soft);
  border-radius: 5px;
  overflow: hidden;
  margin: 6px 0 7px;
}
.small-progress .bar {
  display: block;
  height: 100%;
  background: var(--primary);
  border-radius: 5px;
}
.progress-split {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--muted);
  margin-top: 8px;
}

/* ── 接着上次学 ── */
.recent-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  width: 100%;
  min-height: 68px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
}
.recent-formula {
  width: 42px;
  height: 42px;
  background: var(--primary-soft);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Georgia, serif;
  font-style: italic;
  font-size: 23px;
  color: var(--primary);
  flex: 0 0 auto;
}
.recent-text {
  flex: 1;
  min-width: 0;
}
.recent-title {
  font-size: 12px;
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
}
.recent-sub {
  font-size: 10px;
  color: var(--muted);
}
.chev {
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
}

/* ── 面板 / 胶囊 / 大数字 ── */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 21px;
  padding: 20px;
}
.panel-title {
  font-size: 15px;
  font-weight: 650;
  display: block;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 20px;
  padding: 5px 8px;
  font-size: 10px;
  line-height: 1.5;
  background: var(--primary-soft);
  color: var(--primary);
  flex: 0 0 auto;
}
.pill image {
  width: 12px;
  height: 12px;
}
.pill.orange {
  background: var(--accent-soft);
  color: var(--accent-ink);
}
.big-number {
  font-size: 36px;
  font-weight: 600;
  letter-spacing: -1px;
  display: block;
}
.big-number .unit {
  font-size: 16px;
  font-weight: 400;
  color: var(--muted);
  letter-spacing: 0;
}

/* ── 任务列表 ── */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.task {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 83px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 17px;
  background: var(--surface);
  text-align: left;
}
.task-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--primary-soft);
  flex: 0 0 auto;
}
.task-icon image {
  width: 22px;
  height: 22px;
}
.task-content {
  flex: 1;
  min-width: 0;
}
.task-title {
  font-size: 14px;
  font-weight: 650;
  display: flex;
  align-items: center;
  gap: 6px;
}
.task-sub {
  font-size: 11px;
  color: var(--muted);
  margin-top: 4px;
  display: block;
}

/* ── 按钮 ── */
.primary-button,
.secondary-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 49px;
  border-radius: 14px;
  padding: 12px 16px;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.5;
  text-align: center;
}
.primary-button {
  color: #ffffff;
  background: var(--primary);
}
.primary-button image,
.secondary-button image {
  width: 18px;
  height: 18px;
}
.secondary-button {
  color: var(--primary);
  background: var(--surface);
  border: 1px solid var(--border);
}
.text-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: var(--primary);
  font-size: 11px;
  min-height: 44px;
  padding: 5px 2px;
}
.text-button image {
  width: 15px;
  height: 15px;
}
.icon-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 12px;
}
.icon-button image {
  width: 22px;
  height: 22px;
}
.icon-button.saved {
  background: var(--accent-soft);
}

/* ── 菜单列表 ── */
.menu-list {
  display: flex;
  flex-direction: column;
  margin-top: 20px;
}
.menu-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--border);
}
.menu-icon {
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
}
.menu-label {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
}
.menu-value {
  font-size: 11px;
  color: var(--muted);
}

/* ── 资料库：搜索 / 学科切换 / 章节卡 / 知识点行 ── */
.search-box {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 14px;
  padding: 0 14px;
  height: 44px;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
}
.search-box image {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}
.search-box input {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--fg);
  background: transparent;
}

.subject-tabs {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
.subject-tab {
  flex: 1;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}
.subject-tab.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
}

.knowledge-feature {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin-top: 14px;
  padding: 16px;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  text-align: left;
}
.feature-text {
  flex: 1;
  min-width: 0;
}
.feature-title {
  font-family: var(--display);
  font-size: 19px;
  font-weight: 700;
  margin: 4px 0 5px;
  display: block;
}
.feature-art {
  width: 76px;
  height: 62px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.feature-arrow {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}
.approach-note {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 10px;
  color: var(--primary);
}
.approach-note image {
  width: 13px;
  height: 13px;
}
.chapter-foot {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.foot-text {
  font-size: 10px;
  color: var(--muted);
}

.knowledge-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.knowledge-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 14px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  text-align: left;
}
.knowledge-number {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-soft);
  border-radius: 9px;
  min-width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.knowledge-content {
  flex: 1;
  min-width: 0;
}
.k-title {
  font-size: 13px;
  font-weight: 650;
  display: block;
  margin-bottom: 4px;
}
.k-sub {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.5;
}

/* ── 知识点详情 ── */
.topic-lead {
  font-size: 13px;
  line-height: 1.75;
  color: var(--muted);
  margin-top: 10px;
  display: block;
}
.formula-box {
  margin-top: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 18px;
}
.knowledge-anchor {
  font-size: 10px;
  letter-spacing: 1.2px;
  color: var(--muted);
}
.formula-text {
  font-family: Georgia, 'Songti SC', serif;
  font-size: 19px;
  line-height: 1.6;
  margin: 10px 0 8px;
  display: block;
  word-break: break-word;
}
.formula-caption {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.65;
  display: block;
}
.formula-box .pill {
  margin-top: 12px;
}

.detail-section {
  margin-top: 22px;
}
.section-title {
  font-size: 15px;
  font-weight: 650;
  margin-bottom: 12px;
  display: block;
}
.section-body {
  font-size: 13px;
  line-height: 1.8;
  color: var(--fg);
  display: block;
}
.concept-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.step-no {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.step-text {
  flex: 1;
  font-size: 13px;
  line-height: 1.7;
}
.action-stack {
  margin-top: 20px;
}

/* ── 单词：卡片 / 发音 / 释义 / 例句 ── */
.word-card {
  margin-top: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  padding: 20px;
}
.word-label {
  font-size: 10px;
  letter-spacing: 1.2px;
  color: var(--muted);
}
.word-heading {
  font-family: var(--display);
  font-size: 38px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin: 10px 0 8px;
  display: block;
  word-break: break-word;
}
.pronunciation {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 6px 11px;
  font-size: 12px;
  color: var(--primary);
  background: var(--surface);
}
.pronunciation image {
  width: 15px;
  height: 15px;
}
.accent-label {
  font-size: 10px;
  color: var(--muted);
}
.word-definition {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.def-text {
  font-size: 15px;
  line-height: 1.7;
  display: block;
}
.part {
  color: var(--accent-ink);
  font-family: Georgia, serif;
  font-style: italic;
  margin-right: 6px;
}
.example {
  margin-top: 16px;
  padding: 14px;
  border-radius: 16px;
  background: var(--primary-soft);
}
.ex-label {
  font-size: 10px;
  color: var(--primary);
  letter-spacing: 1px;
}
.ex-en {
  display: block;
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--fg);
}
.ex-zh {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--muted);
}

/* ── 复习流程 ── */
.review-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 650;
}
.counter {
  font-size: 11px;
  color: var(--muted);
}
.review-hint {
  font-size: 12px;
  color: var(--muted);
  margin: 10px 0 0;
  display: block;
  line-height: 1.7;
}
.review-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}
.rating-label {
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  margin-top: 22px;
  display: block;
}
.ratings {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.rate-button {
  flex: 1;
  min-width: 0;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 12px 6px;
  text-align: center;
  font-size: 13px;
  font-weight: 650;
}
.rate-sub {
  display: block;
  font-size: 9px;
  font-weight: 400;
  color: var(--muted);
  margin-top: 4px;
}
.rate-button.unknown {
  color: var(--accent-ink);
  border-color: var(--accent);
  background: var(--accent-soft);
}
.rate-button.familiar {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--primary-soft);
}
.review-feedback {
  margin-top: 18px;
  padding: 16px;
  border-radius: 18px;
  background: var(--primary-soft);
}
.review-feedback.needs-work {
  background: var(--accent-soft);
}
.fb-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 650;
  color: var(--primary);
}
.review-feedback.needs-work .fb-title {
  color: var(--accent-ink);
}
.fb-title image {
  width: 17px;
  height: 17px;
}
.fb-body {
  font-size: 12px;
  line-height: 1.7;
  color: var(--muted);
  margin: 8px 0 14px;
  display: block;
}

/* ── 复习结果 ── */
.result-hero {
  text-align: center;
  padding: 18px 0 6px;
}
.result-mark {
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  border-radius: 50%;
  background: var(--primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}
.result-mark image {
  width: 28px;
  height: 28px;
}
.result-title {
  font-family: var(--display);
  font-size: 24px;
  font-weight: 700;
  display: block;
}
.result-counts {
  display: flex;
  margin-top: 20px;
  border-radius: 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 16px 0;
}
.count-cell {
  flex: 1;
  text-align: center;
}
.count-num {
  font-size: 22px;
  font-weight: 650;
  display: block;
}
.count-label {
  font-size: 10px;
  color: var(--muted);
  margin-top: 4px;
  display: block;
}

/* ── 单词列表行 ── */
.word-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}
.word-list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 13px 14px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  text-align: left;
}
.wl-main {
  flex: 1;
  min-width: 0;
}
.wl-word {
  font-size: 15px;
  font-weight: 650;
  display: block;
  margin-bottom: 3px;
}
.wl-meaning {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.5;
}

/* ── 词根 / 助记 ── */
.root-parts {
  font-family: Georgia, 'Songti SC', serif;
  font-size: 16px;
  color: var(--primary);
  display: block;
  margin-bottom: 10px;
}
.memory-note .section-body {
  padding: 14px;
  border-radius: 16px;
  background: var(--accent-soft);
  color: var(--accent-ink);
}

/* ── 我的 ── */
.profile-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--primary);
  color: #ffffff;
  font-family: var(--display);
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.profile-name {
  font-size: 20px;
  font-weight: 700;
  display: block;
}
.profile-sub {
  font-size: 11px;
  color: var(--muted);
  margin-top: 4px;
  display: block;
}
.demo-label {
  margin-left: auto;
  font-size: 9px;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 4px 8px;
  flex: 0 0 auto;
}
.stats-grid {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
.stat-cell {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 16px;
}
.stat-num {
  font-size: 24px;
  font-weight: 650;
  letter-spacing: -0.5px;
  display: block;
}
.stat-label {
  font-size: 10px;
  color: var(--muted);
  margin-top: 5px;
  display: block;
}

.chart-switch {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
  flex: 0 0 auto;
}
.cs-btn {
  padding: 6px 11px;
  font-size: 10px;
  color: var(--muted);
  background: var(--surface);
}
.cs-btn.active {
  background: var(--primary);
  color: #ffffff;
}
.week-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6px;
  height: 120px;
  margin-top: 18px;
}
.chart-day {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  height: 100%;
}
.chart-day .bar {
  width: 100%;
  max-width: 22px;
  border-radius: 6px;
  background: var(--primary-soft);
  min-height: 3px;
}
.chart-day.today .bar {
  background: var(--primary);
}
.day-num,
.day-label {
  font-size: 9px;
  color: var(--muted);
}
.chart-caption {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.7;
  margin-top: 14px;
  display: block;
}

/* ── 目标表单 ── */
.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  border-bottom: 1px solid var(--border);
}
.field-label {
  font-size: 13px;
  color: var(--fg);
  flex: 0 0 auto;
}
.field-value {
  font-size: 13px;
  color: var(--primary);
  font-weight: 600;
  text-align: right;
}
.field picker {
  flex: 1;
  min-width: 0;
}
.form-grid {
  display: flex;
  gap: 12px;
}
.form-grid .field {
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 12px 0;
}
.goal-helper {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.7;
  margin-top: 14px;
  display: block;
}
.form-status {
  font-size: 12px;
  color: var(--primary);
  text-align: center;
  margin-top: 12px;
  display: block;
  line-height: 1.7;
}

/* ── 空状态 ── */
.empty {
  text-align: center;
  padding-top: 60px;
}
.empty-symbol {
  width: 68px;
  height: 68px;
  margin: 0 auto 18px;
  border-radius: 50%;
  background: var(--primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-symbol image {
  width: 32px;
  height: 32px;
}
.empty-title {
  font-family: var(--display);
  font-size: 20px;
  font-weight: 700;
  display: block;
}
.empty-copy {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.8;
  margin: 12px 0 24px;
  display: block;
}

/* 搜索框占位符：placeholder-class 需要全局类名，scoped 样式匹配不到 */
.search-ph {
  color: #9aa8a5;
  font-size: 13px;
}

/* 按压反馈：微信小程序 WXSS 不支持 :active，可点击元素统一用 hover-class="hover-press" */
.hover-press {
  opacity: 0.72;
}

/* 入场动画 */
@keyframes uniFade {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.fade-in {
  animation: uniFade 0.18s ease both;
}
</style>
