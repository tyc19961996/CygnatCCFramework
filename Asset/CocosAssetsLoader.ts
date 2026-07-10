import { Asset, AssetManager, assetManager, resources } from "cc";

class LoadProgress {
    public url: string;
    public completedCount: number;
    public totalCount: number;
    public item: any;
    public cb?: Function;
}

export class CocosAssetsLoader {

    public static loadProgress = new LoadProgress();
    private static _loadingMap: { [key: string]: Function[] } = {};

    /** 加载资源异常时抛出错误 */
    public static loadResThrowErrorSync<T>(url: string, type: typeof Asset, onProgress?: (completedCount: number, totalCount: number, item: any) => void): Promise<T> {
        return null;
    }


    public static loadRes<T>(url: string, type: typeof Asset, callback: Function) {
        if (this._loadingMap[url]) {
            this._loadingMap[url].push(callback);
            return;
        }
        this._loadingMap[url] = [callback];
        this.loadResSync<T>(url, type).then((data: any) => {
            let arr = this._loadingMap[url];
            for (const func of arr) {
                func(data);
            }
            this._loadingMap[url] = null;
            delete this._loadingMap[url];
        });
    }
    /** 加载资源 */
    public static loadResSync<T>(url: string, type: typeof Asset, onProgress?: (completedCount: number, totalCount: number, item: any) => void): Promise<T> {
        return new Promise((resolve, reject) => {
            if (!onProgress) onProgress = this._onProgress;
            resources.load(url, type, onProgress, (err, asset: any) => {
                if (err) {
                    reject(new Error(`${url} [资源加载] 错误 ${err}`));
                } else {
                    resolve(asset as T);
                }
            });
        });
    }
    /** 
     * 加载进度
     * cb方法 其实目的是可以将loader方法的progress
     */
    private static _onProgress(completedCount: number, totalCount: number, item: any) {
        this.loadProgress.completedCount = completedCount;
        this.loadProgress.totalCount = totalCount;
        this.loadProgress.item = item;
        this.loadProgress.cb && this.loadProgress.cb(completedCount, totalCount, item);
    }

    /** 加载bundle */
    public static loadBundleSync(url: string): Promise<AssetManager.Bundle> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            assetManager.loadBundle(url, (err: Error, bundle: AssetManager.Bundle) => {
                const endTime = Date.now();
                console.log(url + '====bundle 结束加载 用时：', endTime - startTime);
                if (err) {
                    reject(new Error(`加载bundle失败, url: ${url}, err:${err}`));
                } else {
                    resolve(bundle);
                }
            });
        });
    }

    /** 路径是相对分包文件夹路径的相对路径 */
    public static loadAssetFromBundleSync<T>(bundleName: string, url: string | string[], type: typeof Asset, onProgress?: (completedCount: number, totalCount: number, item: any) => void): Promise<T> {
        return new Promise((resolve, reject) => {
            let bundle = assetManager.getBundle(bundleName);
            if (!bundle) {
                reject(new Error(`加载bundle中的资源失败, 未找到bundle, bundleUrl:${bundleName}`));
            }
            if (!onProgress) onProgress = this._onProgress;
            // const startTime = Date.now();
            bundle.load(url as any, type, (err, asset: any) => {
                // const endTime = Date.now();
                // console.log(url + '====  资源结束加载 用时：'  , endTime / 1000  - startTime / 1000);
                if (err) {
                    reject(new Error(`加载bundle中的资源失败, 未找到asset, url:${url}, err:${err}`));
                } else {
                    resolve(asset as T);
                }
            });
        });
    }

    /** 通过路径加载资源, 如果这个资源在bundle内, 会先加载bundle, 在解开bundle获得对应的资源 */
    public static loadAssetSync(url: string | string[]) {
        return new Promise((resolve, reject) => {
            resources.load(url as any, (err, assets: Asset | Asset[]) => {
                if (!err) {
                    reject(new Error(`加载asset失败, url:${url}, err: ${err}`));
                } else {
                    this.addRef(assets);
                    resolve(assets);
                }
            });
        });
    }
    /** 释放资源 */
    public static releaseAsset(assets: Asset | Asset[]) {
        this.decRes(assets);
    }
    /** 增加引用计数 */
    private static addRef(assets: Asset | Asset[]) {
        if (assets instanceof Array) {
            for (const a of assets) {
                a.addRef();
            }
        } else {
            assets.addRef();
        }
    }
    /** 减少引用计数, 当引用计数减少到0时,会自动销毁 */
    private static decRes(assets: Asset | Asset[]) {
        if (assets instanceof Array) {
            for (const a of assets) {
                a.decRef();
            }
        } else {
            assets.decRef();
        }
    }

}