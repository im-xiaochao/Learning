"use strict";
const common_vendor = require("../../common/vendor.js");
const data_mathData = require("../../data/math-data.js");
const data_mathDetail = require("../../data/math-detail.js");
const data_mathLectures = require("../../data/math-lectures.js");
if (!Math) {
  MathPointDetail();
}
const MathPointDetail = () => "../../components/MathPointDetail.js";
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "math",
  setup(__props) {
    const activeModule = common_vendor.ref(data_mathData.MATH_MODULES[0]);
    const search = common_vendor.ref("");
    const expandedChapters = common_vendor.ref({});
    const expandedSections = common_vendor.ref({});
    const selectedPoint = common_vendor.ref(null);
    function chapterKey(part, chapter) {
      const partId = typeof part === "string" ? part : part.id;
      const chapterId = typeof chapter === "string" ? chapter : chapter.id;
      return partId + "__" + chapterId;
    }
    function sectionKey(part, chapter, section) {
      const sectionId = typeof section === "string" ? section : section.id;
      return chapterKey(part, chapter) + "__" + sectionId;
    }
    function pointKey(part, chapter, section, point) {
      const pointId = typeof point === "string" ? point : point.id;
      return sectionKey(part, chapter, section) + "__" + pointId;
    }
    function cleanLine(line) {
      return line.split(String.fromCharCode(96)).join("").trim();
    }
    function normalize(text) {
      return cleanLine(text).toLowerCase();
    }
    function chapterNumber(title) {
      var _a;
      return ((_a = title.match(/^第([一二三四五六七八九十0-9]+)章/)) == null ? void 0 : _a[1]) || "·";
    }
    function sectionNumber(title) {
      var _a;
      return ((_a = title.match(/^\d+/)) == null ? void 0 : _a[0]) || "·";
    }
    function shortMapLabel(title) {
      const label = data_mathDetail.cleanTitle(title);
      return label.length > 12 ? label.slice(0, 12) + "…" : label;
    }
    function sectionPoints(section) {
      if (section.points.length)
        return section.points;
      return data_mathDetail.sectionLessons(section).map((lesson, index) => ({
        id: section.id + "__topic__" + (index + 1),
        title: lesson.title,
        blocks: []
      }));
    }
    function sectionPointCount(section) {
      return section.points.length || data_mathDetail.sectionLessons(section).length;
    }
    function hasSectionContent(section) {
      return sectionPointCount(section) > 0;
    }
    function chapterSections(chapter) {
      return chapter.sections.filter(hasSectionContent);
    }
    const searchTerm = common_vendor.computed(() => normalize(search.value));
    const hasSearch = common_vendor.computed(() => searchTerm.value.length > 0);
    function includesTerm(text, term = searchTerm.value) {
      return Boolean(term) && normalize(text).includes(term);
    }
    function pointMatches(point, term = searchTerm.value) {
      if (!term)
        return true;
      const content = point.blocks.flatMap((block) => [block.label, ...block.lines]).join(" ");
      return includesTerm(point.title + " " + content, term);
    }
    function topicMatches(topic, section, term = searchTerm.value) {
      if (!term)
        return true;
      const lesson = data_mathLectures.getMathLecture(topic, section.title);
      const detailText = [
        lesson.explanation,
        lesson.formula,
        lesson.example,
        lesson.trap,
        ...lesson.keyPoints,
        ...lesson.steps
      ].filter(Boolean).join(" ");
      return includesTerm(topic + " " + detailText, term);
    }
    function sectionPointMatches(point, section, term = searchTerm.value) {
      return section.points.length ? pointMatches(point, term) : topicMatches(point.title, section, term);
    }
    const visibleParts = common_vendor.computed(() => {
      const term = searchTerm.value;
      if (!term) {
        return activeModule.value.parts.map((part) => ({
          part,
          chapters: part.chapters.map((chapter) => {
            const sections = chapterSections(chapter);
            return sections.length ? { chapter, sections } : null;
          }).filter((chapter) => Boolean(chapter))
        })).filter((part) => part.chapters.length);
      }
      return activeModule.value.parts.map((part) => {
        const partHit = includesTerm(part.title, term);
        const chapters = part.chapters.map((chapter) => {
          const chapterHit = partHit || includesTerm(chapter.title, term);
          const sections = chapter.sections.map((section) => {
            const sectionHit = chapterHit || includesTerm(section.title, term);
            if (sectionHit)
              return hasSectionContent(section) ? section : null;
            if (!hasSectionContent(section))
              return null;
            if (!section.points.length) {
              const intro = (section.intro || []).filter((topic) => topicMatches(topic, section, term));
              return intro.length ? { ...section, intro } : null;
            }
            const points = section.points.filter((point) => pointMatches(point, term));
            return points.length ? { ...section, points } : null;
          }).filter((section) => Boolean(section));
          return sections.length ? { chapter, sections } : null;
        }).filter((chapter) => Boolean(chapter));
        return chapters.length ? { part, chapters } : null;
      }).filter((part) => Boolean(part));
    });
    function moduleSummary(module) {
      var _a;
      let chapters = 0;
      let sections = 0;
      let points = 0;
      let detailedPoints = 0;
      let lessonTopics = 0;
      for (const part of module.parts) {
        const contentChapters = part.chapters.filter((chapter) => chapterSections(chapter).length);
        chapters += contentChapters.length;
        for (const chapter of contentChapters) {
          const contentSections = chapterSections(chapter);
          sections += contentSections.length;
          for (const section of contentSections) {
            const count = sectionPointCount(section);
            points += count;
            detailedPoints += count;
            if (!section.points.length)
              lessonTopics += ((_a = section.intro) == null ? void 0 : _a.length) || 0;
          }
        }
      }
      return {
        parts: module.parts.filter((part) => part.chapters.some((chapter) => chapterSections(chapter).length)).length,
        chapters,
        sections,
        points,
        detailedPoints,
        lessonTopics
      };
    }
    const stats = common_vendor.computed(() => moduleSummary(activeModule.value));
    const searchResultCount = common_vendor.computed(() => {
      const sections = visibleParts.value.reduce(
        (total, part) => total + part.chapters.reduce((sum, item) => sum + item.sections.length, 0),
        0
      );
      const points = visibleParts.value.reduce(
        (total, part) => total + part.chapters.reduce(
          (sum, item) => sum + item.sections.reduce((sectionSum, section) => sectionSum + sectionPointCount(section), 0),
          0
        ),
        0
      );
      return { sections, points };
    });
    function switchModule(module) {
      if (activeModule.value === module)
        return;
      activeModule.value = module;
      search.value = "";
      collapseAll();
    }
    function toggleChapter(key) {
      expandedChapters.value = { ...expandedChapters.value, [key]: !expandedChapters.value[key] };
    }
    function toggleSection(key) {
      expandedSections.value = { ...expandedSections.value, [key]: !expandedSections.value[key] };
    }
    function collapseAll() {
      expandedChapters.value = {};
      expandedSections.value = {};
    }
    function isChapterOpen(key) {
      return Boolean(expandedChapters.value[key] || hasSearch.value);
    }
    function isSectionOpen(key, section) {
      const matchingPoint = hasSearch.value && sectionPoints(section).some((point) => sectionPointMatches(point, section));
      return Boolean(expandedSections.value[key] || matchingPoint);
    }
    function chapterSummary(chapter) {
      const sections = chapterSections(chapter);
      const points = sections.reduce((sum, section) => sum + sectionPointCount(section), 0);
      return { sections: sections.length, points, detailedPoints: points };
    }
    function chapterMapNodes(part, chapter, sections) {
      return sections.map((section) => ({
        key: sectionKey(part, chapter, section),
        label: shortMapLabel(section.title)
      }));
    }
    function openPoint(module, part, chapter, section, point, pointIndex) {
      selectedPoint.value = {
        key: pointKey(part, chapter, section, point),
        module,
        part,
        chapter,
        section,
        point,
        pointIndex,
        pointCount: sectionPointCount(section)
      };
      common_vendor.index.pageScrollTo({ scrollTop: 0, duration: 0 });
    }
    function closePoint() {
      selectedPoint.value = null;
      common_vendor.index.pageScrollTo({ scrollTop: 0, duration: 0 });
    }
    function onSearchInput(e) {
      var _a;
      search.value = ((_a = e.detail) == null ? void 0 : _a.value) || "";
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: selectedPoint.value
      }, selectedPoint.value ? {
        b: selectedPoint.value.key,
        c: common_vendor.o(closePoint, "21"),
        d: common_vendor.p({
          module: selectedPoint.value.module,
          part: selectedPoint.value.part,
          chapter: selectedPoint.value.chapter,
          section: selectedPoint.value.section,
          point: selectedPoint.value.point,
          ["point-index"]: selectedPoint.value.pointIndex,
          ["point-count"]: selectedPoint.value.pointCount,
          ["note-key"]: selectedPoint.value.key
        })
      } : common_vendor.e({
        e: common_vendor.f(common_vendor.unref(data_mathData.MATH_MODULES), (module, k0, i0) => {
          return {
            a: common_vendor.t(module.name),
            b: common_vendor.t(moduleSummary(module).chapters),
            c: common_vendor.t(moduleSummary(module).points),
            d: module.name,
            e: activeModule.value.name === module.name ? 1 : "",
            f: `切换到${module.name}`,
            g: common_vendor.o(($event) => switchModule(module), module.name)
          };
        }),
        f: search.value,
        g: common_vendor.o(onSearchInput, "f8"),
        h: search.value
      }, search.value ? {
        i: common_vendor.o(($event) => search.value = "", "3b")
      } : {}, {
        j: hasSearch.value
      }, hasSearch.value ? {
        k: common_vendor.t(searchResultCount.value.sections),
        l: common_vendor.t(searchResultCount.value.points)
      } : {}, {
        m: common_vendor.t(activeModule.value.name),
        n: common_vendor.t(stats.value.chapters),
        o: common_vendor.t(stats.value.detailedPoints),
        p: common_vendor.t(stats.value.points),
        q: common_vendor.t(stats.value.sections),
        r: common_vendor.t(stats.value.detailedPoints),
        s: common_vendor.t(stats.value.lessonTopics),
        t: visibleParts.value.length === 0
      }, visibleParts.value.length === 0 ? {
        v: common_vendor.o(($event) => search.value = "", "1b")
      } : {}, {
        w: common_vendor.f(visibleParts.value, (group, k0, i0) => {
          return {
            a: common_vendor.t(group.part.id.endsWith("p1") ? "01" : group.part.id.endsWith("p2") ? "02" : "03"),
            b: common_vendor.t(group.part.title),
            c: common_vendor.t(group.chapters.length),
            d: common_vendor.f(group.chapters, (item, k1, i1) => {
              return common_vendor.e({
                a: common_vendor.t(chapterNumber(item.chapter.title)),
                b: common_vendor.t(item.chapter.title),
                c: common_vendor.t(chapterSummary(item.chapter).sections),
                d: common_vendor.t(chapterSummary(item.chapter).points),
                e: common_vendor.t(chapterSummary(item.chapter).detailedPoints),
                f: common_vendor.t(isChapterOpen(chapterKey(group.part, item.chapter)) ? "−" : "+"),
                g: `展开或收起${item.chapter.title}`,
                h: common_vendor.o(($event) => toggleChapter(chapterKey(group.part, item.chapter)), chapterKey(group.part, item.chapter)),
                i: isChapterOpen(chapterKey(group.part, item.chapter))
              }, isChapterOpen(chapterKey(group.part, item.chapter)) ? {
                j: common_vendor.t(chapterNumber(item.chapter.title)),
                k: common_vendor.t(shortMapLabel(item.chapter.title)),
                l: common_vendor.t(item.sections.length),
                m: common_vendor.f(chapterMapNodes(group.part, item.chapter, item.sections), (node, nodeIndex, i2) => {
                  return {
                    a: common_vendor.t(nodeIndex + 1),
                    b: common_vendor.t(node.label),
                    c: node.key,
                    d: expandedSections.value[node.key] ? 1 : "",
                    e: `展开或收起${node.label}`,
                    f: common_vendor.o(($event) => toggleSection(node.key), node.key)
                  };
                }),
                n: common_vendor.f(item.sections, (section, k2, i2) => {
                  return common_vendor.e({
                    a: common_vendor.t(sectionNumber(section.title)),
                    b: common_vendor.t(section.title),
                    c: common_vendor.t(sectionPointCount(section)),
                    d: common_vendor.t(isSectionOpen(sectionKey(group.part, item.chapter, section), section) ? "−" : "+"),
                    e: `展开或收起${section.title}`,
                    f: common_vendor.o(($event) => toggleSection(sectionKey(group.part, item.chapter, section)), sectionKey(group.part, item.chapter, section)),
                    g: isSectionOpen(sectionKey(group.part, item.chapter, section), section)
                  }, isSectionOpen(sectionKey(group.part, item.chapter, section), section) ? {
                    h: common_vendor.f(sectionPoints(section), (point, pointIndex, i3) => {
                      return {
                        a: common_vendor.t(String(pointIndex + 1).padStart(2, "0")),
                        b: common_vendor.t(point.title),
                        c: common_vendor.t(common_vendor.unref(data_mathDetail.pointDetail)(point, section).tag),
                        d: `打开知识点${point.title}`,
                        e: common_vendor.o(($event) => openPoint(activeModule.value, group.part, item.chapter, section, point, pointIndex), pointKey(group.part, item.chapter, section, point)),
                        f: pointKey(group.part, item.chapter, section, point)
                      };
                    })
                  } : {}, {
                    i: sectionKey(group.part, item.chapter, section)
                  });
                })
              } : {}, {
                o: chapterKey(group.part, item.chapter)
              });
            }),
            e: group.part.id
          };
        })
      }));
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-ce9408c1"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/math/math.js.map
