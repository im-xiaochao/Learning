"use strict";
const common_vendor = require("../../common/vendor.js");
const data_words = require("../../data/words.js");
const composables_useProgress = require("../../composables/useProgress.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "stats",
  setup(__props) {
    const { learnedCount, wrongWordIds, streakDays, state } = composables_useProgress.useProgress();
    const total = data_words.words.length;
    const remaining = common_vendor.computed(() => total - learnedCount.value);
    const percent = common_vendor.computed(() => Math.round(learnedCount.value / total * 100));
    const WEEK_LABELS = ["日", "一", "二", "三", "四", "五", "六"];
    const last7 = common_vendor.computed(() => {
      const days = new Set(state.value.activeDays);
      const out = [];
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() - 6);
      for (let i = 0; i < 7; i++) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        out.push({
          label: WEEK_LABELS[d.getDay()] ?? "",
          active: days.has(`${y}-${m}-${day}`),
          isToday: i === 6
        });
        d.setDate(d.getDate() + 1);
      }
      return out;
    });
    function goBack() {
      common_vendor.index.navigateBack();
    }
    return (_ctx, _cache) => {
      return {
        a: common_vendor.o(goBack, "1c"),
        b: common_vendor.t(common_vendor.unref(learnedCount)),
        c: common_vendor.t(percent.value),
        d: percent.value + "%",
        e: common_vendor.t(remaining.value),
        f: common_vendor.t(common_vendor.unref(learnedCount)),
        g: common_vendor.t(remaining.value),
        h: common_vendor.t(common_vendor.unref(wrongWordIds).length),
        i: common_vendor.t(common_vendor.unref(streakDays)),
        j: common_vendor.f(last7.value, (d, i, i0) => {
          return common_vendor.e({
            a: d.active
          }, d.active ? {} : {}, {
            b: d.active ? 1 : "",
            c: d.active ? "有学习记录" : "无学习记录",
            d: common_vendor.t(d.label),
            e: d.isToday ? 1 : "",
            f: i
          });
        })
      };
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-3598459f"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/stats/stats.js.map
