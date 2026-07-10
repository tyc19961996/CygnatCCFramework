/*******************************************************************************
 * 创建: 2024年08月28日
 * 作者: 水煮肉片饭(27185709@qq.com)
 * 描述: 运动拖尾
 * 1、支持合批
 *    可以使用Atlas的图集帧作为拖尾贴图，不打断DrawCall
 * 2、支持世界坐标 与 节点坐标
 *    原版拖尾只支持世界坐标，如果游戏中采用“反向移动地图”来实现视窗跟随，由于世界坐标并没有改变，会导致拖尾异常。
 *    新版拖尾支持世界坐标 和 本地坐标 两种模式切换，以上问题使用本地坐标就可以解决。
 * 3、避免内存波动
 *    原版拖尾通过不断创建渐隐顶点来模拟拖尾效果（类似于粒子系统）。
 *    新版拖尾的实现原理完全遵从拖尾的本质，顶点数是固定的，通过更新顶点位置来改变尾巴形状，内存更稳定。
 * 4、其他功能
 *    节点缩放，拖尾会跟着缩放。节点旋转，拖尾不会跟着旋转。
 *    上级节点缩放，拖尾不会跟着缩放，但可以调用updateCascadeScale函数让拖尾同步缩放。
*******************************************************************************/
import { _decorator, assetManager, CCInteger, Director, director, IRenderData, Mat4, Node, NodeEventType, SpriteAtlas, SpriteFrame, UIRenderer, Vec2 } from 'cc';
import { EDITOR, JSB } from 'cc/env';
class Joint {           //尾巴关节，每个关节控制2个顶点，N个关节组成尾巴骨骼（N = 尾巴长度）
    x: number = 0;      //关节x
    y: number = 0;      //关节y
    dis: number = 0;    //与顶点的距离（一个关节沿切线方向左右各延伸dis距离，就是2个顶点坐标）
    cos: number = 0;    //关节弯曲角cos值
    sin: number = 0;    //关节弯曲角sin值
}
const { ccclass, property, menu } = _decorator;
@ccclass
@menu('Gi/MotionTrail')
export class MotionTrail extends UIRenderer {
    @property({ type: SpriteAtlas, readonly: true })
    protected atlas: SpriteAtlas = null;
    @property
    private _spriteFrame: SpriteFrame = null;
    @property({ type: SpriteFrame })
    get spriteFrame() { return this._spriteFrame; }
    set spriteFrame(value: SpriteFrame) {
        this._spriteFrame = value;
        this.updateSpriteFrame();
        this.updateUV();
        this.markForUpdateRenderData();
    }
    @property
    private _isActive: boolean = true;
    @property({ displayName: '是否激活', tooltip: '设置isActive = true可以刷新顶点数据' })
    get isActive() { return this._isActive; }
    set isActive(value: boolean) {
        this._isActive = this.enabled = value;
        this.updateActive();
    }
    @property
    private _isWorldXY: boolean = true;
    @property({ displayName: '世界坐标', tooltip: '顶点坐标是世界坐标还是本地坐标' })
    get isWorldXY() { return this._isWorldXY; }
    set isWorldXY(value: boolean) {
        this._isWorldXY = value;
        this.resetPos();
    }
    @property({ displayName: '偏移' })
    offset: Vec2 = new Vec2();
    @property
    private _length: number = 20;
    @property({ type: CCInteger, displayName: '拖尾长度' })
    get length() { return this._length; }
    set length(value: number) {
        this._length = Math.max(value, 2);
        this.updateLength();
        this.updateIData();
        this.updateUV();
        this.updateWidth();
        this.resetPos();
    }
    @property
    private _headWidth: number = 100;
    @property({ displayName: '头部宽度' })
    get headWidth() { return this._headWidth; }
    set headWidth(value: number) {
        this._headWidth = Math.max(value, 0);
        this.updateWidth();
    }
    @property
    private _tailWidth: number = 0;
    @property({ displayName: '尾部宽度' })
    get tailWidth() { return this._tailWidth; }
    set tailWidth(value: number) {
        this._tailWidth = Math.max(value, 0);
        this.updateWidth();
    }
    @property
    private _headOpacity: number = 255;
    @property({ type: CCInteger, min: 0, max: 255, slide: true, displayName: '头部透明度' })
    get headOpacity() { return this._headOpacity; }
    set headOpacity(value: number) {
        this._headOpacity = value;
        this._updateColor();
    }
    @property
    private _tailOpacity: number = 0;
    @property({ type: CCInteger, min: 0, max: 255, slide: true, displayName: '尾部透明度' })
    get tailOpacity() { return this._tailOpacity; }
    set tailOpacity(value: number) {
        this._tailOpacity = value;
        this._updateColor();
    }
    private joints: Joint[] = [];                   //尾巴关节组
    private cascadeScale: Vec2 = new Vec2(1, 1);    //级联缩放，即所有上级节点缩放的乘积（上级节点指父节点、父节点的父节点……）
    private visibleScale: Vec2 = new Vec2(1, 1);    //可见缩放，即级联缩放 * 节点自身缩放
    public __preload() {
        super.__preload();
        this._assembler = {                         //定制Assembler
            updateColor: this.updateColor.bind(this),
            updateRenderData: this.onFlushed.bind(this),
            fillBuffers: this.fillBuffer.bind(this),
        };
        JSB && ((this as any).update = this._assembler.updateRenderData);
        this._useVertexOpacity = true;
    }
    public onLoad() {
        super.onLoad();
        this.updateSpriteFrame();
        this.updateLength();
        this.updateUV();
        this.updateWidth();
        this.updateActive();
        JSB && director.once(Director.EVENT_AFTER_DRAW, this.updateColor, this);
        this.node.on(NodeEventType.TRANSFORM_CHANGED, this.updateVisibleScale, this);
    }
    public onDestroy() {
        super.onDestroy();
        this.node.off(NodeEventType.TRANSFORM_CHANGED, this.updateVisibleScale, this);
    }
    //设置enable为true，不但可以显示拖尾，还可以重置拖尾位置，并同步上级节点缩放对拖尾造成的影响。
    protected updateActive() {
        if (this._isActive) {
            this.updateCascadeScale();
            this.updateVisibleScale();
            this.resetPos();
        }
    }
    //根据尾巴长度、顶点格式分配顶点数据所需的内存
    private updateLength() {
        for (let i = 0, len = this._length, joints = this.joints = []; i < len; joints[i++] = new Joint());
        this.createBuffer();
    }
    //根据头部宽度、尾部宽度计算关节与顶点的距离（插值法）
    private updateWidth() {
        let trailLen = this._length;
        let headHalfW = this._headWidth * 0.5;
        let disDelt = (headHalfW - this._tailWidth * 0.5) / (trailLen - 1);
        for (let i = 0, joints = this.joints; i < trailLen; joints[i].dis = headHalfW - disDelt * i++);
    }
    //设置顶点个数和三角形个数
    private createBuffer() {
        this.destroyRenderData();
        let renderData = this._renderData = this.requestRenderData();
        let vertNum = this._length << 1;
        renderData.dataLength = vertNum;
        renderData.resize(vertNum, (vertNum - 2) * 3);
        this._updateColor();
        this.updateIData();
    }
    //计算顶点索引
    private updateIData() {
        let iData = this._renderData.chunk['_ib'];
        for (let i = 0, id = 0, len = iData.length; i < len; ++id) {
            iData[i++] = id;
            iData[i++] = id + 1;
            iData[i++] = id + 2;
        }
        JSB && this._renderData.chunk.setIndexBuffer(iData);
    }
    //实时运算的顶点数据内容
    private onFlushed() {
        if (!this._spriteFrame) return;
        this.updateXY();
        this._renderData.updateRenderData(this, this._spriteFrame);
        if (JSB) {
            this.markForUpdateRenderData();
        }
    }
    //计算级联缩放，也就是所有上级节点缩放系数的乘积
    private updateCascadeScale() {
        let node = this.node;
        let sx = 1, sy = 1;
        while (node['_parent'] !== null) {
            node = node['_parent'];
            sx *= node.scale.x;
            sy *= node.scale.y;
        }
        this.cascadeScale.x = sx;
        this.cascadeScale.y = sy;
    }
    //计算可见缩放
    private updateVisibleScale(type: number = 4) {
        if (type & Node.TransformBit.SCALE) {
            this.visibleScale.x = this.cascadeScale.x * this.node.scale.x;
            this.visibleScale.y = this.cascadeScale.y * this.node.scale.y;
        }
    }
    //计算关节数据以及顶点坐标（每个关节控制2个顶点）
    private updateXY() {
        let node = this.node;
        let joints = this.joints;
        let data = this._renderData.data;
        let len = this._length - 1;
        for (let i = len; i > 0; --i) {
            let cur = joints[i], prev = joints[i - 1];
            cur.x = prev.x;
            cur.y = prev.y;
            cur.sin = prev.sin;
            cur.cos = prev.cos;
        }
        let cur = joints[0], next = joints[1];
        let vsx = this.visibleScale.x, vsy = this.visibleScale.y;
        if (this._isWorldXY) {
            let m = node.worldMatrix;
            cur.x = this.offset.x * vsx + m.m12;
            cur.y = this.offset.y * vsy + m.m13;
        } else {
            cur.x = this.offset.x * node.scale.x + node.position.x;
            cur.y = this.offset.y * node.scale.y + node.position.y;
        }
        let a = next.y - cur.y, b = next.x - cur.x, sqrt = Math.sqrt(a * a + b * b);
        if (sqrt > 0) {
            cur.sin = a / sqrt;
            cur.cos = b / sqrt;
        }
        let tx = 0, ty = 0, csx = 1, csy = 1;
        if (!this._isWorldXY) {
            tx = node.position.x, ty = node.position.y;
            csx = this.cascadeScale.x, csy = this.cascadeScale.y;
        }
        let id = 0;
        let curX = 0, curY = 0, disX = 0, disY = 0;
        for (let i = 0; i < len; ++i, id += 2) {
            cur = joints[i];
            curX = (cur.x - tx) * csx;
            curY = (cur.y - ty) * csy;
            disX = cur.dis * vsx * cur.sin;
            disY = cur.dis * vsy * cur.cos;
            data[id].x = curX + disX;
            data[id].y = curY - disY;
            data[id + 1].x = curX - disX;
            data[id + 1].y = curY + disY;
        }
        next = joints[len];
        curX = (next.x - tx) * csx;
        curY = (next.y - ty) * csy;
        disX = next.dis * vsx * cur.sin;
        disY = next.dis * vsy * cur.cos;
        data[id].x = curX + disX;
        data[id].y = curY - disY;
        data[id + 1].x = curX - disX;
        data[id + 1].y = curY + disY;
        this.fitXY(data);
    }
    //初始化顶点数据
    public resetPos() {
        let tx = this.offset.x, ty = this.offset.y;
        let node = this.node;
        if (this._isWorldXY) {
            let m = node.worldMatrix;
            tx += m.m12;
            ty += m.m13;
        } else {
            tx += node.position.x;
            ty += node.position.y;
        }
        for (let i = this._length - 1, joints = this.joints; i > -1; --i) {
            joints[i].x = tx;
            joints[i].y = ty;
        }
        let data = this._renderData.data;
        for (let i = 0, len = data.length; i < len; ++i) {
            data[i].x = tx;
            data[i].y = ty;
        }
        this.fitXY(data);
    }
    //自动适配XY，修改顶点xy数据后需主动调用该函数
    private fitXY(data: IRenderData[]) {
        let vb = this._renderData.chunk.vb;
        if (JSB) {//原生平台默认会进行一次本地坐标到世界坐标的转换，因此先用逆矩阵抵消该转换，否则拖尾会受节点旋转影响
            let im = Mat4.invert(new Mat4(), this.node['_mat']), im00 = im.m00, im01 = im.m01, im04 = im.m04, im05 = im.m05;
            if (this._isWorldXY) {
                let im12 = im.m12, im13 = im.m13;
                for (let i = 0, len = data.length; i < len; ++i) {
                    let x = data[i].x, y = data[i].y;
                    data[i].x = im00 * x + im04 * y + im12;
                    data[i].y = im01 * x + im05 * y + im13;
                }
            } else {
                for (let i = 0, len = data.length; i < len; ++i) {
                    let x = data[i].x, y = data[i].y;
                    data[i].x = im00 * x + im04 * y;
                    data[i].y = im01 * x + im05 * y;
                }
            }
        } else {
            if (this._isWorldXY) {
                for (let i = 0, len = vb.length, step = this._renderData.floatStride, id = 0; i < len; i += step, ++id) {
                    vb[i] = data[id].x;
                    vb[i + 1] = data[id].y;
                }
            } else {
                let m = this.node.worldMatrix, m12 = m.m12, m13 = m.m13;
                for (let i = 0, len = vb.length, step = this._renderData.floatStride, id = 0; i < len; i += step, ++id) {
                    vb[i] = data[id].x + m12;
                    vb[i + 1] = data[id].y + m13;
                }
            }
        }
    }
    //根据关节数，均匀分布顶点UV
    private updateUV() {
        let spriteFrame = this._spriteFrame;
        if (!spriteFrame) return;
        let renderData = this._renderData;
        let vb = renderData.chunk.vb;
        let step = renderData.floatStride;
        let uvStep = 1 / (this.joints.length - 1);
        for (let i = 3, id = 0, len = vb.length; i < len; i += step, ++id) {
            vb[i] = id & 1;
            vb[i + 1] = 1 - uvStep * (id >> 1);
        }
        let uv = spriteFrame.uv;
        if (spriteFrame['_rotated']) {
            var uvL = uv[0], uvB = uv[1], uvW = uv[4] - uvL, uvH = uv[3] - uvB;
            for (let i = 3, len = vb.length, step = renderData.floatStride; i < len; i += step) {
                let tmp = vb[i];
                vb[i] = uvL + vb[i + 1] * uvW;
                vb[i + 1] = uvB + tmp * uvH;
            }
        } else {
            var uvL = uv[0], uvB = uv[1], uvW = uv[2] - uvL, uvH = uv[5] - uvB;
            for (let i = 3, len = vb.length, step = renderData.floatStride; i < len; i += step) {
                vb[i] = uvL + vb[i] * uvW;
                vb[i + 1] = uvB + vb[i + 1] * uvH;
            }
        }
    }
    //计算顶点颜色
    private updateColor() {
        let vb = this._renderData.chunk.vb;
        let headOpa = this._headOpacity / 255;
        let opaDelt = (headOpa - this._tailOpacity / 255) / (this._length - 1);
        let color = this.color, r = color.r / 255, g = color.g / 255, b = color.b / 255, a = color.a / 255;
        for (let i = 5, len = vb.length, step = this._renderData.floatStride * 2, id = 0; i < len; i += step, ++id) {
            vb[i] = vb[i + 9] = r;
            vb[i + 1] = vb[i + 10] = g;
            vb[i + 2] = vb[i + 11] = b;
            vb[i + 3] = vb[i + 12] = a * (headOpa - opaDelt * id);
        }
    }
    //如果材质为空，则设置为默认材质
    public updateMaterial() {
        super['updateMaterial']();
        this._customMaterial ??= this.getSharedMaterial(0);
    }
    //可以传入cc.SpriteFrame图集帧（支持合批，推荐），或单张图片cc.Texture2D
    private updateSpriteFrame() {
        let spriteFrame = this._spriteFrame;
        if (!spriteFrame) { this.atlas = null; return; }
        this._renderData && (this._renderData.textureDirty = true);
        if (EDITOR) {
            if (!spriteFrame['_atlasUuid']) { this.atlas = null; return; }
            assetManager.loadAny(spriteFrame['_atlasUuid'], (err: Error, asset: SpriteAtlas) => {
                if (err) { this.atlas = null; return; }
                this.atlas = asset;
            });
        }
    }
    protected _render(render: any) {
        render.commitComp(this, this._renderData, this._spriteFrame, this._assembler, null);
        this.markForUpdateRenderData();
    }
    protected _canRender(): boolean {
        return super._canRender() && !!(this._spriteFrame?.texture);
    }
    //Web平台，将renderData的数据提交给GPU渲染，renderData.data使用世界坐标
    //原生平台并不会执行该函数，引擎另外实现了渲染函数，renderData.data使用本地坐标
    private fillBuffer() {
        let renderData = this._renderData;
        let chunk = renderData.chunk;
        let vid = chunk.vertexOffset;
        let meshBuffer = chunk.meshBuffer;
        let iData = meshBuffer.iData;
        let ib = chunk.ib;
        for (let i = 0, len = renderData.indexCount, offset = meshBuffer.indexOffset; i < len; iData[offset++] = vid + ib[i++]);
        meshBuffer.indexOffset += renderData.indexCount;
    }
}
