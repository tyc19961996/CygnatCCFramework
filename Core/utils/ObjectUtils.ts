

export class ObjectUtils {

    /**
     * 遍历验证target对象是否包含source对象的所有属性
     * 若target缺少某属性，则返回false。
     *若属性值为对象，则递归检查。
     *全部属性符合则返回true。
     * @param target 目标对象
     * @param source 对比对象
     * @returns 
     */
    public static containsAllProperties(target, source) {
        if (!this.isObject(target) || !this.isObject(source)) {
            return;
        }

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (!target.hasOwnProperty(key)) {
                    return false;
                }
                if (this.isObject(source[key]) && !this.containsAllProperties(target[key], source[key])) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * 将target中缺少的属性添加到target中遍历source对象的属性：
     * 如果target没有某个属性，则从source中复制该属性到target。
     * 如果属性值是对象，则递归调用自身以处理嵌套的对象属性。
     */
    public static addMissingProperties(target, source) {
        if (!this.isObject(target) || !this.isObject(source)) {
            return
        }

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (!target.hasOwnProperty(key)) {
                    target[key] = source[key];
                } else if (this.isObject(source[key])) {
                    this.addMissingProperties(target[key], source[key]);
                }
            }
        }
    }

    /**
     * 判断对象是否为对象
     * @param obj 
     * @returns 
     */
    public static isObject(obj) {
        return typeof obj === 'object' && obj !== null;
    }

    /**
     * 浅拷贝
     */
    public static shallowCopy(obj) {
        if (!obj) return obj;
        return JSON.parse(JSON.stringify(obj));
    }
}