import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';

function block(marker, lines, indent = '') {
    return [indent + `// <cygnat-harmony-account:${marker}>`, ...lines, indent + `// </cygnat-harmony-account:${marker}>`].join('\n');
}
function patch(name, marker, anchor, position, lines, forbidden, indent = '') {
    return { name, marker, anchor, position, forbidden, block: block(marker, lines, indent) };
}
export function accountPatches() {
    const patches = {
        page: [
            patch('账号 UI 导入', 'page-import', "import { PortProxy } from '../common/PortProxy';", 'after', ["import { handleHarmonyAccountRequest, disposeHarmonyAccount } from '@cygnat/harmony-ads';"], ['handleHarmonyAccountRequest']),
            patch('账号 UI 消息', 'page-case', '        case "exitGame": {', 'before', [
                '        case "cygnatAccountRequest": {',
                '          handleHarmonyAccountRequest(getContext(this) as common.UIAbilityContext, msg.param as string, (json: string): void => {',
                '            this.workPort.postMessage("cygnatAccountEvent", json);',
                '          });', '          break;', '        }',
            ], ['cygnatAccountRequest'], '        '),
            patch('账号 UI 清理', 'page-dispose', '  aboutToDisappear(): void {', 'after', ['    disposeHarmonyAccount();'], ['disposeHarmonyAccount()'], '    '),
        ],
        worker: [
            patch('账号 Worker 导入', 'worker-import', "import { PortProxy } from '../common/PortProxy';", 'after', ["import { configureHarmonyAccountWorker, enqueueHarmonyAccountEvent } from '@cygnat/harmony-ads/Worker';"], ['configureHarmonyAccountWorker']),
            patch('账号 Worker 配置', 'worker-setup', 'let uiPort = new PortProxy(worker.workerPort);', 'after', [
                'configureHarmonyAccountWorker((json: string): void => {', '  uiPort.postMessage("cygnatAccountRequest", json);', '});',
            ], ['cygnatAccountRequest']),
            patch('账号 Worker 事件', 'worker-case', '    case "backPress":', 'before', [
                '    case "cygnatAccountEvent":', '      enqueueHarmonyAccountEvent(msg.param as string);', '      break;',
            ], ['cygnatAccountEvent'], '    '),
        ],
        ability: [
            patch('UIAbility 账号导入', 'ability-import', 'export default class EntryAbility extends UIAbility {', 'before', [
                "import { initializeHarmonyAccount } from '@cygnat/harmony-ads';",
            ], ['initializeHarmonyAccount']),
            patch('页面加载后初始化账号', 'ability-init', "windowStage.loadContent('pages/index', (err, data) => {", 'after', [
                '      console.info("[CygnatAccount] stage=ability-callback code=" + (err && typeof err.code === "number" ? err.code : 0));',
                '      if (!err || !err.code) {',
                '        initializeHarmonyAccount(this.context, cygnatAccountLifecycle).catch(() => {',
                '          console.error("鸿蒙游戏服务初始化失败，请检查公开 ID、签名指纹与服务配置");',
                '        });', '      }',
            ], ['initializeHarmonyAccount(this.context'], '      '),
            patch('UIAbility 生命周期导入', 'ability-lifecycle-import', 'export default class EntryAbility extends UIAbility {', 'before', [
                "import { disposeHarmonyAccountFromAbility, getHarmonyAccountLifecycleGeneration } from '@cygnat/harmony-ads/Worker';",
            ], ['disposeHarmonyAccountFromAbility', 'getHarmonyAccountLifecycleGeneration']),
            patch('页面加载前记录生命周期', 'ability-generation', "windowStage.loadContent('pages/index', (err, data) => {", 'before', [
                '    const cygnatAccountLifecycle = getHarmonyAccountLifecycleGeneration();',
            ], ['const cygnatAccountLifecycle'], '    '),
            patch('UIAbility 销毁账号初始化', 'ability-dispose', 'export default class EntryAbility extends UIAbility {', 'after', [
                '  onWindowStageDestroy(): void {', '    disposeHarmonyAccountFromAbility();', '  }',
            ], ['disposeHarmonyAccountFromAbility()'], '  '),
        ],
    };
    // 只升级框架原样生成的旧托管块，继续拒绝用户修改的块。
    const diagnosticBlock = patches.ability[1].block.replace('this.context, cygnatAccountLifecycle', 'this.context');
    patches.ability[1].legacyBlocks = [diagnosticBlock, diagnosticBlock.split('\n').filter((line) => !line.includes('stage=ability-callback')).join('\n')];
    return patches;
}

/** 仅解析 JSON5 数据，不执行宿主文件；保留节点位置用于最小文本修改。 */
function parseJson5(text) {
    let i = 0;
    function skip() {
        for (;;) {
            while (/\s/.test(text[i] || '') && i < text.length) i++;
            if (text.slice(i, i + 2) === '//') { const end = text.indexOf('\n', i); i = end < 0 ? text.length : end + 1; }
            else if (text.slice(i, i + 2) === '/*') { const end = text.indexOf('*/', i + 2); if (end < 0) throw Error('JSON5 注释未闭合'); i = end + 2; }
            else return;
        }
    }
    function string() {
        const quote = text[i++]; let value = '';
        while (i < text.length) {
            const c = text[i++]; if (c === quote) return value;
            if (c !== '\\') { value += c; continue; }
            const e = text[i++];
            const escapes = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0' };
            if (e === 'u' || e === 'x') {
                const count = e === 'u' ? 4 : 2; const digits = text.slice(i, i + count);
                if (!new RegExp(`^[0-9a-fA-F]{${count}}$`).test(digits)) throw Error('JSON5 转义无效');
                value += String.fromCharCode(parseInt(digits, 16)); i += count;
            } else value += escapes[e] ?? e;
        }
        throw Error('JSON5 字符串未闭合');
    }
    function value() {
        skip(); const start = i; let data; let entries;
        if (text[i] === '{') {
            i++; data = {}; entries = new Map(); skip();
            while (text[i] !== '}') {
                skip(); let key;
                if (text[i] === '"' || text[i] === "'") key = string();
                else { const match = /^[A-Za-z_$][\w$]*/.exec(text.slice(i)); if (!match) throw Error('JSON5 属性无效'); key = match[0]; i += key.length; }
                skip(); if (text[i++] !== ':') throw Error('JSON5 属性缺少冒号');
                if (entries.has(key)) throw Error('JSON5 存在重复属性：' + key);
                const node = value(); entries.set(key, node); Object.defineProperty(data, key, { value: node.data, enumerable: true });
                skip(); if (text[i] === ',') { i++; skip(); } else if (text[i] !== '}') throw Error('JSON5 对象缺少逗号');
            }
            i++;
        } else if (text[i] === '[') {
            i++; data = []; entries = []; skip();
            while (text[i] !== ']') {
                const node = value(); entries.push(node); data.push(node.data); skip();
                if (text[i] === ',') { i++; skip(); } else if (text[i] !== ']') throw Error('JSON5 数组缺少逗号');
            }
            i++;
        } else if (text[i] === '"' || text[i] === "'") data = string();
        else {
            const match = /^(?:true|false|null|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/.exec(text.slice(i));
            if (!match) throw Error('JSON5 值无效');
            data = JSON.parse(match[0]); i += match[0].length;
        }
        return { start, end: i, data, entries };
    }
    const result = value(); skip(); if (i !== text.length) throw Error('JSON5 存在尾部内容'); return result;
}

function isCodePosition(text, position) {
    let quote = '', comment = '';
    for (let index = 0; index < position; index++) {
        const c = text[index], next = text[index + 1];
        if (comment === '//') { if (c === '\n') comment = ''; continue; }
        if (comment === '/*') { if (c === '*' && next === '/') { comment = ''; index++; } continue; }
        if (quote) { if (c === '\\') index++; else if (c === quote) quote = ''; continue; }
        if (c === '/' && (next === '/' || next === '*')) { comment = '/' + next; index++; }
        else if (c === "'" || c === '"' || c === '`') quote = c;
    }
    return !quote && !comment;
}

export async function resolveAccountAbility(project) {
    const main = path.join(project, 'native/engine/harmonyos-next/entry/src/main');
    const root = parseJson5(await readFile(path.join(main, 'module.json5'), 'utf8'));
    const module = root.entries?.get('module')?.data;
    if (!module || !Array.isArray(module.abilities)) throw Error('module 必须声明 abilities');
    const name = module.mainElement ?? 'EntryAbility';
    const candidates = module.abilities.filter((ability) => ability?.name === name);
    if (name !== 'EntryAbility' || candidates.length !== 1) throw Error('无法定位唯一的 Creator EntryAbility 主入口');
    const srcEntry = candidates[0].srcEntry;
    if (typeof srcEntry !== 'string' || !/^\.\/ets\/entryability\/EntryAbility\.(?:ets|ts)$/.test(srcEntry)) {
        throw Error('EntryAbility.srcEntry 必须明确指向允许的 .ts 或 .ets 宿主入口');
    }
    const file = path.resolve(main, srcEntry);
    const mainReal = await realpath(main);
    const fileReal = await realpath(file);
    const relative = path.relative(mainReal, fileReal);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw Error('EntryAbility 实际路径超出 entry/src/main，拒绝接线');
    const text = (await readFile(file, 'utf8')).replace(/\r\n/g, '\n');
    const classes = [...text.matchAll(/^export default class EntryAbility extends UIAbility \{/gm)]
        .filter((match) => isCodePosition(text, match.index));
    if (classes.length !== 1) throw Error('宿主缺少唯一的 Creator EntryAbility 类模板');
    const pattern = /^([ \t]*)(windowStage\.loadContent\((['"])pages\/index\3, \(err, data\) => \{)/gm;
    const anchors = [...text.matchAll(pattern)].filter((match) => isCodePosition(text, match.index + match[1].length));
    if (anchors.length !== 1) throw Error('页面加载回调缺少唯一的允许单引号或双引号模板锚点');
    const outside = text.replace(/\/\/ <cygnat-harmony-account:[^>]+>[\s\S]*?\/\/ <\/cygnat-harmony-account:[^>]+>/g, (block) => block.replace(/[^\n]/g, ' '));
    const destroyNames = [...outside.matchAll(/\bonWindowStageDestroy\b/g)]
        .filter((match) => isCodePosition(outside, match.index));
    const destroys = [...outside.matchAll(/\b(onWindowStageDestroy\s*\(\s*\)\s*(?::\s*void\s*)?\{)/g)]
        .filter((match) => isCodePosition(outside, match.index));
    if (destroyNames.length > 1 || destroys.length !== destroyNames.length) throw Error('UIAbility 销毁回调重复或签名未知，拒绝接线');
    return { relativePath: path.relative(project, file), anchor: anchors[0][2], disposeAnchor: destroys[0]?.[1] };
}

export async function analyzeAccountMetadata(project, account, previous) {
    const file = path.join(project, 'native/engine/harmonyos-next/entry/src/main/module.json5');
    const text = await readFile(file, 'utf8');
    const root = parseJson5(text); const module = root.entries?.get('module');
    if (!(module?.entries instanceof Map)) throw Error('找不到唯一 module 对象');
    const edits = [];
    function append(node, values) {
        if (!values.length) return;
        const hasItems = node.entries.size > 0 || node.entries.length > 0;
        // 从最后一个值之后插入，让原有尾逗号与注释仍保持合法。
        const nodes = node.entries instanceof Map ? [...node.entries.values()] : node.entries;
        const at = hasItems ? nodes.at(-1).end : node.start + 1;
        edits.push({ start: at, end: at, text: (hasItems ? ',' : '') + '\n' + values.join(',\n') });
    }
    const metadata = module.entries.get('metadata');
    const additions = [];
    if (metadata && !Array.isArray(metadata.entries)) throw Error('metadata 必须是数组');
    for (const [name, expected, oldValue] of [['app_id', account.appId, previous?.appId], ['client_id', account.clientId, previous?.clientId]]) {
        const matches = metadata ? metadata.entries.filter((n) => n.data?.name === name) : [];
        if (matches.length > 1) throw Error('metadata 存在重复 ' + name);
        if (matches.length === 0) additions.push(JSON.stringify({ name, value: expected }));
        else if (matches[0].data.value !== expected) {
            if (!oldValue || matches[0].data.value !== oldValue) throw Error('未托管或已修改的 ' + name + ' 与公开参数冲突');
            const node = matches[0].entries.get('value'); edits.push({ start: node.start, end: node.end, text: JSON.stringify(expected) });
        }
    }
    const properties = [];
    if (metadata) append(metadata, additions);
    else properties.push('"metadata": [' + additions.join(',') + ']');
    const permissions = module.entries.get('requestPermissions');
    if (permissions && !Array.isArray(permissions.entries)) throw Error('requestPermissions 必须是数组');
    const internet = permissions ? permissions.entries.filter((n) => n.data?.name === 'ohos.permission.INTERNET') : [];
    if (internet.length > 1) throw Error('重复 INTERNET 权限');
    if (!internet.length) {
        const permission = JSON.stringify({ name: 'ohos.permission.INTERNET' });
        if (permissions) append(permissions, [permission]); else properties.push('"requestPermissions": [' + permission + ']');
    }
    append(module, properties);
    let contents = text;
    for (const edit of edits.sort((a, b) => b.start - a.start)) contents = contents.slice(0, edit.start) + edit.text + contents.slice(edit.end);
    parseJson5(contents);
    return contents === text ? null : { path: file, contents };
}
