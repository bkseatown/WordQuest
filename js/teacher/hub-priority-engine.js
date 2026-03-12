(function hubPriorityEngineModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.CSHubPriorityEngine = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createHubPriorityEngineModule() {
  "use strict";

  function createEngine(deps) {
    var api = deps || {};

    function buildPriorityReason(block, supportCount, isCurrent, isNext) {
      var lessonRef = api.simplifyCurriculumLabel(block && (block.curriculum || block.lesson || "")) || String(block && (block.subject || block.label) || "this block");
      if (supportCount >= 3) {
        return supportCount + " priority students need support during " + lessonRef + ".";
      }
      if (isCurrent) {
        return "This class is already in progress and should stay front-of-mind.";
      }
      if (isNext) {
        return "This block is next, so it is the best transition to prep.";
      }
      return lessonRef + " is ready with context and support coverage.";
    }

    function describePriorityAngle(block, supportCount, isCurrent, isNext) {
      var supportType = String(block && block.supportType || "").toLowerCase();
      if (isCurrent) return "Live block";
      if (isNext) return "Next transition";
      if (supportCount >= 3) return "Highest support load";
      if (/pull/.test(supportType)) return "Protected support time";
      if (/push/.test(supportType)) return "In-class coverage";
      if (/coverage|core/.test(supportType)) return "Class readiness";
      return "Ready block";
    }

    function scorePriorityContext(students, block, isCurrent, isNext) {
      var rows = Array.isArray(students) ? students : [];
      var memory = api.blockOpenMemory(block && block.id);
      return rows.reduce(function (score, student) {
        var tier = Number(student && student.tier || 2);
        var trend = String(student && student.trend || "stable");
        var daysSince = Number(student && student.daysSince || 0);
        var verdict = api.readRecommendationVerdict(student && student.studentId);
        var outcome = api.readRecommendationOutcome(student && student.studentId);
        score += tier >= 3 ? 20 : (tier === 2 ? 11 : 4);
        if (trend === "down") score += 12;
        else if (trend === "stable") score += 5;
        if (daysSince >= 7) score += 12;
        else if (daysSince >= 4) score += 7;
        if (verdict === "skipped") score += 10;
        else if (verdict === "modified") score += 4;
        else if (verdict === "followed") score -= 5;
        if (outcome === "not-yet") score += 8;
        else if (outcome === "helped") score -= 6;
        return score;
      }, 0)
      + (isCurrent ? 28 : 0)
      + (isNext ? 16 : 0)
      + (Number(memory.opens || 0) > 0 ? -Math.min(12, Number(memory.opens || 0) * 4) : 0)
      + (/pull/.test(String(block && block.supportType || "").toLowerCase()) ? 6 : 0);
    }

    function distinctPriorityAngle(item, usedAngles) {
      var options = [];
      var block = item && item.block ? item.block : {};
      var supportType = String(block && block.supportType || "").toLowerCase();
      if (item && item.isCurrent) options.push("Live block");
      if (item && item.isNext) options.push("Next transition");
      if ((item && item.supportCount || 0) >= 3) options.push("Highest support load");
      if (/pull/.test(supportType)) options.push("Protected support time");
      if (/push/.test(supportType)) options.push("In-class coverage");
      if (/coverage|core/.test(supportType)) options.push("Class readiness");
      options.push("Ready block");
      for (var i = 0; i < options.length; i += 1) {
        if (usedAngles.indexOf(options[i]) === -1) return options[i];
      }
      return options[0];
    }

    function buildPriorityItems(blocks, currentBlock, nextBlock) {
      var rows = Array.isArray(blocks) ? blocks : [];
      var ranked = rows.map(function (block) {
        var contextData = api.buildTeacherContextForBlock(block);
        var students = api.supportStudentsSummary(contextData);
        var history = api.summarizeRecommendationHistory(students.map(function (student) {
          return student && student.studentId;
        }));
        var supportCount = students.filter(function (student) {
          return /^T[23]$/i.test(String(student && student.label || ""));
        }).length;
        var followedCount = students.filter(function (student) {
          return api.readRecommendationVerdict(student && student.studentId) === "followed";
        }).length;
        var skippedCount = students.filter(function (student) {
          return api.readRecommendationVerdict(student && student.studentId) === "skipped";
        }).length;
        var helpedCount = students.filter(function (student) {
          return api.readRecommendationOutcome(student && student.studentId) === "helped";
        }).length;
        var notYetCount = students.filter(function (student) {
          return api.readRecommendationOutcome(student && student.studentId) === "not-yet";
        }).length;
        var isCurrent = !!(currentBlock && block && block.id === currentBlock.id);
        var isNext = !!(!isCurrent && nextBlock && block && block.id === nextBlock.id);
        var score = scorePriorityContext(students, block, isCurrent, isNext);
        var memory = api.blockOpenMemory(block && block.id);
        var status = isCurrent ? "Urgent" : (supportCount >= 2 || isNext ? "Watch" : "Ready");
        return {
          block: block,
          contextData: contextData,
          score: score,
          status: status,
          supportCount: supportCount,
          isCurrent: isCurrent,
          isNext: isNext,
          opensToday: Number(memory.opens || 0),
          followedCount: followedCount,
          skippedCount: skippedCount,
          helpedCount: helpedCount,
          notYetCount: notYetCount,
          recentHistory: history,
          reason: buildPriorityReason(block, supportCount, isCurrent, isNext),
          angle: describePriorityAngle(block, supportCount, isCurrent, isNext),
          cue: isCurrent ? "Now" : (isNext ? "Up next" : "")
        };
      }).sort(function (a, b) {
        return b.score - a.score;
      }).slice(0, 3);
      var usedAngles = [];
      ranked.forEach(function (item) {
        item.angle = distinctPriorityAngle(item, usedAngles);
        usedAngles.push(item.angle);
      });
      return ranked;
    }

    function buildNowNextBrief(blocks) {
      var rows = Array.isArray(blocks) ? blocks : [];
      var currentBlock = rows.filter(api.isCurrentTimeBlock)[0] || null;
      var nextBlock = api.findCurrentOrNextBlock(rows) || rows[0] || null;
      var priorityItems = buildPriorityItems(rows, currentBlock, nextBlock);
      var primaryItem = priorityItems[0] || null;
      var activeSupportCount = rows.reduce(function (count, block) {
        return count + api.countSupportStudentsForContext(api.buildTeacherContextForBlock(block));
      }, 0);
      var nowLabel = currentBlock
        ? (currentBlock.label || currentBlock.classSection || currentBlock.subject || "Current block")
        : "After school";
      var nextLabel = nextBlock
        ? (nextBlock.label || nextBlock.classSection || nextBlock.subject || "Next block")
        : "No upcoming class";
      var actionLabel = primaryItem
        ? "Open " + (primaryItem.block.label || primaryItem.block.subject || "this class")
        : "Sync your schedule";
      return {
        title: primaryItem
          ? ((primaryItem.block && (primaryItem.block.label || primaryItem.block.subject)) || "This block") + " deserves the first move."
          : api.greetingWord() + ", " + api.currentTeacherFirstName() + ".",
        summary: rows.length
          ? rows.length + " blocks are set for today, with " + activeSupportCount + " priority touchpoints to manage."
          : "Your schedule is clear right now. Connect today's classes and this page will become your live command view.",
        now: {
          label: currentBlock ? "In motion" : "Day status",
          value: nowLabel,
          meta: currentBlock ? (currentBlock.timeLabel || "In progress") : "No active class"
        },
        next: {
          label: "On deck",
          value: nextLabel,
          meta: nextBlock ? (nextBlock.timeLabel || "Scheduled") : "Nothing queued"
        },
        action: {
          label: "Move first",
          value: actionLabel,
          meta: primaryItem
            ? ((primaryItem.supportCount || 0) + " priority student" + (primaryItem.supportCount === 1 ? "" : "s"))
            : "Connect calendar once"
        },
        rationale: primaryItem ? primaryItem.reason : "Once classes are connected, the hub will rank the most important next move automatically.",
        outcomeMemory: primaryItem ? api.describeOutcomeMemory(primaryItem) : "",
        memoryMode: api.hubMemoryModeLabel(),
        currentBlock: currentBlock,
        nextBlock: nextBlock,
        primaryItem: primaryItem,
        priorityItems: priorityItems
      };
    }

    function priorityConfidenceLabel(item) {
      var score = Number(item && item.score || 0);
      if (score >= 90) return "High confidence";
      if (score >= 55) return "Medium confidence";
      return "Emerging confidence";
    }

    function priorityWhyLine(item) {
      if (!item) return "";
      var parts = [];
      if (item.isCurrent) parts.push("in progress right now");
      else if (item.isNext) parts.push("next transition");
      else if ((item.supportCount || 0) >= 3) parts.push(item.supportCount + " priority students");
      if (item.recentHistory && item.recentHistory.entries >= 2) {
        if (item.recentHistory.helped > item.recentHistory.notYet) parts.push("strong recent outcomes");
        else if (item.recentHistory.notYet > 0) parts.push("mixed recent outcomes");
      }
      return parts.length ? "Why: " + parts.join(" · ") : "";
    }

    function recommendationQualityLabel(item) {
      var history = item && item.recentHistory ? item.recentHistory : { entries: 0, helped: 0, notYet: 0 };
      var score = Number(item && item.score || 0);
      if (history.entries >= 3 && history.helped >= history.notYet + 1) return "Proven move";
      if (score >= 90) return "High quality signal";
      if (score >= 55) return "Solid quality signal";
      return "Emerging signal";
    }

    return {
      buildNowNextBrief: buildNowNextBrief,
      priorityConfidenceLabel: priorityConfidenceLabel,
      priorityWhyLine: priorityWhyLine,
      recommendationQualityLabel: recommendationQualityLabel
    };
  }

  return {
    createEngine: createEngine
  };
});
