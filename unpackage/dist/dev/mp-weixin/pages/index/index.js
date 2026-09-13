"use strict";
const common_vendor = require("../../common/vendor.js");
const data_words = require("../../data/words.js");
const composables_useSettings = require("../../composables/useSettings.js");
const composables_useProgress = require("../../composables/useProgress.js");
const stores_session = require("../../stores/session.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "index",
  setup(__props) {
    const { groupSize } = composables_useSettings.useSettings();
    const { learnedCount, wrongWordIds } = composables_useProgress.useProgress();
    const total = data_words.words.length;
    const remaining = common_vendor.computed(() => total - learnedCount.value);
    const percent = common_vendor.computed(() => Math.round(learnedCount.value / total * 100));
    const allDone = common_vendor.computed(() => remaining.value <= 0);
    const sessionSize = common_vendor.computed(() => Math.min(groupSize.value, remaining.value));
    const todayWord = common_vendor.computed(() => {
      if (total === 0)
        return null;
      const day = Math.floor(Date.now() / 864e5);
      return data_words.words[day % total];
    });
    function adjust(delta) {
      groupSize.value = composables_useSettings.clampSize(groupSize.value + delta);
    }
    function onSizeInput(e) {
      const v = Number.parseInt(e.detail.value, 10);
      if (Number.isNaN(v))
        return;
      groupSize.value = composables_useSettings.clampSize(v);
    }
    function goWrong() {
      common_vendor.index.navigateTo({ url: "/pages/wrong/wrong" });
    }
    function goStats() {
      common_vendor.index.navigateTo({ url: "/pages/stats/stats" });
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.t(allDone.value ? "今日已完成" : "还剩 " + remaining.value + " 词"),
        b: todayWord.value
      }, todayWord.value ? {
        c: common_vendor.t(todayWord.value.word),
        d: common_vendor.t(todayWord.value.phonetic),
        e: common_vendor.t(todayWord.value.meaning)
      } : {}, {
        f: common_vendor.t(percent.value),
        g: percent.value + "%",
        h: common_vendor.t(common_vendor.unref(learnedCount)),
        i: common_vendor.t(common_vendor.unref(total)),
        j: common_vendor.t(common_vendor.unref(composables_useSettings.GROUP_SIZE_MIN)),
        k: common_vendor.t(common_vendor.unref(composables_useSettings.GROUP_SIZE_MAX)),
        l: common_vendor.unref(groupSize) <= common_vendor.unref(composables_useSettings.GROUP_SIZE_MIN) ? 1 : "",
        m: `减少到 ${Math.max(common_vendor.unref(composables_useSettings.GROUP_SIZE_MIN), common_vendor.unref(groupSize) - 1)} 词`,
        n: common_vendor.o(($event) => adjust(-1), "72"),
        o: String(common_vendor.unref(groupSize)),
        p: common_vendor.o(onSizeInput, "d2"),
        q: common_vendor.o(onSizeInput, "2d"),
        r: common_vendor.unref(groupSize) >= common_vendor.unref(composables_useSettings.GROUP_SIZE_MAX) ? 1 : "",
        s: `增加到 ${Math.min(common_vendor.unref(composables_useSettings.GROUP_SIZE_MAX), common_vendor.unref(groupSize) + 1)} 词`,
        t: common_vendor.o(($event) => adjust(1), "8f"),
        v: common_vendor.t(common_vendor.unref(wrongWordIds).length > 0 ? common_vendor.unref(wrongWordIds).length + " 个待消灭" : "暂无错词"),
        w: common_vendor.o(goWrong, "6e"),
        x: common_vendor.t(percent.value),
        y: common_vendor.o(goStats, "d5"),
        z: allDone.value
      }, allDone.value ? {
        A: common_vendor.t(common_vendor.unref(total))
      } : {
        B: common_vendor.t(common_vendor.unref(learnedCount) > 0 ? "继续学习" : "开始学习"),
        C: common_vendor.t(sessionSize.value),
        D: common_vendor.unref(learnedCount) > 0 ? "继续学习" : "开始学习",
        E: common_vendor.o(($event) => common_vendor.unref(stores_session.startLearn)(), "b5")
      }, {
        F: common_vendor.unref(learnedCount) > 0 && !allDone.value
      }, common_vendor.unref(learnedCount) > 0 && !allDone.value ? {
        G: common_vendor.t(Math.min(common_vendor.unref(groupSize), common_vendor.unref(learnedCount))),
        H: common_vendor.o(($event) => common_vendor.unref(stores_session.startReview)(), "4b")
      } : {});
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-1cf27b2a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
