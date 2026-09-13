"use strict";
const common_vendor = require("../common/vendor.js");
const data_mathVisualModel = require("../data/math-visual-model.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "MathVisual",
  props: {
    kind: {},
    title: { default: "" },
    section: { default: "" },
    summary: { default: "" },
    formula: { default: "" },
    keyPoints: { default: () => [] },
    steps: { default: () => [] },
    example: { default: "" },
    content: { default: () => [] },
    label: { default: "当前知识点" }
  },
  setup(__props) {
    const props = __props;
    const sourceLabel = common_vendor.computed(() => props.label || "当前知识点");
    const model = common_vendor.computed(() => data_mathVisualModel.buildVisualModel(props));
    function findNode(id) {
      return model.value.nodes.find((item) => item.id === id) || model.value.nodes[0];
    }
    function nodeBounds(item) {
      return {
        halfWidth: item.width / 2,
        halfHeight: item.height / 2
      };
    }
    function edgePoints(edge) {
      const from = findNode(edge.from);
      const to = findNode(edge.to);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      if (dx === 0 && dy === 0) {
        return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
      }
      const fromSize = nodeBounds(from);
      const toSize = nodeBounds(to);
      const fromScale = 1 / Math.max(Math.abs(dx) / fromSize.halfWidth, Math.abs(dy) / fromSize.halfHeight);
      const toScale = 1 / Math.max(Math.abs(dx) / toSize.halfWidth, Math.abs(dy) / toSize.halfHeight);
      return {
        x1: from.x + dx * fromScale,
        y1: from.y + dy * fromScale,
        x2: to.x - dx * toScale,
        y2: to.y - dy * toScale
      };
    }
    function edgeStyle(edge) {
      const points = edgePoints(edge);
      const dx = points.x2 - points.x1;
      const dy = points.y2 - points.y1;
      const length = Math.hypot(dx, dy);
      return {
        left: `${points.x1 / 360 * 100}%`,
        top: `${points.y1}px`,
        width: `${length / 360 * 100}%`,
        transform: `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`
      };
    }
    function nodeStyle(node) {
      return {
        left: `${node.x / 360 * 100}%`,
        top: `${node.y}px`,
        width: `${node.width / 360 * 100}%`,
        height: `${node.height}px`
      };
    }
    function nodeClass(node) {
      return `visual-node visual-node-${node.tone}${node.shape === "line" ? " visual-node-line" : ""}`;
    }
    return (_ctx, _cache) => {
      return {
        a: common_vendor.t(sourceLabel.value),
        b: common_vendor.t(model.value.caption),
        c: common_vendor.t(model.value.relation),
        d: common_vendor.t(model.value.evidence),
        e: common_vendor.f(model.value.edges, (item, k0, i0) => {
          return {
            a: item.id,
            b: common_vendor.n("visual-edge-" + item.tone),
            c: common_vendor.s(edgeStyle(item))
          };
        }),
        f: common_vendor.f(model.value.nodes, (item, k0, i0) => {
          return common_vendor.e({
            a: item.shape !== "line"
          }, item.shape !== "line" ? {} : {}, {
            b: item.shape !== "line" && item.label
          }, item.shape !== "line" && item.label ? {
            c: common_vendor.t(item.label)
          } : {}, {
            d: item.detail
          }, item.detail ? {
            e: common_vendor.t(item.detail)
          } : {}, {
            f: item.id,
            g: common_vendor.n(nodeClass(item)),
            h: common_vendor.s(nodeStyle(item))
          });
        }),
        g: model.value.diagramHeight + "px",
        h: common_vendor.t(model.value.takeaway)
      };
    };
  }
});
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-914378c7"]]);
wx.createComponent(Component);
//# sourceMappingURL=../../.sourcemap/mp-weixin/components/MathVisual.js.map
