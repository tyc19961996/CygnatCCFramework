import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const readSource = (relativePath) => readFile(path.join(process.cwd(), ...relativePath), 'utf8');
const [windowBaseSource, windowGroupSource, windowManagerSource, headerManagerSource] = await Promise.all([
  readSource(['UI', 'window', 'WindowBase.ts']),
  readSource(['UI', 'core', 'WindowGroup.ts']),
  readSource(['UI', 'core', 'WindowManager.ts']),
  readSource(['UI', 'core', 'HeaderManager.ts']),
]);

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing section marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing section end marker: ${endMarker}`);
  return source.slice(start, end);
}

test('the animated window no longer owns the full-screen swallow node', () => {
  const init = section(windowBaseSource, 'public _init(', 'public _adapted()');
  const adapted = section(windowBaseSource, 'public _adapted()', 'private _captureBaseScale');

  assert.doesNotMatch(init, /BlockInputEvents|this\.node\.addChild\(bgNode\)|_swallowNode/);
  assert.doesNotMatch(adapted, /_swallowNode/);
});

test('a window group owns one inactive full-screen swallow graph', () => {
  const constructor = section(windowGroupSource, 'constructor(', 'public async showWindow');

  assert.match(windowGroupSource, /private _swallowGraph: Node = null;/);
  assert.match(constructor, /new Node\("swallow"\)/);
  assert.match(constructor, /addComponent\(UITransform\)/);
  assert.match(constructor, /addComponent\(BlockInputEvents\)/);
  assert.match(constructor, /this\._root\.addChild\(this\._swallowGraph\)/);
  assert.match(constructor, /this\._swallowGraph\.active = false;/);
});

test('swallow placement reads the current top-window index and hides for an empty group', () => {
  const adjust = section(windowGroupSource, 'public adjustSwallowGraph()', 'public async showWindow');

  assert.match(adjust, /if \(!this\._swallowGraph \|\| this\.size === 0\)/);
  assert.match(adjust, /this\._swallowGraph\.active = false;/);
  assert.match(adjust, /const windowIndex = windowNode\.getSiblingIndex\(\);/);
  assert.match(adjust, /this\._swallowGraph\.setSiblingIndex\(newIndex\);/);
});

test('overlay adjustment always runs alpha, swallow, then header depth', () => {
  const adjust = section(windowManagerSource, 'public static adjustOverlayLayers()', 'public static releaseUnusedRes');
  const alpha = adjust.indexOf('this.adjustAlphaGraph();');
  const swallow = adjust.indexOf('group.adjustSwallowGraph();');
  const header = adjust.indexOf('HeaderManager.adjustHeaderDepths();');

  assert.ok(alpha >= 0, 'alpha graph adjustment is required');
  assert.ok(swallow > alpha, 'swallow graphs must move after the alpha graph');
  assert.ok(header > swallow, 'headers must be normalized after all overlay nodes');
  assert.match(headerManagerSource, /public static adjustHeaderDepths\(\): void/);
});
