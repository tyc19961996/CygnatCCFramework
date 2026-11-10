package com.cygnat.apk233;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.meta.android.mpg.cm.MetaAdApi;
import com.meta.android.mpg.cm.api.IAdCallback;
import com.meta.android.mpg.cm.api.IMetaAdApi;
import com.meta.android.mpg.cm.api.InitCallback;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.Map;

/** Cocos 游戏线程只提交请求和读取事件，SDK 调用在 Android 主线程执行。 */
public final class Cygnat233AdsBridge {
    private static final String TAG = "Cygnat233AdsBridge";
    private static final int ERROR_EXIT = -97002;
    private static final int ERROR_BUSY = -97003;
    private static final int ERROR_TIMEOUT = -97006;
    private static final int ERROR_NATIVE = -97007;
    private static final long INIT_TIMEOUT_MS = 15000;
    private static final Handler UI = new Handler(Looper.getMainLooper());
    private static final ArrayDeque<JSONObject> EVENTS = new ArrayDeque<>();

    // 游戏线程读取提交时的 Activity，原生状态变更仍在主线程执行。
    private static volatile Activity activity;
    // 以下状态只由主线程访问。
    private static Request fullScreen;
    private static Request banner;
    private static Request initialization;
    private static boolean initializationTimedOut;
    private static String configuredKey;
    private static boolean initialized;
    private static final Map<String, Request> EXPIRED_FULL_SCREEN = new HashMap<>();

    private Cygnat233AdsBridge() {}

    public static void attach(Activity owner) {
        if (activity != null && activity != owner) detach(activity);
        activity = owner;
    }

    public static void detach(Activity owner) {
        if (activity != owner) return;
        activity = null;
        if (fullScreen != null) expireFullScreen(fullScreen, ERROR_EXIT, "233 APK Activity 已销毁");
        if (banner != null) closeBanner(banner);
    }

    public static int getProtocolVersion() {
        return 1;
    }

    public static boolean submit(String json) {
        try {
            Activity owner = activity;
            Request request = new Request(new JSONObject(json));
            return UI.post(() -> dispatch(request, owner));
        } catch (JSONException error) {
            Log.e(TAG, "233 APK 广告请求格式错误", error);
            return false;
        }
    }

    public static String drainEvents() {
        synchronized (EVENTS) {
            JSONArray batch = new JSONArray();
            while (!EVENTS.isEmpty()) batch.put(EVENTS.removeFirst());
            return batch.toString();
        }
    }

    private static void dispatch(Request request, Activity owner) {
        if ("closeBanner".equals(request.kind)) {
            if (banner != null && banner.id.equals(request.id)) closeBanner(banner);
            return;
        }

        if ("expireFullScreen".equals(request.kind)) {
            if (fullScreen != null && fullScreen.id.equals(request.id)) {
                expireFullScreen(fullScreen, ERROR_TIMEOUT, "233 APK 广告请求超时");
            }
            return;
        }

        if (owner == null || owner != activity || owner.isFinishing()) {
            emit(request, "error", ERROR_NATIVE, "233 APK Activity 不可用");
            return;
        }
        if (request.isBanner() ? banner != null : fullScreen != null) {
            emit(request, "error", ERROR_BUSY, "233 APK 广告正在播放");
            return;
        }
        if (EXPIRED_FULL_SCREEN.containsKey(request.kind)) {
            emit(request, "error", ERROR_TIMEOUT, "233 APK 同类型广告仍在等待 SDK 结束");
            return;
        }
        if (configuredKey != null && !configuredKey.equals(request.appKey)) {
            emit(request, "error", ERROR_NATIVE, "233 APK 广告 appKey 与本进程初始化配置不一致");
            return;
        }

        if (initialization != null && initializationTimedOut) {
            emit(request, "error", ERROR_TIMEOUT, "233 APK 仍在等待 SDK 初始化回调");
            return;
        }

        if (request.isBanner()) banner = request;
        else fullScreen = request;

        if (initialized) {
            show(request);
        } else if (initialization == null) {
            initialize(request);
        }
    }

    private static void initialize(Request request) {
        initialization = request;
        initializationTimedOut = false;
        configuredKey = request.appKey;
        try {
            IMetaAdApi sdk = MetaAdApi.get();
            if (request.debug) sdk.setLogLevel(5);
            sdk.init(activity.getApplication(), request.appKey, new InitCallback() {
                @Override
                public void onInitSuccess() {
                    UI.post(() -> {
                        if (initialization != request) return;
                        initialization = null;
                        initialized = true;
                        if (fullScreen != null) show(fullScreen);
                        if (banner != null) show(banner);
                    });
                }

                @Override
                public void onInitFailed(int code, String message) {
                    UI.post(() -> failInitialization(request, code, message));
                }
            });
            UI.postDelayed(
                () -> {
                    if (initialization != request) return;
                    // SDK 会修改进程级初始化状态，真实回调前不可再次调用 init。
                    initializationTimedOut = true;
                    failPendingAds(ERROR_TIMEOUT, "233 APK 广告 SDK 初始化超时");
                },
                INIT_TIMEOUT_MS
            );
        } catch (RuntimeException | LinkageError error) {
            Log.e(TAG, "233 APK 广告 SDK 初始化失败", error);
            failInitialization(request, ERROR_NATIVE, "233 APK 广告 SDK 初始化失败");
        }
    }

    private static void failInitialization(Request attempt, int code, String message) {
        if (initialization != attempt) return;
        initialization = null;
        failPendingAds(code, message);
    }

    private static void failPendingAds(int code, String message) {
        if (fullScreen != null) finish(fullScreen, "error", code, message);
        if (banner != null) finish(banner, "error", code, message);
    }

    private static void show(Request request) {
        request.started = true;
        IAdCallback.IVideoIAdCallback callback = new IAdCallback.IVideoIAdCallback() {
            @Override
            public void onAdShow() {
                UI.post(() -> {
                    if (isCurrent(request) && !request.closing) emit(request, "opened", 0, null);
                });
            }

            @Override
            public void onAdShowFailed(int code, String message) {
                UI.post(() -> finishFromSdk(request, "error", code, message));
            }

            @Override
            public void onAdClose() {
                UI.post(() -> finishFromSdk(request, "closed", 0, null));
            }

            @Override
            public void onAdClick() {}

            @Override
            public void onAdClickSkip() {}

            @Override
            public void onAdReward() {
                UI.post(() -> {
                    if (isCurrent(request)) emit(request, "rewarded", 0, null);
                });
            }
        };

        try {
            IMetaAdApi sdk = MetaAdApi.get();
            switch (request.kind) {
                case "reward":
                    sdk.showVideoAd(request.pos, callback);
                    break;
                case "interstitial":
                    sdk.showInterstitialAd(request.pos, callback);
                    break;
                case "banner":
                    sdk.showBannerAd(request.pos, callback);
                    break;
                default:
                    finish(request, "error", ERROR_NATIVE, "233 APK 广告类型无效");
            }
        } catch (RuntimeException | LinkageError error) {
            Log.e(TAG, "233 APK 广告 SDK 调用失败", error);
            finish(request, "error", ERROR_NATIVE, "233 APK 广告 SDK 调用失败");
        }
    }

    private static void closeBanner(Request request) {
        if (!request.started) {
            finish(request, "closed", 0, null);
            return;
        }
        if (request.closing) return;

        request.closing = true;
        try {
            // SDK 提交关闭操作，实际关闭由 onAdClose 确认。
            MetaAdApi.get().closeBannerAd();
        } catch (RuntimeException | LinkageError error) {
            request.closing = false;
            Log.e(TAG, "233 APK Banner 关闭失败", error);
            emit(request, "error", ERROR_NATIVE, "233 APK Banner 关闭失败");
        }
    }

    private static void expireFullScreen(Request request, int code, String message) {
        // SDK 每种全屏广告只保留一个回调，旧请求终态前不能覆盖该槽。
        if (request.started) EXPIRED_FULL_SCREEN.put(request.kind, request);
        finish(request, "error", code, message);
    }

    private static void finishFromSdk(Request request, String type, int code, String message) {
        if (EXPIRED_FULL_SCREEN.get(request.kind) == request) {
            EXPIRED_FULL_SCREEN.remove(request.kind);
        } else {
            finish(request, type, code, message);
        }
    }

    private static boolean isCurrent(Request request) {
        return request == (request.isBanner() ? banner : fullScreen);
    }

    private static void finish(Request request, String type, int code, String message) {
        if (!isCurrent(request)) return;
        if (request.isBanner()) banner = null;
        else fullScreen = null;
        emit(request, type, code, message);
    }

    private static void emit(Request request, String type, int code, String message) {
        JSONObject event = new JSONObject();
        try {
            event.put("requestId", request.id);
            event.put("type", type);
            if ("error".equals(type)) {
                event.put("code", code);
                event.put("message", message);
            }
        } catch (JSONException error) {
            Log.e(TAG, "233 APK 广告事件编码失败", error);
            return;
        }

        synchronized (EVENTS) {
            if (EVENTS.size() >= 64) EVENTS.removeFirst();
            EVENTS.addLast(event);
        }
    }

    private static final class Request {
        final String id;
        final String kind;
        final int pos;
        final String appKey;
        final boolean debug;
        boolean started;
        boolean closing;

        Request(JSONObject input) throws JSONException {
            id = input.getString("requestId");
            kind = input.getString("kind");
            if ("closeBanner".equals(kind) || "expireFullScreen".equals(kind)) {
                pos = 0;
                appKey = "";
                debug = false;
            } else {
                pos = input.getInt("pos");
                appKey = input.getString("appKey");
                debug = input.optBoolean("debug");
            }
        }

        boolean isBanner() {
            return "banner".equals(kind);
        }
    }
}
