declare namespace OppoMinigame {
    interface SystemInfo {
        platform?: string;
        platformVersionCode?: number | string;
        platformVersionName?: string;
        screenWidth?: number;
        screenHeight?: number;
    }

    interface LaunchOptions {
        query?: Record<string, any>;
        referrerInfo?: Record<string, any>;
        [key: string]: any;
    }

    interface ErrorResult {
        code?: number | string;
        msg?: string;
        errCode?: number;
        errMsg?: string;
        [key: string]: any;
    }

    interface LoginData {
        token?: string;
        uid?: string;
        nickName?: string;
        avatar?: string;
        code?: string;
        [key: string]: any;
    }

    interface LoginResult {
        data?: LoginData;
        code?: number | string;
        msg?: string;
        errCode?: number;
        errMsg?: string;
        [key: string]: any;
    }

    interface AdCloseResult {
        isEnded?: boolean;
        [key: string]: any;
    }

    interface RewardedVideoAd {
        load(): Promise<void>;
        show(): Promise<void>;
        onLoad(callback: () => void): void;
        onError(callback: (error: ErrorResult) => void): void;
        onClose(callback: (result: AdCloseResult) => void): void;
        destroy?(): void;
    }

    interface InterstitialAd {
        load(): Promise<void>;
        show(): Promise<void>;
        onLoad(callback: () => void): void;
        onError(callback: (error: ErrorResult) => void): void;
        onClose(callback: () => void): void;
        destroy?(): void;
    }

    interface BannerAdStyle {
        left?: number;
        top?: number;
        width?: number;
        height?: number;
    }

    interface BannerAdErrorEvent extends ErrorResult {
        errorCode?: number;
        errorMessage?: string;
    }

    interface BannerAd {
        style?: BannerAdStyle;
        show(): Promise<void> | void;
        hide(): Promise<void> | void;
        destroy(): void;
        onLoad?(callback: () => void): void;
        onError?(callback: (error: BannerAdErrorEvent) => void): void;
        onResize?(callback: (size: { width: number; height: number }) => void): void;
        onClose?(callback: () => void): void;
        onShow?(callback: () => void): void;
    }

    interface CreateBannerAdOption {
        adUnitId: string;
        style?: BannerAdStyle;
        adIntervals?: number;
    }

    interface CustomAdStyle {
        top?: number;
        left?: number;
        width?: number;
    }

    interface CreateCustomAdOption {
        adUnitId: string;
        style?: CustomAdStyle;
    }

    interface CustomAdClickEvent {
        code?: number;
        msg?: string;
    }

    interface CustomAd {
        style?: CustomAdStyle;
        show(): Promise<void>;
        hide(): void;
        destroy(): void;
        onLoad(callback: () => void): void;
        offLoad(callback?: (() => void) | null): void;
        onShow(callback: () => void): void;
        offShow(callback?: (() => void) | null): void;
        onHide(callback: () => void): void;
        offHide(callback?: (() => void) | null): void;
        onError(callback: (error: ErrorResult) => void): void;
        offError(callback?: ((error: ErrorResult) => void) | null): void;
        onClick(callback: (event: CustomAdClickEvent) => void): void;
        offClick(callback?: ((event: CustomAdClickEvent) => void) | null): void;
    }

    interface QG {
        getLaunchOptionsSync?(): LaunchOptions;
        onShow?(callback: (options: LaunchOptions) => void): void;
        onTouchStart?(callback: (data: any) => void): void;
        onTouchMove?(callback: (data: any) => void): void;
        onTouchEnd?(callback: (data: any) => void): void;
        onTouchCancel?(callback: (data: any) => void): void;
        getSystemInfoSync?(): SystemInfo;
        getSystemInfo?(options: {
            success?: (result: SystemInfo) => void;
            fail?: (error: ErrorResult) => void;
        }): void;
        exitApplication?(options?: {
            success?: () => void;
            fail?: (error: ErrorResult) => void;
            complete?: () => void;
        }): void;
        setClipboardData?(options: {
            data: string;
            success?: () => void;
            fail?: (error: ErrorResult) => void;
        }): void;
        vibrateShort?(options?: { type?: "heavy" | "medium" | "light" }): void;
        vibrateLong?(): void;
        login?(options: {
            success?: (result: LoginResult) => void;
            fail?: (error: ErrorResult) => void;
        }): void;
        initAdService?(options: {
            appId: string;
            isDebug?: boolean;
            success?: () => void;
            fail?: (error: ErrorResult) => void;
        }): void;
        createRewardedVideoAd?(options: { adUnitId: string }): RewardedVideoAd;
        createInterstitialAd?(options: { adUnitId: string }): InterstitialAd;
        createBannerAd?(options: CreateBannerAdOption): BannerAd;
        createCustomAd?(options: CreateCustomAdOption): CustomAd;
    }
}

declare const qg: OppoMinigame.QG;
