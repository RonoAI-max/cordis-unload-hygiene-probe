'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { checkDirectory } = require('./safe-path.cjs');
const { resolveDistribution, internalArchive } = require('./dsh-distribution.cjs');
const root = path.resolve(__dirname, '..');
const home = path.join(root, 'test-dsh-home');
function ensureDirectory(target) {
  if (target !== home && !target.startsWith(home + path.sep)) throw new Error(`Outside test home: ${target}`);
  checkDirectory(target, true);
}
function environment(distribution) {
  if (process.platform !== 'win32') throw new Error('Windows required');
  ensureDirectory(home);
  const temp = path.join(home, 'tmp');
  ensureDirectory(temp);
  return { SystemRoot: process.env.SystemRoot, WINDIR: process.env.SystemRoot, PATH: path.join(process.env.SystemRoot, 'System32'), USERPROFILE: home, HOME: home, APPDATA: home, LOCALAPPDATA: home, TEMP: temp, TMP: temp, DSH_HOME: home, DSH_TELEMETRY_DISABLED: '1', ELECTRON_RUN_AS_NODE: '1', [internalArchive]: distribution.archive };
}
function run(args) {
  const distribution = resolveDistribution();
  const env = environment(distribution);
  const started = Date.now();
  const child = spawnSync(distribution.runtime, args, { cwd: home, env, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024, windowsHide: true });
  return { stdout: child.stdout || '', stderr: child.stderr || '', exitCode: child.status, signal: child.signal, elapsedMs: Date.now() - started, timeout: child.error?.code === 'ETIMEDOUT', error: child.error?.message || null };
}
module.exports = { root, home, run, ensureDirectory };
