'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { validateTrial, expectedLocations, formatText } = require('../scripts/diagnose-core.cjs');
const root = path.resolve(__dirname, '..');
const cli = path.join(root, 'scripts', 'diagnose.cjs');
function run(args, env = process.env) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: root, env, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true });
}
const help = run(['--help']);
assert.equal(help.status, 0);
assert.match(help.stdout, /Usage:/);
assert.equal(help.stderr, '');
for (const args of [[], ['--demo'], ['--demo', 'invalid'], ['--demo', 'good', '--bad'], ['--demo', 'good', '--json', '--json'], ['--help', '--demo', 'good'], ['--demo', 'good', 'C:\\not-allowed']]) {
  const child = run(args);
  assert.equal(child.status, 4);
  assert.match(child.stderr, /Usage:/);
  assert.equal(child.stdout, '');
}
for (const [demo, exit, fixtures] of [['good', 0, ['good']], ['leak', 2, ['leak']], ['both', 2, ['good', 'leak']]]) {
  for (const json of [false, true]) {
    const child = run(['--demo', demo, ...(json ? ['--json'] : [])]);
    assert.equal(child.status, exit, child.stdout + child.stderr);
    assert.equal(child.stderr, '');
    assert.doesNotMatch(child.stdout, /(?:[A-Za-z]:[\\/]|file:\/\/|\x1b|\bat .*\()/);
    assert.match(child.stdout, /Trusted fixed fixtures only/);
    if (json) {
      const data = JSON.parse(child.stdout);
      assert.equal(data.schemaVersion, 1);
      assert.equal(data.status, 'completed');
      assert.equal(data.integration, 'real-dsh-profile');
      assert.equal(data.demo, demo);
      assert.deepEqual(data.trials.map(trial => trial.fixture), fixtures);
      for (const trial of data.trials) {
        assert.equal(trial.outcome, trial.fixture === 'good' ? 'clean' : 'intentional_leak_detected');
        assert.equal(trial.bundle, '@local/cordis-unload-hygiene-phase3');
        assert.deepEqual(trial.resources.map(item => item.type), ['interval', 'timeout', 'listener']);
        assert.equal(trial.applied, 1);
        assert.equal(trial.disposed, 1);
        assert.equal(trial.cleanupComplete, true);
        assert.equal(trial.globalsRestored, true);
        for (const [index, item] of trial.resources.entries()) {
          assert.equal(item.before, 1);
          assert.equal(item.after, trial.fixture === 'good' ? 0 : 1);
          assert.equal(item.source.file, 'phase3-plugin/index.js');
          assert.equal(item.source.line, [9, 10, 11][index]);
          assert.equal(item.source.column, [20, 19, 11][index]);
        }
      }
    } else {
      for (const fixture of fixtures) assert.match(child.stdout, fixture === 'good' ? /good: clean fixture/ : /leak: intentional leak detected/);
      for (const resource of ['interval:', 'timeout:', 'listener:', 'phase3-plugin/index.js:']) assert.ok(child.stdout.includes(resource));
    }
  }
}
const entry = path.join(root, 'test-phase3-home', 'profiles', 'phase3', 'node_modules', '@local', 'cordis-unload-hygiene-phase3', 'index.js');
const positions = expectedLocations(fs.readFileSync(path.join(root, 'phase3-plugin', 'index.js'), 'utf8'));
const records = Object.entries(positions).map(([type, source]) => ({ type, live: true, source: { file: entry, ...source } }));
const valid = { status: 'PASS', mode: 'g3', pluginEntry: entry, applied: 1, disposed: 1, cleanupComplete: true, globalsRestored: true, before: records, after: [] };
const child = data => ({ status: 0, signal: null, error: undefined, stderr: '', stdout: JSON.stringify(data) });
assert.equal(validateTrial(child(valid), 'g3', entry, positions).outcome, 'clean');
for (const bad of [null, { ...valid, cleanupComplete: false }, { ...valid, after: [records[0]] }, { ...valid, before: [records[0], records[0], records[2]] }, { ...valid, pluginEntry: path.join(root, 'wrong.js') }, { ...valid, before: records.map(record => ({ ...record, source: { ...record.source, line: 1 } })) }]) assert.throws(() => validateTrial(child(bad), 'g3', entry, positions));
for (const bad of [{ ...child(valid), status: 1 }, { ...child(valid), error: new Error('timeout') }, { ...child(valid), signal: 'SIGTERM' }, { ...child(valid), stderr: 'error' }, { ...child(valid), stdout: '{' }, { ...child(valid), stdout: 'x'.repeat(1024 * 1024 + 1) }]) assert.throws(() => validateTrial(bad, 'g3', entry, positions));
assert.match(formatText({ status: 'blocked', message: 'unavailable' }), /BLOCKED: unavailable/);
console.log('PASS: CLI help/usage, six real DSH outputs, schema/exits, sanitized paths, and validator failure controls');
