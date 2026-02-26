#!/usr/bin/env node
'use strict';

const { spawnSync, execSync } = require('child_process');
const https = require('https');

const WORKFLOWS = [
  { id: 'deploy-pages.yml', label: 'Deploy GitHub Pages' },
  { id: 'ui-guardrails.yml', label: 'UI Guardrails' },
  { id: 'ui-runtime-smoke.yml', label: 'UI Runtime Smoke' },
  { id: 'weekly-roi-report.yml', label: 'Weekly ROI Report' }
];

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    skipLocal: args.has('--skip-local'),
    skipRemote: args.has('--skip-remote')
  };
}

function getRepoSlug() {
  let remote;
  try {
    remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }

  // Supports both git@github.com:owner/repo.git and https://github.com/owner/repo(.git)
  const sshMatch = remote.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) return `${sshMatch[1]}/${sshMatch[2]}`;

  const httpsMatch = remote.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (httpsMatch) return `${httpsMatch[1]}/${httpsMatch[2]}`;

  return null;
}

function runLocalReleaseCheck() {
  const start = Date.now();
  const result = spawnSync('npm', ['run', 'release:check'], {
    stdio: 'inherit',
    env: process.env
  });
  const durationSec = ((Date.now() - start) / 1000).toFixed(1);
  const ok = result.status === 0;
  return { ok, durationSec };
}

function fetchJson(url, token) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'wordquest-health-check',
      'Accept': 'application/vnd.github+json'
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error(`Invalid JSON from ${url}`));
        }
      });
    }).on('error', reject);
  });
}

function formatRun(run) {
  if (!run) return 'no runs found';
  const status = run.status || 'unknown';
  const conclusion = run.conclusion || '--';
  const branch = run.head_branch || '--';
  const when = run.created_at || '--';
  return `${status}/${conclusion} on ${branch} at ${when} -> ${run.html_url || '--'}`;
}

async function fetchWorkflowSummary(slug) {
  const token = process.env.GITHUB_TOKEN || '';
  const results = [];

  for (const workflow of WORKFLOWS) {
    const url = `https://api.github.com/repos/${slug}/actions/workflows/${workflow.id}/runs?per_page=1`;
    try {
      const payload = await fetchJson(url, token);
      const run = Array.isArray(payload.workflow_runs) ? payload.workflow_runs[0] : null;
      results.push({ label: workflow.label, ok: run ? run.conclusion === 'success' : null, text: formatRun(run) });
    } catch (error) {
      results.push({ label: workflow.label, ok: null, text: `unavailable (${error.message})` });
    }
  }

  return results;
}

async function main() {
  const args = parseArgs();
  console.log('== WordQuest Health Check ==');
  let localOk = true;

  if (!args.skipLocal) {
    console.log('\n[Local] release:check');
    const local = runLocalReleaseCheck();
    localOk = local.ok;
    console.log(`Result: ${local.ok ? 'PASS' : 'FAIL'} (${local.durationSec}s)`);
  } else {
    console.log('\n[Local] skipped (--skip-local)');
  }

  if (!args.skipRemote) {
    console.log('\n[Remote] latest workflow runs');
    const slug = getRepoSlug();
    if (!slug) {
      console.log('Could not determine GitHub repo slug from origin remote.');
    } else {
      console.log(`Repo: ${slug}`);
      const remote = await fetchWorkflowSummary(slug);
      for (const item of remote) {
        const state = item.ok === true ? 'PASS' : item.ok === false ? 'FAIL' : 'INFO';
        console.log(`- ${item.label}: ${state} | ${item.text}`);
      }
    }
  } else {
    console.log('\n[Remote] skipped (--skip-remote)');
  }

  process.exit(localOk ? 0 : 1);
}

main().catch((error) => {
  console.error(`health check failed: ${error.message}`);
  process.exit(1);
});
