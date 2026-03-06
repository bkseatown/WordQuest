(function teacherStorageModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSTeacherStorage = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createTeacherStorage() {
  "use strict";

  var KEYS = {
    teacherProfile: "cs.teacher.profile.v1",
    scheduleBlocks: "cs.schedule.blocks.v1",
    classContexts: "cs.class.contexts.v1",
    students: "cs.students.v1",
    studentSupport: "cs.student.support.v1",
    lessonContext: "cs.lesson.context.v1",
    sessionLogs: "cs.session.logs.v1",
    legacyLessonBriefBlocks: "cs.lessonBrief.blocks.v1"
  };

  function safeParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (_err) {
      return fallback;
    }
  }

  function readJson(key, fallback) {
    try {
      return safeParse(localStorage.getItem(key), fallback);
    } catch (_err) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_err) {
      return false;
    }
  }

  function todayStamp() {
    var d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  function normalizeDayStamp(day) {
    var value = String(day || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayStamp();
  }

  function normalizeList(values, maxItems) {
    var out = [];
    var seen = {};
    var rows = Array.isArray(values) ? values : [];
    rows.forEach(function (value) {
      var text = String(value || "").trim();
      if (!text || seen[text]) return;
      seen[text] = true;
      out.push(text);
    });
    return out.slice(0, maxItems || rows.length || 0);
  }

  function inferSubject(block) {
    var row = block && typeof block === "object" ? block : {};
    var subject = String(row.subject || row.area || "").trim().toLowerCase();
    if (subject === "intervention") return "Intervention";
    if (subject === "ela") return "ELA";
    if (subject === "math") return "Math";
    if (subject === "writing") return "Writing";
    if (subject === "humanities") return "Humanities";
    var label = String(row.curriculum || row.label || "").toLowerCase();
    if (label.indexOf("math") >= 0 || label.indexOf("bridges") >= 0 || label.indexOf("illustrative") >= 0) return "Math";
    if (label.indexOf("writing") >= 0 || label.indexOf("step up") >= 0) return "Writing";
    if (label.indexOf("humanities") >= 0 || label.indexOf("history") >= 0) return "Humanities";
    if (label.indexOf("fundations") >= 0 || label.indexOf("just words") >= 0 || label.indexOf("ufli") >= 0 || label.indexOf("heggerty") >= 0) return "Intervention";
    return "ELA";
  }

  function normalizeBlock(block, day) {
    var row = block && typeof block === "object" ? block : {};
    var subject = inferSubject(row);
    var lesson = String(row.lesson || row.lessonLabel || "").trim();
    return {
      id: String(row.id || "blk-" + Date.now()),
      day: normalizeDayStamp(day || row.day),
      timeLabel: String(row.timeLabel || row.blockTime || "").trim(),
      label: String(row.label || row.blockLabel || row.classSection || "").trim(),
      teacher: String(row.teacher || "").trim(),
      subject: subject,
      curriculum: String(row.curriculum || row.programLabel || "").trim(),
      curriculumId: String(row.curriculumId || row.programId || "").trim(),
      lesson: lesson,
      classSection: String(row.classSection || row.section || row.label || "").trim(),
      supportType: String(row.supportType || "push-in").trim() || "push-in",
      notes: String(row.notes || "").trim(),
      rosterRefs: normalizeList(row.rosterRefs || row.studentIds || [], 60),
      studentIds: normalizeList(row.studentIds || row.rosterRefs || [], 60),
      lessonContextId: String(row.lessonContextId || "").trim()
    };
  }

  function normalizeBlockMap(raw) {
    var src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    var out = {};
    Object.keys(src).forEach(function (day) {
      var rows = Array.isArray(src[day]) ? src[day] : [];
      out[normalizeDayStamp(day)] = rows.map(function (row) {
        return normalizeBlock(row, day);
      }).filter(function (row) {
        return row.id && row.label;
      });
    });
    return out;
  }

  function loadScheduleMap() {
    return normalizeBlockMap(readJson(KEYS.scheduleBlocks, {}));
  }

  function saveScheduleMap(map) {
    return writeJson(KEYS.scheduleBlocks, normalizeBlockMap(map));
  }

  function loadScheduleBlocks(day) {
    var map = loadScheduleMap();
    var stamp = normalizeDayStamp(day);
    return Array.isArray(map[stamp]) ? map[stamp].slice() : [];
  }

  function saveScheduleBlocks(day, rows) {
    var map = loadScheduleMap();
    map[normalizeDayStamp(day)] = Array.isArray(rows) ? rows.map(function (row) {
      return normalizeBlock(row, day);
    }).filter(function (row) {
      return row.id && row.label;
    }) : [];
    return saveScheduleMap(map);
  }

  function migrateLessonBriefBlocks() {
    var scheduleMap = loadScheduleMap();
    var legacyMap = readJson(KEYS.legacyLessonBriefBlocks, {});
    var changed = false;
    if (!legacyMap || typeof legacyMap !== "object") {
      return { migrated: false, changed: false };
    }
    Object.keys(legacyMap).forEach(function (day) {
      var legacyRows = Array.isArray(legacyMap[day]) ? legacyMap[day] : [];
      if (!legacyRows.length) return;
      var stamp = normalizeDayStamp(day);
      var existing = Array.isArray(scheduleMap[stamp]) ? scheduleMap[stamp].slice() : [];
      var byId = {};
      existing.forEach(function (row) {
        byId[row.id] = row;
      });
      legacyRows.forEach(function (row) {
        var normalized = normalizeBlock(row, stamp);
        if (!normalized.id || !normalized.label) return;
        if (byId[normalized.id]) {
          byId[normalized.id] = Object.assign({}, byId[normalized.id], normalized);
        } else {
          byId[normalized.id] = normalized;
        }
      });
      var next = Object.keys(byId).map(function (id) { return byId[id]; });
      var priorText = JSON.stringify(existing);
      var nextText = JSON.stringify(next);
      if (priorText !== nextText) {
        scheduleMap[stamp] = next;
        changed = true;
      }
    });
    if (changed) saveScheduleMap(scheduleMap);
    return { migrated: true, changed: changed };
  }

  function loadTeacherProfile() {
    var profile = readJson(KEYS.teacherProfile, {});
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) profile = {};
    return {
      id: String(profile.id || "").trim(),
      name: String(profile.name || "").trim(),
      email: String(profile.email || "").trim(),
      school: String(profile.school || "").trim()
    };
  }

  function saveTeacherProfile(profile) {
    var current = loadTeacherProfile();
    var next = Object.assign({}, current, profile || {});
    return writeJson(KEYS.teacherProfile, next);
  }

  function loadClassContexts() {
    var map = readJson(KEYS.classContexts, {});
    return map && typeof map === "object" && !Array.isArray(map) ? map : {};
  }

  function saveClassContext(classId, patch) {
    var map = loadClassContexts();
    var key = String(classId || "").trim();
    if (!key) return false;
    map[key] = Object.assign({}, map[key] || {}, patch || {});
    return writeJson(KEYS.classContexts, map);
  }

  function loadLessonContexts() {
    var map = readJson(KEYS.lessonContext, {});
    return map && typeof map === "object" && !Array.isArray(map) ? map : {};
  }

  function saveLessonContext(contextId, patch) {
    var map = loadLessonContexts();
    var key = String(contextId || "").trim();
    if (!key) return false;
    map[key] = Object.assign({}, map[key] || {}, patch || {});
    return writeJson(KEYS.lessonContext, map);
  }

  return {
    KEYS: KEYS,
    todayStamp: todayStamp,
    normalizeDayStamp: normalizeDayStamp,
    normalizeBlock: normalizeBlock,
    loadScheduleMap: loadScheduleMap,
    saveScheduleMap: saveScheduleMap,
    loadScheduleBlocks: loadScheduleBlocks,
    saveScheduleBlocks: saveScheduleBlocks,
    migrateLessonBriefBlocks: migrateLessonBriefBlocks,
    loadTeacherProfile: loadTeacherProfile,
    saveTeacherProfile: saveTeacherProfile,
    loadClassContexts: loadClassContexts,
    saveClassContext: saveClassContext,
    loadLessonContexts: loadLessonContexts,
    saveLessonContext: saveLessonContext,
    readJson: readJson,
    writeJson: writeJson
  };
});
