'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function same(first, second) { return first.toLowerCase() === second.toLowerCase(); }
function within(target, parent) {
  const relative = path.relative(parent, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
function checkedPath(target) {
  if (typeof target !== 'string' || !path.isAbsolute(target) || !same(path.resolve(target), target) || !within(target, root)) throw new Error(`Invalid project path: ${target}`);
  return target;
}
function infoOrMissing(target) {
  try { return fs.lstatSync(target); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
function checkDirectory(target, create = false) {
  checkedPath(target);
  let current = path.parse(target).root;
  for (const part of target.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let info = infoOrMissing(current);
    if (!info) {
      if (!create || !within(current, root) || same(current, root)) throw new Error(`Missing directory: ${current}`);
      fs.mkdirSync(current);
      info = fs.lstatSync(current);
    }
    if (!info.isDirectory() || info.isSymbolicLink() || !same(fs.realpathSync(current), current)) throw new Error(`Unsafe directory: ${current}`);
  }
}
function checkFile(target, optional = false) {
  checkedPath(target);
  checkDirectory(path.dirname(target));
  const info = infoOrMissing(target);
  if (!info && optional) return false;
  if (!info || !info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || !same(fs.realpathSync(target), target)) throw new Error(`Unsafe file: ${target}`);
  return true;
}
function fixedFile(target, content) {
  if (!checkFile(target, true)) {
    fs.writeFileSync(target, content, { flag: 'wx' });
    checkFile(target);
  }
  if (fs.readFileSync(target, 'utf8') !== content) throw new Error(`Unexpected file content: ${target}`);
}
function checkTree(target) {
  checkedPath(target);
  checkDirectory(path.dirname(target));
  if (!infoOrMissing(target)) return;
  checkDirectory(target);
  for (const name of fs.readdirSync(target)) {
    const child = path.join(target, name);
    const info = fs.lstatSync(child);
    if (info.isDirectory() && !info.isSymbolicLink()) checkTree(child);
    else checkFile(child);
  }
}
module.exports = { checkDirectory, checkFile, fixedFile, checkTree, checkedPath };
