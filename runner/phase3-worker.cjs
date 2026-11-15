'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { checkDirectory, checkFile, fixedFile, checkTree } = require('./safe-path.cjs');
const { installResourceProbe } = require('./resource-probe.cjs');
const root = path.resolve(__dirname, '..');
const home = path.join(root, 'test-phase3-home');
const profileDir = path.join(home, 'profiles', 'phase3');
const packageName = '@local/cordis-unload-hygiene-phase3';
const packageDir = path.join(profileDir, 'node_modules', '@local', 'cordis-unload-hygiene-phase3');
const pluginEntry = path.join(packageDir, 'index.js');
const { archiveAnchor } = require('./dsh-distribution.cjs');
const anchor = archiveAnchor();
const stateKey = Symbol.for('cordis-unload-hygiene-phase3.state');
const emitterKey = Symbol.for('cordis-unload-hygiene-phase3.emitter');
function allowOnly(directory, names) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    assert.ok(names.includes(entry.name) && !entry.isSymbolicLink(), `Unexpected entry: ${path.join(directory, entry.name)}`);
  }
}
function prepare() {
  checkDirectory(home);
  allowOnly(home, ['tmp', 'profiles', 'node-addon-native-custom-loader']);
  checkTree(path.join(home, 'tmp'));
  checkTree(path.join(home, 'node-addon-native-custom-loader'));
  checkDirectory(path.join(home, 'profiles'), true);
  allowOnly(path.join(home, 'profiles'), ['phase3']);
  checkDirectory(profileDir, true);
  allowOnly(profileDir, ['package.json', 'cordis.patch.yml', 'cordis.yml', 'node_modules']);
  checkFile(path.join(profileDir, 'cordis.yml'), true);
  for (const [directory, names] of [[path.join(profileDir, 'node_modules'), ['@local']], [path.join(profileDir, 'node_modules', '@local'), ['cordis-unload-hygiene-phase3']], [packageDir, ['index.js', 'package.json', 'cordis.patch.yml']]]) {
    checkDirectory(directory, true);
    allowOnly(directory, names);
  }
  fixedFile(path.join(profileDir, 'package.json'), `${JSON.stringify({ name: 'dsh-profile-phase3', private: true, dependencies: { [packageName]: '1.0.0' }, dsh: { profile: { bundles: [packageName] } } }, null, 2)}\n`);
  fixedFile(path.join(profileDir, 'cordis.patch.yml'), '[]\n');
  for (const name of ['index.js', 'package.json', 'cordis.patch.yml']) {
    const source = path.join(root, 'phase3-plugin', name);
    checkFile(source);
    fixedFile(path.join(packageDir, name), fs.readFileSync(source, 'utf8'));
  }
}
async function main() {
  const mode = process.argv[2];
  assert.ok(process.argv.length === 3 && ['g3', 'l3'].includes(mode));
  assert.equal(process.cwd().toLowerCase(), home.toLowerCase());
  assert.equal(process.env.DSH_HOME.toLowerCase(), home.toLowerCase());
  process.env.CORDIS_UNLOAD_FIXTURE_MODE = mode;
  prepare();
  const requireFromArchive = createRequire(anchor);
  const load = name => import(pathToFileURL(requireFromArchive.resolve(name)).href);
  const { loadLayeredEnv, loadProfileDirectory } = await load('@deepseek-ai/dsh-app-boot');
  const { resolveDshHome } = await load('@deepseek-ai/dsh-home-paths');
  const { runProfile } = await load('@deepseek-ai/dsh/profile-boot');
  assert.equal(resolveDshHome().toLowerCase(), home.toLowerCase());
  const loaded = loadProfileDirectory('dsh', profileDir, anchor);
  assert.deepEqual(loaded.skippedBundles, []);
  assert.deepEqual(loaded.layers.map(layer => layer.packageName), [packageName]);
  assert.equal(loaded.layers[0].packageDir.toLowerCase(), packageDir.toLowerCase());
  assert.equal(loaded.layers[0].patches.length, 1);
  const emitter = new EventEmitter();
  const unrelatedListener = () => {};
  emitter.on('unrelated', unrelatedListener);
  globalThis[emitterKey] = emitter;
  const originals = [setInterval, clearInterval, setTimeout, clearTimeout, emitter.on];
  const probe = installResourceProbe(pluginEntry, emitter);
  const unrelatedTimer = setInterval(() => {}, 60000);
  let app;
  let result;
  try {
    app = await runProfile({ environment: loadLayeredEnv('dsh'), profile: 'phase3', patchFiles: [], args: [] });
    const profileContext = app.ctx.get('profileContext');
    assert.equal(profileContext.home.toLowerCase(), home.toLowerCase());
    assert.equal(profileContext.dir.toLowerCase(), profileDir.toLowerCase());
    assert.deepEqual(profileContext.startedBundles, [packageName]);
    const loader = app.ctx.get('loader');
    const entry = [...loader.entries()].find(candidate => candidate.options.name === packageName);
    assert.ok(entry && entry.fiber);
    assert.deepEqual(globalThis[stateKey], { applied: 1, disposed: 0 });
    const before = probe.snapshot().filter(record => record.live);
    assert.deepEqual(before.map(record => record.type).sort(), ['interval', 'listener', 'timeout']);
    await entry.fiber.dispose();
    await loader.await();
    assert.deepEqual(globalThis[stateKey], { applied: 1, disposed: 1 });
    const after = probe.snapshot().filter(record => record.live);
    assert.deepEqual(after.map(record => record.type).sort(), mode === 'g3' ? [] : ['interval', 'listener', 'timeout']);
    result = { mode, before, after, applied: 1, disposed: 1, pluginEntry };
  } finally {
    try { await app?.ctx?.fiber?.dispose(); } finally {
      probe.restore();
      assert.equal(probe.snapshot().filter(record => record.live).length, 0);
      assert.equal(emitter.listeners('unrelated')[0], unrelatedListener);
      assert.equal(unrelatedTimer._destroyed, false);
      originals[1](unrelatedTimer);
      assert.deepEqual([setInterval, clearInterval, setTimeout, clearTimeout, emitter.on], originals);
      delete globalThis[stateKey];
      delete globalThis[emitterKey];
      delete process.env.CORDIS_UNLOAD_FIXTURE_MODE;
    }
  }
  console.log(JSON.stringify({ status: 'PASS', ...result, cleanupComplete: true, globalsRestored: true }));
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
