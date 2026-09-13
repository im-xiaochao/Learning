"use strict";
const common_vendor = require("../common/vendor.js");
const data_words = require("../data/words.js");
const composables_useProgress = require("../composables/useProgress.js");
const composables_useSettings = require("../composables/useSettings.js");
const sessionWords = common_vendor.ref([]);
const sessionMode = common_vendor.ref("learn");
const sessionKey = common_vendor.ref(0);
const sessionIndex = common_vendor.ref(1);
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function startLearn() {
  const { learnedCount } = composables_useProgress.useProgress();
  const { groupSize } = composables_useSettings.useSettings();
  const slice = data_words.words.slice(learnedCount.value, learnedCount.value + groupSize.value);
  if (slice.length === 0)
    return false;
  sessionWords.value = slice;
  sessionMode.value = "learn";
  sessionIndex.value = Math.floor(learnedCount.value / groupSize.value) + 1;
  sessionKey.value += 1;
  common_vendor.index.navigateTo({ url: "/pages/learn/learn" });
  return true;
}
function startReview() {
  const { learnedCount, wrongWordIds } = composables_useProgress.useProgress();
  const { groupSize } = composables_useSettings.useSettings();
  if (learnedCount.value === 0)
    return false;
  const learned = data_words.words.slice(0, learnedCount.value);
  const wrongSet = new Set(wrongWordIds.value);
  const wrongFirst = shuffle(learned.filter((w) => wrongSet.has(w.id)));
  const rest = shuffle(learned.filter((w) => !wrongSet.has(w.id)));
  const pick = [...wrongFirst, ...rest].slice(0, groupSize.value);
  if (pick.length === 0)
    return false;
  sessionWords.value = pick;
  sessionMode.value = "review";
  sessionKey.value += 1;
  common_vendor.index.navigateTo({ url: "/pages/learn/learn" });
  return true;
}
function startWrongBook() {
  const { wrongWordIds } = composables_useProgress.useProgress();
  const { groupSize } = composables_useSettings.useSettings();
  if (wrongWordIds.value.length === 0)
    return false;
  const pool = wrongWordIds.value.map((id) => data_words.words.find((w) => w.id === id)).filter((w) => Boolean(w));
  const pick = shuffle(pool).slice(0, groupSize.value);
  if (pick.length === 0)
    return false;
  sessionWords.value = pick;
  sessionMode.value = "wrongbook";
  sessionKey.value += 1;
  common_vendor.index.navigateTo({ url: "/pages/learn/learn" });
  return true;
}
function nextSession() {
  const { wrongWordIds } = composables_useProgress.useProgress();
  if (sessionMode.value === "review") {
    if (!startReview())
      common_vendor.index.navigateBack();
    else
      common_vendor.index.redirectTo({ url: "/pages/learn/learn" });
    return;
  }
  if (sessionMode.value === "wrongbook") {
    if (wrongWordIds.value.length === 0) {
      common_vendor.index.navigateBack();
      return;
    }
    if (startWrongBook())
      common_vendor.index.redirectTo({ url: "/pages/learn/learn" });
    else
      common_vendor.index.navigateBack();
    return;
  }
  if (startLearn())
    common_vendor.index.redirectTo({ url: "/pages/learn/learn" });
  else
    common_vendor.index.navigateBack();
}
function getSession() {
  return { sessionWords, sessionMode, sessionKey, sessionIndex };
}
exports.getSession = getSession;
exports.nextSession = nextSession;
exports.startLearn = startLearn;
exports.startReview = startReview;
exports.startWrongBook = startWrongBook;
//# sourceMappingURL=../../.sourcemap/mp-weixin/stores/session.js.map
