<script setup lang="ts">
import { computed } from 'vue'
import type { MathVisualKind } from '../data/math-enhancements'
import { buildVisualModel } from '../data/math-visual-model'
import type { VisualEdge, VisualNode } from '../data/math-visual-model'

const props = withDefaults(
  defineProps<{
    kind: MathVisualKind
    title?: string
    section?: string
    summary?: string
    formula?: string
    keyPoints?: readonly string[]
    steps?: readonly string[]
    example?: string
    content?: readonly string[]
    label?: string
  }>(),
  {
    title: '',
    section: '',
    summary: '',
    formula: '',
    keyPoints: () => [],
    steps: () => [],
    example: '',
    content: () => [],
    label: '当前知识点',
  },
)

const sourceLabel = computed(() => props.label || '当前知识点')

/** 图形骨架按知识点类型选择，节点文字来自本卡自己的公式、步骤与要点。 */
const model = computed(() => buildVisualModel(props))

function findNode(id: string): VisualNode {
  return model.value.nodes.find((item) => item.id === id) || model.value.nodes[0]!
}

function nodeBounds(item: VisualNode) {
  return {
    halfWidth: item.width / 2,
    halfHeight: item.height / 2,
  }
}

function edgePoints(edge: VisualEdge) {
  const from = findNode(edge.from)
  const to = findNode(edge.to)
  const dx = to.x - from.x
  const dy = to.y - from.y

  if (dx === 0 && dy === 0) {
    return { x1: from.x, y1: from.y, x2: to.x, y2: to.y }
  }

  const fromSize = nodeBounds(from)
  const toSize = nodeBounds(to)
  const fromScale = 1 / Math.max(Math.abs(dx) / fromSize.halfWidth, Math.abs(dy) / fromSize.halfHeight)
  const toScale = 1 / Math.max(Math.abs(dx) / toSize.halfWidth, Math.abs(dy) / toSize.halfHeight)

  return {
    x1: from.x + dx * fromScale,
    y1: from.y + dy * fromScale,
    x2: to.x - dx * toScale,
    y2: to.y - dy * toScale,
  }
}

function edgeStyle(edge: VisualEdge) {
  const points = edgePoints(edge)
  const dx = points.x2 - points.x1
  const dy = points.y2 - points.y1
  const length = Math.hypot(dx, dy)
  return {
    left: `${(points.x1 / 360) * 100}%`,
    top: `${points.y1}px`,
    width: `${(length / 360) * 100}%`,
    transform: `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)`,
  }
}

function nodeStyle(node: VisualNode) {
  return {
    left: `${(node.x / 360) * 100}%`,
    top: `${node.y}px`,
    width: `${(node.width / 360) * 100}%`,
    height: `${node.height}px`,
  }
}

function nodeClass(node: VisualNode): string {
  return `visual-node visual-node-${node.tone}${node.shape === 'line' ? ' visual-node-line' : ''}`
}
</script>

<template>
  <view class="visual-card">
    <view class="visual-heading">
      <text class="visual-kicker">关系图</text>
      <text class="visual-label">{{ sourceLabel }}</text>
    </view>
    <text class="visual-caption">{{ model.caption }}</text>
    <text class="visual-relation">{{ model.relation }}</text>
    <view class="visual-evidence">
      <text class="visual-evidence-label">本卡锚点</text>
      <text class="visual-evidence-text">{{ model.evidence }}</text>
    </view>

    <view class="visual-map" :style="{ height: model.diagramHeight + 'px' }">
      <view
        v-for="item in model.edges"
        :key="item.id"
        class="visual-edge"
        :class="'visual-edge-' + item.tone"
        :style="edgeStyle(item)"
      />

      <view v-for="item in model.nodes" :key="item.id" :class="nodeClass(item)" :style="nodeStyle(item)">
        <view v-if="item.shape !== 'line'" class="visual-node-dot" />
        <text v-if="item.shape !== 'line' && item.label" class="visual-node-label">{{ item.label }}</text>
        <text v-if="item.detail" class="visual-node-detail">{{ item.detail }}</text>
      </view>
    </view>

    <text class="visual-takeaway">{{ model.takeaway }}</text>
  </view>
</template>

<style scoped>
.visual-card {
  width: 100%;
  padding: 12px 12px 11px;
  border-radius: 15px;
  background: var(--card-soft);
  box-sizing: border-box;
}

.visual-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.visual-kicker {
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
}

.visual-label {
  overflow: hidden;
  color: var(--muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.visual-caption {
  display: block;
  margin-top: 4px;
  color: var(--text);
  font-size: 16px;
  font-weight: 800;
  line-height: 1.3;
}

.visual-relation {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.5;
}

.visual-evidence {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px;
  min-height: 16px;
  margin-top: 2px;
  color: var(--text);
  font-size: 11px;
  line-height: 1.5;
}

.visual-evidence-label {
  flex: 0 0 auto;
  color: var(--accent-strong);
  font-weight: 800;
}

.visual-evidence-text {
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
}

/* 高度由模型给出：不同骨架的节点数量不同，固定高度会压坏图形。 */
.visual-map {
  position: relative;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 12px;
  background: var(--card);
}

.visual-takeaway {
  display: block;
  margin-top: 8px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
}

.visual-edge {
  position: absolute;
  z-index: 1;
  height: 0;
  border-top: 2px dashed var(--accent);
  transform-origin: left center;
}

.visual-edge::after {
  position: absolute;
  top: -5px;
  right: -1px;
  width: 0;
  height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 6px solid var(--accent);
  content: '';
}

.visual-edge-core {
  border-top-color: var(--accent-strong);
}

.visual-edge-core::after {
  border-left-color: var(--accent-strong);
}

.visual-edge-soft {
  border-top-color: var(--success);
}

.visual-edge-soft::after {
  border-left-color: var(--success);
}

.visual-edge-muted {
  border-top-color: var(--muted);
}

.visual-edge-muted::after {
  border-left-color: var(--muted);
}

.visual-node {
  position: absolute;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 8px;
  border: 1px solid var(--accent);
  border-radius: 13px;
  box-sizing: border-box;
  transform: translate(-50%, -50%);
  overflow: hidden;
}

.visual-node-soft {
  background: var(--card);
  border-color: var(--border);
}

.visual-node-accent {
  background: var(--accent-soft);
  border-color: var(--accent);
}

.visual-node-core {
  background: var(--accent-soft);
  border-color: var(--accent-strong);
  border-width: 2px;
}

.visual-node-muted {
  background: var(--card-soft);
  border-color: var(--muted);
}

/* 数轴一类的辅助线：只是一个细条，不参与文字排版。 */
.visual-node-line {
  z-index: 1;
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: var(--accent);
  opacity: 0.35;
}

.visual-node-dot {
  position: absolute;
  top: 7px;
  left: 9px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-strong);
}

.visual-node-soft .visual-node-dot {
  background: var(--muted);
}

.visual-node-accent .visual-node-dot {
  background: var(--accent);
}

.visual-node-core .visual-node-dot {
  background: var(--success);
}

.visual-node-label,
.visual-node-detail {
  display: block;
  max-width: 100%;
  text-align: center;
}

.visual-node-label {
  overflow: hidden;
  color: var(--text);
  font-size: 11px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.visual-node-detail {
  margin-top: 3px;
  overflow: hidden;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
