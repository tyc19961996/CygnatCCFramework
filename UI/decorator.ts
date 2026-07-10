/**
 * @Author: Gongxh
 * @Date: 2024-12-11
 * @Description: UI 装饰器
 */

import { InfoPool } from "./core/InfoPool";
import { IDecoratorInfo, MetadataKey } from "./interface/type";

export namespace _uidecorator {
    /** @internal */
    const uiclassMap: Map<any, IDecoratorInfo> = new Map(); // 窗口注册信息

    /** @internal */
    const uiheaderMap: Map<string, IDecoratorInfo> = new Map(); // header注册信息

    /** 获取窗口注册信息 */
    export function getWindowMaps(): Map<any, IDecoratorInfo> { return uiclassMap }

    /** 获取header注册信息 */
    export function getHeaderMaps(): Map<any, IDecoratorInfo> { return uiheaderMap; }

    /**
     * 窗口装饰器
     * @param {string} groupName 窗口组名称
     * @param {string} bundle fgui包名
     * @param {string} name 窗口名 (与fgui中的组件名一一对应)
     * @param {string[] | string} inlinePkgs 内联的包名 当前界面需要引用其他包中的资源时使用 引用多个包用数组 引用单个包用字符串
     * 
     * @example @uiclass("窗口组", "UI包名", "MyWindow", ["包名1", "包名2"])
     * @example @uiclass("窗口组", "UI包名", "MyWindow", "包名1")
     */
    export function uiclass(groupName: string, bundle: string, name: string): Function {
        /** target 类的构造函数 */
        return function (ctor: any): any {
            // 检查是否有原始构造函数引用（由其他装饰器如 @dataclass 提供）
            const originalCtor = ctor;
            // 给构造函数添加静态属性，存储窗口名称（避免混淆后 constructor.name 变化）
            ctor[MetadataKey.originalName] = name;
            uiclassMap.set(originalCtor, {
                ctor: ctor, // 存储实际的构造函数（可能被包装过）
                props: ctor[MetadataKey.prop] || null,
                callbacks: ctor[MetadataKey.callback] || null,
                controls: ctor[MetadataKey.control] || null,
                transitions: ctor[MetadataKey.transition] || null,
                res: {
                    group: groupName,
                    bundle: bundle,
                    name: name,
                },
            });
            InfoPool.add(ctor, groupName, bundle, name,);
            return ctor;
        };
    }

    /**
     * UI header装饰器
     * @param {string} bundle 包名
     * @param {string} name 组件名
     */
    export function uiheader(bundle: string, name: string): Function {
        return function (ctor: any): void {
            // 检查是否有原始构造函数引用（由其他装饰器如 @dataclass 提供）
            const originalCtor = ctor;
            // log(`pkg:【${pkg}】 uiheader prop >${JSON.stringify(ctor[UIPropMeta] || {})}<`);
            ctor[MetadataKey.originalName] = name;
            uiheaderMap.set(originalCtor, {
                ctor: ctor, // 存储实际的构造函数（可能被包装过）
                props: ctor[MetadataKey.prop] || null,
                callbacks: ctor[MetadataKey.callback] || null,
                controls: ctor[MetadataKey.control] || null,
                transitions: ctor[MetadataKey.transition] || null,
                res: {
                    bundle: bundle,
                    name: name,
                }
            });
            InfoPool.addHeader(ctor, bundle, name);
            return ctor;
        };
    }

}

