import { _decorator, assetManager, builtinResMgr, Button, Component, error, EventHandler, EventTouch, ImageAsset, instantiate, isValid, IVec2Like, Label, Material, Node, RichText, Size, sp, Sprite, SpriteAtlas, SpriteFrame, Texture2D, Tween, tween, UIOpacity, UITransform, v3, Vec2, Vec3, warn, Widget } from "cc";
import { Error } from "./Logger/Log";
import { GlobalTimer } from "../timer/GlobalTimer";

export class CocosUtils {
    //#region 节点查找
    public static getNodeEx(target: Node | Component, name: string, active: boolean) {
        let tNode: Node = target instanceof Component ? target.node : target;
        let arr: Node[] = [];
        tNode.children.forEach(n => {
            if (n.name == name && (!active || n.activeInHierarchy)) arr.push(n);
            arr = arr.concat(this.getNodeEx(n, name, active));
        })
        return arr;
    }
    /**根据节点路径 寻找节点 */
    public static getNode(target: Node | Component, ...url: any[]) {
        let tNode: Node = target instanceof Component ? target.node : target;
        for (let i in url) {
            tNode = tNode.getChildByName(`${url[i]}`);
            if (!tNode) {
                Error(`查找错误,${url[i]}`)
                return null;
            }
        }
        return tNode;
    }
    //#endregion

    //#region 节点组件查询
    /**获取组件 不存在那么就添加 */
    public static getOrAddComponent<T extends Component>(node: Node | Component, cla): any {
        let temp = node.getComponent(cla);
        if (!temp) {
            temp = node.addComponent(cla);
        }
        return temp as T;
    }
    //#endregion

    //#region 节点组件属性设置

    /**
     * 设置节点层级
     * @param node 
     * @param priority 
     */
    public static setNodePriority(node: Node, priority: number) {
        const uiTransform = node.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.priority = priority;
        }
    }

    /**设置节点透明度 */
    public static setOpacity(node: Node | Component, Opacity: number) {
        const tClassPoxy: UIOpacity = this.getOrAddComponent(node, UIOpacity);
        tClassPoxy.opacity = Opacity;
    }

    /**设置节点缩放 */
    public static setScale(target: Node | Component, scale: number) {
        const tNode: Node = target instanceof Component ? target.node : target;
        tNode.setScale(scale, scale, scale);
    }

    /**设置节点显示 */
    public static setActive(target: Node | Component, active: boolean, ADFlag: number = 0) {
        if(!target){
            return;
        }
        const tNode: Node = target instanceof Component ? target.node : target;
        if (tNode.active != active) {
            tNode.active = active;
        }
    }

    /**设置按钮是否禁用 */
    public static setBtnInteractable(btn: Button, _interactable: boolean) {
        btn.interactable = _interactable;
        const tempSprite = btn.getComponent(Sprite)
        if (tempSprite) {
            tempSprite.grayscale = !_interactable;
        }
    }

    public static TweenNodeOpacity(node: Node | Component, opacity: number, time: number = 0.5,callBack?: Function) {
        const tNode: Node = node instanceof Component ? node.node : node;
        const opacityComp = CocosUtils.getOrAddComponent(tNode, UIOpacity);
        if (time > 0) {
            tween(opacityComp).to(time, { opacity: opacity }).call(()=>{
                callBack?.();
            }).start();
        } else {
            opacityComp.opacity = opacity;
            callBack?.();
        }
    }

    /**缓动图片范围 */
    public static TweenSpriteRange(node: Node | Sprite, fillRange: number, time: number = 0.2) {
        const tSprite: Sprite = node instanceof Node ? node.getComponent(Sprite) : node;
        if (time > 0) {
            tween(tSprite).to(time, { fillRange: fillRange }).start();
        } else {
            tSprite.fillRange = fillRange;
        }
    }

    /**设置数组节点 全部是否置灰 */
    public static setAllGray(node: Node[], isGray: boolean, exclude: Node[] = []) {
        node.forEach(child => {
            this.setChiladAllGray(child, isGray, exclude);
        })
    }

    /**设置节点以及子节点 全部是否置灰 */
    public static setChiladAllGray(node: Node | Sprite, isGray: boolean, exclude: Node[] = []) {
        const tNode: Node = node instanceof Sprite ? node.node : node;
        const children = tNode.children;
        children.forEach(child => {
            if (!exclude.includes(child)) {
                this.setChiladAllGray(child, isGray, exclude);
            }
        })
        if (!exclude.includes(tNode)) {
            this.setGray(tNode, isGray);
        }
    }

    /**设置节点是否置灰 */
    public static setGray(node: Node | Sprite, isGray: boolean) {
        const tSprite: Sprite = node instanceof Node ? node.getComponent(Sprite) : node;
        if (tSprite) {
            tSprite.grayscale = isGray;
        } else {
            const label = node.getComponent(Label);
            if (label) {
                if (!label["Org"]) { label["Org"] = label.material; }
                if (isGray) {
                    label.material = builtinResMgr.get<Material>('ui-sprite-gray-material')
                } else {
                    label.material = label["Org"];
                }
            }
        }
    }

    /**
  * 更新label文字
  * **/
    public static switchText(node: Node | Label, str: any, forceUpdate = false, isNum = false) {
        if (!isValid(node)) {
            warn('要更新的节点为空，str=' + str);
            return;
        }
        const label: Label = node instanceof Node ? node.getComponent(Label) : node;
        if (!label) { return; }
        label.node.attr({ original: str });
        label.string = isNum ? str : str;

        // if (label.useSystemFont) {
        //     label.font = AppLanguage.getFont()
        // }

        forceUpdate && label.updateRenderData();
    }

    /**
    * 更新RichText文字
    * **/
    public static switchRichText(node: Node | RichText, str: any, forceUpdate = false, isNum = false) {
        if (!isValid(node)) {
            warn('要更新的节点为空，str=' + str);
            return;
        }
        const label: RichText = node instanceof Node ? node.getComponent(RichText) : node;
        if (!label) { return; }
        label.node.attr({ original: str });
        label.string = isNum ? str : str;
        if (label.useSystemFont) {
            //@ts-ignore
            //label.font = AppLanguage.getFont()
        }
        forceUpdate && label["_updateRichTextStatus"]();
    }

    /**添加富文本点击事件 */
    public static AddRichTextClick(tagetNode: Node | RichText, CallBack: Function, functionName?: string) {
        let tRichText: RichText = null;
        if (tagetNode instanceof RichText) {
            tRichText = tagetNode;
        } else {
            tRichText = tagetNode.getComponent(RichText)
        }
        if (!tRichText) {
            error("添加富文本点击失败 该节点没有富文本组件");
            return;
        }
        functionName = functionName ? functionName : CallBack.name;
        functionName = functionName.replace("bound", "");
        functionName = functionName.replace(" ", "");
        tRichText[functionName] = CallBack;
    }

    public static scaleNode(target: Node | Component, width: number, height = 0) {
        if (!width) return;
        const tNode = target instanceof Node ? target : target.node;
        if (isValid(tNode)) {
            if (!height) {
                height = width;
            }
            const wScale = width / tNode.getComponent(UITransform).width;
            const hScale = height / tNode.getComponent(UITransform).height;
            const sc = Math.min(wScale, hScale);
            tNode.setScale(v3(sc, sc, sc))
        }
    }

    public static scaleNodeW(target: Node | Component, width: number) {
        const tNode = target instanceof Node ? target : target.node;
        if (isValid(tNode)) {
            const wScale = width / tNode.getComponent(UITransform).width;
            tNode.setScale(v3(wScale, wScale, wScale))
        }
    }

    public static scaleNodeH(target: Node | Component, height) {
        const tNode = target instanceof Node ? target : target.node;
        if (isValid(tNode)) {
            const wScale = height / tNode.getComponent(UITransform).height;
            tNode.setScale(v3(wScale, wScale, wScale))
        }
    }

    public static setNodeSize(target: Node | Component, width: number, height: number) {
        const uiTrans = target.getComponent(UITransform);
        uiTrans.setContentSize(new Size(width, height));
    }

    /**
 *  二阶贝塞尔曲线 运动
 * @param target
 * @param {number} duration
 * @param {} c1 起点坐标
 * @param {} c2 控制点
 * @param {Vec3} to 终点坐标
 * @param opts
 * @returns {any}
 */
    public static bezierTo(target: Node, duration: number, c1: Vec2, c2: Vec2, to: Vec3, opts: any, Callback?: Function) {
        opts = opts || Object.create(null);
        /**
         * @desc 二阶贝塞尔
         * @param {number} t 当前百分比
         * @param {} p1 起点坐标
         * @param {} cp 控制点
         * @param {} p2 终点坐标
         * @returns {any}
         */
        let twoBezier = (t: number, p1: Vec2, cp: Vec2, p2: Vec3) => {
            let x = (1 - t) * (1 - t) * p1.x + 2 * t * (1 - t) * cp.x + t * t * p2.x;
            let y = (1 - t) * (1 - t) * p1.y + 2 * t * (1 - t) * cp.y + t * t * p2.y;
            return v3(x, y, 0);
        };
        opts.onUpdate = (arg: Vec3, ratio: number) => {
            target.setPosition(twoBezier(ratio, c1, c2, to))
            Callback && Callback();
        };
        return tween(target).to(duration, {}, opts);
    }


    /**
     * 获取节点呼吸动画
     * @param node 
     * @param minScale 最小缩放
     * @param maxScale 最大缩放
     * @param duration 动画时长
     * @returns 动画
     */
    public static getNodeBreathAnimation(node: Node | Component, minScale: number = 1, maxScale: number = 1.15, duration: number = 0.5) {
        const tNode = node instanceof Node ? node : node.node;
        const tTween = tween(tNode)
            .set({ scale: v3(minScale, minScale, minScale) })
            .repeatForever(
                tween(tNode)
                    .to(duration, { scale: v3(maxScale, maxScale, maxScale) })
                    .to(duration, { scale: v3(minScale, minScale, minScale) })
            )

        return tTween;
    }

    
        /** 等待时间, 秒为单位 */
    public static sleepSync = function (dur: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            GlobalTimer.startTimer(() => {
                resolve(true);
            }, dur);
        });
    }

    //#endregion
}
