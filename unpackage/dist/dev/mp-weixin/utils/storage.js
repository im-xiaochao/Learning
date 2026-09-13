"use strict";
const common_vendor = require("../common/vendor.js");
function storageGet(key, fallback) {
  try {
    const v = common_vendor.index.getStorageSync(key);
    if (v === "" || v === null || v === void 0)
      return fallback;
    return v;
  } catch {
    return fallback;
  }
}
function storageSet(key, value) {
  try {
    common_vendor.index.setStorageSync(key, value);
  } catch {
  }
}
exports.storageGet = storageGet;
exports.storageSet = storageSet;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/storage.js.map
