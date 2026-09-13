"use strict";
const common_vendor = require("../../common/vendor.js");
const data_words = require("../../data/words.js");
const composables_useProgress = require("../../composables/useProgress.js");
const composables_useSettings = require("../../composables/useSettings.js");
const stores_session = require("../../stores/session.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "wrong",
  setup(__props) {
    const { wrongWordIds, removeWrong } = composables_useProgress.useProgress();
    const { groupSize } = composables_useSettings.useSettings();
    const wrongWords = common_vendor.computed(
      () => wrongWordIds.value.map((id) => data_words.words.find((w) => w.id === id)).filter((w) => Boolean(w))
    );
    const sessionSize = common_vendor.computed(() => Math.min(groupSize.value, wrongWords.value.length));
    function goBack() {
      common_vendor.index.navigateBack();
    }
    function onStart() {
      stores_session.startWrongBook();
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.o(goBack, "a3"),
        b: common_vendor.t(wrongWords.value.length),
        c: wrongWords.value.length === 0
      }, wrongWords.value.length === 0 ? {
        d: common_vendor.o(
          //@ts-ignore
          (...args) => common_vendor.unref(stores_session.startLearn) && common_vendor.unref(stores_session.startLearn)(...args),
          "11"
        )
      } : {}, {
        e: common_vendor.f(wrongWords.value, (w, k0, i0) => {
          return {
            a: common_vendor.t(w.word),
            b: common_vendor.t(w.phonetic),
            c: common_vendor.t(w.meaning),
            d: `将 ${w.word} 标记为已掌握`,
            e: common_vendor.o(($event) => common_vendor.unref(removeWrong)(w.id), w.id),
            f: w.id
          };
        }),
        f: wrongWords.value.length > 0
      }, wrongWords.value.length > 0 ? {
        g: common_vendor.t(sessionSize.value),
        h: common_vendor.o(onStart, "f1")
      } : {});
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-520e5184"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/wrong/wrong.js.map
