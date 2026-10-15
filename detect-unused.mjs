import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html']);
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'www']);

const ENTRY_FILES = new Set([
  'index.html',
  'main.tsx',
  'capacitor.config.ts',
  'vite.config.ts',
  'vitest.config.ts',
  'playwright.config.ts',
  'eslint.config.js',
]);

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const name of entries) {
    if (EXCLUDE_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, files);
    } else if (st.isFile()) {
      const ext = name.slice(name.lastIndexOf('.'));
      if (EXTENSIONS.has(ext)) {
        files.push(full);
      }
    }
  }
  return files;
}

const allFiles = walk(ROOT);

// Build relative paths
const relFiles = allFiles.map((f) => relative(ROOT, f).split(sep).join('/'));

function isEntry(rel) {
  const base = rel.split('/').pop();
  if (ENTRY_FILES.has(base)) return true;
  if (rel.startsWith('e2e/')) return true;
  if (base.endsWith('.test.ts')) return true;
  return false;
}

// For each candidate (non-entry) file, check if referenced by any other file
const candidates = relFiles.filter((r) => !isEntry(r));
const references = relFiles.map((r) => readFileSync(join(ROOT, r), 'utf8'));

function buildPatterns(fileRel) {
  const base = fileRel.split('/').pop();
  const baseNoExt = base.replace(/\.[^.]+$/, '');
  const pathNoExt = fileRel.replace(/\.[^.]+$/, '');
  // patterns: from './path', from '../path', require('./path'), import './path'
  const patterns = [];
  const variants = [];
  // base variants: ./base, /base, base (bare, unlikely but include)
  variants.push(`./${baseNoExt}`);
  variants.push(`../${baseNoExt}`);
  variants.push(`./${base}`);
  variants.push(`../${base}`);
  variants.push(`/${baseNoExt}`);
  variants.push(`/${base}`);
  // path variants (relative to root, e.g. src/editor/types)
  variants.push(`./${pathNoExt}`);
  variants.push(`../${pathNoExt}`);
  variants.push(`/${pathNoExt}`);
  for (const v of variants) {
    patterns.push(`from '${v}'`);
    patterns.push(`from "${v}"`);
    patterns.push(`require('${v}')`);
    patterns.push(`require("${v}")`);
    patterns.push(`import '${v}'`);
    patterns.push(`import "${v}"`);
  }
  return patterns;
}

const unused = [];
for (let i = 0; i < candidates.length; i++) {
  const cand = candidates[i];
  const patterns = buildPatterns(cand);
  let referenced = false;
  for (let j = 0; j < relFiles.length; j++) {
    if (j === i) continue;
    const content = references[j];
    for (const p of patterns) {
      if (content.includes(p)) {
        referenced = true;
        break;
      }
    }
    if (referenced) break;
  }
  if (!referenced) {
    unused.push(cand);
  }
}

console.log(unused.join('\n'));
