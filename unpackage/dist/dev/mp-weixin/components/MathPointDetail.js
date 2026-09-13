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
        l: common_vendor.t(detail.value.summary),
        m: common_vendor.t(detail.value.explanation || detail.value.summary),
        n: detail.value.keyPoints && detail.value.keyPoints.length
      }, detail.value.keyPoints && detail.value.keyPoints.length ? {
        o: common_vendor.f(detail.value.keyPoints, (item, index, i0) => {
          return {
            a: common_vendor.t(item),
            b: index
          };
        })
      } : {}, {
        p: detail.value.formula
      }, detail.value.formula ? {
        q: common_vendor.t(detail.value.formula)
      } : {}, {
        r: detail.value.visualUseful
      }, detail.value.visualUseful ? common_vendor.e({
        s: common_vendor.t(visualTitle.value),
        t: common_vendor.p({
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
        v: hints.value.length
      }, hints.value.length ? {
        w: common_vendor.t(hints.value.join(" "))
      } : {}) : {}, {
        x: steps.value.length
      }, steps.value.length ? {
        y: common_vendor.f(steps.value, (step, index, i0) => {
          return {
            a: common_vendor.t(index + 1),
            b: common_vendor.t(common_vendor.unref(data_mathDetail.cleanLine)(step)),
            c: index
          };
        })
      } : {}, {
        z: detail.value.example || detail.value.trap
      }, detail.value.example || detail.value.trap ? common_vendor.e({
        A: detail.value.example
      }, detail.value.example ? {
        B: common_vendor.t(detail.value.example)
      } : {}, {
        C: detail.value.trap
      }, detail.value.trap ? {
        D: common_vendor.t(detail.value.trap)
      } : {}) : {}, {
        E: blocks.value.length
      }, blocks.value.length ? {
        F: common_vendor.f(blocks.value, (block, blockIndex, i0) => {
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
        G: noteEditing.value
      }, noteEditing.value ? {
        H: noteDraft.value,
        I: common_vendor.o(onNoteInput, "39"),
        J: common_vendor.o(cancelEditNote, "60"),
        K: common_vendor.o(saveNote, "39")
      } : common_vendor.e({
        L: note.value
      }, note.value ? {
        M: common_vendor.t(note.value)
      } : {}, {
        N: common_vendor.t(note.value ? "编辑我的笔记" : "+ 添加我的笔记"),
        O: note.value ? "编辑我的笔记" : "添加我的笔记",
        P: common_vendor.o(startEditNote, "75")
      }), {
        Q: common_vendor.o(($event) => emit("back"), "15")
      });
    };
  }
});
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-e824a561"]]);
wx.createComponent(Component);
//# sourceMappingURL=../../.sourcemap/mp-weixin/components/MathPointDetail.js.map
