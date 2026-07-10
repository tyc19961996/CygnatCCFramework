// /**公共工具类*/

import { _decorator,  Node, tween, v3, Tween, UITransform, Enum } from 'cc';

export class Utils {
    //#region 数字类
    static changNum(num: number, count: number = 2): string {
        if (num < 1000) {
            return Math.floor(num).toString();
        } else if (num < 1000000) {
            let str = (num / 1000).toFixed(count);
            if (str[str.length - 1] == "0" && str[str.length - 2] == "0") {
                str = Math.floor(Number(str)).toString();
            }
            return str + "k";
        } else if (num < 1000000000) {
            let str = (num / 1000000).toFixed(count);
            if (str[str.length - 1] == "0" && str[str.length - 2] == "0") {
                str = Math.floor(Number(str)).toString();
            }
            return str + "m";
        } else {
            let str = (num / 1000000000).toFixed(count);
            if (str[str.length - 1] == "0" && str[str.length - 2] == "0") {
                str = Math.floor(Number(str)).toString();
            }
            return str + "b";
        }
    }

    public static eftIn(content: Node, callback = null) {
        content.setScale(0, 0);

        Tween.stopAllByTarget(content);
        tween(content)
            .to(0.2, { scale: v3(1, 1) }, { easing: 'backOut' })
            .call(() => {
                callback && callback();
            })
    }
    //    /**浮点数随机值区间*/
    public static randomFloat(min, max?) {
        if (min instanceof Array) {
            let list = min;
            min = parseInt(list[0]);
            max = parseInt(list[1]);
        }
        else {
            min = parseInt(min);
            max = parseInt(max);
        }
        return (min + Math.random() * (max - min)).toFixed(2);
    }
    //    /**整数随机区间数 */
    public static randomNum(min, max?) {
        if (min instanceof Array) {
            let list = min;
            min = parseInt(list[0]);
            max = parseInt(list[1]);
        }
        else {
            min = parseInt(min);
            max = parseInt(max);
        }
        return min + Math.floor(Math.random() * (max - min + 1));
    }


    static SetNodeWidth(node: Node, val) {
        node.getComponent(UITransform).width = val;
    }
    static SetNodeHeight(node: Node, val) {
        node.getComponent(UITransform).height = val;
    }
    static getNodeHeight(node: Node) {
        return node.getComponent(UITransform).height;
    }
    static getNodeWidth(node: Node) {
        return node.getComponent(UITransform).width;
    }

    /** 生成随机的UUID */
    public static createUuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    
    /**
   * 向字符串中的数字前后加字符串
   * @param str 原字符串
   * @param prefix 数字前加的字符串
   * @param suffix 数字后加的字符串
   * @returns 
   */
    static addStringsAroundNumbers(str: string, prefix: string, suffix: string): string {
        // 使用全局搜索（g）和匹配任何数字（\d+）的正则表达式  
        const regex = /\d+/g;
        return str.replace(regex, (match) => prefix + match + suffix);
    }


    /** 获取范围内随机数 */

    /**扰乱数组 */
    static botherArr(arr) {
        let a, b, temp;
        let time = arr.length;
        for (let index = 0; index < time; index++) {
            a = Math.floor(Math.random() * arr.length);
            b = Math.floor(Math.random() * arr.length);
            temp = arr[a];
            arr[a] = arr[b];
            arr[b] = temp;
        }
    }

    /**
 * 根据对象数组 返回物品字符串
 */
    static getItemsStr(items: { id: number, value: number }[]) {
        let str = '';
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            str += `${item.id}:${item.value}&`;
        }
        //去掉最后一个&
        str = str.substring(0, str.length - 1);
        return str;
    }

    static getCurrentMonthEndTimestamp(): number {
        // 获取当前日期
        const now = new Date();
        // 获取当前年份和月份
        const year = now.getFullYear();
        const month = now.getMonth();

        // 创建下个月的第一天
        const nextMonthFirstDay = new Date(year, month + 1, 1);
        // 将日期减去一天，得到当前月的最后一天
        nextMonthFirstDay.setDate(nextMonthFirstDay.getDate() - 1);

        // 获取时间戳，单位是毫秒
        const timestamp = nextMonthFirstDay.getTime();
        return timestamp;
    }

    /** 处理字符串值枚举，让其可以通过cc.Enum选择 */
    static string_to_cc(enum_: any, new_enum_: any): any {
        let index_n = 0;
        const new_enum = {};

        for (const k_s in enum_) {
            if (typeof enum_[k_s] === "string") {
                new_enum_[index_n] = enum_[k_s];
                new_enum_[enum_[k_s]] = index_n;
                new_enum[k_s] = index_n++;
            }
        }
        return Enum(new_enum);
    }
    static arr2Dict<T, T2 = T>(arr: T[], onKey: (t: T, i: number) => string, onValue?: (t: T, i: number) => T2): Record<string, T2> {
        return onValue
            ? arr.reduce((rsl, v, i) => ((rsl[onKey(v, i)] = onValue(v, i)), rsl), {})
            : arr.reduce((rsl, v, i) => ((rsl[onKey(v, i)] = v), rsl), {});
    }
    static mapDict<T, T2>(dict: Record<string, T>, onKey: (t: T, key: string) => T2): Record<string, T2> {
        const rsl = {}; for (const key in dict) rsl[key] = onKey(dict[key], key); return rsl;
    }
    static randomInArray<T>(arr: T[]): T {
        return arr[0 | Math.random() * arr.length];
    }
    static setParentP(n: Node, p: Node) { n.parent = p; n.setPosition(0, 0); return n; }

    public static formatLanguage(str: string, params: { [key: string]: string | number }): string {
        return str.replace(/\{(\d+)\}(%|折)?/g, (match, key, percentSign) => {
            const value = params[key];
            if (percentSign === '%' && typeof value === 'number') {
                // 如果后面有 % 且值为数字，则乘以 100 并加上 %
                return (value * 100).toString() + '%';
            } else if (percentSign === '折' && typeof value === 'number') {
                // 如果后面有 折 且值为数字，则乘以 100 并加上 折
                return (value * 10).toString() + '折';
            } else if (typeof value !== 'undefined') {
                // 如果没有 % 或值不是数字，直接替换值
                return value.toString();
            }
            return match; // 如果找不到对应的值，返回原匹配字符串
        });
    }


    /**
     * 解析装备数据
     * 格式 10001:10&10002:10
     */
    public static handleEquipData(data: string) {
        const record: Record<string, number> = {};
        const arr = data.split('&');
        arr.forEach(e => {
            const split = e.split(':');
            const key = split[0];
            const val = split[1];
            record[key] = Number(val);
        })
        return record;
    }

    /**
     * 特殊场景使用
     * 将字符串中的小数点乘以100 
     * 主要是buff数值跟buff显示的值不一致的原因
     * @param str 
     * @returns 
     */
    public static processString(str: any): string {
        const num = Number(str);  // 将字符串转换为数字
        // 判断是否是有效的数字并且是小数
        if (!isNaN(num) && num % 1 !== 0) {
            // 是小数，返回小数乘以100后的字符串
            return (num * 100).toString();
        } else {
            // 不是小数，直接返回原字符串
            return str;
        }
    }

    /**
     * 将数字转换为中文
     * @param num 
     * @returns 
     */
    public static numberToChinese(num: number): string {
        const units = ['', '十', '百', '千', '万', '十万', '百万', '千万', '亿'];
        const digits = '零一二三四五六七八九';

        if (num === 0) return '零';

        let result = '';
        let unitIndex = 0; // 单位索引
        let zeroFlag = false; // 标记零是否出现过

        while (num > 0) {
            const digit = num % 10; // 取当前数字
            if (digit > 0) {
                result = digits[digit] + units[unitIndex] + result; // 拼接数字和单位
                zeroFlag = false; // 重置零标记
            } else if (!zeroFlag) {
                result = digits[0] + result; // 拼接零
                zeroFlag = true; // 设置零标记
            }
            num = Math.floor(num / 10); // 去掉最后一位
            unitIndex++;
        }

        // 处理十的情况，例如 10 -> 十， 20 -> 二十
        if (result.startsWith('一十')) {
            result = result.slice(1); // 去掉一十前的 '一'
        }

        return result;
    }



    /**
    * 根据权重返回值
    * 格式0:0&&1:1 
    * @param str 权重字符串
    * @param excludeIds 排除的id
    * @returns 
    */
    public static getValByWeight(str: string, excludeIds?: number[]):number {
        //配置id:weight&id:weight
        let weightArr = str.split('&');
        //移除排除的id
        if (excludeIds) {
            weightArr = weightArr.filter(item => {
                const [id, weight] = item.split(':');
                return !excludeIds.includes(parseInt(id));
            });
        }

        if (weightArr.length === 0) return null;

        const weightSum = weightArr.reduce((sum, item) => {
            const [id, weight] = item.split(':');
            return sum + parseInt(weight);
        }, 0);

        const random = Math.random() * weightSum;
        let currentWeight = 0;
        for (let i = 0; i < weightArr.length; i++) {
            const [id, weight] = weightArr[i].split(':');
            currentWeight += parseInt(weight);
            if (random <= currentWeight) return parseInt(id);
        }

        return null;
    }


    public static getWeek(date: Date): number {
        const start = new Date(date.getFullYear(), 0, 1);
        const diff = date.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        return Math.ceil((dayOfYear + 1) / 7);
    }

    /**
     * 格式化日期
     * @param date 日期对象
     * @param format 格式字符串 
     * yyyy:年, MM:月, dd:日, HH:时, mm:分, ss:秒
     */
    public static formatDate(date: Date, format: string): string {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours();
        const minute = date.getMinutes();
        const second = date.getSeconds();

        format = format.replace(/yyyy/g, year.toString());
        format = format.replace(/MM/g, month < 10 ? '0' + month : month.toString());
        format = format.replace(/dd/g, day < 10 ? '0' + day : day.toString());
        format = format.replace(/HH/g, hour < 10 ? '0' + hour : hour.toString());
        format = format.replace(/mm/g, minute < 10 ? '0' + minute : minute.toString());
        format = format.replace(/ss/g, second < 10 ? '0' + second : second.toString());

        return format;
    }

    /**
     * 获取指定日期是一年中的第几周
     * @param date 日期对象
     * @returns 周数(1-53)
     */
    public static getWeekNumber(date: Date): number {
        // 设置为周一为一周的开始
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        
        // 计算周数
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    /**
     * 获取今天零点时间
     */
    public static getTodayZeroTime(): number {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    }

    /**
     * 获取下一天零点时间
     */
    public static getNextDayZeroTime(): number {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    }

    /**
     * 获取本周一零点时间
     */
    public static getWeekStartTime(): number {
        const now = new Date();
        const day = now.getDay() || 7; // 如果是周日,day为0,转为7
        const mondayDate = new Date(now.getTime() - (day - 1) * 86400000);
        return new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate()).getTime();
    }

    /**
     * 获取本月1号零点时间
     */
    public static getMonthStartTime(): number {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    }

    /**
     * 获取小数点后位数
     * @param num 
     * @returns 
     */
    public static getDecimalPlaces(num: number): number {
        const str = num.toString();
        const match = str.match(/\.(\d+)/);
        return match ? match[1].length : 0;
    }

    /**
     * 保留小数点后几位
     * @param num 
     * @param places 
     */
    public static toFixed(num: number,places:number): string {
        const curPlaces = this.getDecimalPlaces(num);
        if(curPlaces > places){
            return num.toFixed(places);
        }
        return num.toString();
    }


        /**
     * 版本号比较
     * @param version1 本地版本号
     * @param version2 远程版本号
     * 如果返回值大于0，则version1大于version2
     * 如果返回值等于0，则version1等于version2
     * 如果返回值小于0，则version1小于version2
     */
        public static compareVersion(version1: string, version2: string): number {
            let v1 = version1.split('.');
            let v2 = version2.split('.');
            const len = Math.max(v1.length, v2.length);
            while (v1.length < len) {
                v1.push('0');
            }
            while (v2.length < len) {
                v2.push('0');
            }
    
            for (let i = 0; i < len; ++i) {
                let num1 = parseInt(v1[i]);
                let num2 = parseInt(v2[i]);
                if (num1 > num2) {
                    return 1;
                } else if (num1 < num2) {
                    return -1;
                }
            }
            return 0;
        }
    
        /** 
         * 判断传入的字符串是否是json格式的字符串
         */
        public static isJsonString(str: string): boolean {
            try {
                JSON.parse(str);
                return true;
            } catch (e) {
                return false;
            }
        }
    
        /**
         * 获取url参数
         * @param url 
         */
        public static getUrlParam(url: string): { url: string, params: { [key: string]: string } } {
            let result = { url: "", params: {} as { [key: string]: string } };
            let urlArr = url.split('?');
            result.url = urlArr[0];
            if (urlArr.length > 1) {
                let paramsArr = urlArr[1].split("&");
                for (let i = 0; i < paramsArr.length; i++) {
                    let item = paramsArr[i];
                    let [key, value] = item.split("=");
                    result.params[key] = value;
                }
            }
            return result;
        }
    
        /**
         * 给url添加参数
         * @param url 
         * @returns 新的url
         */
        public static addUrlParam(url: string, key: string, value: string): string {
            let urlData = this.getUrlParam(url);
            urlData.params[key] = value;
            return urlData.url + "?" + Object.entries(urlData.params).map(([key, value]) => `${key}=${value}`).join("&");
        }

}