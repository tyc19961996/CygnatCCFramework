 /**字符串工具 */
 export  class  StringUtils{
    public static GetAttackXi(AttackBase: number, Level: number, xishu: number): number {
        for (let i = 0; i < Level - 1; i++) {
            AttackBase *= xishu;
        }
        return AttackBase;
    }
    /**字符串拆解 */
    public static GetStrByArray(str: string, _: string = "|") {
        let Temp = str.split(_);
        let TempArray:number[] = [];
        for (let i = 0; i < Temp.length; i++) {
            TempArray.push(Number(Temp[i]));
        }
        return TempArray;
    }
    public static GetBuildingStrByArray(str: string, _: string = ":"): string[] {
        if (str == null) {
            return [];
        }
        let Temp = str.split(_);
        return Temp;
    }

    public static RoleSpeed: number = 1;
    public static GetFloat2ByString(value: number,isZh:boolean = true,_z:string = "元") {
        let TempValue = 0;
        let _s = "";
        let TempStr = "";
        if (value >= 10000) {
            _s = isZh ? "万" : "M";
            TempValue = value / 10000;
        }  else {
            TempValue = value;
        }
        TempValue *= 100;
        TempValue = Math.floor(TempValue);
        TempValue = TempValue / 100;
        TempStr = TempValue + _s + _z;
        return TempStr;
    }

    // static  ZhMonylist = [
    //      [
    //          "清",
    //          "10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    //      ],
    //      [
    //          "明",
    //          "1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    //      ],
    //      [
    //          "宋",
    //          "100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    //      ],
    //      [
    //          "唐",
    //          "10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    //      ],
    //      [
    //          "隋",
    //          "1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    //      ],
    //      [
    //          "晋",
    //          "100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    //      ],
    //      [
    //          "吴",
    //          "10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    //      ],
    //      [
    //          "蜀",
    //          "1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    //      ],
    //      ["魏", "100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    //      ["汉", "10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    //      ["秦", "1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    //      ["周", "100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    //      ["商", "10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    //      ["夏", "1000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    //      ["古", "100000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    //      ["全", "10000000000000000000000000000000000000000000000000000000000000000000000000000"],
    //      ["大", "1000000000000000000000000000000000000000000000000000000000000000000000000"],
    //      ["无", "100000000000000000000000000000000000000000000000000000000000000000000"],
    //      ["不", "10000000000000000000000000000000000000000000000000000000000000000"],
    //      ["那", "1000000000000000000000000000000000000000000000000000000000000"],
    //      ["阿", "100000000000000000000000000000000000000000000000000000000"],
    //      ["恒", "10000000000000000000000000000000000000000000000000000"],
    //      ["极", "1000000000000000000000000000000000000000000000000"],
    //      ["载", "100000000000000000000000000000000000000000000"],
    //      ["正", "10000000000000000000000000000000000000000"],
    //      ["涧", "1000000000000000000000000000000000000"],
    //      ["沟", "100000000000000000000000000000000"],
    //      ["穰", "10000000000000000000000000000"],
    //      ["秭", "1000000000000000000000000"],
    //      ["垓", "100000000000000000000"],
    //      ["京", "10000000000000000"],
    //      ["兆", "1000000000000"],
    //      ["亿", "100000000"],
    //      ["万", "10000"],
    //      ["", "1"]
    //  ].reverse()



    // public static MoneyConvert(value: number,Fixed:number = 2) {

    //     if (value == 0) {
    //         return 0 + this.ZhMonylist[0][0];
    //     }
    //     let TempValue = value;
    //     let TempStr = "";
    //     //8let  ValueLen = value.toString().length;
    //     let tIndex: number = 0;
    //     for (let i = 0; i < this.ZhMonylist.length; i++) {
    //         let data = this.ZhMonylist[i];
    //         if (value <= Number(data[1])) {
    //             tIndex = i;
    //             break;
    //         }
    //     }
    //     for (let i = tIndex; i >= 0; i--) {
    //         const list = this.ZhMonylist[i];
    //         let mantissa = list[0];
    //         let tNumber = Number(list[1]);
    //         if (TempValue >= tNumber) {
    //             let offset = Math.floor(TempValue / tNumber);
    //             TempStr += offset + mantissa;
    //             TempValue -= offset * tNumber;
    //             Fixed--;
    //             if (Fixed <= 0) {
    //                 break;
    //             }
    //         }
    //     }
    //     return TempStr;
    // }


    static  EnMonylist = [
        ["b", "1000000000"],
        ["m", "1000000"],
        ["k", "1000"],
        ["", "1"]
    ].reverse()

     /**伤害文本显示转换 */
     static HurtConvert(value: number, fix: number = 2) {

         let TempStr = "";
         if (value > 1000000000) {
            TempStr = (value/1000000000).toFixed(fix)+"b"
         } else if (value > 1000000) {
            TempStr = (value/1000000).toFixed(fix)+"m"
         } else if (value > 1000) {
            TempStr = (value/1000).toFixed(fix)+"k"
         }else{
            TempStr = value.toString();
         }
         return TempStr.replace(".00", "");
     }

    /**
     * 给字符串中的每段数字加上前后缀（常用于富文本包裹数字变色）
     * @example addStringsAroundNumbers("造成120点伤害", "<color=#ff0000>", "</color>")
     */
    public static addStringsAroundNumbers(str: string, prefix: string, suffix: string): string {
        return str.replace(/(\d+(?:\.\d+)?)/g, `${prefix}$1${suffix}`);
    }

    /**
     * 用 {key} 占位符格式化字符串
     * @example formatByKey("第{level}关", { level: 3 }) => "第3关"
     */
    public static formatByKey(str: string, params: { [key: string]: string | number }): string {
        return str.replace(/\{(\w+)\}/g, (match, key) => {
            return params[key] !== undefined ? params[key].toString() : match;
        });
    }

 }