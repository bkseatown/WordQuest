const fs = require('fs');
const path = require('path');
const TARGET_PAGES = [
  'index.html',
  'teacher-dashboard.html',
  'reading-lab.html',
  'sentence-surgery.html',
  'writing-studio.html',
  'word-quest.html',
  'numeracy.html'
];

function nowIso() {
  return new Date().toISOString();
}

function shortSha(raw) {
  return String(raw || '').trim().slice(0, 12);
}

function dateBuildId(seed) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const n = Number(seed || 0) || 0;
  const suffix = String.fromCharCode(97 + (Math.abs(n) % 26));
  return `${y}${m}${d}${suffix}`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const named = new Map();
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] && args[i].startsWith('--')) {
      named.set(args[i], args[i + 1] || '');
      i += 1;
    }
  }
  const positional = args.filter((a) => !a.startsWith('--'));
  return { named, positional };
}

function resolveBuildId(positional, named) {
  const explicit = named.get('--build') || positional[1] || '';
  if (explicit) return String(explicit).trim();
  const run = Number(process.env.GITHUB_RUN_NUMBER || 0) || Date.now();
  return dateBuildId(run);
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFileSafe(filePath, content) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
}

function buildStampJs(buildId, sha) {
  return [
    '(function buildStampGlobal() {',
    '  var buildId = ' + JSON.stringify(buildId) + ';',
    '  var gitSha = ' + JSON.stringify(sha) + ';',
    '  var time = ' + JSON.stringify(nowIso()) + ';',
    '  var payload = { buildId: buildId, stamp: buildId, version: buildId, gitSha: gitSha, sha: gitSha, time: time, builtAt: time };',
    '  if (typeof window !== "undefined") {',
    '    window.__BUILD__ = payload;',
    '    window.CS_BUILD = Object.assign({}, window.CS_BUILD || {}, payload);',
    '  }',
    '  if (typeof self !== "undefined") self.__CS_BUILD__ = payload;',
    '})();',
    ''
  ].join('\n');
}

function maybeSetBuildMeta(html, buildId) {
  return html
    .replace(/(<meta\s+name=["']wq-build["']\s+content=["'])[^"']*(["'][^>]*>)/ig, `$1${buildId}$2`)
    .replace(/(<meta\s+name=["']ws-build["']\s+content=["'])[^"']*(["'][^>]*>)/ig, `$1${buildId}$2`);
}

function shouldCacheBustAsset(url) {
  if (!url) return false;
  if (/^(https?:)?\/\//i.test(url)) return false;
  if (/^(data:|mailto:|tel:|#)/i.test(url)) return false;
  const clean = url.split('#')[0];
  return /\.(js|css)(\?.*)?$/i.test(clean);
}

function cacheBustAssetUrl(url, buildId) {
  const hashIndex = url.indexOf('#');
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const queryIndex = base.indexOf('?');
  const pathOnly = queryIndex >= 0 ? base.slice(0, queryIndex) : base;
  const query = queryIndex >= 0 ? base.slice(queryIndex + 1) : '';
  const params = new URLSearchParams(query);
  params.set('v', buildId);
  return pathOnly + '?' + params.toString() + hash;
}

function patchHtmlAssetVersions(targetDir, buildId) {
  const filesTouched = [];
  TARGET_PAGES.forEach((name) => {
    const filePath = path.join(targetDir, name);
    if (!fs.existsSync(filePath)) {
      if (name === 'numeracy.html') return;
      throw new Error(`[stamp-build-version] required page missing: ${name}`);
    }
    const src = fs.readFileSync(filePath, 'utf8');
    const withBuildMeta = maybeSetBuildMeta(src, buildId);
    const next = withBuildMeta.replace(/(src|href)=["']([^"']+)["']/g, (full, attr, url) => {
      if (!shouldCacheBustAsset(url)) return full;
      return `${attr}="${cacheBustAssetUrl(url, buildId)}"`;
    });
    if (next !== src) {
      fs.writeFileSync(filePath, next, 'utf8');
      filesTouched.push(name);
    }
  });
  const unexpected = filesTouched.filter((name) => !TARGET_PAGES.includes(name));
  if (unexpected.length) {
    throw new Error(`[stamp-build-version] refusing unexpected html writes: ${unexpected.join(', ')}`);
  }
  process.stdout.write(`[stamp-build-version] filesTouched=[${filesTouched.join(', ')}]\n`);
}

function maybePatchServiceWorker(rootDir, buildId) {
  const swPath = path.join(rootDir, 'sw-runtime.js');
  if (!fs.existsSync(swPath)) return;
  const src = fs.readFileSync(swPath, 'utf8');
  const next = src.replace(/const SW_VERSION = '([^']*)';/, "const SW_VERSION = '" + buildId + "';");
  if (next !== src) fs.writeFileSync(swPath, next, 'utf8');
}

function main() {
  const { named, positional } = parseArgs(process.argv);
  const targetDir = path.resolve(process.cwd(), named.get('--dir') || positional[0] || '.');
  const sha = shortSha(named.get('--sha') || process.env.GITHUB_SHA || process.env.COMMIT_SHA || '');
  const buildId = resolveBuildId(positional, named);

  writeFileSafe(path.join(targetDir, 'build.json'), JSON.stringify({
    buildId,
    gitSha: sha,
    time: nowIso()
  }, null, 2) + '\n');

  const stamp = buildStampJs(buildId, sha);
  writeFileSafe(path.join(targetDir, 'build-stamp.js'), stamp);
  writeFileSafe(path.join(targetDir, 'js', 'build-stamp.js'), stamp);

  patchHtmlAssetVersions(targetDir, buildId);

  process.stdout.write(`[stamp-build-version] target=${targetDir} build=${buildId} sha=${sha || 'n/a'}\n`);
}

main();
