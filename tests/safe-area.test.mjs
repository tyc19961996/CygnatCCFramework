import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import typescript from 'typescript';

const sourcePath = path.join(process.cwd(), 'Core', 'engine', 'SafeArea.ts');
const source = await readFile(sourcePath, 'utf8');
const { outputText } = typescript.transpileModule(source, {
  compilerOptions: {
    module: typescript.ModuleKind.ESNext,
    target: typescript.ScriptTarget.ES2019,
  },
});
const { calculateSafeAreaFrame, calculateSafeAreaInsets } = await import(
  `data:text/javascript,${encodeURIComponent(outputText)}`,
);

test('calculates a portrait safe-area frame with a top inset', () => {
  assert.deepEqual(
    calculateSafeAreaFrame(1080, 2400, { top: 60, bottom: 0, left: 0, right: 0 }),
    { width: 1080, height: 2340, offsetX: 0, offsetY: -30 },
  );
});

test('calculates a landscape safe-area frame with a left inset', () => {
  assert.deepEqual(
    calculateSafeAreaFrame(2400, 1080, { top: 0, bottom: 0, left: 60, right: 0 }),
    { width: 2340, height: 1080, offsetX: 30, offsetY: 0 },
  );
});

test('calculates a safe-area frame with asymmetric insets', () => {
  assert.deepEqual(
    calculateSafeAreaFrame(2400, 1080, { top: 20, bottom: 10, left: 15, right: 25 }),
    { width: 2360, height: 1050, offsetX: -5, offsetY: -5 },
  );
});

test('derives portrait insets from a safe-area rectangle', () => {
  assert.deepEqual(
    calculateSafeAreaInsets(1080, 2400, { x: 0, y: 0, width: 1080, height: 2340 }),
    { top: 60, bottom: 0, left: 0, right: 0 },
  );
});

test('derives asymmetric horizontal insets from a safe-area rectangle', () => {
  assert.deepEqual(
    calculateSafeAreaInsets(2400, 1080, { x: 60, y: 10, width: 2300, height: 1050 }),
    { top: 20, bottom: 10, left: 60, right: 40 },
  );
});
