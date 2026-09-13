"use strict";
const common_vendor = require("../common/vendor.js");
const data_mathDetail = require("../data/math-detail.js");
if (!Math) {
  MathVisual();
}
const MathVisual = () => "./MathVisual.js";
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "MathPointDetail",
  props: {
    module: {},
    part: {},
    chapter: {},
    section: {},
    point: {},
    pointIndex: {},
    pointCount: {},
    noteKey: {}
  },
  emits: ["back"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const detail = common_vendor.computed(() => data_mathDetail.pointDetail(props.point, props.section));
    const blocks = common_vendor.computed(() => data_mathDetail.contentBlocks(props.point));
    const hints = common_vendor.computed(() => data_mathDetail.visualHints(props.point));
    const steps = common_vendor.computed(() => data_mathDetail.pointSteps(props.point, props.section));
    const visualContent = common_vendor.computed(() => blocks.value.flatMap((block) => block.lines.map(data_mathDetail.cleanLine)));
    const visualLabel = common_vendor.computed(() => data_mathDetail.VISUAL_LABELS[detail.value.visual] || "概念关系");
    const visualTitle = common_vendor.computed(() => `${visualLabel.value}关系图`);
    function readNote() {
      try {
        return common_vendor.index.getStorageSync(props.noteKey) || "";
      } catch {
        return "";
      }
    }
    const note = common_vendor.ref(readNote());
    const noteEditing = common_vendor.ref(false);
    const noteDraft = common_vendor.ref(note.value);
    function startEditNote() {
      noteDraft.value = note.value;
      noteEditing.value = true;
    }
    function cancelEditNote() {
      noteEditing.value = false;
      noteDraft.value = note.value;
    }
    function saveNote() {
      const value = noteDraft.value.trim();
      try {
        if (value)
          common_vendor.index.setStorageSync(props.noteKey, value);
        else
          common_vendor.index.removeStorageSync(props.noteKey);
      } catch {
      }
      note.value = value;
      noteEditing.value = false;
    }
    function onNoteInput(e) {
      noteDraft.value = e.detail.value;
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.o(($event) => emit("back"), "37"),
        b: common_vendor.t(String(props.pointIndex + 1).padStart(2, "0")),
        c: common_vendor.t(String(props.pointCount).padStart(2, "0")),
        d: common_vendor.t(props.module.name),
        e: common_vendor.t(props.part.title),
        f: common_vendor.t(props.chapter.title),
        g: common_vendor.t(props.section.title),
        h: common_vendor.t(common_vendor.unref(data_mathDetail.cleanTitle)(props.point.title)),
        i: common_vendor.t(detail.value.summary),
        j: common_vendor.t(detail.value.tag),
        k: common_vendor.t(visualLabel.value),
        l: detail.value.source
      }, detail.value.source ? {
        m: common_vendor.t(detail.value.source)
      } : {}, {
        n: common_vendor.t(detail.value.summary),
        o: common_vendor.t(detail.value.explanation || detail.value.summary),
        p: detail.value.keyPoints && detail.value.keyPoints.length
      }, detail.value.keyPoints && detail.value.keyPoints.length ? {
        q: common_vendor.f(detail.value.keyPoints, (item, index, i0) => {
          return {
            a: common_vendor.t(item),
            b: index
          };
        })
      } : {}, {
        r: detail.value.formula
      }, detail.value.formula ? {
        s: common_vendor.t(detail.value.formula)
      } : {}, {
        t: detail.value.visualUseful
      }, detail.value.visualUseful ? common_vendor.e({
        v: common_vendor.t(visualTitle.value),
        w: common_vendor.p({
          kind: detail.value.visual,
          title: common_vendor.unref(data_mathDetail.cleanTitle)(props.point.title),
          section: common_vendor.unref(data_mathDetail.cleanTitle)(props.section.title),
          summary: detail.value.summary,
          formula: detail.value.formula,
          ["key-points"]: detail.value.keyPoints,
          steps: detail.value.steps,
          example: detail.value.example,
          content: visualContent.value,
          label: "当前知识点"
        }),
        x: hints.value.length
      }, hints.value.length ? {
        y: common_vendor.t(hints.value.join(" "))
      } : {}) : {}, {
        z: steps.value.length
      }, steps.value.length ? {
        A: common_vendor.f(steps.value, (step, index, i0) => {
          return {
            a: common_vendor.t(index + 1),
            b: common_vendor.t(common_vendor.unref(data_mathDetail.cleanLine)(step)),
            c: index
          };
        })
      } : {}, {
        B: detail.value.example || detail.value.trap
      }, detail.value.example || detail.value.trap ? common_vendor.e({
        C: detail.value.example
      }, detail.value.example ? {
        D: common_vendor.t(detail.value.example)
      } : {}, {
        E: detail.value.trap
      }, detail.value.trap ? {
        F: common_vendor.t(detail.value.trap)
      } : {}) : {}, {
        G: blocks.value.length
      }, blocks.value.length ? {
        H: common_vendor.f(blocks.value, (block, blockIndex, i0) => {
          return common_vendor.e({
            a: block.label
          }, block.label ? {
            b: common_vendor.t(block.label)
          } : {}, {
            c: common_vendor.f(block.lines, (line, lineIndex, i1) => {
              return {
                a: common_vendor.t(common_vendor.unref(data_mathDetail.cleanLine)(line)),
                b: lineIndex
              };
            }),
            d: blockIndex
          });
        })
      } : {}, {
        I: noteEditing.value
      }, noteEditing.value ? {
        J: noteDraft.value,
        K: common_vendor.o(onNoteInput, "2a"),
        L: common_vendor.o(cancelEditNote, "b0"),
        M: common_vendor.o(saveNote, "15")
      } : common_vendor.e({
        N: note.value
      }, note.value ? {
        O: common_vendor.t(note.value)
      } : {}, {
        P: common_vendor.t(note.value ? "编辑我的笔记" : "+ 添加我的笔记"),
        Q: note.value ? "编辑我的笔记" : "添加我的笔记",
        R: common_vendor.o(startEditNote, "bc")
      }), {
        S: common_vendor.o(($event) => emit("back"), "30")
      });
    };
  }
});
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-e824a561"]]);
wx.createComponent(Component);
//# sourceMappingURL=../../.sourcemap/mp-weixin/components/MathPointDetail.js.map
