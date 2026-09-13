"use strict";
const common_vendor = require("../common/vendor.js");
const data_words = require("../data/words.js");
const utils_storage = require("../utils/storage.js");
const KEY = "memorize-words-progress-v3";
function todayStr(d = /* @__PURE__ */ new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function numberArray(v) {
  return Array.isArray(v) ? v.filter((n) => typeof n === "number") : [];
}
function load() {
  const p = utils_storage.storageGet(KEY, {});
  return {
    learnedCount: typeof p.learnedCount === "number" ? Math.max(0, p.learnedCount) : 0,
    wrongWordIds: numberArray(p.wrongWordIds),
    activeDays: Array.isArray(p.activeDays) ? p.activeDays.filter((s) => typeof s === "string") : []
  };
}
const state = common_vendor.ref(load());
common_vendor.watch(
  state,
  (v) => utils_storage.storageSet(KEY, v),
  { deep: true }
);
const learnedCount = common_vendor.computed(() => state.value.learnedCount);
const wrongWordIds = common_vendor.computed(() => state.value.wrongWordIds);
const streakDays = common_vendor.computed(() => {
  const days = new Set(state.value.activeDays);
  let streak = 0;
  const d = /* @__PURE__ */ new Date();
  if (!days.has(todayStr(d)))
    d.setDate(d.getDate() - 1);
  while (days.has(todayStr(d))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
});
function useProgress() {
  function addLearned(n) {
    state.value = {
      ...state.value,
      learnedCount: Math.min(data_words.words.length, state.value.learnedCount + n)
    };
  }
  function recordWrong(id) {
    if (!state.value.wrongWordIds.includes(id)) {
      state.value = { ...state.value, wrongWordIds: [...state.value.wrongWordIds, id] };
    }
  }
  function removeWrong(id) {
    state.value = {
      ...state.value,
      wrongWordIds: state.value.wrongWordIds.filter((x) => x !== id)
    };
  }
  function clearWrongOfGroup(ids) {
    const set = new Set(ids);
    const next = state.value.wrongWordIds.filter((x) => !set.has(x));
    if (next.length !== state.value.wrongWordIds.length) {
      state.value = { ...state.value, wrongWordIds: next };
    }
  }
  function touchToday() {
    const t = todayStr();
    if (!state.value.activeDays.includes(t)) {
      state.value = { ...state.value, activeDays: [...state.value.activeDays, t] };
    }
  }
  return {
    state,
    learnedCount,
    wrongWordIds,
    streakDays,
    addLearned,
    recordWrong,
    removeWrong,
    clearWrongOfGroup,
    touchToday
  };
}
exports.useProgress = useProgress;
//# sourceMappingURL=../../.sourcemap/mp-weixin/composables/useProgress.js.map
