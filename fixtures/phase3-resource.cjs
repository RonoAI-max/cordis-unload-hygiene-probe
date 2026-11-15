'use strict';
exports.make = emitter => {
  const listener = () => {};
  const interval = setInterval(() => {}, 60000);
  const timeout = setTimeout(() => {}, 60000);
  emitter.on('fixture', listener);
  return { interval, timeout, listener };
};
exports.duplicate = (emitter, listener) => { emitter.on('duplicate', listener); emitter.addListener('duplicate', listener); };
exports.fire = (callback) => setTimeout(callback, 5, 'argument');
exports.owned = (emitter, listener) => emitter.on('shared', listener);
