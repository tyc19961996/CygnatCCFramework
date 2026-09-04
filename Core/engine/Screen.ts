/**
 * @Author: Gongxh
 * @Date: 2024-12-08
 * @Description: 屏幕尺寸信息接口
 */
import type { SafeAreaInsets } from "./SafeArea";

export class Screen {
    /** 屏幕宽度 */
    public static ScreenWidth: number;
    /** 屏幕高度 */
    public static ScreenHeight: number;
    /** 设计分辨率宽 */
    public static DesignWidth: number;
    /** 设计分辨率高 */
    public static DesignHeight: number;
    /** 安全区边距 */
    public static SafeArea: SafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };
    /**
     * 兼容字段：安全区四个边距中的最大值
     * @deprecated 请改用 SafeArea 的方向边距。
     */
    public static SafeAreaHeight: number = 0;
    /** 安全区的宽度 */
    public static SafeWidth: number;
    /** 安全区的高度 */
    public static SafeHeight: number;
}
