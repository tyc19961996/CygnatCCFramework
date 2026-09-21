import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const groupSource = await readFile(path.join(process.cwd(), 'UI', 'core', 'WindowGroup.ts'), 'utf8');
const baseSource = await readFile(path.join(process.cwd(), 'UI', 'window', 'WindowBase.ts'), 'utf8');

function methodBody(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing method marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test('new windows stay inactive while asynchronous header preparation is pending', () => {
  const createWindow = methodBody(groupSource, 'private async createWindow', 'private processWindowHideStatus');
  const deactivate = createWindow.indexOf('window.active = false;');
  const addChild = createWindow.indexOf('this._root.addChild(windowBase.node);');
  const requestHeader = createWindow.indexOf('await HeaderManager.requestHeader');

  assert.ok(deactivate >= 0, 'the instantiated node must be made inactive');
  assert.ok(deactivate < addChild, 'the node must be inactive before it enters the scene tree');
  assert.ok(addChild < requestHeader, 'the test must cover the asynchronous gap after addChild');
});

test('opening transition state is prepared before the window node is activated', () => {
  const show = methodBody(baseSource, 'public _show(', 'public _hide()');
  const activate = show.indexOf('this.node.active = true;');
  const scaleStart = show.indexOf('this.node.setScale(0, 0, sz);');
  const fadeStart = show.indexOf('op.opacity = 0;');
  const opacityReset = show.indexOf('op.opacity = 255;');

  assert.ok(activate >= 0, 'the window must be activated during show');
  assert.ok(scaleStart >= 0 && scaleStart < activate, 'scale start state must precede activation');
  assert.ok(fadeStart >= 0 && fadeStart < activate, 'fade start state must precede activation');
  assert.ok(opacityReset >= 0 && opacityReset < activate, 'no-transition opacity reset must precede activation');
});
