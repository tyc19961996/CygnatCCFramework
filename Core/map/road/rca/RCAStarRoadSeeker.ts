import BinaryTreeNode from "../BinaryTreeNode";
import IRoadSeeker from "../IRoadSeeker";
import PathLog from "../PathLog";
import { PathOptimize } from "../PathOptimize";
import { PathQuadSeek } from "../PathQuadSeek";
import RoadNode from "../RoadNode";
import CornerRoadNode, { CornerRoadNodeType } from "./CornerRoadNode";
import CornerRoadUtils from "./CornerRoadUtils";
import RCABakingData from "./RCABakingData";

/**
 * RCA 寻路算法。备注：RCA寻路是目前所有寻路算法中速度最快的算法，速度远超如今流行的“A星寻路”和“跳点寻路（jps）”，当你遇到大地图或者很多角色同时寻路时，使用RCA寻路能保证很高的游戏帧率 
 * @作者 落日故人 QQ 583051842
 * 
 * 目前寻路速度最快的寻路算法，远远快于当下流行的其它寻路算法，如A星和jps(跳点寻路)，RCA由本作者研究出来的新寻路算法。如果遇到问题，可以联系作者：QQ 583051842
 * 使用范围：在大地图寻路时，或者在中小地图有几百上千角色同时寻路时，其它的寻路算法消耗巨大，导致游戏帧率下降到几帧或直接卡死不动，这时使用RCA寻路算法可轻易解决问题。
 * 
 * RCA的原意是：Ray(射线)，Corner(墙角)，Astar(A星寻路)，三大元素组成的首选字母组成。
 * (1)、Ray代表着视野，从一个点向另一个点发射射线，可检测中途有没有碰到障碍
 * (2)、Corner分为外墙角和内墙角，记录着地图某个区域内的可视信息，即一个墙角周围都有哪些可直达的其它墙角，或者这个墙角是否可直达目标点
 * (3)、Astar寻路，这里的Astar寻路不是基于地图格子寻路的，而是基于墙角寻路，并且是外墙角。地图中墙角的数量是远少于地图格子的数量的，所以寻路效率是远高于基于地图格子的寻路
 * 
 * RCA寻路快的原因：“看路”，“问路”
 * 为什么RCA寻路寻路会比其它寻路快很多？因为打破了旧寻路算法常规方式，代入了现实中人们寻找地点的方式。
 * 现实中，我们去到一个陌生的城市找地址，我们会向这个地址的方位看，如果看得见说明找到路了，如果看不见就问周围的人，如问保安，摊贩，环卫，如果他们知道那就找到了，如果不知道那就去下一个地点问其它人，直到问到路为止。
 * 
 * 清楚了吗？RCA不再是像其它寻路算法那样找个启发点按某些启发条件无脑搜寻目标，而是基于我们现实中的看路和问路。
 * 所以RCA的寻路核心思想就是“看路”和“问路”。当然了，看路不比瞎子摸路快吗？问路不比无脑探索速度快吗？这就是为什么RCA寻路远快与其它寻路算法，即使面对大地图也能轻松寻到目标。
 * 
 * 寻路的和核心思想：“看”和“问”
 * (1)、看：即Ray(射线)，通过射线可检查一个点是否看到另一个点，只要两个点之间没有障碍就代表能看得见。
 * (2)、问：即问Corner(墙角)，墙角在地图初始化时就提前记录了周围可直达哪些其它墙角，在看不到路时问墙角，墙角会告诉你怎么走
 * 
 * 寻路基本原理：
 * (1)、先直线观察：从起始点向目标点发一条射线，如果能直达，寻路成功。如果不能直达，即射线碰撞到了障碍，走第2步摸墙角。
 * (2)、第1步的射线碰撞到障碍的地方顺着墙壁摸(左右或者上下摸，看射线碰撞方向)，摸到最近的一个墙角结束。
 * (3)、如果摸到最近的墙角是外墙角，则以这个外墙角做为Astar寻路的起始点搜寻目标点。
 * (4)、如果摸到的墙角是内墙角点，则查找这个内墙角点附近离起始点最近并可直达起始点的外墙角点，做第3步处理
 * (5)、AStar寻路是基于外墙角的数据集寻路的，每检检测一个外墙角时。先检测这个外墙角是否能看得见目标（即射线检测），看得见寻路结束，找到目标。看不见时找下一个墙角继续检测是否看得见目标，看不见继续找，直到找到目标为止。
 */
export default class RCAStarRoadSeeker implements IRoadSeeker
{
    /**
     * 横向移动一个格子的代价
     */		
    protected COST_STRAIGHT:number = 10; 
        
    /**
     * 斜向移动一个格子的代价
     */		
    protected COST_DIAGONAL:number = 14;
    
    /**
     *最大搜寻步骤数，超过这个值时表示找不到目标 
    */		
    protected maxStep:number = 1000;
    
    /**
     * 开启列表
     */		
    protected _openlist:Array<RoadNode>; 
    
    /**
     *关闭列表 
    */		
    protected _closelist:Array<RoadNode>;

    /**
     * 二叉堆存储结构
     */
    protected _binaryTreeNode:BinaryTreeNode = new BinaryTreeNode();
    
    /**
     *开始节点 
    */		
    protected _startNode:RoadNode;
    
    /**
     *当前检索节点 
    */		
    protected _currentNode:RoadNode;
    
    /**
     *目标节点 
    */		
    protected _targetNode:RoadNode;
    
    /**
     *地图路点数据 
    */		
    protected _roadNodes:{[key:number]:RoadNode};

    /**
     * 外墙角路点列表
     */
    protected _outSideCornerList:CornerRoadNode[] = [];

    /**
     * 内墙角路点列表
     */
    protected _inSideCornerList:CornerRoadNode[] = [];

    /**
     * 墙角路点存储字典，存的数据包含内墙角和外墙角，作用是根据位置坐标快速查找墙角路点
     */
    protected _cornerRoadNodes:{[key:number]:CornerRoadNode} = {};

    /**
     *这个变量记录的是，Astar寻路阶段当前检索的外墙角路点
    */		
    protected _currentOutCornerNode:CornerRoadNode;

    /**
     *Astar寻路阶段, 作为寻路起始的外墙角路点。（因为Astar寻路是基于所有外墙角作为集合数据寻路的，所以起始点必须是外墙角点） 
    */		
    protected _firstSearchOutCornerNode:CornerRoadNode;

    
    /**
     *用于检索一个节点周围8个点的向量数组 
    */		
    protected _round:number[][] = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]]
    
    protected handle:number = -1;

    /**
     * 是否优化路径
     */
    protected optimize:boolean = true;

    /**
     * 定义一个路点是否能通过，如果是null，则用默认判断条件
     */
    protected _isPassCallBack:Function = null;

    /**
     * 搜寻深度
     */
    public seekDepth:number = 0;
    
    
    public constructor(roadNodes:{[key:string]:RoadNode})
    {
        this._roadNodes = roadNodes;
    }

    /**
     * 设置最大寻路步骤
     * @param maxStep 
     */
    public setMaxSeekStep(maxStep:number)
    {
        this.maxStep = maxStep;
    }

    /**
     * 设置路径优化等级, RCA寻路只有一种优化等级，所以是空函数
     * @param optimize 
     */
    public setPathOptimize(optimize:PathOptimize)
    {

    }

    /**
     * 设置4方向路点的寻路类型，RCA寻路是基于外墙角寻路的，所以不存在4方向或8方向寻路类型，所以是空函数
     * @param pathQuadSeek 
     */
    public setPathQuadSeek(pathQuadSeek:PathQuadSeek)
    {

    }

    /**
     * 定义一个路点是否能通过，如果参数是null，则用默认判断条件
     * @param callback 
     */
    public setRoadNodePassCondition(callback: Function) 
    {
        this._isPassCallBack = callback;
    }



    /**
     * 烘焙地图，如果地图地形数据有改变，可以重新执行烘焙。没变化不要做烘焙，因为这个操作非常消耗性能
     */
    public baking():void
    {
        CornerRoadUtils.instance.init(this, this._roadNodes);
        this._outSideCornerList = CornerRoadUtils.instance.getOutSideCornerList(); 
        this._inSideCornerList = CornerRoadUtils.instance.getInSideCornerList();
        this.storeCornerRoadNodes(this._outSideCornerList,this._inSideCornerList); 
        this.linkAllCornerNodes(this._outSideCornerList,this._inSideCornerList); //这行互相链接所有可直达的墙角是运算消耗最大的
    }

    /**
     * 以外部提供给烘焙数据初始化RCA寻路组件
     * @param data 
     */
    public initBakingData(data:RCABakingData)
    {
        CornerRoadUtils.instance.init(this, this._roadNodes);
        var isBakingDataError:boolean = false; //烘焙数据是否错误

        try {
            isBakingDataError = !this.tryInitBakingData(data);
        } catch (err) {
            isBakingDataError = true;
            console.error("解析烘焙数据发生异常，原因：",err);
        }

        //如果初始化的烘焙数据有误，抛弃这个数据，自动重新烘焙
        if(isBakingDataError)
        {
            console.warn(`烘焙的数据有误，抛弃烘焙数据，寻路组件自动重新烘焙，会消耗一点时间。请开发者检查烘焙数据错误原因，如果不了解可联系请教这个寻路算法的作者：qq583051842`);
            this.baking(); //不用烘焙数据了，自行烘焙。
        }else
        {
            console.log("烘焙数据初始化成功");
        }
    }

    /**
     * 尝试初始化烘焙数据
     * @param data 
     * @returns 初始化成功返回 true
     */
    public tryInitBakingData(data:RCABakingData):boolean
    {
        //------------------------提前判断烘焙数据是否有效---------------------------
        if(data.linkBetweenTwoOutSideCornerDatas.length % 4 != 0)
        {
            console.error(`烘焙的外墙角数据有误，数据长度不是4的倍数 dataLen =`,len);
            return false;
        }

        if(data.linkBetweenInSideCornerToOutSideCornerDatas.length % 4 != 0)
        {
            console.error(`烘焙的内墙角数据有误，数据长度不是4的倍数 dataLen =`,len);
            return false;
        }

        var len:number;

        //---------------------先读取烘焙数据里所有的外墙角和内墙角--------------------
        var outSideCornerList:CornerRoadNode[] = [];
        len = data.outSideCornerCoordinates.length;

        for(var i:number = 0; i < len; i++)
        {
            var cx:number = data.outSideCornerCoordinates[i][0];
            var cy:number = data.outSideCornerCoordinates[i][1];
            var roadNode:RoadNode = this.getRoadNode(cx, cy);

            if(roadNode == null)
            {
                console.error(`烘焙的外墙角数据有误，坐标 (cx = ${cx}, cy= ${cy}), 不在地图内`);
                return false;
            }

            var cornerRoadNode:CornerRoadNode = new CornerRoadNode();
            cornerRoadNode.roadNode = roadNode;
            cornerRoadNode.cornerType = 0;
            outSideCornerList.push(cornerRoadNode);
        }

        var inSideCornerList:CornerRoadNode[] = [];

        len = data.inSideCornerCoordinates.length;

        for(var i:number = 0; i < len; i++)
        {
            var cx:number = data.inSideCornerCoordinates[i][0];
            var cy:number = data.inSideCornerCoordinates[i][1];
            var roadNode:RoadNode = this.getRoadNode(cx, cy);

            if(roadNode == null)
            {
                console.error(`烘焙的内墙角数据有误，坐标 (cx = ${cx}, cy= ${cy}), 不在地图内`);
                return false;
            }

            var cornerRoadNode:CornerRoadNode = new CornerRoadNode();
            cornerRoadNode.roadNode = roadNode;
            cornerRoadNode.cornerType = 1;
            inSideCornerList.push(cornerRoadNode);
        }

        this._outSideCornerList = outSideCornerList; 
        this._inSideCornerList = inSideCornerList;
        this.storeCornerRoadNodes(this._outSideCornerList,this._inSideCornerList); 

        //------------------开始处理所有外墙角两两之间的链接关系------------------------
        len = data.linkBetweenTwoOutSideCornerDatas.length;

        for(var i:number = 0; i < len; i += 4)
        {
            // 每4个数组元素为一对墙角的连接数据，前两个元素是第一个外墙角坐标，后两个元素是第二个外墙角坐标
            var cx1:number = data.linkBetweenTwoOutSideCornerDatas[i];
            var cy1:number = data.linkBetweenTwoOutSideCornerDatas[i + 1];

            var cx2:number = data.linkBetweenTwoOutSideCornerDatas[i + 2];
            var cy2:number = data.linkBetweenTwoOutSideCornerDatas[i + 3];

            var cornerRoadNode1:CornerRoadNode = this.getCornerRoadNode(cx1, cy1);
            if(cornerRoadNode1 == null)
            {
                console.error(`烘焙链接的内墙角数据有误，坐标 (cx = ${cx1}, cy= ${cy1}), 不在地图内`);
                return false;
            }

            var cornerRoadNode2:CornerRoadNode = this.getCornerRoadNode(cx2, cy2);
            if(cornerRoadNode2 == null)
            {
                console.error(`烘焙链接的内墙角数据有误，坐标 (cx = ${cx2}, cy= ${cy2}), 不在地图内`);
                return false;
            }

            cornerRoadNode1.addLinkNode(cornerRoadNode2);
            cornerRoadNode2.addLinkNode(cornerRoadNode1);
        }


        //-------------------开始处理内墙角连外墙角数据--------------------------
        len = data.linkBetweenInSideCornerToOutSideCornerDatas.length;

        for(var i:number = 0; i < len; i += 4)
        {
            // 每4个数组元素为一对墙角的连接数据, 前两个元素是内墙角坐标，后两个元素是外墙角坐标

            var cx1:number = data.linkBetweenInSideCornerToOutSideCornerDatas[i];
            var cy1:number = data.linkBetweenInSideCornerToOutSideCornerDatas[i + 1];

            var cx2:number = data.linkBetweenInSideCornerToOutSideCornerDatas[i + 2];
            var cy2:number = data.linkBetweenInSideCornerToOutSideCornerDatas[i + 3];

            var cornerRoadNode1:CornerRoadNode = this.getCornerRoadNode(cx1, cy1); //第一个墙角是内墙角
            if(cornerRoadNode1 == null)
            {
                console.error(`inside 烘焙链接的内墙角数据有误，坐标 (cx = ${cx1}, cy= ${cy1}), 不在地图内`);
                return false;
            }

            var cornerRoadNode2:CornerRoadNode = this.getCornerRoadNode(cx2, cy2); //第二个墙角是外墙角
            if(cornerRoadNode2 == null)
            {
                console.error(`inside 烘焙链接的内墙角数据有误，坐标 (cx = ${cx2}, cy= ${cy2}), 不在地图内`);
                return false;
            }

            cornerRoadNode1.addLinkNode(cornerRoadNode2); //内墙角只需单向链接外墙角

        }

        return true;
        
    }

    /**
     * 获得地图烘焙数据，可以通过这个接口拿到烘焙数据并导出成数据文件（web端可以生成数据文件），之后游戏可以用数据文件初始化RCA寻路组件，可大大降低自动烘焙带来的时间消耗
     * @returns 
     */
    public getBakingData():RCABakingData
    {
        this.baking();

        var data:RCABakingData = new RCABakingData();

        //--------------------开始处理外墙角链接数据-----------------------
        var len:number = this._outSideCornerList.length;

        var keyLinkDic:{[key:string]:boolean} = {};

        var chongf1:number  = 0;
        var chongf2:number  = 0;

        for(var i:number = 0; i < len; i++)
        {
            var outSideCornerRoadNode:CornerRoadNode = this._outSideCornerList[i];
            data.outSideCornerCoordinates.push([outSideCornerRoadNode.roadNode.cx,outSideCornerRoadNode.roadNode.cy]);

            var linkCornerNodes:CornerRoadNode[] = outSideCornerRoadNode.linkOtherNodes;

            for(var j:number = 0; j < linkCornerNodes.length; j++)
            {
                var otherOutSideCornerRoadNode:CornerRoadNode = linkCornerNodes[j];
                var key1:string = outSideCornerRoadNode.roadNode.cx + "_" + outSideCornerRoadNode.roadNode.cy;
                var key2:string = otherOutSideCornerRoadNode.roadNode.cx + "_" + otherOutSideCornerRoadNode.roadNode.cy;

                //这个if判定是去重复，两个点链接，墙角1链接墙角2和墙角2链接墙角1是相同的，不用存两份数据
                if(!keyLinkDic[key1 + "_" + key2] && !keyLinkDic[key2 + "_" + key1])
                {
                    data.linkBetweenTwoOutSideCornerDatas.push(
                        outSideCornerRoadNode.roadNode.cx, outSideCornerRoadNode.roadNode.cy, otherOutSideCornerRoadNode.roadNode.cx, otherOutSideCornerRoadNode.roadNode.cy
                    );

                    keyLinkDic[key1 + "_" + key2] = true;
                    keyLinkDic[key2 + "_" + key1] = true;
                }else
                {
                    chongf1 ++;
                }

            }

        }


        //----------------------开始处理内墙角链接数据--------------------------
        len = this._inSideCornerList.length;

        for(var i:number = 0; i < len; i++)
        {
            var inSideCornerRoadNode:CornerRoadNode = this._inSideCornerList[i];
            data.inSideCornerCoordinates.push([inSideCornerRoadNode.roadNode.cx,inSideCornerRoadNode.roadNode.cy]);

            var linkCornerNodes:CornerRoadNode[] = inSideCornerRoadNode.linkOtherNodes;

            for(var j:number = 0; j < linkCornerNodes.length; j++)
            {
                var otherOutSideCornerRoadNode:CornerRoadNode = linkCornerNodes[j]; //内墙角链接的都是外墙角数据
                var key1:string = inSideCornerRoadNode.roadNode.cx + "_" + inSideCornerRoadNode.roadNode.cy;
                var key2:string = otherOutSideCornerRoadNode.roadNode.cx + "_" + otherOutSideCornerRoadNode.roadNode.cy;

                if(!keyLinkDic[key1 + "_" + key2] && !keyLinkDic[key2 + "_" + key1])
                {
                    data.linkBetweenInSideCornerToOutSideCornerDatas.push(
                        inSideCornerRoadNode.roadNode.cx,inSideCornerRoadNode.roadNode.cy,otherOutSideCornerRoadNode.roadNode.cx, otherOutSideCornerRoadNode.roadNode.cy
                    );

                    keyLinkDic[key1 + "_" + key2] = true;
                    keyLinkDic[key2 + "_" + key1] = true;

                }else
                {
                    chongf2 ++;
                }

            }
        }

        return data;
    }

    protected storeCornerRoadNodes(outSideCornerList:CornerRoadNode[], inSideCornerList:CornerRoadNode[])
    {
        this._cornerRoadNodes = {};

        //内墙角存储
        for(var i:number = 0; i < outSideCornerList.length; i++)
        {
            var cornerRoadNode:CornerRoadNode = outSideCornerList[i];
            var cx:number = cornerRoadNode.roadNode.cx;
            var cy:number = cornerRoadNode.roadNode.cy
            var key:string = cx + "_" + cy;
            this._cornerRoadNodes[key] = cornerRoadNode;
        }

        //外墙角单向连接内墙角
        for(var i:number = 0; i < inSideCornerList.length; i++)
        {
            var cornerRoadNode:CornerRoadNode = inSideCornerList[i];
            var cx:number = cornerRoadNode.roadNode.cx;
            var cy:number = cornerRoadNode.roadNode.cy
            var key:string = cx + "_" + cy;
            this._cornerRoadNodes[key] = cornerRoadNode;
        }

    }

    //连接所有墙角
    public linkAllCornerNodes(outSideCornerList:CornerRoadNode[], inSideCornerList:CornerRoadNode[]):void
    {
        //内墙角互相连接
        for(var i:number = 0; i < outSideCornerList.length - 1; i++)
        {
            var cornerRoadNode1:CornerRoadNode = outSideCornerList[i];

            for(var j:number = i + 1; j < outSideCornerList.length; j++)
            {
                var cornerRoadNode2:CornerRoadNode = outSideCornerList[j];

                // this.isArriveBetweenTwoNodes 和 CornerRoadUtils.instance.rayBetweenTwoNodes 功能一样的，都是射线检测，只不过返回值不一样。用isArriveBetweenTwoNodes返回bool值好一点，因为不用返回数组对象，对内存优化有利
                if(this.isArriveBetweenTwoNodes(cornerRoadNode1.roadNode,cornerRoadNode2.roadNode)) 
                {
                    cornerRoadNode1.addLinkNode(cornerRoadNode2);
                    cornerRoadNode2.addLinkNode(cornerRoadNode1);
                }
            }
        }

        //外墙角单向连接内墙角
        for(var i:number = 0; i < inSideCornerList.length; i++)
        {
            var cornerRoadNode1:CornerRoadNode = inSideCornerList[i];

            for(var j:number = 0; j < outSideCornerList.length; j++)
            {
                var cornerRoadNode2:CornerRoadNode = outSideCornerList[j];

                // this.isArriveBetweenTwoNodes 和 CornerRoadUtils.instance.rayBetweenTwoNodes 功能一样的，都是射线检测，只不过返回值不一样。用isArriveBetweenTwoNodes返回bool值好一点，因为不用返回数组对象，对内存优化有利
                if(this.isArriveBetweenTwoNodes(cornerRoadNode1.roadNode,cornerRoadNode2.roadNode))
                {
                    cornerRoadNode1.addLinkNode(cornerRoadNode2);
                }
            }
        }
    }

    /**
     * 根据世界坐标获得墙角路节点
     * @param cx 
     * @param cy 
     * @returns 
     */
    public getCornerRoadNode(cx:number, cy:number):CornerRoadNode
    {
        var key:string = cx + "_" + cy;
        return this._cornerRoadNodes[key];
    }

    /**
     * 寻路入口方法，如果目标点是不可通过路点，则寻路失败。 
     * 如果游戏开发，角色寻路时及时目标点不可走也希望能寻路到比较靠近目标点的一个路点，这种情况建议使用函数seekPath2
     * @param startNode 
     * @param targetNode 
     * @returns 
     */		
    public seekPath(startNode:RoadNode,targetNode:RoadNode):Array<RoadNode>
    {
        this._startNode = startNode;
        this._currentNode = startNode;
        this._targetNode = targetNode;
        
        if(!this._startNode || !this._targetNode)
            return [];
        
        if(this._startNode == this._targetNode)
        {
            return [this._targetNode];
        }
        
        if(!this.isPassNode(this._targetNode))
        {
            PathLog.log("目标不可达到：");
            return [];
        }

        this._startNode.g = 0; //先重置起始节点的g值，因为后面的逻辑在顺墙找外墙角点时，要根据起始点预设路径。
        this._firstSearchOutCornerNode = null; //重置
        this._currentOutCornerNode = null; //重置


        //---------------------------------------------------RCA寻路第一步:-------------------------------------------------------------------------------------
        //先尝试从寻路起始点到目标点之间发一条射线。
        //(1)、如果返回空，说明射线能直达目标点，把起始点和目标点作为路径数组返回，寻路结束。
        //(2)、如果不返回空，说明射线碰撞到障碍，用射线碰撞到的障碍信息做第二步处理。

        var hitNodePair:RoadNode[] = CornerRoadUtils.instance.rayBetweenTwoNodes(this._startNode,this._targetNode); //返回值一个碰撞信息的路点数组，第一个数组元素是碰撞到墙壁前的一个路点，第二个元素是碰撞到墙后的路点
        if(hitNodePair == null) //返回空，说明射线没有碰撞到墙壁，说明起始点直达终点，直接返回起始点和终点作为路径即可
        {
            PathLog.log("射线没有碰撞到障碍点, 即可以两点一线直达");
            return [this._startNode, this._targetNode]; //返回起始点和目标点组成的数组路径
        }

        //---------------------------------------------------RCA寻路第二步-------------------------------------------------------------------------------------------------
        //第一步的起始点到目标点发射射线遇到了障碍，需要做一下处理。
        //(1)、拿到射线碰撞到墙前位置的路点，以这个路为中心，沿着墙壁边缘左右（射线垂直碰墙的情况）或上下（射线水平碰墙的情况）摸索，直到摸到最近的一个墙角为止
        //(2)、摸到最近的墙角之后，判断这墙角的类型，墙角的类型分为外墙角和内墙角。
        //(3)、如果是外墙角，则用这个外墙角做第三步的基于墙角的AStar寻路的起始点。
        //(4)、如果是内墙角，则以这个内墙角为中心，并以这个内墙角的视野由近到远找到第一个可直达起始点的外墙角，并以这个外墙角做第三步的基于墙角的AStar寻路的起始点。

        //先声明几个定理
        //定理1：在密闭容器空间内，所有的墙角都是可以连通的，也就是每个墙角可以直接或间接通往别的墙角，所以把所有墙角作为一个整体，可以通过AStar找到通往别的墙角的最短路径，对了，这里说的用于Star寻路的墙角只包括外墙角，因为外墙角已经够用，内墙角没必要添加进去，添加进去反而得不到最短路径
        //定理2：起始点向目标点发射线如果碰撞到墙壁，并且顺着墙壁找到内墙角，那么这个内墙角关联的所有外墙角中，一定存在最少一个可以直达起始点的外墙角。
        //定理3：顺射线碰撞点摸到的内墙角是一定看不到目标点的，如果能看到说明起始点和目标点是可以两点一线直达的，也就不存在起始点向目标点发射线会碰撞到墙壁情况了，所以内墙角要做的作用只是帮起始点找到离它最近的并可直达它的外墙角
        //定理4：内墙角只有一种情况不会关联外墙角，也就是在一个矩形的密闭空间内，4个角落各有一个内墙角，空间内并无任何外墙角


        var beforeHitWallNode:RoadNode = hitNodePair[0]; //射线碰到墙壁前的一个路点
        var wallNode:RoadNode = hitNodePair[1];//射线碰到墙的墙壁障碍路点
        if(beforeHitWallNode == null || wallNode == null)
        {
            //目标点在地图外的情况才会发生
            console.error("射线碰墙信息出现空值","this._startNode",this._startNode,"targetNode",targetNode,"beforeHitWallNode",beforeHitWallNode,"wallNode",wallNode);
            return [];
        }

        var nearestCornerNode:CornerRoadNode = CornerRoadUtils.instance.getRayHitNearestCorner(beforeHitWallNode, wallNode); //离起始点最近的墙角点，可能起始点无法直达这个墙角点，下面的代码要做特殊处理
        if(nearestCornerNode == null)
        {
            PathLog.log(`beforeHitWallNode =  ${beforeHitWallNode.toString()} , wallNode = ${wallNode.toString()}`);
            console.error("找不到最近的墙角点，目标不可达到。这种情况几乎不可能发生，除非墙壁无限长，或者起始点在障碍区内，不过如果这段日志打印出来时要好好检查原因");
            return [];
        }

        //下面的墙角类型cornerType的值，0代表外墙角，1代表内墙角
        if(nearestCornerNode.cornerType == CornerRoadNodeType.outSideCorner) //如果摸到的墙角是外墙角。
        {
            var nearestOutCornerNode:CornerRoadNode = nearestCornerNode; //初始化离起始点最近的一个外墙角点
            PathLog.log("起始点到目标点射线碰撞到的障碍点处找到离碰撞点最近的外墙角点",`(${nearestOutCornerNode.roadNode.cx},${nearestOutCornerNode.roadNode.cy})`);

            if(nearestOutCornerNode.roadNode != this._startNode) //如果第一个外墙角点不等于起始点
            {
                if(CornerRoadUtils.instance.rayBetweenTwoNodes(nearestOutCornerNode.roadNode,this._startNode) == null) //通过射线的方式确认是否这个外墙角可直达起始点
                {
                    this.setChildNodeToParentNode(nearestOutCornerNode.roadNode, this._startNode); //能直达就提前预设确认了父子关系的两个路点，因为第三步的AStar寻路是基于最近的这个外墙角做为起始点寻路的
                }else
                {
                    PathLog.log("最近的一个外墙角点无法直达起始点！");

                    var bestLinkOutCornerNode:RoadNode = CornerRoadUtils.instance.getBestLinkOutCornerNode(this._startNode,beforeHitWallNode,nearestOutCornerNode); //首个外墙角不能直达时，尝试找其它的拐角点可以让起始点能直达这个外墙角
                    if(bestLinkOutCornerNode == null)
                    {
                        bestLinkOutCornerNode = beforeHitWallNode;
                    }else
                    {
                        //PathLog.log(`找到一个合适的拐角点`, bestLinkOutCornerNode.toString());
                    }

                    if(CornerRoadUtils.instance.isOutSideCorner(bestLinkOutCornerNode)) //如果这个拐角点正好是个外墙角, 把这个外墙角替换之前那个外墙角成为最近的外墙角
                    {
                        var newNearestOutCornerNode:CornerRoadNode = this.getCornerRoadNode(bestLinkOutCornerNode.cx,bestLinkOutCornerNode.cy);
                        if(newNearestOutCornerNode == null)
                        {
                            PathLog.log("墙角数据有误，墙角节点找不到对应的墙角数据，请检查原因：bestLinkOutCornerNode = " + bestLinkOutCornerNode.toString());
                            return [];
                        }

                        nearestOutCornerNode = newNearestOutCornerNode; //更换更优的最近外墙角点。备注，如果不更换可能会发生两个墙角点直接的parent互相关联对方引起死循环
                    }
                    
                    if(bestLinkOutCornerNode == nearestOutCornerNode.roadNode) //说明最近外墙角点被更换了
                    {
                        this.setChildNodeToParentNode(nearestOutCornerNode.roadNode, this._startNode);
                    }else
                    {
                        this.setChildNodeToParentNode(bestLinkOutCornerNode, this._startNode); //提前预设确认了父子关系的两个路点
                        this.setChildNodeToParentNode(nearestOutCornerNode.roadNode, bestLinkOutCornerNode); //提前预设确认了父子关系的两个路点
                    }

                }

            }else
            {
                PathLog.log("寻路起始点正好处于一个外墙角处!");
            }

            
            this._firstSearchOutCornerNode = nearestOutCornerNode;
            this._currentOutCornerNode = nearestOutCornerNode;

        }else
        {
            //如果找到的首个离起始点到目标点的射线碰撞墙壁点是外墙角，则通过这个外墙角找出一个合适的最近外墙角

            var nearestInCornerNode:CornerRoadNode = nearestCornerNode; //内墙角
            PathLog.log("起始点到目标点射线碰撞到的障碍点处找到离碰撞点最近的内墙角点",`(${nearestInCornerNode.roadNode.cx},${nearestInCornerNode.roadNode.cy})`);

            var nearestOutCornerNode:CornerRoadNode = null;

            var linkOtherOutCornerNodes:CornerRoadNode[] = nearestInCornerNode.getAndSortLinkOutCornerRoadNodes(); //获得这个内墙角关联的所有外墙角，并且有近到远排好序了
            var len:number = linkOtherOutCornerNodes.length;
            for(var i:number = 0; i < len; i++)
            {
                var outCornerNode:CornerRoadNode = linkOtherOutCornerNodes[i];
                if(CornerRoadUtils.instance.rayBetweenTwoNodes(outCornerNode.roadNode,this._startNode) == null)
                {
                    //在内墙角关联的所有外墙角中，找一个可以直达起始点的最短距离外墙角，因为getAndSortLinkOutCornerRoadNodes已经对链接点进行过由近到远排序，所以outCornerNode一定是距离最短那个
                    nearestOutCornerNode = outCornerNode; 
                    PathLog.log("找到一个内墙角关联并可直达起始点的外墙角!", outCornerNode);
                    break;
                }
            }

            if(nearestOutCornerNode == null) //这个内墙角无法找到任何关联的并且可直达起始点的外墙角，所以可以提前判断寻路无法找到目标点。
            {
                PathLog.log("内墙角周围找不到一个可直达起始点的外墙角，寻路失败！");
                return [];
            }

            if(nearestOutCornerNode.roadNode != this._startNode) //如果第一个内墙角点不等于起始点
            {
                this.setChildNodeToParentNode(nearestOutCornerNode.roadNode, this._startNode); //提前预设确认了父子关系的两个路点
            }
    
            this._firstSearchOutCornerNode = nearestOutCornerNode;
            this._currentOutCornerNode = nearestOutCornerNode;

        }

        if(this._currentOutCornerNode == null)
        {
            PathLog.log("没有找到一个外墙角点作为检索起始点，寻路失败！");
            return [];
        }

        //找到合适的最近外墙角后，先尝试从这个外墙角处发射线看是否能直达目标点，如果能就把目标点的parent设置给这个外墙角，寻路结束，返回路径。因为第三阶段的Astar寻路中不会对起始的外墙角做射线检查目标点
        if(CornerRoadUtils.instance.rayBetweenTwoNodes(this._currentOutCornerNode.roadNode, this._targetNode) == null)
        {
            PathLog.log("第一个外墙角处就找到了目标点，太好了！");
            this._targetNode.parent = this._currentOutCornerNode.roadNode;
            return this.getPath();
        }

        //---------------------------------------------------RCA寻路第三步----------------------------------------------------------------------------------
        //从第二步中找到的离起始点最近的外墙角点，以所有外墙角点作为数据集合，并以这个最近外墙角点作为Astar寻路的起始点做寻路

        //寻路过程中，每检索一个外墙角点时要做以下处理
        //(1)、先判断这个检索的外墙角是否是终点，如果是，则寻路结束，返回路径，否则下一步。
        //(2)、再判断这个检索的外墙角通过射线是否可直达终点，如果可以，则寻路结束，返回路径，否则下一步
        //(3)、查找这个检索的外墙角关联的其它外墙角，通过AStar的 f = g + h 中f值最优的新检索点，如果找不到新检索点，寻路失败，寻路结束。否则以这新的检索点再会到步骤(1)

        this._startNode.g = 0; //重置起始节点的g值
        this._startNode.resetTree(); //清除起始节点原有的二叉堆关联关系

        this._binaryTreeNode.refleshTag(); //刷新二叉堆tag，用于后面判断是不是属于当前次的寻路
        //this._binaryTreeNode.addTreeNode(this._startNode); //把起始节点设置为二叉堆结构的根节点

        var step:number = 0;
        
        while(true)
        {
            if(step > this.maxStep)
            {
                PathLog.log("没找到目标计算步骤为：",step);
                return [];
            }
            
            step++;
            this.seekDepth = step;
            
            this.searchRoundOutCornerNodes(this._currentOutCornerNode);
            
            if(this._binaryTreeNode.isTreeNull()) //二叉堆树里已经没有任何可搜寻的点了，则寻路结束，每找到目标
            {
                PathLog.log("没找到目标计算步骤为：",step);
                return [];
            }

            var currentSearchNode:RoadNode = this._binaryTreeNode.getMin_F_Node();
            //PathLog.log(`currentSearchNode (${currentSearchNode.cx},${currentSearchNode.cy})`,currentSearchNode);

            if(currentSearchNode == this._targetNode)
            {
                PathLog.log("找到目标计算步骤为：",step);
                return this.getPath();
            }else if(CornerRoadUtils.instance.rayBetweenTwoNodes(currentSearchNode, this._targetNode) == null)
            {
                //如果当前检索的外墙角点，向终点发射射线可直达
                PathLog.log("~~~~墙角视野找到目标点，寻路完成，计算步骤为：",step);
                this._targetNode.parent = currentSearchNode; // 把目标点的父节点为当前检索点，用于导出寻路路径
                return this.getPath();
            }
            else
            {
                //如果寻路过程中的某个节点是可以直达起始点的,把这节点的父节点设置为起始节点
                /*if(CornerRoadUtils.instance.rayBetweenTwoNodes(currentSearchNode, this._startNode) == null) 
                {
                    this.setChildNodeToParentNode(currentSearchNode,this._startNode); //setChildNodeToParentNode函数内已经包含打入关闭列表处理
                }else
                {
                    this._binaryTreeNode.setRoadNodeInCloseList(currentSearchNode);//打入关闭列表标记
                }*/

                this._binaryTreeNode.setRoadNodeInCloseList(currentSearchNode);//打入关闭列表标记
                
                this._currentOutCornerNode = this.getCornerRoadNode(currentSearchNode.cx,currentSearchNode.cy); //获得这个点的墙角点
            }                    
        }


        return [];

    }

    /**
     *寻路入口方法 如果没有寻到目标，则返回离目标最近的路径
    * @param startNode
    * @param targetNode
    * @return 
    * 
    */		
    public seekPath2(startNode:RoadNode,targetNode:RoadNode):Array<RoadNode>
    {
        this._startNode = startNode;
        this._currentNode = startNode;
        this._targetNode = targetNode;
        
        if(!this._startNode || !this._targetNode)
            return [];
        
        if(this._startNode == this._targetNode)
        {
            return [this._targetNode];
        }
        
        if(!this.isPassNode(this._startNode))
        {
            //起始点在障碍区内，无法使用RCA寻路。
            return [];
        }

        this._startNode.g = 0; //先重置起始节点的g值，因为后面的逻辑在顺墙找外墙角点时，要根据起始点预设路径。
        this._firstSearchOutCornerNode = null; //重置
        this._currentOutCornerNode = null; //重置


        //---------------------------------------------------RCA寻路第一步:-------------------------------------------------------------------------------------
        //先尝试从寻路起始点到目标点之间发一条射线。
        //(1)、如果返回空，说明射线能直达目标点，把起始点和目标点作为路径数组返回，寻路结束。
        //(2)、如果不返回空，说明射线碰撞到障碍，用射线碰撞到的障碍信息做第二步处理。

        var hitNodePair:RoadNode[] = CornerRoadUtils.instance.rayBetweenTwoNodes(this._startNode,this._targetNode); //返回值一个碰撞信息的路点数组，第一个数组元素是碰撞到墙壁前的一个路点，第二个元素是碰撞到墙后的路点
        if(hitNodePair == null) //返回空，说明射线没有碰撞到墙壁，说明起始点直达终点，直接返回起始点和终点作为路径即可
        {
            PathLog.log("射线没有碰撞到障碍点, 即可以两点一线直达");
            return [this._startNode, this._targetNode]; //返回起始点和目标点组成的数组路径
        }

        //---------------------------------------------------RCA寻路第二步-------------------------------------------------------------------------------------------------
        //第一步的起始点到目标点发射射线遇到了障碍，需要做一下处理。
        //(1)、拿到射线碰撞到墙前位置的路点，以这个路为中心，沿着墙壁边缘左右（射线垂直碰墙的情况）或上下（射线水平碰墙的情况）摸索，直到摸到最近的一个墙角为止
        //(2)、摸到最近的墙角之后，判断这墙角的类型，墙角的类型分为外墙角和内墙角。
        //(3)、如果是外墙角，则用这个外墙角做第三步的基于墙角的AStar寻路的起始点。
        //(4)、如果是内墙角，则以这个内墙角为中心，并以这个内墙角的视野由近到远找到第一个可直达起始点的外墙角，并以这个外墙角做第三步的基于墙角的AStar寻路的起始点。

        //先声明几个定理
        //定理1：在密闭容器空间内，所有的墙角都是可以连通的，也就是每个墙角可以直接或间接通往别的墙角，所以把所有墙角作为一个整体，可以通过AStar找到通往别的墙角的最短路径，对了，这里说的用于Star寻路的墙角只包括外墙角，因为外墙角已经够用，内墙角没必要添加进去，添加进去反而得不到最短路径
        //定理2：起始点向目标点发射线如果碰撞到墙壁，并且顺着墙壁找到内墙角，那么这个内墙角关联的所有外墙角中，一定存在最少一个可以直达起始点的外墙角。
        //定理3：顺射线碰撞点摸到的内墙角是一定看不到目标点的，如果能看到说明起始点和目标点是可以两点一线直达的，也就不存在起始点向目标点发射线会碰撞到墙壁情况了，所以内墙角要做的作用只是帮起始点找到离它最近的并可直达它的外墙角
        //定理4：内墙角只有一种情况不会关联外墙角，也就是在一个矩形的密闭空间内，4个角落各有一个内墙角，空间内并无任何外墙角


        var beforeHitWallNode:RoadNode = hitNodePair[0]; //射线碰到墙壁前的一个路点
        var wallNode:RoadNode = hitNodePair[1];//射线碰到墙的墙壁障碍路点
        if(beforeHitWallNode == null || wallNode == null)
        {
            //目标点在地图外的情况才会发生
            console.error("射线碰墙信息出现空值","this._startNode",this._startNode,"targetNode",targetNode,"beforeHitWallNode",beforeHitWallNode,"wallNode",wallNode);
            return [];
        }

        var nearestCornerNode:CornerRoadNode = CornerRoadUtils.instance.getRayHitNearestCorner(beforeHitWallNode, wallNode); //离起始点最近的墙角点，可能起始点无法直达这个墙角点，下面的代码要做特殊处理
        if(nearestCornerNode == null)
        {
            PathLog.log(`beforeHitWallNode =  ${beforeHitWallNode.toString()} , wallNode = ${wallNode.toString()}`);
            console.error("找不到最近的墙角点，目标不可达到。这种情况几乎不可能发生，除非墙壁无限长，或者起始点在障碍区内，不过如果这段日志打印出来时要好好检查原因");
            return [];
        }

        //下面的墙角类型cornerType的值，0代表外墙角，1代表内墙角
        if(nearestCornerNode.cornerType == CornerRoadNodeType.outSideCorner) //如果摸到的墙角是外墙角。
        {
            var nearestOutCornerNode:CornerRoadNode = nearestCornerNode; //初始化离起始点最近的一个外墙角点
            PathLog.log("起始点到目标点射线碰撞到的障碍点处找到离碰撞点最近的外墙角点",`(${nearestOutCornerNode.roadNode.cx},${nearestOutCornerNode.roadNode.cy})`);

            if(nearestOutCornerNode.roadNode != this._startNode) //如果第一个外墙角点不等于起始点
            {
                if(CornerRoadUtils.instance.rayBetweenTwoNodes(nearestOutCornerNode.roadNode,this._startNode) == null) //通过射线的方式确认是否这个外墙角可直达起始点
                {
                    this.setChildNodeToParentNode(nearestOutCornerNode.roadNode, this._startNode); //能直达就提前预设确认了父子关系的两个路点，因为第三步的AStar寻路是基于最近的这个外墙角做为起始点寻路的
                }else
                {
                    PathLog.log("最近的一个外墙角点无法直达起始点！");

                    var bestLinkOutCornerNode:RoadNode = CornerRoadUtils.instance.getBestLinkOutCornerNode(this._startNode,beforeHitWallNode,nearestOutCornerNode); //首个外墙角不能直达时，尝试找其它的拐角点可以让起始点能直达这个外墙角
                    if(bestLinkOutCornerNode == null)
                    {
                        bestLinkOutCornerNode = beforeHitWallNode;
                    }else
                    {
                        //PathLog.log(`找到一个合适的拐角点`, bestLinkOutCornerNode.toString());
                    }

                    if(CornerRoadUtils.instance.isOutSideCorner(bestLinkOutCornerNode)) //如果这个拐角点正好是个外墙角, 把这个外墙角替换之前那个外墙角成为最近的外墙角
                    {
                        var newNearestOutCornerNode:CornerRoadNode = this.getCornerRoadNode(bestLinkOutCornerNode.cx,bestLinkOutCornerNode.cy);
                        if(newNearestOutCornerNode == null)
                        {
                            PathLog.log("墙角数据有误，墙角节点找不到对应的墙角数据，请检查原因：bestLinkOutCornerNode = " + bestLinkOutCornerNode.toString());
                            return [];
                        }

                        nearestOutCornerNode = newNearestOutCornerNode; //更换更优的最近外墙角点。备注，如果不更换可能会发生两个墙角点直接的parent互相关联对方引起死循环
                    }
                    
                    if(bestLinkOutCornerNode == nearestOutCornerNode.roadNode) //说明最近外墙角点被更换了
                    {
                        this.setChildNodeToParentNode(nearestOutCornerNode.roadNode, this._startNode);
                    }else
                    {
                        this.setChildNodeToParentNode(bestLinkOutCornerNode, this._startNode); //提前预设确认了父子关系的两个路点
                        this.setChildNodeToParentNode(nearestOutCornerNode.roadNode, bestLinkOutCornerNode); //提前预设确认了父子关系的两个路点
                    }

                }

            }else
            {
                PathLog.log("寻路起始点正好处于一个外墙角处!");
            }

            
            this._firstSearchOutCornerNode = nearestOutCornerNode;
            this._currentOutCornerNode = nearestOutCornerNode;

        }else
        {
            //如果找到的首个离起始点到目标点的射线碰撞墙壁点是外墙角，则通过这个外墙角找出一个合适的最近外墙角

            var nearestInCornerNode:CornerRoadNode = nearestCornerNode; //内墙角
            PathLog.log("起始点到目标点射线碰撞到的障碍点处找到离碰撞点最近的内墙角点",`(${nearestInCornerNode.roadNode.cx},${nearestInCornerNode.roadNode.cy})`);

            var nearestOutCornerNode:CornerRoadNode = null;

            var linkOtherOutCornerNodes:CornerRoadNode[] = nearestInCornerNode.getAndSortLinkOutCornerRoadNodes(); //获得这个内墙角关联的所有外墙角，并且有近到远排好序了
            var len:number = linkOtherOutCornerNodes.length;
            for(var i:number = 0; i < len; i++)
            {
                var outCornerNode:CornerRoadNode = linkOtherOutCornerNodes[i];
                if(CornerRoadUtils.instance.rayBetweenTwoNodes(outCornerNode.roadNode,this._startNode) == null)
                {
                    //在内墙角关联的所有外墙角中，找一个可以直达起始点的最短距离外墙角，因为getAndSortLinkOutCornerRoadNodes已经对链接点进行过由近到远排序，所以outCornerNode一定是距离最短那个
                    nearestOutCornerNode = outCornerNode; 
                    PathLog.log("找到一个内墙角关联并可直达起始点的外墙角!", outCornerNode);
                    break;
                }
            }

            if(nearestOutCornerNode == null) //这个内墙角无法找到任何关联的并且可直达起始点的外墙角，所以可以提前判断寻路无法找到目标点。
            {
                PathLog.log("内墙角周围找不到一个可直达起始点的外墙角，改寻路到射线碰墙前点！保证玩家可以寻到里目标点最近的一个点");
                var closestNode:RoadNode = this.getClosestNodeDistTarget(beforeHitWallNode, beforeHitWallNode);
                return this.seekPath(startNode, closestNode);
            }

            if(nearestOutCornerNode.roadNode != this._startNode) //如果第一个内墙角点不等于起始点
            {
                this.setChildNodeToParentNode(nearestOutCornerNode.roadNode, this._startNode); //提前预设确认了父子关系的两个路点
            }
    
            this._firstSearchOutCornerNode = nearestOutCornerNode;
            this._currentOutCornerNode = nearestOutCornerNode;

        }


        if(this._currentOutCornerNode == null)
        {
            PathLog.log("没有找到一个外墙角点作为检索起始点，寻路失败！");
            return [];
        }

        //找到合适的最近外墙角后，先尝试从这个外墙角处发射线看是否能直达目标点，如果能就把目标点的parent设置给这个外墙角，寻路结束，返回路径。因为第三阶段的Astar寻路中不会对起始的外墙角做射线检查目标点
        if(CornerRoadUtils.instance.rayBetweenTwoNodes(this._currentOutCornerNode.roadNode, this._targetNode) == null)
        {
            PathLog.log("第一个外墙角处就找到了目标点，太好了！");
            this._targetNode.parent = this._currentOutCornerNode.roadNode;
            return this.getPath();
        }


        //---------------------------------------------------RCA寻路第三步----------------------------------------------------------------------------------
        //从第二步中找到的离起始点最近的外墙角点，以所有外墙角点作为数据集合，并以这个最近外墙角点作为Astar寻路的起始点做寻路

        //寻路过程中，每检索一个外墙角点时要做以下处理
        //(1)、先判断这个检索的外墙角是否是终点，如果是，则寻路结束，返回路径，否则下一步。
        //(2)、再判断这个检索的外墙角通过射线是否可直达终点，如果可以，则寻路结束，返回路径，否则下一步
        //(3)、查找这个检索的外墙角关联的其它外墙角，通过AStar的 f = g + h 中f值最优的新检索点，如果找不到新检索点，寻路失败，寻路结束。否则以这新的检索点再会到步骤(1)


        var newMaxStep:number = this.maxStep;

        if(!this.isPassNode(this._targetNode))
        {
            //如果不能直达目标，最大寻路步骤 = 为两点间的预估距离的3倍
            newMaxStep = (Math.abs(this._targetNode.cx - this._startNode.cx) + Math.abs(this._targetNode.cy - this._startNode.cy)) * 3;
            if(newMaxStep > this.maxStep)
            {
                newMaxStep = this.maxStep;
            }
        }

        this._startNode.g = 0; //重置起始节点的g值
        this._startNode.resetTree(); //清除起始节点原有的二叉堆关联关系

        this._binaryTreeNode.refleshTag(); //刷新二叉堆tag，用于后面判断是不是属于当前次的寻路
        //this._binaryTreeNode.addTreeNode(this._startNode); //把起始节点设置为二叉堆结构的根节点

        var step:number = 0;
        
        var closestNode:RoadNode = null; //距离目标最近的路点

        while(true)
        {
            if(step > newMaxStep)
            {
                PathLog.log("没找到目标计算步骤为：",step);

                closestNode = this.getClosestNodeDistTarget(closestNode, beforeHitWallNode); //找一个准确的离目标点比较近的路点作为终点做二段寻路
                return this.seekPath(startNode,closestNode);
            }

            step++;
            this.seekDepth = step;
            
            this.searchRoundOutCornerNodes(this._currentOutCornerNode);
            
            if(this._binaryTreeNode.isTreeNull()) //二叉堆树里已经没有任何可搜寻的点了，则寻路结束，每找到目标
            {
                PathLog.log("~没找到目标计算步骤为：",step);

                closestNode = this.getClosestNodeDistTarget(closestNode, beforeHitWallNode); //找一个准确的离目标点比较近的路点作为终点做二段寻路
                return this.seekPath(startNode,closestNode);;
            }

            var currentSearchNode:RoadNode = this._binaryTreeNode.getMin_F_Node();
            //PathLog.log(`currentSearchNode (${currentSearchNode.cx},${currentSearchNode.cy})`,currentSearchNode);

            if(closestNode == null)
            {
                closestNode = currentSearchNode;
            }else
            {
                if(currentSearchNode.h < closestNode.h)
                {
                    closestNode = currentSearchNode;
                }else if(currentSearchNode.h == closestNode.h)
                {
                    if(currentSearchNode.g < closestNode.g)
                    {
                        closestNode = currentSearchNode;
                    }
                }
            }

            if(currentSearchNode == this._targetNode)
            {
                PathLog.log("找到目标计算步骤为：",step);
                return this.getPath();
            }else if(CornerRoadUtils.instance.rayBetweenTwoNodes(currentSearchNode, this._targetNode) == null)
            {
                //如果当前检索的外墙角点，向终点发射射线可直达
                PathLog.log("~~~~墙角视野找到目标点,寻路完成，计算步骤为：",step);
                this._targetNode.parent = currentSearchNode; // 把目标点的父节点为当前检索点，用于导出寻路路径
                return this.getPath();
            }
            else
            {
                //如果寻路过程中的某个节点是可以直达起始点的,把这节点的父节点设置为起始节点
                /*if(CornerRoadUtils.instance.rayBetweenTwoNodes(currentSearchNode, this._startNode) == null) 
                {
                    this.setChildNodeToParentNode(currentSearchNode,this._startNode); //setChildNodeToParentNode函数内已经包含打入关闭列表处理
                }else
                {
                    this._binaryTreeNode.setRoadNodeInCloseList(currentSearchNode);//打入关闭列表标记
                }*/

                this._binaryTreeNode.setRoadNodeInCloseList(currentSearchNode);//打入关闭列表标记
                
                this._currentOutCornerNode = this.getCornerRoadNode(currentSearchNode.cx,currentSearchNode.cy); //获得这个点的墙角点
            }                    
        }

        return [];

    }


    /**
     * 当目标不可到达时，获得一个离目标点最近的一个路点，用于后续的二次寻路用，二次寻路时用这个返回值作为终点
     * @param baseClosestNode 
     * @param baseBeforeHitWallNode 这个属性是开始寻路时起始点向目标点发射射线时的碰墙前点
     * @returns 
     */
    public getClosestNodeDistTarget(baseClosestNode:RoadNode, baseBeforeHitWallNode:RoadNode)
    {
        if(baseClosestNode == null)
        {
            return null;
        }

        var hitNodePair:RoadNode[] = CornerRoadUtils.instance.rayBetweenTwoNodes(baseClosestNode, this._targetNode); 
        if(hitNodePair != null) //射线碰撞到了墙壁
        {
            var beforeHitWallNode:RoadNode = hitNodePair[0]; //射线碰到墙壁前的一个路点,把这个路点作为离目标点最近的路径

            //beforeHitWallNode 也可能不是最近的点，所以beforeHitWallNode沿着targetNode的左右方向和上下方向寻找一个离targetNode更近的点

            var disX:number = Math.abs(this._targetNode.cx - beforeHitWallNode.cx);
            var disY:number = Math.abs(this._targetNode.cy - beforeHitWallNode.cy);

            if(baseBeforeHitWallNode != null)
            {
                var baseHitDisX:number = Math.abs(this._targetNode.cx - baseBeforeHitWallNode.cx);
                var baseHitDisY:number = Math.abs(this._targetNode.cy - baseBeforeHitWallNode.cy);

                if(baseHitDisX + baseHitDisY < disX + disY)
                {
                    //如果起始点到终点射线的碰撞前点比 baseClosestNode发射射线到目标点的碰撞前点离目标点更近，则切换碰撞前点
                    beforeHitWallNode = baseBeforeHitWallNode;
                    disX = baseHitDisX;
                    disY = baseHitDisY;
                }
            }
            
            var closestNode:RoadNode = beforeHitWallNode;
            var minHvalue:number = disX + disY;

            var dirX:number = this._targetNode.cx > beforeHitWallNode.cx ? 1 : -1;
            var dirY:number = this._targetNode.cy > beforeHitWallNode.cy ? 1 : -1;

            for(var i:number = 0 ; i < disX; i++)
            {
                var newClosestNode:RoadNode = this.getRoadNode(beforeHitWallNode.cx + ((i + 1) * dirX), beforeHitWallNode.cy);
                if(!this.isPassNode(newClosestNode))
                {
                    break;
                }

                var newDisX:number = Math.abs(this._targetNode.cx - newClosestNode.cx);
                var newDisY:number = Math.abs(this._targetNode.cy - newClosestNode.cy);

                var newHvalue:number = newDisX + newDisY;

                if(newHvalue < minHvalue)
                {
                    minHvalue = newHvalue;
                    closestNode = newClosestNode;
                }
            }

            for(var i:number = 0 ; i < disY; i++)
            {
                var newClosestNode:RoadNode = this.getRoadNode(beforeHitWallNode.cx, beforeHitWallNode.cy + ((i + 1) * dirY));
                if(!this.isPassNode(newClosestNode))
                {
                    break;
                }

                var newDisX:number = Math.abs(this._targetNode.cx - newClosestNode.cx);
                var newDisY:number = Math.abs(this._targetNode.cy - newClosestNode.cy);

                var newHvalue:number = newDisX + newDisY;

                if(newHvalue < minHvalue)
                {
                    minHvalue = newHvalue;
                    closestNode = newClosestNode;
                }
            }

            return closestNode;
        }

        return baseClosestNode;
    }
    

    /**
     * 设置一个点为另一个点的父节点，在未开始寻路前用，用来预设某些提前确认了两点间是父子连接关系的两个路点
     * @param node1 
     * @param node2 
     */
    protected setChildNodeToParentNode(childNode:RoadNode, parentNode:RoadNode)
    {
        childNode.g = parentNode.g + this.getGValue(childNode, parentNode);
        childNode.h = this.getHValue(childNode);
        childNode.f = childNode.g + childNode.h;
        childNode.parent = parentNode;

        this._binaryTreeNode.setRoadNodeInCloseList(childNode);//打入关闭列表标记
    }

    /**
     *查找一个节点周围可直达的其它外墙角点 
    * @param node
    * @return 
    */		
    protected searchRoundOutCornerNodes(outCornerNode:CornerRoadNode):void
    {
        var len:number = outCornerNode.linkOtherNodes.length;
        for(var i:number = 0 ; i < len ; i++)
        {
            var otherOutCorner:CornerRoadNode = outCornerNode.linkOtherNodes[i];
            if(otherOutCorner.roadNode != this._startNode && otherOutCorner.roadNode != this._firstSearchOutCornerNode.roadNode && !this.isInCloseList(otherOutCorner.roadNode))
            {
                this.setCornerNodeF(otherOutCorner);
            }
        }
    }

    /**
     *设置外墙角的F值 
    * @param node
    */		
    public setCornerNodeF(otherOutCorner:CornerRoadNode):void
    {	
        var node:RoadNode = otherOutCorner.roadNode;

        var g:number;
        
        if(this.seekDepth <= 1) 
        {
            //这个处理是对付某种出现概率很小的特殊情况，这种情况会出现寻到的路径比预期的路径的总距离长了一点点（长3个左右的格子距离，不优化问题也不大,可以只执行else的代码），做了搜寻深度前1步内的优化，基本都只出现在前1步内
            if(CornerRoadUtils.instance.rayBetweenTwoNodes(node, this._startNode) == null) 
            {
                //射线检测这个点能直达初始点，所以g值直接从这个点到起始点计算
                g = this._startNode.g + this.getGValue(node,this._startNode);
            }else
            {
                g = this._currentOutCornerNode.roadNode.g + this.getGValue(node,this._currentOutCornerNode.roadNode);
            }
        }else
        {
            g = this._currentOutCornerNode.roadNode.g + this.getGValue(node,this._currentOutCornerNode.roadNode);
        }

        /*var g:number;
        if(CornerRoadUtils.instance.rayBetweenTwoNodes(node, this._startNode) == null) 
        {
            g = this._startNode.g + this.getGValue(node,this._startNode);
        }else
        {
            g = this._currentOutCornerNode.roadNode.g + this.getGValue(node,this._currentOutCornerNode.roadNode);
        }*/

        
        if(this.isInOpenList(node))
        {
            if(g < node.g)
            {
                node.g = g;

                node.parent = this._currentOutCornerNode.roadNode;
                node.h = this.getHValue(node);
                node.f = node.g + node.h;

                //节点的g值已经改变，把节点先从二堆叉树结构中删除，再重新添加进二堆叉树
                this._binaryTreeNode.removeTreeNode(node); 
                this._binaryTreeNode.addTreeNode(node);
            }
        }else
        {
            node.g = g;

            this._binaryTreeNode.setRoadNodeInOpenList(node);//给节点打入开放列表的标志
            node.resetTree();

            node.parent = this._currentOutCornerNode.roadNode;
            node.h = this.getHValue(node);
            node.f = node.g + node.h;

            this._binaryTreeNode.addTreeNode(node);
        }
    }

    /**
     * 获得两个点之间的G值
     * @param node 
     * @param parentNode 
     * @returns 
     */
    protected getGValue(node:RoadNode, parentNode:RoadNode):number
    {
        var disX:number = Math.abs(parentNode.cx - node.cx);
        var disY:number = Math.abs(parentNode.cy - node.cy);
        //var g:number = (disX + disY) * this.COST_STRAIGHT; //一般准确的距离判断，做横边和竖边的和，消耗最小
        var g:number = Math.sqrt(disX * disX + disY * disY) * this.COST_STRAIGHT; //最准确的距离，但是要做开平方，算法消耗有点大

        return g;
    }

    /**
     * 获得某个点到寻路目标点的H值
     * @param node 
     * @returns 
     */
    protected getHValue(node:RoadNode):number
    {
        var disX:number = Math.abs(this._targetNode.cx - node.cx);
        var disY:number = Math.abs(this._targetNode.cy - node.cy);
        var h:number = (disX + disY) * this.COST_STRAIGHT; //一般准确的距离判断，做横边和竖边的和，消耗最小
        //var h:number = Math.sqrt(disX * disX + disY * disY) * this.COST_STRAIGHT; //最准确的距离，但是要做开平方，算法消耗有点大
        
        return h;
    }

    /**
     * 获得一个路点从起始点到目标点之间的估算值
     * @param node 
     */
    public getFValueFromStartToTarget(node:RoadNode):number
    {
        var g:number = this.getGValue(node, this._startNode);
        var h:number = this.getHValue(node);
        var f = g + h;
        return f;
    }

    /**
     *获得最终寻路到的所有路点 
    * @return 
    */		
    protected getPath():Array<RoadNode>
    {
        var nodeArr:Array<RoadNode> = [];
        
        var node:RoadNode = this._targetNode;
        
        while(node != this._startNode)
        {
            nodeArr.unshift(node);
            node = node.parent;
        }
        
        nodeArr.unshift(this._startNode);

        if(!this.optimize)
        {
            return nodeArr;
        }

        //return nodeArr; //RCA寻路好像做不做优化都没区别，寻到的路径好像都是优化好的。如果要想进一步提高寻路效率就解除这行注释吧。这行注释先加上，不排除有什么特殊情况需要优化路径保证最短路径。

        //----第一阶段在RCA寻路里不存在，所以不用考虑

        //第一阶段优化： 对横，竖，正斜进行优化
        //把多个节点连在一起的，横向或者斜向的一连串点，除两边的点保留
        /*for(var i:number = 1 ; i < nodeArr.length - 1 ; i++)
        {
            var preNode:RoadNode = nodeArr[i - 1] as RoadNode;
            var midNode:RoadNode = nodeArr[i] as RoadNode;
            var nextNode:RoadNode = nodeArr[i + 1] as RoadNode;
        
            var bool1:Boolean = midNode.cx == preNode.cx && midNode.cx == nextNode.cx;
            var bool2:Boolean = midNode.cy == preNode.cy && midNode.cy == nextNode.cy;
            //var bool3:Boolean = ((midNode.cx - preNode.cx) / (midNode.cy - preNode.cy)) * ((nextNode.cx - midNode.cx) / (nextNode.cy - midNode.cy)) == 1； //发现一个bug，因为 2 * 0.5也等于1，所以用这行语句作为判断是否是正斜角不够精确
            var bool3:Boolean = ((midNode.cx - preNode.cx) / (midNode.cy - preNode.cy)) == ((nextNode.cx - midNode.cx) / (nextNode.cy - midNode.cy)) 
        
            if(bool1 || bool2 || bool3)
            {
                nodeArr.splice(i,1)
                i--;
            }
        }*/

        //第二阶段优化：对不在横，竖，正斜的格子进行优化
        for(var i:number = 0 ; i < nodeArr.length - 2 ; i++)
        {
            var startNode:RoadNode = nodeArr[i] as RoadNode;
            var optimizeNode:RoadNode = null;

            //优先从尾部对比，如果能直达就把中间多余的路点删掉
            for(var j:number = nodeArr.length - 1 ; j > i + 1 ; j--)
            {
                var targetNode:RoadNode = nodeArr[j] as RoadNode;

                //在第一阶段优已经优化过横，竖，正斜了，所以再出现是肯定不能优化的，可以忽略:  备注：RCA寻路的路径规则和Astar寻路的路径规则不一样，所以下面这行判断条件注释掉
                /*if(startNode.cx == targetNode.cx || startNode.cy == targetNode.cy || Math.abs(targetNode.cx - startNode.cx) == Math.abs(targetNode.cy - startNode.cy))
                {
                    continue;
                }*/

                if(this.isArriveBetweenTwoNodes(startNode,targetNode))
                {
                    optimizeNode = targetNode;
                    break;
                }

            }

            if(optimizeNode)
            {
                var optimizeLen:number = j - i - 1;
                nodeArr.splice(i + 1,optimizeLen);
            }
        
        }
        

        return nodeArr;
    }
    
    /**
     * 两点之间是否可到达。
     * 这个函数和 CornerRoadUtils.instance.rayBetweenTwoNodes 函数是一样的，只是那个函数返回碰撞信息，而这个函数返回的是bool值，在不需要碰撞信息的情况下用这个比较好。
     * @param startNode 
     * @param targetNode 
     * @returns 
     */
    public isArriveBetweenTwoNodes(startNode:RoadNode,targetNode:RoadNode):boolean
    {
        if(startNode == targetNode)
        {
            return false;
        }

        var disX:number = Math.abs(targetNode.cx - startNode.cx);
        var disY:number = Math.abs(targetNode.cy - startNode.cy);

        var dirX = 0;

        if(targetNode.cx > startNode.cx)
        {
            dirX = 1;
        }else if(targetNode.cx < startNode.cx)
        {
            dirX = -1;
        }

        var dirY = 0;

        if(targetNode.cy > startNode.cy)
        {
            dirY = 1;
        }else if(targetNode.cy < startNode.cy)
        {
            dirY = -1;
        }

        var rx:number = 0;
        var ry:number = 0;
        var intNum:number = 0;
        var decimal:number = 0;

        if(disX > disY)
        {
            var rate:number = disY / disX;

            for(var i = 0 ; i < disX ; i++)
            {
                ry = startNode.cy + i * dirY * rate;
                intNum = Math.floor(ry);
                decimal = ry % 1;

                var cx1:number = startNode.cx + i * dirX;
                var cy1:number = decimal <= 0.5 ? intNum : intNum + 1;

                ry = startNode.cy + (i + 1) * dirY * rate;
                intNum = Math.floor(ry);
                decimal = ry % 1;

                var cx2:number = startNode.cx + (i + 1) * dirX;
                var cy2:number = decimal <= 0.5 ? intNum : intNum + 1;

                var node1:RoadNode = this.getRoadNode(cx1,cy1);
                var node2:RoadNode = this.getRoadNode(cx2,cy2);

                //cc.log(i + "  :: " + node1.cy," yy ",startNode.cy + i * rate,ry % 1);

                if(!this.isCrossAtAdjacentNodes(node1,node2))
                {
                    return false;
                }
            }

        }else
        {
            var rate:number = disX / disY;

            for(var i = 0 ; i < disY ; i++)
            {
                rx = i * dirX * rate;
                intNum = dirX > 0 ? Math.floor(startNode.cx + rx) : Math.ceil(startNode.cx + rx);
                decimal = Math.abs(rx % 1);

                var cx1:number = decimal <= 0.5 ? intNum : intNum + 1 * dirX;
                var cy1:number = startNode.cy + i * dirY;
                
                rx = (i + 1) * dirX * rate;
                intNum = dirX > 0 ? Math.floor(startNode.cx + rx) : Math.ceil(startNode.cx + rx);
                decimal = Math.abs(rx % 1);

                var cx2:number = decimal <= 0.5 ? intNum : intNum + 1 * dirX;
                var cy2:number = startNode.cy + (i + 1) * dirY;

                var node1:RoadNode = this.getRoadNode(cx1,cy1);
                var node2:RoadNode = this.getRoadNode(cx2,cy2);

                if(!this.isCrossAtAdjacentNodes(node1,node2))
                {
                    return false;
                }
            }
        }
        
        return true;
    }

    /**
     * 判断两个相邻的点是否可通过
     * @param node1 
     * @param node2 
     */
    protected isCrossAtAdjacentNodes(node1:RoadNode,node2:RoadNode):boolean
    {
        if(node1 == node2)
        {
            return false;
        }

        //两个点只要有一个点不能通过就不能通过
        if(!this.isPassNode(node1) || !this.isPassNode(node2))
        {
            return false;
        }

        var dirX = node2.cx - node1.cx;
        var dirY = node2.cy - node1.cy

        //如果不是相邻的两个点 则不能通过
        if(Math.abs(dirX) > 1 || Math.abs(dirY) > 1)
        {
            return false;
        }

        //如果相邻的点是在同一行，或者同一列，则判定为可通过
        if((node1.cx == node2.cx) || (node1.cy == node2.cy))
        {
            return true;
        }

        //只剩对角情况了
        if(
            this.isPassNode(this.getRoadNode(node1.cx,node1.cy + dirY)) &&
            this.isPassNode(this.getRoadNode((node1.cx + dirX),node1.cy))
        )
        {
            return true;
        }

        return false;
    }

    /**
     * 是否是可通过的点 
     * @param node 
     */
    public isPassNode(node:RoadNode):boolean
    {
        if(this._isPassCallBack != null)
        {
            return this._isPassCallBack(node);
        }

        if(node == null || node.value == 1)
        {
            return false;
        }

        return true;
    }

    /**
     * 是否能通过这个节点
     * @param node 
     * @returns 
     */
    public isCanPass(node:RoadNode):boolean
    {
        if(!this.isPassNode(node)) //如果当前路点不能通过就不是可通过的点
        {
            return false;
        }

        return true;
    }


    /**
     * 根据世界坐标获得路节点
     * @param cx 
     * @param cy 
     * @returns 
     */
    public getRoadNode(cx:number, cy:number):RoadNode
    {
        var key:string = cx + "_" + cy;
        return this._roadNodes[key];
    }

    /**
     * 设置寻路半径
     * @param radius 
     */
    public setSeakRadius(radius:number)
    {
        //RCA寻路还每实现按角色半径寻路，因为墙角是只占一个格子
    }

    protected _consumeSeekStep:number = 0;
    public getConsumeSeekStep():number
    {
        return this._consumeSeekStep;
    }

    /**
     *测试寻路步骤 
    * @param startNode
    * @param targetNode
    * @return 
    */		
    public testSeekPathStep(startNode:RoadNode,targetNode:RoadNode,radius:number,callback:Function,target:any,time:number):void
    {
        
    }

    /**
     * 停止测试寻路
     */
    public stopTestSeekPathStep()
    {
        if(this.handle != -1)
        {
            clearInterval(this.handle);
            this.handle = -1;
        }
    }
    
    
    /**
     *节点是否在开启列表 
    * @param node
    * @return 
    */		
    protected isInOpenList(node:RoadNode):Boolean
    {
        return this._binaryTreeNode.isInOpenList(node);
    }
    
    /**
     * 节点是否在关闭列表 
     * @param node 
     * @returns 
     */		
    protected  isInCloseList(node:RoadNode):Boolean
    {
        return this._binaryTreeNode.isInCloseList(node);
    }
    
    
    /**
     * 释放资源
     */
    public dispose():void
    {
        this._roadNodes = null;
        this._round = null;
    }
    
}
