'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root } = require('../runner/phase0b-common.cjs');
const { resolveDistribution, internalArchive } = require('../runner/dsh-distribution.cjs');
const { checkDirectory, checkFile } = require('../runner/safe-path.cjs');
const { parseArgs, expectedLocations, validateTrial, formatText, limitation } = require('./diagnose-core.cjs');
const home = path.join(root, 'test-phase3-home');
const worker = path.join(root, 'runner', 'phase3-worker.cjs');
const source = path.join(root, 'phase3-plugin', 'index.js');
const entry = path.join(home, 'profiles', 'phase3', 'node_modules', '@local', 'cordis-unload-hygiene-phase3', 'index.js');
const usage = 'Usage: node scripts/diagnose.cjs --demo good|leak|both [--json]\n       node scripts/diagnose.cjs --help\n';
function emit(result, json) { process.stdout.write(json ? `${JSON.stringify(result, null, 2)}\n` : formatText(result)); }
let options;
try { options = parseArgs(process.argv.slice(2)); } catch {
  process.stderr.write(usage);
  process.exitCode = 4;
}
if (options?.help) {
  process.stdout.write(`${usage}\n${limitation}\nExit codes: 0 clean, 2 intentional leak detected, 1 failure, 3 blocked, 4 usage error.\n`);
} else if (options) {
  try {
    if (!process.env.SystemRoot) { const error = new Error('BLOCKED'); error.code = 'BLOCKED'; throw error; }
    const distribution = resolveDistribution();
    checkFile(worker);
    checkFile(source);
    const positions = expectedLocations(fs.readFileSync(source, 'utf8'));
    checkDirectory(home, true);
    const temp = path.join(home, 'tmp');
    checkDirectory(temp, true);
    const env = { SystemRoot: process.env.SystemRoot, WINDIR: process.env.SystemRoot, PATH: path.join(process.env.SystemRoot, 'System32'), USERPROFILE: home, HOME: home, APPDATA: home, LOCALAPPDATA: home, TEMP: temp, TMP: temp, DSH_HOME: home, DSH_TELEMETRY_DISABLED: '1', ELECTRON_RUN_AS_NODE: '1', [internalArchive]: distribution.archive };
    const modes = options.demo === 'both' ? ['g3', 'l3'] : [options.demo === 'good' ? 'g3' : 'l3'];
    const trials = [];
    for (const mode of modes) {
      const child = spawnSync(distribution.runtime, [worker, mode], { cwd: home, env, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024, windowsHide: true });
      checkFile(entry);
      trials.push(validateTrial(child, mode, entry, positions));
    }
    const result = { schemaVersion: 1, status: 'completed', integration: 'real-dsh-profile', demo: options.demo, trials, limitation };
    emit(result, options.json);
    process.exitCode = trials.some(trial => trial.outcome === 'intentional_leak_detected') ? 2 : 0;
  } catch (error) {
    const blocked = error.code === 'BLOCKED';
    emit({ schemaVersion: 1, status: blocked ? 'blocked' : 'failed', message: blocked ? 'Required local Windows DSH runtime or archive is unavailable.' : 'The fixed-fixture trial or its validation failed.', limitation }, options.json);
    process.exitCode = blocked ? 3 : 1;
  }
}
