"use strict";
const common_vendor = require("../common/vendor.js");
const utils_storage = require("../utils/storage.js");
const GROUP_SIZE_MIN = 1;
const GROUP_SIZE_MAX = 50;
const DEFAULT_SIZE = 10;
const KEY = "memorize-words-settings";
function clampSize(v) {
  if (!Number.isFinite(v))
    return DEFAULT_SIZE;
  return Math.min(GROUP_SIZE_MAX, Math.max(GROUP_SIZE_MIN, Math.round(v)));
}
const groupSize = common_vendor.ref(clampSize(utils_storage.storageGet(KEY, void 0) ?? DEFAULT_SIZE));
common_vendor.watch(groupSize, (v) => {
  const clamped = clampSize(v);
  if (clamped !== v)
    groupSize.value = clamped;
  utils_storage.storageSet(KEY, { groupSize: clamped });
});
function useSettings() {
  return { groupSize, GROUP_SIZE_MIN, GROUP_SIZE_MAX, clampSize };
}
exports.GROUP_SIZE_MAX = GROUP_SIZE_MAX;
exports.GROUP_SIZE_MIN = GROUP_SIZE_MIN;
exports.clampSize = clampSize;
exports.useSettings = useSettings;
//# sourceMappingURL=../../.sourcemap/mp-weixin/composables/useSettings.js.map
