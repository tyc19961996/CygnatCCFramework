import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import typescript from 'typescript';

const sourcePath = path.join(process.cwd(), 'Core', 'bind', 'AutoBind.ts');
const source = await readFile(sourcePath, 'utf8');
const sourceWithoutRuntimeImports = source.replace(
  /^import[\s\S]*?ObjectPool";\r?\n/,
  `class Node {}\nclass Component {}\nclass CpmLikePool {}\nclass CpmPool {}\nclass NodePool {}`,
);
const { outputText } = typescript.transpileModule(sourceWithoutRuntimeImports, {
  compilerOptions: {
    module: typescript.ModuleKind.ESNext,
    target: typescript.ScriptTarget.ES2019,
  },
});
const { AutoBind } = await import(
  `data:text/javascript,${encodeURIComponent(outputText)}`,
);

class TestNode {
  constructor(name, children = []) {
    this.name = name;
    this.children = children;
    this.active = false;
  }
}

test('binds subclass fields after a parent class has been bound', () => {
  class GameUI {
    constructor(node) {
      this.node = node;
      this.$title = null;
    }
  }

  class ZhenHuanGameUI extends GameUI {
    constructor(node) {
      super(node);
      this.$background = null;
    }
  }

  const title = new TestNode('$title');
  const background = new TestNode('$background');
  const parent = new GameUI(new TestNode('root', [title]));
  const subclass = new ZhenHuanGameUI(new TestNode('root', [title, background]));

  AutoBind.bind(parent);
  AutoBind.bind(subclass);

  assert.equal(parent.$title, title);
  assert.equal(subclass.$title, title);
  assert.equal(subclass.$background, background);
});

test('uses the dollar sign for fields when nodes use a custom sign', () => {
  class CustomNodeSignUI {
    constructor(node) {
      this.node = node;
      this.$title = null;
    }
  }

  const atTitle = new TestNode('@title');
  const ui = new CustomNodeSignUI(new TestNode('root', [atTitle]));

  AutoBind.bind(ui, '@');

  assert.equal(ui.$title, atTitle);
});
