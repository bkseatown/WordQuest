#!/usr/bin/env node
"use strict";

var signals = require("../js/cornerstone-signals.js");
var store = require("../js/cornerstone-store.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function blobToJson(blob) {
  if (!blob) return null;
  if (typeof blob.text === "function") {
    var txt = await blob.text();
    return JSON.parse(txt);
  }
  if (typeof blob._fallbackText === "string") {
    return JSON.parse(blob._fallbackText);
  }
  throw new Error("Blob text unavailable");
}

async function main() {
  try {
    var code = store.setStudentCode("SAS7A-03");
    assert(code === "SAS7A-03", "student code should normalize");

    var fakeRows = [
      signals.normalizeSignal({
        engine: "wordquest",
        studentCode: code,
        durationMs: 90000,
        metrics: { guessesCount: 4, uniqueVowelsTried: 3 },
        derived: { strategyEfficiency: "Developing" },
        tier: "tier2",
        nextMove: { title: "Coach vowel strategy", steps: ["Model one round"], estMinutes: 10 }
      }),
      signals.normalizeSignal({
        engine: "readinglab",
        studentCode: code,
        durationMs: 120000,
        metrics: { accuracy: 86, punctuationRespect: 58 },
        derived: { punctuationRespectBand: "Emerging" },
        tier: "tier3",
        nextMove: { title: "Punctuation pause re-read", steps: ["Model", "Timed re-read"], estMinutes: 10 }
      }),
      signals.normalizeSignal({
        engine: "writing",
        studentCode: code,
        durationMs: 70000,
        metrics: { editsCount: 3, reasoningAdded: true },
        derived: { controlBand: "Developing", clarityBand: "Developing" },
        tier: "tier2",
        nextMove: { title: "Reasoning sentence upgrade", steps: ["Model one because sentence"], estMinutes: 10 }
      })
    ];

    fakeRows.forEach(function (row) { store.appendSession(row); });
    var listed = store.listSessions({ studentCode: code });
    assert(listed.length >= 3, "should store 3 sessions");

    var exportedBlob = store.exportSessions({ studentCode: code });
    var exportedJson = await blobToJson(exportedBlob);
    assert(Array.isArray(exportedJson), "export should be an array");
    assert(exportedJson.length >= 3, "export should include sessions");

    var importResult = store.importSessions(exportedJson);
    assert(importResult.deduped >= 3, "re-import should dedupe existing sessions");

    console.log("PASS diagnostic-smoke", JSON.stringify({
      stored: listed.length,
      exported: exportedJson.length,
      deduped: importResult.deduped
    }));
  } catch (error) {
    console.error("FAIL diagnostic-smoke", error && error.message ? error.message : error);
    process.exitCode = 1;
  }
}

main();
