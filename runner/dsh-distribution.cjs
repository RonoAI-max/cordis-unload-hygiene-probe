'use strict';
const fs = process.versions.electron ? require('original-fs') : require('node:fs');
const path = require('node:path');
const runtimeSuffix = ['DSH Tauri', 'runtime', 'win32-x64', 'DSH Tauri.exe'];
const archiveSuffix = ['dsh-tauri', 'dependencies', 'dsh', 'deepseek-harness-pkg-windows.asar'];
const internalArchive = 'CORDIS_PROBE_VERIFIED_ARCHIVE';
function blocked() { const error = new Error('Known DSH distribution unavailable or unsafe'); error.code = 'BLOCKED'; return error; }
function absoluteNormal(value) {
  if (typeof value !== 'string' || !path.win32.isAbsolute(value) || /^\\\\/.test(value) || path.win32.normalize(value).toLowerCase() !== value.toLowerCase()) throw blocked();
  return value;
}
function derive(env) {
  const local = absoluteNormal(env.LOCALAPPDATA);
  const roaming = absoluteNormal(env.APPDATA);
  if (path.win32.basename(local).toLowerCase() !== 'local' || path.win32.basename(roaming).toLowerCase() !== 'roaming' || path.win32.basename(path.win32.dirname(local)).toLowerCase() !== 'appdata' || path.win32.dirname(local).toLowerCase() !== path.win32.dirname(roaming).toLowerCase()) throw blocked();
  return { runtime: path.win32.join(local, ...runtimeSuffix), archive: path.win32.join(roaming, ...archiveSuffix) };
}
function verifyFile(target) {
  try {
    let current = path.parse(target).root;
    for (const segment of target.slice(current.length).split(path.sep).filter(Boolean)) {
      current = path.join(current, segment);
      const info = fs.lstatSync(current);
      if (info.isSymbolicLink() || fs.realpathSync(current).toLowerCase() !== current.toLowerCase()) throw blocked();
      if (current.toLowerCase() === target.toLowerCase()) { if (!info.isFile() || info.nlink !== 1) throw blocked(); }
      else if (!info.isDirectory()) throw blocked();
    }
    return target;
  } catch { throw blocked(); }
}
function resolveDistribution(env = process.env) {
  if (process.platform !== 'win32') throw blocked();
  const found = derive(env);
  verifyFile(found.runtime);
  verifyFile(found.archive);
  return found;
}
function archiveFromWorker(env = process.env) {
  if (process.platform !== 'win32') throw blocked();
  const archive = absoluteNormal(env[internalArchive]);
  const parent = archiveSuffix.reduceRight((current, part) => {
    if (path.win32.basename(current).toLowerCase() !== part.toLowerCase()) throw blocked();
    return path.win32.dirname(current);
  }, archive);
  if (path.win32.basename(parent).toLowerCase() !== 'roaming' || path.win32.basename(path.win32.dirname(parent)).toLowerCase() !== 'appdata') throw blocked();
  return verifyFile(archive);
}
function archiveAnchor(env) { return path.join(archiveFromWorker(env), 'node_modules', '@deepseek-ai', 'dsh', 'package.json'); }
module.exports = { derive, verifyFile, resolveDistribution, archiveFromWorker, archiveAnchor, internalArchive };
