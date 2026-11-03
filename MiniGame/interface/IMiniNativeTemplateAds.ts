/** 原生模板广告样式，单位 dp；高度由模板比例决定。 */
export interface MiniNativeTemplateAdStyle {
    top?: number;
    left?: number;
    width?: number;
}

export interface IMiniShowNativeTemplateAdOptions {
    style?: MiniNativeTemplateAdStyle;
}

/** 展示请求回调；成功仅表示广告展示成功。 */
export interface MiniNativeTemplateAdCallback {
    success?: () => void;
    fail?: (errCode: number, errMsg: string) => void;
}

/** 宿主点击结果。 */
export interface MiniNativeTemplateAdClickEvent {
    code?: number;
    msg?: string;
}

export interface IMiniNativeTemplateAdsListener {
    onLoad?: () => void;
    onShow?: () => void;
    /** 包括主动隐藏和用户点击关闭。 */
    onHide?: () => void;
    onClick?: (event: MiniNativeTemplateAdClickEvent) => void;
    onError?: (errCode: number, errMsg: string) => void;
}

/** 原生模板广告能力，当前仅 OPPO 实现。 */
export interface IMiniNativeTemplateAds {
    showNativeTemplateAd(options?: IMiniShowNativeTemplateAdOptions, res?: MiniNativeTemplateAdCallback): void;
    hideNativeTemplateAd(): void;
    destroyNativeTemplateAd(): void;
    setNativeTemplateAdsListener(listener: IMiniNativeTemplateAdsListener): void;
}
