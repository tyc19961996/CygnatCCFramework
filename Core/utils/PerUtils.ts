import { Log } from "./Logger/Log";

/**耗时时间单位 */
export class PerUtils {
    static get now() {
        if (performance?.now) {
            return performance.now();
        } else {
            return Date.now();
        }
    }
    private static time: number = 0;
    static start() {
        this.time = this.now;
    }
    static End(flag?: string, ...vlaue) {
        let time = this.now - this.time;
        Log(flag, vlaue, "执行时间ms：", time);
    }
}