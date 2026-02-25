#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appPath = path.join(root, 'js', 'app.js');
const appSource = fs.readFileSync(appPath, 'utf8');

function requireMatch(pattern, message) {
  if (!pattern.test(appSource)) {
    throw new Error(message);
  }
}

const requiredFunnelEvents = [
  'wq_funnel_session_start',
  'wq_funnel_quest_select',
  'wq_funnel_deep_dive_started',
  'wq_funnel_deep_dive_completed',
  'wq_funnel_reset_used',
  'wq_funnel_force_update_used'
];

requiredFunnelEvents.forEach((eventName) => {
  requireMatch(
    new RegExp(`emitTelemetry\\('${eventName}'`),
    `Missing funnel telemetry event emit: ${eventName}`
  );
});

requireMatch(
  /emitTelemetry\('wq_funnel_reset_used',\s*\{\s*source:\s*'settings'\s*\}\)/,
  "Missing settings reset funnel telemetry source ('settings')."
);
requireMatch(
  /emitTelemetry\('wq_funnel_reset_used',\s*\{\s*source:\s*'teacher_session'\s*\}\)/,
  "Missing teacher-session reset funnel telemetry source ('teacher_session')."
);
requireMatch(
  /emitTelemetry\('wq_funnel_force_update_used',\s*\{\s*source:\s*'settings'\s*\}\)/,
  "Missing force-update funnel telemetry source ('settings')."
);

console.log('funnel telemetry contract passed');
