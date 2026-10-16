#!/usr/bin/env node
/**
 * detect-unused.mjs — Scans the project for source files that are never
 * imported by any other file. Reports candidates for removal.
 *
 * Usage:  node detect-unused.mjs
 * Exit code 0 = clean, 1 = unused files found.
 */

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, 'src');
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'android', 'www', 'apks', '.git', 'e2e']);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const ENTRY_POINTS = new Set([
  'src/main.tsx',
  'src/App.tsx',
  'src/vite-env.d.ts',
]);

/** Collect every import path referenced across the source tree. */
function collectImportedPaths(dir, referenced) {
  for (const entry of walkDir(dir)) {
    if (!SOURCE_EXTENSIONS.has(extname(entry))) continue;
    const content = readFileSync(entry, 'utf-8');
    const imports = content.matchAll(/(?:import|export)\s+[^'"]*from\s+['"]([^'"]+)['"]/g);
    for (const m of imports) {
      const specifier = m[1];
      if (specifier.startsWith('.')) {
        const resolved = resolveRelative(specifier, entry);
        if (resolved) referenced.add(resolved);
      } else {
        referenced.add(specifier);
      }
    }
  }
}

function walkDir(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) results.push(...walkDir(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function resolveRelative(specifier, fromFile) {
  const dir = fromFile.substring(0, fromFile.lastIndexOf('/'));
  const candidates = [
    join(dir, specifier),
    join(dir, specifier + '.ts'),
    join(dir, specifier + '.tsx'),
    join(dir, specifier + '.js'),
    join(dir, specifier + '.jsx'),
    join(dir, specifier, 'index.ts'),
    join(dir, specifier, 'index.tsx'),
  ];
  for (const c of candidates) {
    try {
      statSync(c);
      return relative(ROOT, c);
    } catch {
      // try next candidate
    }
  }
  return null;
}

const referenced = new Set();
collectImportedPaths(SRC_DIR, referenced);

const allSourceFiles = walkDir(SRC_DIR).filter((f) =>
  SOURCE_EXTENSIONS.has(extname(f)),
);

const unused = allSourceFiles.filter((f) => {
  const rel = relative(ROOT, f);
  return !ENTRY_POINTS.has(rel) && !referenced.has(rel);
});

if (unused.length === 0) {
  console.log('✅ No unused source files detected.');
  process.exit(0);
}

console.log(`⚠️  Found ${unused.length} potentially unused source file(s):`);
for (const f of unused.sort()) {
  console.log(`  - ${relative(ROOT, f)}`);
}
process.exit(1);