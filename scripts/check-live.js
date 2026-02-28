#!/usr/bin/env node
"use strict";

const https = require("https");

const TARGETS = [
  "https://bkseatown.github.io/WordQuest/",
  "https://bkseatown.github.io/WordQuest/index.html",
  "https://bkseatown.github.io/WordQuest/version.json"
];
const EXPECTED_SHA = process.argv.find((arg) => arg.startsWith("--expected-sha="))
  ? process.argv.find((arg) => arg.startsWith("--expected-sha=")).split("=")[1]
  : "";

function requestWithRedirects(url, maxRedirects = 6) {
  return new Promise((resolve, reject) => {
    const run = (target, redirectsLeft) => {
      const req = https.get(target, (res) => {
        const status = Number(res.statusCode || 0);
        const location = res.headers.location;
        if (location && status >= 300 && status < 400 && redirectsLeft > 0) {
          const nextUrl = new URL(location, target).toString();
          res.resume();
          run(nextUrl, redirectsLeft - 1);
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status,
            finalUrl: target,
            headers: res.headers || {},
            body: Buffer.concat(chunks).toString("utf8")
          });
        });
      });
      req.on("error", reject);
    };
    run(url, maxRedirects);
  });
}

function preview(text, max = 200) {
  return String(text || "").replace(/\s+/g, " ").slice(0, max);
}

async function main() {
  let hasFailure = false;
  let versionPayload = null;
  for (const url of TARGETS) {
    try {
      const result = await requestWithRedirects(url);
      const contentType = String(result.headers["content-type"] || "");
      const bodyPreview = preview(result.body);
      console.log(`URL: ${url}`);
      console.log(`Status: ${result.status}`);
      console.log(`Final URL: ${result.finalUrl}`);
      console.log(`Content-Type: ${contentType}`);
      console.log(`Body(200): ${bodyPreview}`);
      console.log("---");
      if (result.status < 200 || result.status >= 300) hasFailure = true;
      if (url.endsWith("/version.json")) {
        try { versionPayload = JSON.parse(result.body); } catch (_err) {}
      }
    } catch (error) {
      hasFailure = true;
      console.error(`URL: ${url}`);
      console.error(`Error: ${error && error.message ? error.message : String(error)}`);
      console.error("---");
    }
  }
  if (EXPECTED_SHA) {
    const shortExpected = String(EXPECTED_SHA).slice(0, 12);
    const liveSha = String((versionPayload && (versionPayload.sha || versionPayload.cacheBuster || versionPayload.v)) || "");
    if (!liveSha.includes(shortExpected)) {
      console.error(`Version mismatch: expected sha ${shortExpected}, got ${liveSha || "<empty>"}`);
      hasFailure = true;
    } else {
      console.log(`Version match: ${liveSha}`);
    }
  }
  process.exit(hasFailure ? 1 : 0);
}

main();
