import { Component,Node } from "cc";
import { CpmLinkPool as CpmLikePool, CpmPool, IObjectPool, NodePool } from "../pool/ObjectPool";

type Info = { full: string, clear: string, ext: string, }
type ArrDict<T> = Record<string, T[]>;
type InfoAD = ArrDict<Info>;
type InfoADs = { ppts: ArrDict<Info>; fns: ArrDict<Info>; }
type Hdlr<T = void> = (node:Node, obj: Object, info: Info) => T;
type Hdlrs = Record<string, Hdlr>;

type IAutoBinder = { node: Node; onAutoBindFin?(): void };
type IAutoBinderCtor<T extends IAutoBinder> = new (...args: any[]) => T;

export function autoBind(sign: string = '$'): ClassDecorator {
    return function <T extends IAutoBinder>(ctor: IAutoBinderCtor<T>) {
        const rsl = function (...args: any[]): T {
            const rsl = new ctor(...args);
            rsl.node = rsl.node || (args[0] instanceof Node ? args[0] : null);
            if (!rsl.node) return rsl;
            _bind(rsl, rsl.node, sign);
            rsl.onAutoBindFin && rsl.onAutoBindFin();
            return rsl;
        }
        for (const key in ctor){
            rsl[key] = ctor[key];
        }
        return rsl;
    } as ClassDecorator;
}

export const AutoBind = {
    autoBind,
    bind(obj: { node: Node }, sign = '$') { _bind(obj, obj.node, sign) },
    bindWith: _bind,
}

const onPoolRPPt: Hdlr<IObjectPool<any>> = (n, o, info) => { if (!_tryGetArgs(n, o, info, onPoolRPPtA)) return o[info.full] = new NodePool(n).toRecycable(); };
const onPoolRPPtA: Hdlr<IObjectPool<any>> = (n, o, info) => { return onPoolPPtA(n, o, info).toRecycable(); }
const onPoolPPt: Hdlr<IObjectPool<any>> = (n, o, info) => { if (!_tryGetArgs(n, o, info, onPoolPPtA)) return o[info.full] = new NodePool(n); };
const onPoolPPtA: Hdlr<IObjectPool<any>> = (n, o, info) => {
    const a: any[] = o[info.full];
    if (a.length <= 0) return new NodePool(n);
    const v = a[0];
    if (v.prototype instanceof Component) return new CpmPool(n.getComponent(v));
    if (typeof v === 'function') return new CpmLikePool(n, v);
}
const onNodePPt: Hdlr = (n, o, info) => { if (!_tryGetArgs(n, o, info, onNodePPtA)) o[info.full] = n; };
const onNodePPtA: Hdlr<Node | Component | { node: Node }> = (n, o, info) => {
    const a: any[] = o[info.full];
    if (a.length <= 0) return null;
    const v = a[0];
    if (typeof v === 'function') {
        if (!v.prototype) {
            if (a.length === 1) return v(n);
            a.shift();
            return v(n, ...a);
        }
        else if (v.prototype instanceof Component) return n.getComponent(v);
        else {
            if (a.length === 1) return new v(n);
            a.shift();
            return new v(n, ...a);
        }
    }
}

const onPos: Hdlr = (n, o, info) => { o[info.full] = n.position; };
const onNodeFn: Hdlr = (n, o, info) => { o[info.full](n); };
function show(n: Node) { n.active = true; }
function showcs(n: Node) { n.children.forEach(show); }
function hide(n: Node) { n.active = false; }
function hidecs(n: Node) { n.children.forEach(hide); }

const pptHdls: Hdlrs = {
    '': onNodePPt,
    'n': onNodePPt,
    'node': onNodePPt,
    'pos': onPos,
    'pool': onPoolPPt,
    'poolr': onPoolRPPt,
};
const fnHdls: Hdlrs = {
    '': onNodeFn,
    'n': onNodeFn,
    'node': onNodeFn,
    'cs': (n, o, info) => { o[info.full](n.children); },
    'show': show,
    'csshow': showcs,
    'showcs': showcs,
    'hide': hide,
    'hidecs': hidecs,
    'cshide': hidecs,
    'te': (n, o, info) => { n.on(Node.EventType.TOUCH_END, o[info.full], o); },
    'ts': (n, o, info) => { n.on(Node.EventType.TOUCH_START, o[info.full], o); },
    'tm': (n, o, info) => { n.on(Node.EventType.TOUCH_MOVE, o[info.full], o); },
    'tc': (n, o, info) => { n.on(Node.EventType.TOUCH_CANCEL, o[info.full], o); },
};
export const propertyHandlers = pptHdls;
export const functionHandlers = fnHdls;

function _tryGetArgs<T>(n: Node, o: Object, info: Info, onArray: Hdlr<T>) {
    const v = o[info.full];
    if (!v || !Array.isArray(v)) return false;
    o[info.full] = onArray(n, o, info);
    return true;
}

function _bind(obj: Object, node: Node, sign: string = '$') {
    const ds = _collObj(obj, '$');
    const ns = _collNodesD(node, sign, []);
    ds.ppts['self'] && _handle(node, obj, ds.ppts['self'], pptHdls);
    for (let i = 0; i < ns.length; i++) _tryHandle(ns[i], obj, ds.ppts, pptHdls);
    ds.fns['self'] && _handle(node, obj, ds.fns['self'], fnHdls);
    for (let i = 0; i < ns.length; i++) _tryHandle(ns[i], obj, ds.fns, fnHdls);
}

function _collNodesW(root: Node, sign: string): Node[] {
    const stack: Node[][] = [[root]];
    const result: Node[] = [];
    let pt = 0;

    while (pt < stack.length) {
        const nodes = stack[pt++];
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.name.startsWith(sign)) result.push(node);
            if (node.children.length > 0) stack.push(node.children);
        }
    }

    return result;
}

function _collNodesD(node: Node, sign: string, arr: Node[]): Node[] {
    if (node.name.startsWith(sign)) arr.push(node);
    const cs = node.children;
    for (let i = 0; i < cs.length; i++)
        _collNodesD(cs[i], sign, arr);
    return arr;
}

function _tryHandle(node: Node, obj: Object, infoD: InfoAD, hdls: Hdlrs) {
    const infos = infoD[node.name.slice(1)];
    if (!infos) return;
    _handle(node, obj, infos, hdls);
}
function _handle(node: Node, obj: Object, infos: Info[], hdls: Hdlrs) {
    for (let i = 0; i < infos.length; i++) {
        const info = infos[i];
        const hdl = hdls[info.ext] || hdls[''];
        hdl(node, obj, info);
    }
}

function _collObj(obj: Object, sign: string): InfoADs {
    if (obj.constructor === Object) return _collObjDict(obj, sign);
    return obj.constructor['__AB_DICT__'] || (obj.constructor['__AB_DICT__'] = _collObjDict(obj, sign));
}

class _ { _() { } }
const _collObjDict = Object.getOwnPropertyDescriptor(_.prototype, '_')?.enumerable ? _collObjDictE : _collObjDictNE;

function _collObjDictE(obj: Object, sign: string) {
    const ds: InfoADs = { ppts: {}, fns: {} };
    for (const key in obj) {
        if (!key.startsWith(sign)) continue;
        const v = obj[key];
        if (!v) _key2Info(key, 1, ds.ppts);
        else if (typeof v === 'function') _key2Info(key, 4, ds.fns);
        else _key2Info(key, 1, ds.ppts);
    }
    return ds;
}

function _collObjDictNE(obj: Object, sign: string) {
    const ds: InfoADs = { ppts: {}, fns: {} };
    let p = obj;
    while (p) {
        _collObjDictWithNames(Object.getOwnPropertyNames(p), obj, sign, ds);
        p = p['__proto__'];
    }
    return ds;
}

function _collObjDictWithNames(keys: string[], obj: Object, sign: string, ds: InfoADs) {
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (!key.startsWith(sign)) continue;
        const v = obj[key];
        if (!v) _key2Info(key, 1, ds.ppts);
        else if (typeof v === 'function') _key2Info(key, 4, ds.fns);
        else _key2Info(key, 1, ds.ppts);
    }
}

function _key2Info(key: string, start: number, dicts: ArrDict<Info>) {
    const i = key.indexOf('_', start);
    const info: Info = i === -1 ? { full: key, clear: key.slice(start), ext: '' }
        : { full: key, clear: key.slice(start, i), ext: key.slice(i + 1) };
    (dicts[info.clear] || (dicts[info.clear] = [])).push(info);
}
