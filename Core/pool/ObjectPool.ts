import { _decorator, Node, Component, instantiate } from 'cc';
export interface IObjectPoolR<T> extends IObjectPool<T> {
    using: T[];
    recyleAll();
}
export interface IObjectPool<T> {
    cache: T[];
    pop(): T;
    push(t: T);
    toRecycable();
    addOnPop(onPop: (t: T) => void);
    addOnPush(onPop: (t: T) => void);
}
export abstract class AObjectPool<T> implements IObjectPool<T>{
    public pop(): T { return this._pop(); };
    public push(t: T) { this._push(t); }
    private _pop(): T {
        let t: T;
        if (this._cache.length > 0) t = this._cache.pop();
        else t = this._onCreate();
        this._onPop(t);
        return t;
    }
    private _push(t: T) {
        this._onPush(t);
        this._cache.push(t);
    }
    private _popR(t: T) { this._using.push(t); };
    private _pushR(t: T) {
        this._push(t);
        const i = this._using.indexOf(t);
        if (i > -1) this._using.splice(i, 1);
    }
    public recyleAll() {
        const using = this._using;
        for (let i = 0; i < using.length; i++)
            this._push(using[i]);
        using.length = 0;
    }
    public get cache() { return this._cache; }
    private get using() { return this._using; }
    private _cache: T[] = [];
    private _using: T[];
    public toRecycable(): IObjectPoolR<T> {
        if (this._using) return this as any as IObjectPoolR<T>;
        this._using = [];
        this.addOnPop(this._popR);
        this.addOnPush(this._pushR);
        return this as any as IObjectPoolR<T>;
    }
    public addOnPop(onPop: (t: T) => void) {
        const o = this.pop;
        this.pop = function () {
            const t = o.call(this);
            onPop.call(this, t);
            return t;
        }
    }
    public addOnPush(onPush: (t: T) => void) {
        const o = this.push;
        this.push = function (t: T) {
            o.call(this, t);
            onPush(t);
        }
    }
    protected abstract _onCreate(): T;
    protected _onPop(t: T) { }
    protected _onPush(t: T) { }
}

export class ClassPool<T> extends AObjectPool<T>{
    constructor(public readonly ctor: new () => T) { super(); }
    protected _onCreate(): T { return new this.ctor(); }
}

export class NodePool extends AObjectPool<Node>{
    constructor(public readonly node: Node, public root?: Node) {
        super(); node.active = false;
        if (!root) this.root = node.parent;
    }
    protected _onCreate(): Node {
        const n = instantiate(this.node);
        n.parent = this.root; return n;
    }
    protected _onPop(t: Node) { t.active = true; }
    protected _onPush(t: Node) { t.active = false; }
    public setIndexOnPop(si = 0) { this.addOnPop(v => v.setSiblingIndex(si)); }
}

export class CpmPool<T extends Component> extends AObjectPool<T>{
    constructor(public readonly cpm: T, public root?: Node) {
        super(); cpm.node.active = false;
        if (!root) this.root = cpm.node.parent;
    }
    protected _onCreate(): T {
        const n = instantiate(this.cpm.node);
        n.parent = this.root;
        return n.getComponent(this.cpm.constructor as any);
    }
    protected _onPop(t: T) { t.node.active = true; }
    protected _onPush(t: T) { t.node.active = false; }
    public setIndexOnPop(si = 0) { this.addOnPop(v => v.node.setSiblingIndex(si)); }
}

export class CpmLinkPool<T extends { node: Node }> extends AObjectPool<T>{
    private node: Node;
    constructor(node: Node, public readonly ctor: new (node: Node) => T, public root?: Node) {
        super(); node.active = false;
        this.node = instantiate(node);
        if (!root) this.root = node.parent;
    }
    protected _onCreate(): T {
        if (this.node == null) {
            console.log("node is null");
        }
        const n = instantiate(this.node);
        n.parent = this.root;
        return new this.ctor(n);
    }
    protected _onPop(t: T) { t.node.active = true; }
    protected _onPush(t: T) { t.node.active = false; }
    public setIndexOnPop(si = 0) { this.addOnPop(v => v.node.setSiblingIndex(si)); }
}


