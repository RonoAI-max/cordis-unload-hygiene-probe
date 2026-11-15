'use strict';
const path = require('node:path');
const assert = require('node:assert/strict');
const types = ['interval', 'timeout', 'listener'];
const limitation = 'Trusted fixed fixtures only; not arbitrary plugin diagnosis or an OS security sandbox.';
function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true };
  if ((args.length !== 2 && args.length !== 3) || args[0] !== '--demo' || !['good', 'leak', 'both'].includes(args[1]) || (args.length === 3 && args[2] !== '--json')) throw new Error('USAGE');
  return { demo: args[1], json: args.length === 3 };
}
function expectedLocations(source) {
  const patterns = { interval: 'setInterval(', timeout: 'setTimeout(', listener: "on('fixture'" };
  const lines = source.split(/\r?\n/);
  return Object.fromEntries(types.map(type => {
    const matches = lines.flatMap((line, index) => line.includes(patterns[type]) ? [{ line: index + 1, column: line.indexOf(patterns[type]) + 1 }] : []);
    assert.equal(matches.length, 1);
    return [type, matches[0]];
  }));
}
function validateTrial(child, mode, expectedEntry, positions) {
  assert.equal(child.status, 0);
  assert.equal(child.signal, null);
  assert.equal(child.error, undefined);
  assert.equal(child.stderr, '');
  assert.ok(typeof child.stdout === 'string' && Buffer.byteLength(child.stdout) <= 1024 * 1024);
  const data = JSON.parse(child.stdout);
  assert.equal(data.status, 'PASS');
  assert.equal(data.mode, mode);
  assert.equal(data.applied, 1);
  assert.equal(data.disposed, 1);
  assert.equal(data.cleanupComplete, true);
  assert.equal(data.globalsRestored, true);
  assert.equal(typeof data.pluginEntry, 'string');
  assert.ok(path.isAbsolute(data.pluginEntry));
  assert.equal(path.resolve(data.pluginEntry).toLowerCase(), expectedEntry.toLowerCase());
  for (const [records, count] of [[data.before, 1], [data.after, mode === 'l3' ? 1 : 0]]) {
    assert.ok(Array.isArray(records));
    assert.equal(records.length, 3 * count);
    for (const type of types) {
      const found = records.filter(item => item && item.type === type);
      assert.equal(found.length, count);
      for (const item of found) {
        assert.equal(item.live, true);
        assert.equal(typeof item.source?.file, 'string');
        assert.ok(path.isAbsolute(item.source.file));
        assert.equal(path.resolve(item.source.file).toLowerCase(), expectedEntry.toLowerCase());
        assert.equal(item.source.line, positions[type].line);
        assert.equal(item.source.column, positions[type].column);
      }
    }
  }
  return {
    fixture: mode === 'g3' ? 'good' : 'leak',
    outcome: mode === 'g3' ? 'clean' : 'intentional_leak_detected',
    bundle: '@local/cordis-unload-hygiene-phase3',
    resources: types.map(type => ({ type, before: 1, after: mode === 'g3' ? 0 : 1, source: { file: 'phase3-plugin/index.js', ...positions[type] } })),
    applied: data.applied, disposed: data.disposed, cleanupComplete: true, globalsRestored: true,
  };
}
function formatText(result) {
  if (result.status !== 'completed') return `${result.status.toUpperCase()}: ${result.message}\n${limitation}\n`;
  const lines = [`DSH fixed-fixture demo: ${result.demo}`];
  for (const trial of result.trials) {
    lines.push(`${trial.fixture}: ${trial.outcome === 'clean' ? 'clean fixture' : 'intentional leak detected'} (${trial.bundle})`);
    for (const item of trial.resources) lines.push(`  ${item.type}: ${item.before} -> ${item.after} at ${item.source.file}:${item.source.line}:${item.source.column}`);
    lines.push(`  cleanup: ${trial.cleanupComplete}; instrumentation restored: ${trial.globalsRestored}`);
  }
  lines.push(limitation);
  return `${lines.join('\n')}\n`;
}
module.exports = { parseArgs, expectedLocations, validateTrial, formatText, limitation };
