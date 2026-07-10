import { _decorator } from 'cc';
import { ClassPool, IObjectPool } from "../pool/ObjectPool";
type EvTuple3<T> = [OnValueChange<T>, object, boolean];
type EvTuple2<T> = [OnValueChange<T>, object];
type Info = { readonly onwer: object; readonly name: string; }
export type OnValueChange<T> = (nv: T, ov: T, obs: IObserver<T>) => void;
export interface IReadonlyObserver<T> {
    readonly value: T;
    readonly info?: Info;
    on(cb: OnValueChange<T>, target?: object);
    off(cb: OnValueChange<T>, target?: object);
    once(cb: OnValueChange<T>, target?: object);
    listen(isOn: boolean, cb: OnValueChange<T>, target?: object);
    listenAndOn(isOn: boolean, cb: OnValueChange<T>, target?: object);
}
export interface IObserver<T> extends IReadonlyObserver<T> {
    value: T;
    info?: Info;
}

export class Observer<T> implements IObserver<T>{
    private static _pool: IObjectPool<Observer<any>> = new ClassPool(Observer);
    public static create<T>(t: T) { const o = this._pool.pop(); o._value = t; return o; }
    public static recyle(v: Observer<any>) { v.dispose(); this._pool.push(v); }
    public static recyleWith(obj: Object) {
        for (const key in obj) {
            const v = obj[key];
            if (!v || v.constructor !== Observer) continue;
            obj[key] = undefined;
            this.recyle(v);
        }
    }
    public static bindWith<T extends Object = Object>(obj: T): T {
        for (const key in obj) {
            const v = obj[key];
            if (!(v instanceof Observer)) continue;
            v.info = { onwer: obj, name: key };
        }
        return obj;
    }
    constructor(t?: T) { this._value = t; }
    public get value(): T { return this._value; }
    public set value(t: T) { if (t === this._value) return; this._emit(t); }
    protected _value: T;
    public info?: Info;
    private _es: EvTuple3<T>[] = [];
    private _eos?: EvTuple2<T>[];
    protected _emit(t: T) {
        const ov = this._value;
        this._value = t;
        const es = this._es;
        if (es.length) {
            for (let i = 0; i < es.length; i++) {
                const ev = es[i];
                if (!ev[2]) { es.splice(i--, 1); continue; }
                ev[0].call(ev[1], t, ov, this);
            }
        }
        const eos = this._eos;
        if (eos && eos.length) {
            for (let i = 0; i < eos.length; i++) {
                const ev = eos[i];
                ev[0].call(ev[1], t, ov, this);
            }
            eos.length = 0;
        }
    }
    public on(cb: OnValueChange<T>, target?: object) {
        this._es.push([cb, target, true]);
    }
    public off(cb: OnValueChange<T>, target?: object) {
        const es = this._es;
        for (let i = 0; i < es.length; i++) {
            const ev = es[i];
            if (ev[0] === cb && ev[1] === target && ev[2]) {
                ev[2] = false;
                return;
            }
        }
    }
    public once(cb: OnValueChange<T>, target?: object) {
        (this._eos || (this._eos = [])).push([cb, target]);
    }
    public listen(isOn: boolean, cb: OnValueChange<T>, target?: object) {
        isOn ? this.on(cb, target) : this.off(cb, target);
    }
    public listenAndOn(isOn: boolean, cb: OnValueChange<T>, target?: object) {
        isOn ? this.on(cb, target) : this.off(cb, target);
        isOn && cb.call(target, this._value, this._value, this);
    }
    public dispose() {
        this._value = this.info = this._eos = undefined;
        this._es.length = 0;
    }
}


