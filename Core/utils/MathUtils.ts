import { PREVIEW } from "cc/env";
import { misc, v2, Vec2 } from "cc";
import { ArrayUtils } from "./ArrayUtils";

/**
 * 数学函数扩展
 */
export  class MathUtils {

    public static Deg2Rad = 0.0175;
    public static Rad2Deg = 57.2958;
    public static RAND_SEED:number = 0;
    public static readonly  RAND_MAXSEED = 65536000;
    public static SeedRandom() {
        this.RAND_SEED = (this.RAND_SEED * 123 + 59) % this.RAND_MAXSEED;
        return this.RAND_SEED;
    }

    public static ToHex(num: number): string {
        return num.toString(16);
    }

    public static RandomFromArrayUtilscept<T>(numArr: T[], except: T): T {
        let fakeRandomList = [];
        for (let i = 0; i < numArr.length; ++i) {
            if (except == numArr[i]) continue;
            fakeRandomList.push(numArr[i]);
        }
        return this.RandomFromArray(fakeRandomList);
    }

    public static RandomFromArray<T>(numArr: T[]): T {
        let randomIndex = MathUtils.RandomInt(0, numArr.length);
        return numArr[randomIndex];
    }

    public static RandomFromArraySlice<T>(numArr: T[]): T {
        let randomIndex = MathUtils.RandomInt(0, numArr.length);
        let tempData = numArr[randomIndex];
        numArr.slice(randomIndex,1);
        return tempData;
    }

    public static RandomArrayFromArray<T>(arr: T[], count: number): T[] {
        let result = [];
        let indexList = [];
        for (let i = 0; i < arr.length; ++i) {
            indexList.push(i);
        }
        for (let i = 0; i < count; ++i) {
            let randomIndex = MathUtils.RandomInt(0, indexList.length);
            let getIndex = indexList[randomIndex];
            ArrayUtils.RemoveAt(indexList, randomIndex);
            result.push(arr[getIndex]);
        }
        return result;
    }

    public static RandomFromWithWeight<T>(numArr: T[], weightArr: number[]) {
        if (numArr == null || numArr.length == 0) {
            return null;
        }
        var totalWeight = 0;
        for (var weight of weightArr) {
            totalWeight += weight;
        }
        var randomWeight = MathUtils.Random(0, totalWeight);
        var currentWeight = 0;
        for (var i = 0; i < numArr.length; ++i) {
            currentWeight += weightArr[i];
            if (randomWeight < currentWeight) {
                return numArr[i];
            }
        }
        return numArr[numArr.length - 1];
    }

    public static RandomFromWithWeightToIdx<T>(numArr: T[], weightArr: number[]) {
        if (numArr == null || numArr.length == 0) {
            return null;
        }
        var totalWeight = 0;
        for (var weight of weightArr) {
            totalWeight += weight;
        }
        var randomWeight = MathUtils.Random(0, totalWeight);
        var currentWeight = 0;
        for (var i = 0; i < numArr.length; ++i) {
            currentWeight += weightArr[i];
            if (randomWeight < currentWeight) {
                return i;
            }
        }
        return (numArr.length - 1);
    }

    public static RandomFromWithWeightSub<T>(numArr: T[], weightArr: number[]) {
        if (numArr == null || numArr.length == 0) {
            return null;
        }
        var totalWeight = 0;
        for (var weight of weightArr) {
            totalWeight += weight;
        }

        var randomWeight = MathUtils.Random(0, totalWeight);
        for (var i = 0; i < numArr.length; ++i) {
            randomWeight -= weightArr[i];
            if (randomWeight <= 0) {
                return numArr[i];
            }
        }
        return numArr[0];
    }

    public static FilterMaxWeightIdx<T>(numArr: T[], weightArr: number[],isMax:boolean = true) {
        if (numArr == null || numArr.length == 0) {
            return -1;
        }
        let tMax: number = isMax ? 0 : 999999999;
        let idx:number = 0;
        for (let i = 0; i < weightArr.length; i++) {
            const va = weightArr[i];

            if(isMax){
                if(tMax<va){
                    tMax =va ;
                    idx = i;
                }
            }else{
                if (tMax > va) {
                    tMax = va;
                    idx = i;
                }
            }
        }
        return idx;
    }

    public static FilterMaxWeight<T>(numArr: T[], weightArr: number[],isMax:boolean = true) {
        let idx = this.FilterMaxWeightIdx(numArr,weightArr,isMax)
        if (numArr == null || numArr.length == 0) {
            return null;
        }
        return numArr[idx];
    }

    // max  = max + 1
    public static RandomInt(min: number, maxAddOne: number): number {
        return Math.floor(this.Random(min, maxAddOne));
    }

    // max  = max + 1
    public static Random(min: number, maxAddOne: number): number {
        return (maxAddOne - min) * Math.random() + min;
    }

    /**
     * 获取一个范围内随机整数
     * @param min 最小值
     * @param max 最大值
     */
    public static randomRangeInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min) + min);
    }

    /**
     * 判定概率命中
     * @param ratio 概率，百分数
     */
    public static RandomRatio(ratio: number): boolean {
        let v = MathUtils.RandomInt(0, 10000) * 0.01;
        if (ratio > v) {
            return true;
        }
        return false;
    }

    public static Clamp(value: number, min: number, max: number): number {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    public static Clamp01(value: number): number {
        return this.Clamp(value, 0, 1);
    }

    public static Sign(value: number): number {
        if (value == 0) return 1;
        return value > 0 ? 1 : -1;
    }

    public static GetNumCount(num: number): number {
        var numberCount = 0;
        var newNumber = num;
        while (newNumber / 10 > 0) {
            newNumber = Math.floor(newNumber / 10);
            numberCount++;
        }
        return numberCount;
    }

    public static Lerp(from: number, to: number, progress: number): number {
        return from + (to - from) * MathUtils.Clamp01(progress);
    }

    public static MoveTowardsAngle(current: number, target: number, maxDelta: number) {
        var num = MathUtils.DeltaAngle(current, target);
        if (0 - maxDelta < num && num < maxDelta) {
            return target;
        }
        target = current + num;
        return MathUtils.MoveTowards(current, target, maxDelta);
    }

    public static MoveTowards(current: number, target: number, maxDelta: number): number {
        if (Math.abs(target - current) <= maxDelta) {
            return target;
        }
        return current + Math.sign(target - current) * maxDelta;
    }

    public static DeltaAngle(current: number, target: number): number {
        var num = MathUtils.Repeat(target - current, 360);
        if (num > 180) {
            num -= 360;
        }
        return num;
    }

    public static Repeat(t: number, length: number): number {
        return MathUtils.Clamp(t - Math.floor(t / length) * length, 0, length);
    }

    public static IsSimilar(n1: number, n2: number) {
        return n1 == n2;
    }

    public static dx:number=0;
    public static dy:number=0;
    
    public static LockAt(p1x:number,p1y:number,p2x:number,p2y:number):number{
        this.dx=p2x-p1x;
        this.dy=p2y-p1y;
        return  Math.atan2(this.dy,this.dx)/Math.PI*180;

    }

    public static  GetangleByDir(px,py):number{
        return  Math.atan2(py,px)/Math.PI*180;
    }

    public static getAngelePos(angle: number, range) {
        let tangle = angle;//(angle / 180 * Math.PI)
        return v2(Math.cos(tangle) * range, Math.sin(tangle) * range)
    }

       /**
    * 获取一个范围内随机整数  不包含最大值
    * @param min 最小值
    * @param max 最大值
    */
       public static randomCircleRangeInt(randomCount: number, offset: number = 5): number[] {

        let len = Math.floor(360 / offset);
        if (len < randomCount) {
            offset = 360 / randomCount;
            len = randomCount;
        }
        
        let array: number[] = [];
        for (let i = 0; i < len; i++) {
            array.push(i * offset);
        }
        let random: number[] = [];
        for (let i = 0; i < randomCount && array.length > 0; i++) {
            let tIndex = this.RandomFromWithWeightToIndex(array);
            random.push(array[tIndex]);
            array.splice(tIndex, 1)
        }
        return random;
    }

    public static RandomFromWithWeightToIndex(weightArr: number[]) {
        var totalWeight = 0;
          for (let i = 0; i < weightArr.length; i++) {
            const weight = weightArr[i];
            totalWeight += weight;
        }
        var randomWeight = MathUtils.Random(0, totalWeight);
        var currentWeight = 0;
        for (var i = 0; i < weightArr.length; ++i) {
            currentWeight += weightArr[i];
            if (randomWeight < currentWeight) {
                return i;
            }
        }
        return weightArr.length-1;
    }
    public static MsToFloat(ms:number,w:number = 2){
        return +((ms/1000).toFixed(w));
    }

    public static getRangePos(range: number, angle: number) {
        var n = angle / 180 * Math.PI;//misc.degreesToRadians(angle);
        var x = 0 + range * Math.sin(n);
        var y = 0 + range * Math.cos(n);
        return v2(x, y);
    }
}

if(PREVIEW){
    window["MathUtils"] = MathUtils;
}