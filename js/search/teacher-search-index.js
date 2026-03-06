(function teacherSearchIndexModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSTeacherSearchIndex = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createTeacherSearchIndexFactory() {
  "use strict";

  function normalizeText(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }

  function buildSearchBlob(parts) {
    return parts.map(function (part) { return normalizeText(part); }).filter(Boolean).join(" ");
  }

  function create(options) {
    var config = options && typeof options === "object" ? options : {};
    var items = [];

    function add(kind, id, label, subtitle, payload, terms) {
      if (!id || !label) return;
      items.push({
        kind: kind,
        id: String(id),
        label: String(label),
        subtitle: String(subtitle || ""),
        payload: payload || {},
        terms: buildSearchBlob(terms || [label, subtitle])
      });
    }

    (Array.isArray(config.students) ? config.students : []).forEach(function (student) {
      add(
        "student",
        student.id,
        student.name,
        ["Student", student.grade || student.gradeBand].filter(Boolean).join(" · "),
        student,
        [student.name, student.id, student.grade, student.gradeBand, "student"]
      );
    });

    (Array.isArray(config.blocks) ? config.blocks : []).forEach(function (block) {
      add(
        "class",
        block.id,
        block.label || block.classSection || "Class",
        [block.timeLabel, block.subject, block.curriculum, block.lesson].filter(Boolean).join(" · "),
        block,
        [block.label, block.classSection, block.timeLabel, block.subject, block.curriculum, block.lesson, block.teacher, "class", "schedule block"]
      );
      if (block.curriculum) {
        add(
          "curriculum",
          "curriculum:" + block.id,
          block.curriculum,
          [block.subject, block.lesson].filter(Boolean).join(" · "),
          block,
          [block.curriculum, block.subject, block.lesson, "curriculum"]
        );
      }
    });

    (Array.isArray(config.resources) ? config.resources : []).forEach(function (resource) {
      add(
        resource.kind || "resource",
        resource.id,
        resource.label,
        resource.subtitle || "",
        resource,
        [resource.label, resource.subtitle, resource.kind]
      );
    });

    return {
      query: function (input) {
        var q = normalizeText(input);
        if (!q) return [];
        return items.filter(function (item) {
          return item.terms.indexOf(q) >= 0;
        }).slice(0, 24);
      },
      group: function (input) {
        return this.query(input).reduce(function (groups, item) {
          var key = String(item.kind || "resource");
          if (!groups[key]) groups[key] = [];
          groups[key].push(item);
          return groups;
        }, {});
      },
      all: function () {
        return items.slice();
      }
    };
  }

  return { create: create };
});
