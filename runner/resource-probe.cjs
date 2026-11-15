'use strict';
const path = require('node:path');
const { fileURLToPath } = require('node:url');
function installResourceProbe(fixturePath, emitter) {
  const expected = path.resolve(fixturePath).toLowerCase();
  const original = { setInterval, clearInterval, setTimeout, clearTimeout };
  const methods = Object.fromEntries(['on', 'addListener', 'off', 'removeListener'].map(name => [name, emitter[name]]));
  const descriptors = Object.fromEntries(Object.keys(methods).map(name => [name, Object.getOwnPropertyDescriptor(emitter, name)]));
  const timers = new Map();
  const listeners = emitter.eventNames().flatMap(event => emitter.rawListeners(event).map(listener => ({ event, listener, where: null, live: true })));
  let restored = false;
  function location() {
    const stack = new Error('Resource creation').stack || '';
    for (const line of stack.split('\n')) {
      const match = line.match(/(?:\(|\s)((?:file:\/\/\/)?[A-Za-z]:[\\/].*?):(\d+):(\d+)\)?$/);
      if (!match) continue;
      const file = path.resolve(match[1].startsWith('file:') ? fileURLToPath(match[1]) : match[1]);
      if (file.toLowerCase() === expected) return { source: { file, line: Number(match[2]), column: Number(match[3]) }, stack };
    }
    return null;
  }
  function setTimer(type, callback, delay, ...args) {
    const where = location();
    let handle;
    const wrapped = type === 'timeout' && where && typeof callback === 'function' ? function (...values) {
      const record = timers.get(handle);
      if (record) record.live = false;
      return Reflect.apply(callback, this, values);
    } : callback;
    handle = Reflect.apply(original[type === 'interval' ? 'setInterval' : 'setTimeout'], this, [wrapped, delay, ...args]);
    if (where) timers.set(handle, { type, ...where, live: true });
    return handle;
  }
  function clearTimer(name, handle) {
    const result = Reflect.apply(original[name], this, [handle]);
    const record = timers.get(handle);
    if (record) record.live = false;
    return result;
  }
  function add(event, listener) {
    const where = location();
    const result = Reflect.apply(methods.addListener, this, [event, listener]);
    listeners.push({ event, listener, where, live: true });
    return result;
  }
  function remove(event, listener) {
    const result = Reflect.apply(methods.removeListener, this, [event, listener]);
    const record = [...listeners].reverse().find(item => item.live && item.event === event && item.listener === listener);
    if (record) record.live = false;
    return result;
  }
  function snapshot() {
    return [...timers.values(), ...listeners.filter(record => record.where).map(record => ({ type: 'listener', ...record.where, live: record.live }))].map(({ type, source, stack, live }) => ({ type, source, stack, live }));
  }
  function restore() {
    if (restored) return;
    try {
      for (const [handle, record] of timers) if (record.live) { original.clearTimeout(handle); record.live = false; }
      for (const record of [...listeners].reverse()) {
        if (!record.live || !record.where) continue;
        if (listeners.some(other => other.live && !other.where && other.event === record.event && other.listener === record.listener)) throw new Error('Ambiguous listener ownership');
        Reflect.apply(methods.removeListener, emitter, [record.event, record.listener]);
        record.live = false;
      }
    } finally {
      Object.assign(globalThis, original);
      for (const name of Object.keys(methods)) {
        if (descriptors[name]) Object.defineProperty(emitter, name, descriptors[name]);
        else delete emitter[name];
      }
      restored = true;
    }
  }
  globalThis.setInterval = function (...args) { return Reflect.apply(setTimer, this, ['interval', ...args]); };
  globalThis.setTimeout = function (...args) { return Reflect.apply(setTimer, this, ['timeout', ...args]); };
  globalThis.clearInterval = function (handle) { return Reflect.apply(clearTimer, this, ['clearInterval', handle]); };
  globalThis.clearTimeout = function (handle) { return Reflect.apply(clearTimer, this, ['clearTimeout', handle]); };
  emitter.on = emitter.addListener = add;
  emitter.off = emitter.removeListener = remove;
  return { snapshot, restore };
}
module.exports = { installResourceProbe };
