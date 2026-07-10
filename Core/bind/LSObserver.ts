
import { _decorator } from 'cc';
import { IObserver, Observer } from "./Observer";
const dict = {};
export abstract class LSObserver<T = string> extends Observer<T>{
    public static save(obs: IObserver<any>) { if (obs instanceof LSObserver) obs.save(); }
    public static createWith<T>(type: 'json' | 'string' | 'number' | 'boolean', lsKey: string, defaultValue?: string): IObserver<T> {
        return new dict[type](lsKey, defaultValue);
    }
    public static getLS(key: string): string { return localStorage.getItem(key); }
    public static setLS(key: string, value: string) { localStorage.setItem(key, JSON.stringify(value)); }
    constructor(private readonly lsKey: string, defaultValue?: string) {
        super();
        this._value = this._serialize(LSObserver.getLS(lsKey) || defaultValue);
    }
    protected _serialize(v: string): T { return v as T; }
    protected _deserialize(v: T): string { return v as string; }
    protected _emit(t: T) { this.save(t); super._emit(t); }
    public load() { this._value = this._serialize(LSObserver.getLS(this.lsKey)); }
    public save(t: T = this._value) { LSObserver.setLS(this.lsKey, this._deserialize(t)); }
}


export class BooleanLSObserver extends LSObserver<boolean>{
    protected _serialize(v: string): boolean { return v === '1'; }
    protected _deserialize(v: boolean): string { return v ? '1' : '0'; }
}

export class NumberLSObserver extends LSObserver<number>{
    protected _serialize(v: string): number { return +v; }
    protected _deserialize(v: number): string { return v + ''; }
}

export class StringLSObserver extends LSObserver<string>{
    protected _serialize(v: string): string { return v; }
    protected _deserialize(v: string): string { return v; }
}

export class JSONLSObserver<T extends object> extends LSObserver<T>{
    constructor(lsKey: string, defaultValue?: string) {
        super(lsKey, defaultValue);
        this._bind(this._value);
    }
    private __value: T;
    public get value(): T { return this._value; }
    public set value(t: T) {
        if (t === this._value) return;
        if (t === this.__value) return;
        this._bind(t);
        this._emit(t);
    }
    private _bind(t: T) { this.__value = t; this._value = new Proxy(t, this._hdl); }
    private _hdl: ProxyHandler<T> = {
        set: (target: T, p: string | symbol, newValue: any, receiver: any) => {
        target[p] = newValue;
        this.save(target);
        return true;
        }
    }
    protected _serialize(v: string): T { return JSON.parse(v); }
    protected _deserialize(v: T): string { return JSON.stringify(v); }
}

dict['string'] = LSObserver;
dict['number'] = NumberLSObserver;
dict['boolean'] = BooleanLSObserver;
dict['json'] = JSONLSObserver;

