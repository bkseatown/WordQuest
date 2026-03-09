#!/usr/bin/env node
'use strict';

const https = require('https');
const http = require('http');

const args = process.argv.slice(2);
const getArg = (name, fallback = '') => {
  const prefix = `--${name}=`;
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
};

const BASE_URL = getArg('base-url', process.env.BASE_URL || 'https://bkseatown.github.io/WordQuest').replace(/\/+$/, '');
const EXPECTED_BUILD = getArg('expected-build', process.env.EXPECTED_BUILD || '').trim();
const TIMEOUT_SEC = Number(getArg('timeout-sec', '420')) || 420;
const INTERVAL_SEC = Number(getArg('interval-sec', '15')) || 15;

const PAGE_PATHS = ['/', '/word-quest.html', '/reports.html', '/reading-lab.html', '/sentence-surgery.html'];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestWithRedirects(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const run = (target, redirectsLeft) => {
      const client = target.startsWith('https:') ? https : http;
      const req = client.get(target, {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
      }, (res) => {
        const status = Number(res.statusCode || 0);
        const location = res.headers.location;
        if (location && status >= 300 && status < 400 && redirectsLeft > 0) {
          const nextUrl = new URL(location, target).toString();
          res.resume();
          run(nextUrl, redirectsLeft - 1);
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status,
            url: target,
            body: Buffer.concat(chunks).toString('utf8')
          });
        });
      });
      req.on('error', reject);
    };
    run(url, maxRedirects);
  });
}

async function checkLiveRound() {
  const buildResp = await requestWithRedirects(`${BASE_URL}/build.json?cb=${Date.now()}`);
  if (buildResp.status !== 200) {
    return { ok: false, reason: `build.json status ${buildResp.status}` };
  }
  let build = null;
  try {
    build = JSON.parse(buildResp.body || '{}');
  } catch (_err) {
    return { ok: false, reason: 'build.json parse failed' };
  }
  const liveBuildId = String(build.buildId || '').trim();
  if (!liveBuildId) return { ok: false, reason: 'build.json missing buildId' };
  if (EXPECTED_BUILD && liveBuildId !== EXPECTED_BUILD) {
    return { ok: false, reason: `waiting for buildId ${EXPECTED_BUILD}, live=${liveBuildId}` };
  }

  for (const pagePath of PAGE_PATHS) {
    const pageUrl = `${BASE_URL}${pagePath}${pagePath.includes('?') ? '&' : '?'}cb=${Date.now()}`;
    const resp = await requestWithRedirects(pageUrl);
    if (resp.status !== 200) {
      return { ok: false, reason: `${pagePath} status ${resp.status}`, liveBuildId };
    }
    if (!resp.body.includes('build-stamp.js') || !resp.body.includes('build-badge.js')) {
      return { ok: false, reason: `${pagePath} missing build scripts`, liveBuildId };
    }
  }

  return { ok: true, liveBuildId };
}

async function main() {
  const startedAt = Date.now();
  const deadline = startedAt + TIMEOUT_SEC * 1000;
  while (Date.now() < deadline) {
    try {
      const check = await checkLiveRound();
      if (check.ok) {
        console.log(`Live ready. base=${BASE_URL} buildId=${check.liveBuildId}`);
        process.exit(0);
      }
      console.log(`Waiting: ${check.reason}`);
    } catch (error) {
      console.log(`Waiting: ${error && error.message ? error.message : String(error)}`);
    }
    await sleep(INTERVAL_SEC * 1000);
  }
  console.error(`Timed out after ${TIMEOUT_SEC}s waiting for live readiness at ${BASE_URL}.`);
  process.exit(1);
}

main();
