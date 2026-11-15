'use strict';
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const path = require('node:path');
const { installResourceProbe } = require('./resource-probe.cjs');
const fixturePath = path.join(__dirname, '..', 'fixtures', 'phase3-resource.cjs');
const fixture = require(fixturePath);
async function main() {
  const emitter = new EventEmitter();
  const original = { setInterval, clearInterval, setTimeout, clearTimeout, on: emitter.on };
  const unrelatedListener = () => {};
  emitter.on('unrelated', unrelatedListener);
  const probe = installResourceProbe(fixturePath, emitter);
  const unrelatedTimer = setInterval(() => {}, 60000);
  unrelatedTimer.unref();
  try {
    assert.throws(() => emitter.on('invalid', null), TypeError);
    assert.throws(() => setTimeout(null, 1), TypeError);
    assert.equal(probe.snapshot().length, 0);
    const resources = fixture.make(emitter);
    assert.deepEqual(probe.snapshot().filter(item => item.live).map(item => item.type).sort(), ['interval', 'listener', 'timeout']);
    clearTimeout(resources.interval);
    clearInterval(resources.timeout);
    emitter.off('fixture', resources.listener);
    assert.equal(probe.snapshot().filter(item => item.live).length, 0);
    const duplicate = () => {};
    fixture.duplicate(emitter, duplicate);
    assert.equal(emitter.listenerCount('duplicate'), 2);
    emitter.removeListener('duplicate', duplicate);
    assert.equal(probe.snapshot().filter(item => item.live && item.type === 'listener').length, 1);
    emitter.off('duplicate', duplicate);
    assert.equal(probe.snapshot().filter(item => item.live).length, 0);
    await new Promise((resolve, reject) => fixture.fire(function (argument) {
      try { assert.equal(argument, 'argument'); assert.ok(this); resolve(); } catch (error) { reject(error); }
    }));
    assert.equal(probe.snapshot().filter(item => item.live).length, 0);
    fixture.make(emitter);
    throw new Error('expected exception');
  } catch (error) {
    assert.equal(error.message, 'expected exception');
  } finally { probe.restore(); }
  assert.equal(probe.snapshot().filter(item => item.live).length, 0);
  assert.equal(emitter.listenerCount('unrelated'), 1);
  assert.equal(emitter.listeners('unrelated')[0], unrelatedListener);
  assert.equal(unrelatedTimer._destroyed, false);
  assert.equal(setInterval, original.setInterval);
  assert.equal(clearInterval, original.clearInterval);
  assert.equal(setTimeout, original.setTimeout);
  assert.equal(clearTimeout, original.clearTimeout);
  assert.equal(emitter.on, original.on);
  original.clearInterval(unrelatedTimer);
  const sharedEmitter = new EventEmitter();
  const shared = () => {};
  sharedEmitter.on('shared', shared);
  const sharedProbe = installResourceProbe(fixturePath, sharedEmitter);
  fixture.owned(sharedEmitter, shared);
  assert.throws(() => sharedProbe.restore(), /Ambiguous listener ownership/);
  assert.equal(sharedEmitter.listenerCount('shared'), 2);
  sharedEmitter.removeAllListeners('shared');
  console.log('PASS: timers, cross-clear, natural fire, duplicate listeners, invalid arguments, unrelated resources, ambiguous ownership, exception restore');
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
