'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { checkDirectory, checkFile } = require('./safe-path.cjs');
const { root } = require('./phase0b-common.cjs');
const { resolveDistribution, internalArchive } = require('./dsh-distribution.cjs');
const { expectedLocations, validateTrial } = require('../scripts/diagnose-core.cjs');
const home = path.join(root, 'test-phase3-home');
const worker = path.join(root, 'runner', 'phase3-worker.cjs');
const results = [];
const failures = [];
try {
  assert.equal(process.argv.length, 2);
  const distribution = resolveDistribution();
  checkFile(worker);
  checkDirectory(home, true);
  const temp = path.join(home, 'tmp');
  checkDirectory(temp, true);
  const env = { SystemRoot: process.env.SystemRoot, WINDIR: process.env.SystemRoot, PATH: path.join(process.env.SystemRoot, 'System32'), USERPROFILE: home, HOME: home, APPDATA: home, LOCALAPPDATA: home, TEMP: temp, TMP: temp, DSH_HOME: home, DSH_TELEMETRY_DISABLED: '1', ELECTRON_RUN_AS_NODE: '1', [internalArchive]: distribution.archive };
  const source = path.join(root, 'phase3-plugin', 'index.js');
  checkFile(source);
  const positions = expectedLocations(fs.readFileSync(source, 'utf8'));
  const expected = Object.fromEntries(Object.entries(positions).map(([type, position]) => [type, position.line]));
  const entry = path.join(home, 'profiles', 'phase3', 'node_modules', '@local', 'cordis-unload-hygiene-phase3', 'index.js');
  for (let set = 1; set <= 2; set += 1) for (let cycle = 1; cycle <= 3; cycle += 1) for (const mode of ['g3', 'l3']) {
    const child = spawnSync(distribution.runtime, [worker, mode], { cwd: home, env, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024, windowsHide: true });
    try {
      checkFile(entry);
      const trial = validateTrial(child, mode, entry, positions);
      results.push({ set, cycle, mode, ...trial });
    } catch { failures.push({ set, cycle, mode, error: 'Worker execution or result validation failed.' }); }
  }
  const summary = { status: failures.length ? 'FAIL' : 'PASS', integration: 'real-dsh-profile-runProfile', g3Runs: results.filter(item => item.mode === 'g3').length, l3Runs: results.filter(item => item.mode === 'l3').length, expected, results, failures };
  console.log(JSON.stringify(summary, null, 2));
  if (failures.length || summary.g3Runs !== 6 || summary.l3Runs !== 6) process.exitCode = 1;
} catch (error) { console.error(JSON.stringify({ status: error.code === 'BLOCKED' ? 'BLOCKED' : 'FAIL', error: 'Prerequisite or validation failure.', results, failures })); process.exitCode = error.code === 'BLOCKED' ? 3 : 1; }
