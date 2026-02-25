#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const contractPath = path.join(root, 'js/contracts/teacher-assignments-contract.js');
const featurePath = path.join(root, 'js/features/teacher-assignments.js');

const context = {
  window: {},
  document: {},
  localStorage: {
    getItem() { return null; },
    setItem() {}
  },
  CustomEvent: function CustomEvent(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};
context.window.dispatchEvent = () => {};
context.window.CustomEvent = context.CustomEvent;

vm.createContext(context);
vm.runInContext(fs.readFileSync(contractPath, 'utf8'), context, { filename: contractPath });
vm.runInContext(fs.readFileSync(featurePath, 'utf8'), context, { filename: featurePath });

const contract = context.window.WQTeacherAssignmentsContract;
const feature = context.window.WQTeacherAssignmentsFeature;

if (!contract || !contract.storageKeys || !contract.events) {
  throw new Error('Teacher assignments contract failed to initialize.');
}

if (!feature || typeof feature.bindUI !== 'function' || typeof feature.createFeature !== 'function') {
  throw new Error('Teacher assignments feature API is incomplete.');
}

console.log('teacher-assignments smoke check passed');
