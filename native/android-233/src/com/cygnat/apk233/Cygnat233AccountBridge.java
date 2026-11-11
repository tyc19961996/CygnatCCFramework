package com.cygnat.apk233;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.ViewTreeObserver;

import com.meta.android.mpg.account.callback.AccountChangedListener;
import com.meta.android.mpg.account.callback.LoginResultCallback;
import com.meta.android.mpg.account.model.UserInfo;
import com.meta.android.mpg.common.MetaApi;
import com.meta.android.mpg.initialize.InitCallback;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayDeque;

/** SDK 调用与账号状态均在 Android 主线程，游戏线程只读写桥接消息。 */
public final class Cygnat233AccountBridge {
    private static final int UNAVAILABLE = -97101;
    private static final int NOT_INITIALIZED = -97102;
    private static final int BUSY = -97103;
    private static final int INVALIDATED = -97104;
    private static final int TIMEOUT = -97105;
    private static final String TIMEOUT_MESSAGE = "233 APK 账号请求超时，请完全关闭游戏后重新打开";
    private static final long INIT_TIMEOUT_MS = 30_000;
    private static final long LOGIN_TIMEOUT_MS = 180_000;
    private static final long SWITCH_RETRY_MS = 30_000;
    private static final Handler UI = new Handler(Looper.getMainLooper());
    private static final ArrayDeque<JSONObject> EVENTS = new ArrayDeque<>();
    private static volatile Session session;
    private static long generation;
    // SDK 的初始化状态和登录回调槽均为进程级，Activity 重建时仍保留请求所有权。
    private static Request sdkInit;
    private static Request sdkLogin;

    private Cygnat233AccountBridge() {}

    public static void attach(Activity activity) {
        Session previous = session;
        if (previous != null) {
            if (previous.owner == activity) return;
            detach(previous.owner);
        }
        session = new Session(activity);
    }

    public static void detach(Activity activity) {
        Session current = session;
        if (current == null || current.owner != activity) return;
        session = null;
        current.switched = null;
        synchronized (EVENTS) {
            invalidateQueuedResults(true);
            invalidate(sdkInit);
            invalidate(sdkLogin);
            emit(event("detached", null, "generation", ++generation));
        }
        if (current.listener != null) {
            try {
                MetaApi.unregisterAccountChangedListener(current.listener);
            } catch (RuntimeException | LinkageError ignored) {
                // 旧监听的回调仍会被 Session 检查拦截。
            }
            ViewTreeObserver observer = current.owner.getWindow().getDecorView().getViewTreeObserver();
            if (observer.isAlive()) observer.removeOnWindowFocusChangeListener(current);
        }
        if (current.started) {
            try {
                MetaApi.destroySdk();
            } catch (RuntimeException | LinkageError ignored) {
                // 原生依赖缺失时仍允许 Activity 正常销毁。
            }
        }
    }

    public static int getProtocolVersion() {
        return 1;
    }

    public static boolean submit(String json) {
        try {
            JSONObject body = new JSONObject(json);
            Request request = new Request(body.getString("requestId"));
            Session current = session;
            String kind = body.getString("kind");
            if ("init".equals(kind)) {
                String appKey = body.getString("appKey");
                String cpId = body.getString("cpId");
                return UI.post(() -> init(current, request, appKey, cpId));
            }
            if ("login".equals(kind)) return UI.post(() -> login(current, request));
            return false;
        } catch (JSONException ignored) {
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

    private static boolean available(Session current, Request request) {
        if (current != null && current == session && !current.owner.isFinishing()) return true;
        fail(request, UNAVAILABLE, "233 APK Activity 不可用");
        return false;
    }

    private static void init(Session current, Request request, String appKey, String cpId) {
        if (!available(current, request)) return;
        if (appKey.trim().isEmpty() || cpId.trim().isEmpty()) {
            fail(request, NOT_INITIALIZED, "请配置 233 APK 登录 appKey 和 cpId");
        } else if (sdkInit != null) {
            occupied(request, sdkInit);
        } else if (current.listener != null) {
            if (appKey.equals(current.appKey) && cpId.equals(current.cpId)) emit(event("initialized", request.id));
            else fail(request, NOT_INITIALIZED, "233 APK 账号初始化配置与当前 Activity 不一致");
        } else if (sdkLogin != null) {
            occupied(request, sdkLogin);
        } else {
            sdkInit = request;
            current.started = true;
            try {
                MetaApi.initMetaSdk(current.owner, appKey, cpId, new InitCallback() {
                    @Override
                    public void onInitializeSuccess() {
                        UI.post(() -> finishInit(current, request, appKey, cpId, null));
                    }

                    @Override
                    public void onInitializeFail(int code, String message) {
                        UI.post(() -> finishInit(current, request, appKey, cpId, code));
                    }
                });
                UI.postDelayed(() -> timeout(request), INIT_TIMEOUT_MS);
            } catch (RuntimeException | LinkageError ignored) {
                finishInit(current, request, appKey, cpId, UNAVAILABLE);
            }
        }
    }

    private static void finishInit(Session current, Request request, String appKey, String cpId, Integer errorCode) {
        if (sdkInit != request) return;
        sdkInit = null;
        request.finished = true;
        if (session != current) return;
        if (errorCode == null) {
            AccountChangedListener listener = new AccountChangedListener() {
                @Override
                public void onAccountChanged(UserInfo userInfo) {
                    Credentials credentials = Credentials.from(userInfo);
                    UI.post(() -> accountChanged(current, this, "changed", credentials));
                }

                @Override
                public void onAccountLogout() {
                    UI.post(() -> accountChanged(current, this, "logout", null));
                }
            };
            try {
                MetaApi.registerAccountChangedListener(listener);
                current.listener = listener;
                current.appKey = appKey;
                current.cpId = cpId;
                current.owner.getWindow().getDecorView().getViewTreeObserver().addOnWindowFocusChangeListener(current);
                if (!request.expired) emit(event("initialized", request.id));
                return;
            } catch (RuntimeException | LinkageError ignored) {
                if (current.listener == listener) {
                    current.listener = null;
                    try {
                        MetaApi.unregisterAccountChangedListener(listener);
                    } catch (RuntimeException | LinkageError cleanupIgnored) {
                        // 未生效的监听不会生成游戏事件。
                    }
                }
                errorCode = UNAVAILABLE;
            }
        }
        if (!request.expired) fail(request, errorCode, "233 APK SDK 初始化失败");
    }

    private static void login(Session current, Request request) {
        if (!available(current, request)) return;
        if (current.listener == null) {
            fail(request, NOT_INITIALIZED, "请先完成 233 APK 账号初始化");
        } else if (current.isSwitchInProgress()) {
            fail(request, BUSY, "233 APK 正在等待账号登录完成");
        } else if (current.switched != null) {
            Credentials credentials = current.switched;
            current.switched = null;
            succeed(request, credentials);
        } else if (sdkLogin != null) {
            occupied(request, sdkLogin);
        } else {
            sdkLogin = request;
            try {
                MetaApi.login(current.owner, new LoginResultCallback() {
                    @Override
                    public void loginSuccess(UserInfo userInfo) {
                        Credentials credentials = Credentials.from(userInfo);
                        UI.post(() -> finishLogin(current, request, credentials, INVALIDATED));
                    }

                    @Override
                    public void loginFail(int code, String message) {
                        UI.post(() -> finishLogin(current, request, null, code));
                    }
                });
                UI.postDelayed(() -> timeout(request), LOGIN_TIMEOUT_MS);
            } catch (RuntimeException | LinkageError ignored) {
                finishLogin(current, request, null, UNAVAILABLE);
            }
        }
    }

    private static void finishLogin(Session current, Request request, Credentials credentials, int errorCode) {
        if (sdkLogin != request) return;
        sdkLogin = null;
        boolean deliver = current == session && !request.finished && !request.expired;
        request.finished = true;
        if (!deliver) return;
        if (credentials != null) succeed(request, credentials);
        else fail(request, errorCode, "233 APK SDK 登录失败");
    }

    private static void accountChanged(Session current, AccountChangedListener listener, String reason, Credentials credentials) {
        if (current != session || current.listener != listener) return;
        current.switched = credentials;
        // 退出时 SDK 自行启动界面；观察窗口焦点返回后才允许业务主动重试。
        current.switchStarted = "logout".equals(reason) ? SystemClock.elapsedRealtime() : -1;
        current.switchLostFocus = current.switchStarted >= 0 && !current.owner.hasWindowFocus();
        synchronized (EVENTS) {
            invalidateQueuedResults(false);
            invalidate(sdkLogin);
            emit(event("account", null, "generation", ++generation, "reason", reason));
        }
    }

    private static void invalidate(Request request) {
        if (request == null || request.finished) return;
        request.finished = true;
        if (!request.expired) fail(request, INVALIDATED, "233 APK 登录已失效");
    }

    private static void invalidateQueuedResults(boolean includeInit) {
        int count = EVENTS.size();
        for (int index = 0; index < count; index++) {
            JSONObject result = EVENTS.removeFirst();
            String type = result.optString("type");
            if ("loggedIn".equals(type) || (includeInit && "initialized".equals(type))) {
                result = error(result.optString("requestId"), INVALIDATED, "233 APK 登录已失效");
            }
            EVENTS.addLast(result);
        }
    }

    private static void timeout(Request request) {
        if (request.finished) return;
        // SDK 回调前保留在途所有权，避免再拉起一个登录界面。
        request.expired = true;
        fail(request, TIMEOUT, TIMEOUT_MESSAGE);
    }

    private static void occupied(Request request, Request active) {
        if (active.expired || active.finished) fail(request, TIMEOUT, TIMEOUT_MESSAGE);
        else fail(request, BUSY, "233 APK 正在等待 SDK 账号回调");
    }

    private static void succeed(Request request, Credentials credentials) {
        emit(event("loggedIn", request.id, "generation", generation, "uid", credentials.uid, "sid", credentials.sid));
    }

    private static JSONObject error(String id, int code, String message) {
        return event("error", id, "code", code, "message", message);
    }

    private static void fail(Request request, int code, String message) {
        emit(error(request.id, code, message));
    }

    private static void emit(JSONObject result) {
        synchronized (EVENTS) {
            if (EVENTS.size() == 32) EVENTS.removeFirst();
            EVENTS.addLast(result);
        }
    }

    private static JSONObject event(String type, String id, Object... fields) {
        try {
            JSONObject result = new JSONObject().put("type", type);
            if (id != null) result.put("requestId", id);
            for (int i = 0; i < fields.length; i += 2) result.put((String) fields[i], fields[i + 1]);
            return result;
        } catch (JSONException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    private static final class Session implements ViewTreeObserver.OnWindowFocusChangeListener {
        final Activity owner;
        boolean started;
        String appKey;
        String cpId;
        AccountChangedListener listener;
        Credentials switched;
        long switchStarted = -1;
        boolean switchLostFocus;

        Session(Activity owner) {
            this.owner = owner;
        }

        @Override
        public void onWindowFocusChanged(boolean focused) {
            if (this != session || switchStarted < 0) return;
            if (!focused) switchLostFocus = true;
            else if (switchLostFocus) switchStarted = -1;
        }

        boolean isSwitchInProgress() {
            if (switchStarted < 0) return false;
            // 内嵌界面未必产生焦点切换，等待期结束后允许聚焦窗口中的手动重试。
            if (owner.hasWindowFocus() && SystemClock.elapsedRealtime() - switchStarted >= SWITCH_RETRY_MS) {
                switchStarted = -1;
                return false;
            }
            return true;
        }
    }

    private static final class Request {
        final String id;
        boolean finished;
        boolean expired;

        Request(String id) {
            this.id = id;
        }
    }

    private static final class Credentials {
        final String uid;
        final String sid;

        Credentials(String uid, String sid) {
            this.uid = uid;
            this.sid = sid;
        }

        static Credentials from(UserInfo user) {
            if (user == null || user.uid == null || user.uid.trim().isEmpty()
                || user.sid == null || user.sid.trim().isEmpty()) return null;
            return new Credentials(user.uid, user.sid);
        }
    }
}
