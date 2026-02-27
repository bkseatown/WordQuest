#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function stampIndex(indexPath, buildId) {
  const original = read(indexPath);
  let stamped = original.replace(/([?&]v=)[A-Za-z0-9._-]+/g, `$1${buildId}`);
  stamped = stamped.replace(
    /(<meta\s+name="wq-build"\s+content=")[^"]*(")/i,
    `$1${buildId}$2`
  );
  if (stamped !== original) write(indexPath, stamped);
}

function stampApp(appPath, buildId) {
  const original = read(appPath);
  const stamped = original.replace(
    /const SW_RUNTIME_VERSION = '[^']+';/,
    `const SW_RUNTIME_VERSION = '${buildId}';`
  );
  if (stamped !== original) write(appPath, stamped);
}

function stampSwRuntime(swRuntimePath, buildId) {
  const original = read(swRuntimePath);
  const stamped = original.replace(
    /const SW_VERSION = '[^']+';/,
    `const SW_VERSION = '${buildId}';`
  );
  if (stamped !== original) write(swRuntimePath, stamped);
}

function main() {
  const distDir = path.resolve(process.argv[2] || 'dist');
  const explicitBuildId = String(process.argv[3] || '').trim();
  const fallbackBuildId = `${String(process.env.GITHUB_SHA || 'local').slice(0, 12)}-${String(process.env.GITHUB_RUN_NUMBER || Date.now())}`;
  const buildId = (explicitBuildId || fallbackBuildId).replace(/[^A-Za-z0-9._-]/g, '').slice(0, 48) || 'local';

  const indexPath = path.join(distDir, 'index.html');
  const appPath = path.join(distDir, 'js', 'app.js');
  const swRuntimePath = path.join(distDir, 'sw-runtime.js');

  [indexPath, appPath, swRuntimePath].forEach((filePath) => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing file for build stamp: ${filePath}`);
    }
  });

  stampIndex(indexPath, buildId);
  stampApp(appPath, buildId);
  stampSwRuntime(swRuntimePath, buildId);
  write(path.join(distDir, 'build-version.txt'), `${buildId}\n`);
  console.log(`Stamped build version: ${buildId}`);
}

main();
