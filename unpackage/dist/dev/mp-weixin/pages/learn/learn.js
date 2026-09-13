"use strict";
const common_vendor = require("../../common/vendor.js");
const data_words = require("../../data/words.js");
const composables_useProgress = require("../../composables/useProgress.js");
const stores_session = require("../../stores/session.js");
const REVEAL = "—reveal—";
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "learn",
  setup(__props) {
    const { sessionWords, sessionMode, sessionKey, sessionIndex } = stores_session.getSession();
    const { addLearned, recordWrong, clearWrongOfGroup, touchToday } = composables_useProgress.useProgress();
    const isReview = common_vendor.computed(() => sessionMode.value === "review");
    const isWrongBook = common_vendor.computed(() => sessionMode.value === "wrongbook");
    const stage = common_vendor.ref(isReview.value ? "recall" : "study");
    function shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    function splitMeaning(m) {
      const match = m.match(/^([a-z]+\.)/);
      if (match)
        return { pos: match[1] ?? "", text: m.slice(match[0].length) };
      return { pos: "", text: m };
    }
    const notice = common_vendor.ref("");
    let noticeTimer;
    function flash(msg) {
      notice.value = msg;
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => notice.value = "", 2400);
    }
    const studyCursor = common_vendor.ref(0);
    const studyWord = common_vendor.computed(() => sessionWords.value[studyCursor.value] ?? sessionWords.value[0]);
    const masked = common_vendor.ref(true);
    function prevWord() {
      if (studyCursor.value > 0)
        studyCursor.value -= 1;
    }
    function nextWord() {
      if (studyCursor.value < sessionWords.value.length - 1)
        studyCursor.value += 1;
    }
    const recallRoundsTotal = common_vendor.computed(() => isReview.value ? 1 : 3);
    const recallRound = common_vendor.ref(1);
    const roundFailed = common_vendor.ref(false);
    const order = common_vendor.ref([]);
    const cursor = common_vendor.ref(0);
    const roundResults = common_vendor.ref([]);
    const picked = common_vendor.ref(null);
    const current = common_vendor.computed(() => order.value[cursor.value] ?? null);
    const options = common_vendor.computed(() => {
      const w = current.value;
      if (!w)
        return [];
      const poolSrc = sessionWords.value.length >= 4 ? sessionWords.value : data_words.words;
      const pool2 = poolSrc.filter((x) => x.id !== w.id).map((x) => x.meaning);
      return shuffle([w.meaning, ...shuffle(pool2).slice(0, 3)]);
    });
    const praisePool = ["不错！", "很好！", "答对了！", "继续保持！"];
    const praise = common_vendor.ref("");
    function startRecall() {
      order.value = shuffle(sessionWords.value);
      cursor.value = 0;
      recallRound.value = 1;
      roundFailed.value = false;
      roundResults.value = [];
      picked.value = null;
      stage.value = "recall";
    }
    function pickOption(meaning) {
      if (!current.value || picked.value !== null)
        return;
      const correct = meaning === current.value.meaning;
      picked.value = meaning;
      roundResults.value = [...roundResults.value, correct];
      if (!correct) {
        roundFailed.value = true;
        recordWrong(current.value.id);
      } else {
        praise.value = praisePool[Math.floor(Math.random() * praisePool.length)];
      }
    }
    function revealAnswer() {
      if (!current.value || picked.value !== null)
        return;
      picked.value = REVEAL;
      roundResults.value = [...roundResults.value, false];
      roundFailed.value = true;
      recordWrong(current.value.id);
    }
    function proceed() {
      if (cursor.value < order.value.length - 1) {
        cursor.value += 1;
        picked.value = null;
        return;
      }
      if (roundFailed.value) {
        roundFailed.value = false;
        flash("本轮有没认出的单词，再巩固一轮");
      } else if (recallRound.value >= recallRoundsTotal.value) {
        if (isReview.value) {
          finish();
          return;
        }
        startSpell();
        return;
      } else {
        recallRound.value += 1;
        flash(`第 ${recallRound.value - 1} 轮通过！还剩 ${recallRoundsTotal.value - recallRound.value + 1} 轮`);
      }
      order.value = shuffle(sessionWords.value);
      cursor.value = 0;
      roundResults.value = [];
      picked.value = null;
    }
    const spellOrder = common_vendor.ref([]);
    const spellCursor = common_vendor.ref(0);
    const spellWord = common_vendor.computed(() => spellOrder.value[spellCursor.value] ?? null);
    const target = common_vendor.computed(() => {
      var _a;
      return (((_a = spellWord.value) == null ? void 0 : _a.word) ?? "").toLowerCase().replace(/[^a-z]/g, "");
    });
    const pool = common_vendor.ref([]);
    const tiles = common_vendor.ref([]);
    const spellState = common_vendor.ref("idle");
    const spellHint = common_vendor.computed(() => spellWord.value ? splitMeaning(spellWord.value.meaning) : { pos: "", text: "" });
    function setupSpellWord() {
      tiles.value = [];
      pool.value = shuffle(target.value.split("")).map((ch) => ({ ch, used: false }));
      spellState.value = "idle";
    }
    function startSpell() {
      stage.value = "spell";
      spellOrder.value = shuffle(sessionWords.value);
      spellCursor.value = 0;
      setupSpellWord();
      flash("最后一步：把每个单词拼出来");
    }
    function tapPool(i) {
      const item = pool.value[i];
      if (!item || item.used || spellState.value === "ok" || tiles.value.length >= target.value.length)
        return;
      item.used = true;
      tiles.value = [...tiles.value, { ch: item.ch, poolIdx: i }];
      checkSpelled();
    }
    function tapTile(i) {
      if (spellState.value === "ok")
        return;
      const t = tiles.value[i];
      if (!t)
        return;
      const p = pool.value[t.poolIdx];
      if (p)
        p.used = false;
      tiles.value = tiles.value.filter((_, idx) => idx !== i);
    }
    function checkSpelled() {
      const w = spellWord.value;
      if (!w || tiles.value.length !== target.value.length)
        return;
      const spelled = tiles.value.map((t) => t.ch).join("");
      if (spelled === target.value) {
        spellState.value = "ok";
        setTimeout(() => {
          if (spellCursor.value >= spellOrder.value.length - 1)
            finish();
          else {
            spellCursor.value += 1;
            setupSpellWord();
          }
        }, 500);
      } else {
        spellState.value = "bad";
        recordWrong(w.id);
        setTimeout(() => {
          tiles.value.forEach((t) => {
            const p = pool.value[t.poolIdx];
            if (p)
              p.used = false;
          });
          tiles.value = [];
          spellState.value = "idle";
        }, 550);
      }
    }
    common_vendor.onMounted(() => {
      if (isReview.value)
        startRecall();
    });
    common_vendor.onUnmounted(() => {
      clearTimeout(noticeTimer);
    });
    function finish() {
      stage.value = "result";
      if (sessionMode.value === "learn") {
        addLearned(sessionWords.value.length);
        clearWrongOfGroup(sessionWords.value.map((w) => w.id));
      } else if (sessionMode.value === "wrongbook") {
        clearWrongOfGroup(sessionWords.value.map((w) => w.id));
      }
      touchToday();
    }
    function goBack() {
      common_vendor.index.navigateBack();
    }
    const counterText = common_vendor.computed(() => {
      if (stage.value === "study")
        return `${studyCursor.value + 1}/${sessionWords.value.length}`;
      if (stage.value === "recall")
        return `${Math.min(cursor.value + 1, order.value.length)}/${order.value.length}`;
      if (stage.value === "spell")
        return `${Math.min(spellCursor.value + 1, spellOrder.value.length)}/${spellOrder.value.length}`;
      return "";
    });
    const stageProgress = common_vendor.computed(() => {
      if (stage.value === "study")
        return sessionWords.value.length ? (studyCursor.value + 1) / sessionWords.value.length * 100 : 0;
      if (stage.value === "recall")
        return order.value.length ? (cursor.value + 1) / order.value.length * 100 : 0;
      if (stage.value === "spell")
        return spellOrder.value.length ? (spellCursor.value + 1) / spellOrder.value.length * 100 : 0;
      return 100;
    });
    const isLastQuestion = common_vendor.computed(() => cursor.value >= order.value.length - 1);
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.o(goBack, "e9"),
        b: common_vendor.t(counterText.value),
        c: isReview.value
      }, isReview.value ? {} : isWrongBook.value ? {} : stage.value === "recall" ? {
        f: common_vendor.t(recallRound.value),
        g: common_vendor.t(recallRoundsTotal.value)
      } : stage.value === "spell" ? {} : stage.value === "study" ? {} : {}, {
        d: isWrongBook.value,
        e: stage.value === "recall",
        h: stage.value === "spell",
        i: stage.value === "study",
        j: stageProgress.value + "%",
        k: stage.value === "study"
      }, stage.value === "study" ? common_vendor.e({
        l: common_vendor.t(studyWord.value.word),
        m: common_vendor.t(studyWord.value.phonetic),
        n: masked.value
      }, masked.value ? {
        o: common_vendor.o(($event) => masked.value = false, "f7")
      } : {
        p: common_vendor.t(splitMeaning(studyWord.value.meaning).pos),
        q: common_vendor.t(splitMeaning(studyWord.value.meaning).text),
        r: common_vendor.o(($event) => masked.value = true, "ce")
      }, {
        s: studyCursor.value === 0 ? 1 : "",
        t: common_vendor.o(prevWord, "12"),
        v: studyCursor.value === common_vendor.unref(sessionWords).length - 1 ? 1 : "",
        w: common_vendor.o(nextWord, "72"),
        x: common_vendor.o(startRecall, "65")
      }) : stage.value === "recall" && current.value ? common_vendor.e({
        z: common_vendor.t(current.value.word),
        A: common_vendor.t(current.value.phonetic),
        B: common_vendor.f(options.value, (opt, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(splitMeaning(opt).pos),
            b: common_vendor.t(splitMeaning(opt).text),
            c: picked.value !== null && opt === current.value.meaning
          }, picked.value !== null && opt === current.value.meaning ? {} : picked.value === opt && opt !== current.value.meaning ? {} : {}, {
            d: picked.value === opt && opt !== current.value.meaning,
            e: current.value.id + "-" + opt,
            f: picked.value !== null && opt === current.value.meaning ? 1 : "",
            g: picked.value === opt && opt !== current.value.meaning ? 1 : "",
            h: picked.value !== null && opt !== current.value.meaning && picked.value !== opt ? 1 : "",
            i: `${splitMeaning(opt).text}${opt === current.value.meaning ? "，正确答案" : picked.value === opt ? "，你的选择" : ""}`,
            j: common_vendor.o(($event) => pickOption(opt), current.value.id + "-" + opt)
          });
        }),
        C: picked.value === null
      }, picked.value === null ? {
        D: common_vendor.o(revealAnswer, "7a")
      } : picked.value !== current.value.meaning ? {
        F: common_vendor.t(picked.value === REVEAL ? "已标记为不认识" : "答错了，再巩固一下"),
        G: common_vendor.t(isLastQuestion.value ? "查看结果" : "继续"),
        H: isLastQuestion.value ? "查看本轮结果" : "继续下一题",
        I: common_vendor.o(proceed, "2a")
      } : {
        J: common_vendor.t(praise.value),
        K: common_vendor.t(isLastQuestion.value ? "查看结果" : "继续"),
        L: isLastQuestion.value ? "查看本轮结果" : "继续下一题",
        M: common_vendor.o(proceed, "7c")
      }, {
        E: picked.value !== current.value.meaning
      }) : stage.value === "spell" && spellWord.value ? {
        O: common_vendor.t(spellWord.value.phonetic),
        P: common_vendor.t(spellHint.value.pos),
        Q: common_vendor.t(spellHint.value.text),
        R: common_vendor.f(target.value.length, (i, k0, i0) => {
          var _a, _b;
          return {
            a: common_vendor.t(((_a = tiles.value[i - 1]) == null ? void 0 : _a.ch) ?? ""),
            b: "s" + i,
            c: tiles.value[i - 1] ? 1 : "",
            d: tiles.value[i - 1] ? `移除字母 ${(_b = tiles.value[i - 1]) == null ? void 0 : _b.ch}` : "空白字母位",
            e: common_vendor.o(($event) => tapTile(i - 1), "s" + i)
          };
        }),
        S: common_vendor.n(spellState.value),
        T: common_vendor.f(pool.value, (p, i, i0) => {
          return {
            a: common_vendor.t(p.ch),
            b: "p" + i,
            c: p.used ? 1 : "",
            d: p.used ? `字母 ${p.ch} 已使用` : `选择字母 ${p.ch}`,
            e: common_vendor.o(($event) => tapPool(i), "p" + i)
          };
        })
      } : {
        U: common_vendor.t(isReview.value ? "复习完成！" : isWrongBook.value ? "错词学习完成！" : `第 ${common_vendor.unref(sessionIndex)} 组学习完成！`),
        V: common_vendor.t(isReview.value ? `${common_vendor.unref(sessionWords).length} 个单词已复习一遍` : isWrongBook.value ? `${common_vendor.unref(sessionWords).length} 个错词已全部通过，移出错词本` : `认词 3 轮全对 + 拼写 1 轮全对，本组 ${common_vendor.unref(sessionWords).length} 个单词已掌握`),
        W: common_vendor.t(isReview.value ? "再复习一组 ›" : isWrongBook.value ? "继续消灭错词 ›" : "学习下一组 ›"),
        X: common_vendor.o(($event) => common_vendor.unref(stores_session.nextSession)(), "1a"),
        Y: common_vendor.o(goBack, "48")
      }, {
        y: stage.value === "recall" && current.value,
        N: stage.value === "spell" && spellWord.value,
        Z: notice.value
      }, notice.value ? {
        aa: common_vendor.t(notice.value)
      } : {});
    };
  }
});
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/learn/learn.js.map
