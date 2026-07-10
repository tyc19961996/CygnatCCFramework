import { Asset, AudioClip, JsonAsset, Prefab, Sprite, SpriteAtlas, SpriteFrame, Texture2D, UITransform, assetManager, error, js, log, resources, sp } from "cc";
import { ResUrls } from "../../Asset/AssetInfo";
import { CocosAssetsLoader } from "../../Asset/CocosAssetsLoader";
import { CocosUtils } from "../../Core/utils/CocosUtils";
import { Com } from "../../Core/utils/Logger/Log";

/**
 * 资源加载, 针对的是Form
 * 首先将资源分为两类
 * 一种是在编辑器时将其拖上去图片, 这里将其称为静态图片, 
 * 一种是在代码中使用loader加载的图片, 这里将其称为动态图片
 * 
 * 对于静态资源
 * 1, 加载  在加载prefab时, cocos会将其依赖的图片一并加载, 所有不需要我们担心
 * 2, 释放  这里采用的引用计数的管理方法, 只需要调用destoryForm即可
 * 
 * 加载一个窗体
 * 第一步 加载prefab, 第二步 实例化prefab 获得 node
 * 所以销毁一个窗体 也需要两步, 销毁node, 销毁prefab
 */
export  class AssetLoader {
    /** 
     * 采用计数管理的办法, 管理form所依赖的资源
     */
    private static _prefabDepends: { [key: string]: Array<string> } = js.createMap();
    private static _dynamicTags: { [key: string]: Array<string> } = js.createMap();

    private static _tmpAssetsDepends: string[] = [];                                       // 临时缓存
    private static _assetsReference: { [key: string]: number } = js.createMap();          // 资源引用计数

    private static _prefabs: { [key: string]: Prefab } = js.createMap();               // 预制体缓存

    /** 获取预制体 */
    public static getFormPrefab(fid: string) {
        return this._prefabs[fid];
    }

    /** 加载窗体 */
    public static async loadFormPrefab(bundleName: string, windowName: string) {

        if (this._prefabs[windowName]) return this._prefabs[windowName];
        const url = ResUrls.UIPrefabs(windowName);
        let { res, deps } = await this._loadResByBundleWithReference<Prefab>(bundleName, url, Prefab);

        this._prefabDepends[windowName] = deps;
        this._prefabs[windowName] = res;

        return res;
    }

    /** 预加载预制体 */
    public static async preloadFormPrefab(bundleName: string, windowName: string) {

        if (this._prefabs[windowName]) return;

        await this.preloadResAsync(ResUrls.UIPrefabs(windowName), bundleName, Prefab);
    }

    /** 销毁窗体 */
    public static destoryFormPrefab(fid: string) {
        if (this._prefabs[fid]) {
            this._prefabs[fid].destroy();
            this._prefabs[fid] = null;
            delete this._prefabs[fid];
        }
        // 销毁依赖的资源
        this._destoryResWithReference(this._prefabDepends[fid]);
        // 删除缓存
        this._prefabDepends[fid] = null;
        delete this._prefabDepends[fid];
    }


    /** 动态加载资源
     * 通过tag标记当前资源
     *  统一释放 
     * */
    public static async loadDynmicResByBundle<T>(bundle: string, url: string, type: typeof Asset, tag: string) {
        let { res, deps } = bundle === 'Resources' ? await this._loadResWithReference<T>(url, type) : await this._loadResByBundleWithReference<T>(bundle, url, type);
        if (!this._dynamicTags[tag]) {
            this._dynamicTags[tag] = [];
        }
        this._dynamicTags[tag].push(...deps);
        return res;
    }

    /** 
     * 异步加载图片资源
     */
    private static lastImgUrlRecord: Record<string, string> = {};//记录最后一次加载的图片url
    public static async showImgByBundle(bundle: string, url: string, sprite: Sprite, tag: string, width?: number, height?: number) {
        try {
            this.lastImgUrlRecord[sprite.uuid] = url;
            let res = await this.loadSprite(bundle, url, tag);

            if (this.lastImgUrlRecord[sprite.uuid] != url) {
                return;
            }
            if (!res.loaded) return;

            if (sprite && sprite.node && sprite.node.isValid)
                sprite.spriteFrame = res;

            CocosUtils.scaleNode(sprite, width, height)
        } catch (error) {
            Error(`加载图片资源失败, url:${url}, bundle:${bundle}, tag:${tag}, error:${error}`);
        }

    }


    /**
     * 加载spriteFrame资源
     * @param bundleName 资源包名称
     * @param url 资源路径
     * @param tag 资源标签
     * @returns 
     */
    public static async loadSprite(bundleName: string, url: string, tag: string): Promise<SpriteFrame> {
        url = ResUrls.Texture(url) + '/spriteFrame';
        let res = await this.loadDynmicResByBundle<SpriteFrame>(bundleName, url, SpriteFrame, tag);
        return res;
    }

    /**
     * 加载prefab资源
     * @param bundleName 资源包名称
     * @param url 资源路径
     * @param tag 资源标签
     * @returns 
     */
    public static async loadPrefab(bundleName: string, url: string, tag: string): Promise<Prefab> {
        url = ResUrls.Prefabs(url);
        let res = await this.loadDynmicResByBundle<Prefab>(bundleName, url, Prefab, tag);
        return res;
    }

    /**
     * 加载图集资源
     * @param bundleName 资源包名称
     * @param url 资源路径
     * @param tag 资源标签
     * @returns 
     */
    public static async loadAutoAtlas(bundleName: string, url: string, tag: string): Promise<SpriteAtlas> {
        url = ResUrls.Atlas(url);
        let res = await this.loadDynmicResByBundle<SpriteAtlas>(bundleName, url, SpriteAtlas, tag);
        return res;
    }

    /**
     * 加载spine资源
     * @param bundleName 资源包名称
     * @param url 资源路径
     * @param tag 资源标签
     * @returns 
     */
    public static async loadSpine(bundleName: string, url: string, tag: string): Promise<sp.SkeletonData> {
        url = ResUrls.Spine(url);
        let res = await this.loadDynmicResByBundle<sp.SkeletonData>(bundleName, url, sp.SkeletonData, tag);
        return res;
    }

    /**
     * 加载json资源
     * @param bundleName 资源包名称
     * @param url 资源路径
     * @param tag 资源标签
     * @returns 
     */
    public static async loadJson(bundleName: string, url: string, tag: string): Promise<JsonAsset> {
        url = ResUrls.Json(url);
        let res = await this.loadDynmicResByBundle<JsonAsset>(bundleName, url, JsonAsset, tag);
        return res;
    }

    public static async loadAudioClip(bundleName: string, url: string, tag: string): Promise<AudioClip> {
        url = ResUrls.Sound(url);
        let res = await this.loadDynmicResByBundle<AudioClip>(bundleName, url, AudioClip, tag);
        return res;
    }


    /** 销毁动态资源  */
    public static destoryDynamicRes(tag: string) {
        if (!this._dynamicTags[tag]) {       // 销毁
            return false;
        }
        this._destoryResWithReference(this._dynamicTags[tag])

        this._dynamicTags[tag] = null;
        delete this._dynamicTags[tag];

        return true;
    }

    /** 加载资源并添加引用计数 */
    private static async _loadResWithReference<T>(url: string, type: typeof Asset) {
        let res = await CocosAssetsLoader.loadResSync<T>(url, type, this._addTmpAssetsDepends.bind(this));
        if (!res) {
            this._clearTmpAssetsDepends();
            return null;
        }
        this._clearTmpAssetsDepends();
        let deps = assetManager.dependUtil.getDepsRecursively(res['_uuid']) || [];
        deps.push(res['_uuid']);
        this.addAssetsDepends(deps);

        return {
            res: res,
            deps: deps
        };
    }

    /**
     * 加载bundle内的资源
     * @param bundleName 
     * @param url 
     * @param type 
     * @returns 
     */
    private static async _loadResByBundleWithReference<T>(bundleName: string, url: string, type: typeof Asset) {

        let bundle = assetManager.getBundle(bundleName);
        if (!bundle) {
            bundle = await CocosAssetsLoader.loadBundleSync(bundleName);
        }

        let res = await CocosAssetsLoader.loadAssetFromBundleSync<T>(bundleName, url, type, this._addTmpAssetsDepends.bind(this))

        if (!res) {
            this._clearTmpAssetsDepends();
            return null;
        }
        this._clearTmpAssetsDepends();
        let deps = assetManager.dependUtil.getDepsRecursively(res['_uuid']) || [];
        deps.push(res['_uuid']);
        this.addAssetsDepends(deps);

        return {
            res: res,
            deps: deps
        };
    }


    /** 更加引用销毁资源 */
    private static _destoryResWithReference(deps: string[]) {
        let _toDeletes = this.removeAssetsDepends(deps);
        this._destoryAssets(_toDeletes);
        return true;
    }
    /** 添加资源计数 */
    private static addAssetsDepends(deps: Array<string>) {
        for (let s of deps) {
            if (this._checkIsBuiltinAssets(s)) continue;
            if (this._assetsReference[s]) {
                this._assetsReference[s] += 1;
            } else {
                this._assetsReference[s] = 1;
            }
        }
    }
    /** 删除资源计数 */
    private static removeAssetsDepends(deps: Array<string>) {
        let _deletes: string[] = [];
        for (let s of deps) {
            if (!this._assetsReference[s] || this._assetsReference[s] === 0) continue;
            this._assetsReference[s]--;
            if (this._assetsReference[s] === 0) {
                _deletes.push(s);
                delete this._assetsReference[s];                  // 删除key;
            }
        }
        return _deletes;
    }
    private static _destoryAssets(urls: string[]) {
        for (const url of urls) {
            this._destoryAsset(url);
        }
    }
    /** 销毁资源 */
    private static _destoryAsset(url: string) {
        if (this._checkIsBuiltinAssets(url)) return;
        let asset = assetManager.assets.get(url);      // 销毁该资源
        if (!asset) return;
        // assetManager.releaseAsset(asset);
        // console.log('销毁资源', asset['_name']);
        // if(!asset['_name']){
        //     console.log('销毁资源', url);
        // }

        asset.destroy();
        assetManager.assets.remove(url);               // 从缓存中清除
        assetManager.dependUtil['remove'](url);        // 从依赖中删除
    }

    /** 临时添加资源计数 */
    private static _addTmpAssetsDepends(completedCount: number, totalCount: number, item: any) {
        let deps = (assetManager.dependUtil.getDepsRecursively(item.uuid) || []);
        deps.push(item.uuid);
        this.addAssetsDepends(deps);

        this._tmpAssetsDepends.push(...deps);
    }
    /** 删除临时添加的计数 */
    private static _clearTmpAssetsDepends() {
        for (let s of this._tmpAssetsDepends) {
            if (!this._assetsReference[s] || this._assetsReference[s] === 0) continue;
            this._assetsReference[s]--;
            if (this._assetsReference[s] === 0) {
                delete this._assetsReference[s];           // 这里不清理缓存
            }
        }
        this._tmpAssetsDepends = [];
    }

    /** 检查是否是builtin内的资源 */
    public static _checkIsBuiltinAssets(url: string) {

        let asset = assetManager.assets.get(url);

        if (asset && (asset['_name'].indexOf("builtin") != -1 || asset['_name'].indexOf("default_") != -1 || asset['_name'].indexOf("ui-sprite-material") != -1)) {
            return true;
        }
        return false;
    }

    /** 计算当前纹理数量和缓存 */
    public static computeTextureCache() {
        let cache = assetManager.assets;
        let totalTextureSize = 0;
        let count = 0;
        cache.forEach((item: Asset, key: string) => {
            let type = (item && item['__classname__']) ? item['__classname__'] : '';
            if (type == 'Texture2D') {
                let texture = item as Texture2D;
                let textureSize = texture.width * texture.height * ((texture['_native'] === '.jpg' ? 3 : 4) / 1024 / 1024);
                // debugger
                totalTextureSize += textureSize;
                count++;
            }
        });
        return `缓存 [纹理总数:${count}][纹理缓存:${totalTextureSize.toFixed(2) + 'M'}]`;
    }

    public static loadCfgs(bundleName: string, onProgress?: (completedCount: number, totalCount: number, item: any) => void, DIR: string = '') {
        return new Promise<any>(async rs => {

            let bundle = assetManager.getBundle(bundleName);
            if (!bundle) {
                bundle = await CocosAssetsLoader.loadBundleSync(bundleName);
            }

            bundle.loadDir(DIR, JsonAsset, onProgress, (err, assets) => {
                if (err) {
                    error(`${name} [资源加载] 错误 ${err}`);
                    rs(null);
                } else {
                    rs(assets);
                }
            });
        });
    }


    /**
     * 异步预加载资源
     * @param url 
     * @param bundleName 
     * @param type 
     */
    public static async preloadResAsync(url: string, bundleName: string, type: typeof Asset) {
        let bundle = assetManager.getBundle(bundleName);
        if (!bundle) {
            bundle = await CocosAssetsLoader.loadBundleSync(bundleName);
        }
        bundle.preload(url, type, (err, asset) => {
            if (err) {
                Error(`预加载资源失败, url:${url}, bundleName:${bundleName},  err:${err}`);
            }
            else {
                Com(`预加载资源成功, url:${url}, bundleName:${bundleName}`);
            }
        });
    }

    /**
     * 异步预加载资源目录
     * @param url 
     * @param bundleName 
     * @param type 
     */
    public static async preloadResDirAsync(url: string, bundleName: string, type: typeof Asset) {
        return new Promise<any>(async (rs,rj) => { 

            let bundle = assetManager.getBundle(bundleName);
            if (!bundle) {
                bundle = await CocosAssetsLoader.loadBundleSync(bundleName);
            }
            bundle.preloadDir(url, type, (err, assets) => {
                if (err) {
                    rj(err);
                    Error(`预加载资源目录失败, url:${url}, bundleName:${bundleName}, err:${err}`);
                }
                else {
                    rs(assets);
                    Com(`预加载资源目录成功, url:${url}, bundleName:${bundleName}`);
                }
            });

        });
      
    }


    /**
     * 打印资源引用
     */
    public static logAssetsReference() {
        for (const key in this._assetsReference) {
            log(key + ": " + this._assetsReference[key]);
        }
    }

    /**
     * 预加载资源
     * @param resItems 资源组数组
     * @param onProgress 进度回调
     */
    // public static async preloadGameRes(resItems: IResItem[], onProgress?: (current: number, total: number) => void) {
    //     const totalItems = resItems.length;
    //     let completedItems = 0;

    //     for (const item of resItems) {
    //         await this.loadDynmicResByBundle(item.bundle, item.path, item.type, item.tags);
    //         completedItems++;
    //         onProgress?.(completedItems, totalItems);
    //     }
    // }
}