import MapData from "../base/MapData";
import { MapType } from "../base/MapType";
import AstarHoneycombRoadSeeker from "./AstarHoneycombRoadSeeker";
import AStarRoadSeeker from "./AStarRoadSeeker";
import IRoadSeeker from "./IRoadSeeker";
import MapRoadUtils from "./MapRoadUtils";
import { PathOptimize } from "./PathOptimize";
import { PathQuadSeek } from "./PathQuadSeek";
import Point from "./Point";
import RCAStarRoadSeeker from "./rca/RCAStarRoadSeeker";
import RoadNode from "./RoadNode";

/**
 * 寻路代理器
 * @作者 落日故人 QQ 583051842
 */
export default class PathFindingAgent {

    private static _instance:PathFindingAgent;

    public static get instance():PathFindingAgent
    {
        if(this._instance == null)
        {
            this._instance = new PathFindingAgent();
        }
        return this._instance;
    }

    private _roadDic:{[key:string]:RoadNode} = {};

    private _roadSeeker: IRoadSeeker;

    private _mapData: MapData = null;
    public get mapData(): MapData {
        return this._mapData;
    }

    private _mapType: MapType = MapType.angle45;
    public get mapType(): MapType {
        return this._mapType;
    }

    /**
     * 获得寻路接口
     */
    public get roadSeeker(): IRoadSeeker {
        return this._roadSeeker;
    }

    /**
     * 是否用RCA寻路，只适用四边形格子寻路。RCA寻路是目前所有寻路算法中速度最快的算法，速度远超如今流行的“A星寻路”和“跳点寻路（jps）”，当你遇到大地图或者很多角色同时寻路时，使用RCA寻路能保证很高的游戏帧率 
     */
    public useRCASeek:boolean = false;

    /**
     *用于检索一个节点周围8个点的向量数组 (四边形格子用)
     */		
    protected _round:number[][] = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
    //private _round1:number[][] = [[0,-1],[1,0],[0,1],[-1,0]]; //只要4方向周围的路点，请使用这个

    /**
     *用于检索一个节点周围6个点的向量数组 格子列数为偶数时使用  (六边形格子用)
     */		
    protected _round1:number[][] = [[0,-1],[1,-1],[1,0],[0,1],[-1,0],[-1,-1]];

    /**
     *用于检索一个节点周围6个点的向量数组 格子列数为奇数时使用  (六边形格子用)
     */
    protected _round2:number[][] = [[0,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];


    /**
     * 初始化寻路数据
     * @param roadDataArr 路电数据
     * @param mapType 地图类型
     */
    public init(mapData:MapData)
    {
        this._mapData = mapData;
        this._mapType = mapData.type;

        MapRoadUtils.instance.updateMapInfo(this._mapData.mapWidth,this._mapData.mapHeight,this._mapData.nodeWidth,this._mapData.nodeHeight,this._mapData.type);
        
        this._roadDic = {};

        var len:number = this._mapData.roadDataArr.length;
        var len2:number = this._mapData.roadDataArr[0].length;
        
        var value:number = 0;
        var dx:number = 0;
        var dy:number = 0;
        var cx:number = 0;
        var cy:number = 0;

        for(var i:number = 0 ; i < len ; i++)
        {
            for(var j:number = 0 ; j < len2 ; j++)
            {
                value = this._mapData.roadDataArr[i][j];
                dx = j;
                dy = i;
                
                var node:RoadNode = MapRoadUtils.instance.getNodeByDerect(dx,dy);
                node.value = value;

                if(this._mapType == MapType.honeycomb2)
                {
                    cx = node.cx;
                    cy = node.cy;

                    //如果是横式六边形，则需要把路点世界坐标转置，即x,y调换。因为六边形寻路组件AstarHoneycombRoadSeeker是按纵式六边形写的
                    node.cx = cy;
                    node.cy = cx;
                }

                this._roadDic[node.cx + "_" + node.cy] = node;
            }
        }

        if(this._mapType == MapType.honeycomb || this._mapType == MapType.honeycomb2)
        {
            this._roadSeeker = new AstarHoneycombRoadSeeker(this._roadDic)
        }
        else
        {
            //如果使用RCA寻路就初始化RCA寻路组件
            if(this.useRCASeek)
            {
                var rcaRoadSeeker:RCAStarRoadSeeker = new RCAStarRoadSeeker(this._roadDic);
                this._roadSeeker = rcaRoadSeeker;

                var date1:Date = new Date();//烘焙前的时间  //Date.now();

                console.log("\n");
                if(this._mapData.racBakingData != null)
                {
                    console.log("RCA读取烘焙数据");
                    rcaRoadSeeker.initBakingData(this._mapData.racBakingData); //如果有烘焙数据就用烘焙数据初始化地图
                }else
                {
                    console.log("RCA自动烘焙");
                    //如果没有烘焙数据，就自动烘焙。烘焙地图会耗一点时间，也就是会卡住一些时间（不同设备烘焙的时间不同）。
                    // 如果不想等待烘焙时间，可以选择用提前烘焙的数据，地图编辑器可导出烘焙数据，不过地图文件会增大，开发者自己看着选哪种方案。
                    rcaRoadSeeker.baking(); //烘焙地形数据会消耗点时间，地图越大烘焙耗时越长。 烘焙就是通过运算提前记录每个墙角之间的链接关系
                }

                var date2:Date = new Date();//烘焙完成后的时间 //Date.now();
                console.log("RCA烘焙地形耗时 --",(date2.getTime() - date1.getTime()) / 1000,"秒");
                console.log("\n");

            }else
            {
                this._roadSeeker = new AStarRoadSeeker(this._roadDic);
            }
        }
    }

    /**
     * 寻路方法，如果目标不可到达，不会返回任何路径。  备注：2d寻路，参数的单位是像素，3d寻路单位是米，2d和3d寻路是通用的
     * 
     * 如果有疑问可以联系@作者 QQ 583051842
     * 
     * @param startX 起始像素位置X
     * @param startY 起始像素位置Y
     * @param targetX 目标像素位置X
     * @param targetY 目标像素位置Y
     * @param radius 寻路的半径 （2d是像素，3d是米）。备注：如果寻路的角色想按自身的占地面积进行寻路，可以设置这个值
     * @returns 返回寻路路点路径
     */
    public seekPath(startX:number,startY:number,targetX:number,targetY:number,radius:number = 0):RoadNode[]
    {
        var startNode:RoadNode = this.getRoadNodeByPixel(startX,startY);
        var targetNode:RoadNode = this.getRoadNodeByPixel(targetX,targetY);
        var seakRadius:number = this.getSeakRadius(radius);
        
        var roadNodeArr:RoadNode[] = this._roadSeeker.seekPath(startNode,targetNode,seakRadius);

        return roadNodeArr;
    }

    /**
     * 寻路方法，如果目标点不可达到，则返回离目标点最近的路径。  备注：2d寻路，参数的单位是像素，3d寻路单位是米，2d和3d寻路是通用的
     * 
     * 如果有疑问可以联系@作者 QQ 583051842
     * 
     * @param startX 起始像素位置X
     * @param startY 起始像素位置Y
     * @param targetX 目标像素位置X
     * @param targetY 目标像素位置Y
     * @param radius 寻路的半径 （2d是像素，3d是米）。备注：如果寻路的角色想按自身的占地面积进行寻路，可以设置这个值
     * @returns 返回寻路路点路径
     */
    public seekPath2(startX:number,startY:number,targetX:number,targetY:number,radius:number = 0):RoadNode[]
    {
        var startNode:RoadNode = this.getRoadNodeByPixel(startX,startY);
        var targetNode:RoadNode = this.getRoadNodeByPixel(targetX,targetY);
        var seakRadius:number = this.getSeakRadius(radius);

        var roadNodeArr:RoadNode[] = this._roadSeeker.seekPath2(startNode,targetNode,seakRadius);

        return roadNodeArr;
    }

    /**
     * 测试寻路过程，测试用，如果遇到bug，可以通过这个函数监测寻路的每一个步骤的情况。能快速定位问题。
     * @param startX 起始像素位置X
     * @param startY 目标像素位置Y
     * @param targetX 目标像素位置X
     * @param targetY 目标像素位置Y
     * @param radius 寻路的像素位置
     * @param seekRoadCallback 寻路的每个步骤都会执行这个回调
     * @param target 回调函数的目标对象，用于给回调函数指定this是什么
     * @param time 测试寻路时，每个步骤之间的时间间隔，单位是毫秒，如果想慢点查看每个寻路步骤，可以把这个值设置大点
     */	
    public testSeekRoad(startX:number,startY:number,targetX:number,targetY:number,radius:number,seekRoadCallback:Function,target:any,time)
    {
        var startNode:RoadNode = this.getRoadNodeByPixel(startX,startY);
        var targetNode:RoadNode = this.getRoadNodeByPixel(targetX,targetY);
        var seakRadius:number = this.getSeakRadius(radius);

        this._roadSeeker.testSeekPathStep(startNode,targetNode,seakRadius,seekRoadCallback,target,time);
    }

    /**
     * 把像素半径转换为寻路半径,寻路半径是以路点为单位的半径，不能用像素半径进行寻路，所以要转换
     * @param radius 像素半径
     */
    public getSeakRadius(radius:number = 0):number
    {
        var nodeRadius:number = Math.min(MapRoadUtils.instance.halfNodeWidth,MapRoadUtils.instance.halfNodeHeight); //把路点的宽半径和高半径之间的最小值作为路点的半径

        //seakRadius 是寻路用的半径，单位以路点为单位。和radius以像素为单位有区别，所以要把radius转换成寻路用的半径
        var seakRadius = Math.ceil((radius - nodeRadius) / (2 * nodeRadius));
        if(seakRadius > 0)
        {
            return seakRadius;
        }

        return 0;
    }

    /**
     * 两个路点之间是否可直达（即是否可以两点一线到达）
     * @param startNode 
     * @param targetNode 
     */
    public isArriveBetweenTwoNodes(startNode:RoadNode,targetNode:RoadNode):boolean
    {
        if(startNode == null || targetNode == null)
        {
            //两个点，只要有一个不在地图内，就是不可直达
            return false;
        }

        return this._roadSeeker.isArriveBetweenTwoNodes(startNode,targetNode);
    }

    /**
     * 在地图上，两个位置之间是否可直达。2d是像素位置，3d是米
     * @param x1 位置1 x轴
     * @param y1 位置1 y轴
     * @param x2 位置2 x轴
     * @param y2 位置2 y轴
     * @returns 
     */
    public isArriveBetweenTwoPos(x1:number, y1:number, x2:number, y2:number):boolean
    {
        var startNode:RoadNode = this.getRoadNodeByPixel(x1,y1);
        var targetNode:RoadNode = this.getRoadNodeByPixel(x2,y2);
        return this._roadSeeker.isArriveBetweenTwoNodes(startNode,targetNode);
    }

    /**
	 * 是否是可通过的点 
	 * @param node 
	 */
	public isPassNode(node:RoadNode):boolean
    {
        return this._roadSeeker.isPassNode(node);
    }

    public isPassPoint(x:number,y:number):boolean
    {
        var node:RoadNode = this.getRoadNodeByPixel(x,y);
        if(!node){
            return false;
        }
        return this._roadSeeker.isPassNode(node);
    }

    /**
     * 是否能通过这个节点，这个会考虑寻路的半径大小
     * @param node 
     */
    public isCanPass(node:RoadNode,radius:number):boolean
    {
        var seakRadius:number = this.getSeakRadius(radius);
        this._roadSeeker.setSeakRadius(seakRadius);
        return this._roadSeeker.isCanPass(node);
    }

    /**
     * 根据像素坐标获得路节点
     * @param px 像素坐标x
     * @param py 像素坐标y
     * @returns 
     */
    public getRoadNodeByPixel(px:number,py:number):RoadNode
    {
        var point:Point = MapRoadUtils.instance.getWorldPointByPixel(px,py);

        var node:RoadNode = null;
        if(this._mapType == MapType.honeycomb2) //因为初始化时 横式六边形已经对世界坐标做过转置，所以读取路节点时也要通过转置的方式
        {
            node = this.getRoadNode(point.y,point.x);
        }else
        {
            node = this.getRoadNode(point.x,point.y);
        }
        
        return node;
    }

    /**
     * 根据世界坐标获得路节点
     * @param cx 
     * @param cy 
     */
    public getRoadNode(cx:number,cy:number):RoadNode
    {
        //return this._roadDic[cx + "_" + cy];
        return this._roadSeeker.getRoadNode(cx,cy);
    }

    /**
     * 获得一个路点周围相邻的所有路点
     * @param roadNode 选定的路点
     * @param isIncludeSelf 是否包含选定的路点
     * @returns 
     */	
    public getRoundRoadNodes(roadNode:RoadNode,isIncludeSelf:boolean = false):RoadNode[]
    {
        if(roadNode == null)
        {
            return [];
        }

        var nodeArr:RoadNode[] = [];
        var round:number[][];

        if(isIncludeSelf)
        {
            nodeArr.push(roadNode);
        }

        if(this.mapType == MapType.honeycomb || this.mapType == MapType.honeycomb2)
        {
            roadNode.cx % 2 == 0 ? round = this._round1 : round = this._round2;
        }else
        {
            round = this._round;
        }

        for(var i:number = 0 ; i < round.length ; i++)
        {
            var cx:number = roadNode.cx + round[i][0];
            var cy:number = roadNode.cy + round[i][1];

            nodeArr.push(this.getRoadNode(cx,cy));
        }

        return nodeArr;
    }

    /**
     * 设置最大寻路步骤，超过这个寻路步骤还寻不到终点，就默认无法达到终点。
     * 设置这个限制的目的是，防止地图太大，路点太多，没有限制的话，寻路消耗会很大，甚至会卡死
     * @param maxStep 
     */
    public setMaxSeekStep(maxStep:number)
    {
        this._roadSeeker.setMaxSeekStep(maxStep);
    }

    /**
     * 设置路径优化等级，具体优化内容请查看脚本PathOptimize，里面有对各种优化等级的详细解释
     * @param optimize 
     */
    public setPathOptimize(optimize:PathOptimize)
    {
        this._roadSeeker.setPathOptimize(optimize);
    }

    /**
     * 设置4方向路点地图的寻路类型，只针对45度和90度地图，不包括六边形地图（六边形地图设置这个值无任何反应）
     * @param pathQuadSeek  4方向路点地图的寻路类型
     */
    public setPathQuadSeek(pathQuadSeek:PathQuadSeek)
    {
        this._roadSeeker.setPathQuadSeek(pathQuadSeek);
    }

    /**
     * 自定义路点是否能通过的条件。
     * 备注：这个自定义条件不使用于RCA寻路，因为RCA寻路的墙角数据是地图数据初始化的时候就烘焙好了，之后再动态设置条件就会寻路路径错乱。所有用这个自定义条件必须把useRCASeek设置为false
     * @param callback 回调方法用于自定义路点是否可通过的条件，如果参数是null，则用默认判断条件，不是null，则取代默认判断条件
     */
    public setRoadNodePassCondition(callback:Function)
    {
        this._roadSeeker.setRoadNodePassCondition(callback);
    }
}
