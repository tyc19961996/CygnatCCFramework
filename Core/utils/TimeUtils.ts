interface TimeUtilsData {
    /**几几年 */
    FullYear:number,
    /**今年第几月 */
    curMonth:number,
    /**当月第几天 */
    curDay:number,
    /**本周周几 */
    weekDay:number,
    /**今年第几周 */
    yearWeek:number,
}
/**
 * 时间工具
 */
export class TimeUtils {
    public static OneDayTime:number = 24 * 60 * 60;
    /**
    * 时间转换
    */
    static ONE_YEAR: number = 60 * 60 * 24 * 365;
    static ONE_DAY: number = 60 * 60 * 24;

    /**
     * 
     * @param time 时间(秒)
     * @param separator 分隔符
     * @param flag 是否显示时分秒
     * @returns 时间字符串
     */
    public static makeTimeLeftString(time: number, separator: string = ":", flag: Boolean = false): string {
        var ret: string = "";
        var hour: number;
        if (time <= 0) {
            ret = ret + "00:00";
            return ret;
        }
        if (time > this.ONE_YEAR) {
            ret = "大于一年";
            return ret;
        }
        if (flag) {
            if (time > this.ONE_DAY) {
                var day: number = Math.floor(time / this.ONE_DAY);
                ret = day + "天";
            } else if (time >= 3600) {
                hour = Math.floor(time / 3600);
                ret = hour + "时";
            } else {
                var minute: number = Math.floor(time / 60);
                if (minute < 10) ret += "0";
                ret += minute.toString() + separator;
                var second: number = time % 60;
                if (second < 10) ret += "0";
                ret += second.toString();
            }
            return ret;
        }
        if (time > this.ONE_DAY) {
            var day: number = Math.floor(time / this.ONE_DAY);
            ret = day + "天";
            time = time - day * this.ONE_DAY;
            if (flag) {
                hour = Math.floor(time / 3600);
                if (hour > 0) {
                    ret += hour + "时";
                }
                return ret;
            }
        }else{
            ret = '';
        }
        
        if (time <= 0) {
            ret = ret + "";//00:00
            return ret;
        }
        
        hour = Math.floor(time / 3600);
        if (hour > 0) {
            if (hour < 10) {
                ret += "0" + hour.toString() + separator;
            } else {
                ret += hour.toString() + separator;
            }
        }
        var minute: number = Math.floor((time - hour * 3600) / 60);
        if ((minute > 0) || (hour > 0)) {
            if (minute < 10) ret += "0";
            ret += minute.toString() + separator;
        } else {
            ret += "00" + separator;
        }
        var second: number = time % 60;
        if (second < 10) ret += "0";
        ret += second.toString();
        return ret;
    }

    /**
    * 获取当前天数
    */
    public static GetCurDayCount(tick: number = Date.now()): number {
        let dayCount = Math.floor(tick / 1000 / 60 / 60 / 24);
        return dayCount;
    }

    /**获取时间的年月日 */
    public static TimeToString(time: number) {
        let date = new Date(time);
        return date.getFullYear() + '-' + (date.getUTCMonth() + 1) + '-' + date.getUTCDate();
    }

    /** 获取今年的第几周 */
    public static getYearWeek() {
        let endDate = new Date();
        let beginDate = new Date(endDate.getFullYear(), 0, 1);
        let endWeek = endDate.getDay();
        if (endWeek == 0) endWeek = 7;
        let beginWeek = beginDate.getDay();
        if (beginWeek == 0) beginWeek = 7;
        let millisDiff = endDate.getTime() - beginDate.getTime();
        let dayDiff = Math.floor((millisDiff + (beginWeek - endWeek) * (24 * 60 * 60 * 1000)) / 86400000);
        return Math.floor(dayDiff / 7) + 1;
    }

    /** 获取周几 */
    public static getWeek(date: Date = null) {
        if (!date) { date = new Date(); }
        let week = date.getDay();
        week = week == 0 ? 7 : week;
        return week;
    }

    /**获取时间相关 */
    public static GetTimeUtils(): TimeUtilsData {
        let date = new Date();
        let FullYear = date.getFullYear()
        let curMonth = date.getMonth() + 1;
        let curDay = date.getDate();
        let weekDay = this.getWeek(date);
        let yearWeek = this.getYearWeek();
        return { FullYear, curMonth, curDay, weekDay, yearWeek }
    }

    /**获取一天的剩余时间 */
    public static GetRemainingTime() {
        let date = new Date();
        let CurTime = date.getHours() * 60 * 60 + date.getMinutes() * 60 + date.getSeconds();
        return this.OneDayTime - CurTime;
    }


    /**返回每周剩余刷新时间 */
    public static GetWeekRefreshTime() {
        let weekDay = this.getWeek();
        let offset = 7 - weekDay;
        return offset * this.OneDayTime + this.GetRemainingTime();
    }

    
    public static fixedTime: number = 0.02;
}