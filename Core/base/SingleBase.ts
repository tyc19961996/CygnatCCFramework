
export class SingleBase<T extends SingleBase<T>> {
    private static _instances: Map<any, any> = new Map();

    public static Instance<T extends SingleBase<T>>(this: new () => T): T {
        if (!SingleBase._instances.has(this)) {
            SingleBase._instances.set(this, new this());
        }
        return SingleBase._instances.get(this);
    }
    constructor() {}
}
