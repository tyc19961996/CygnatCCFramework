
import { Graphics } from "cc";
import { MapType } from "../../base/MapType";
import MapRoadUtils from "../MapRoadUtils";
import RoadNode from "../RoadNode";
import CornerRoadNode, { CornerRoadNodeType } from "./CornerRoadNode";
import RCAStarRoadSeeker from "./RCAStarRoadSeeker";

/**
 * 墙角运算工具。辅助RCAStarRoadSeeker寻路组件，把墙角相关的运算全部放到这里，减少RCAStarRoadSeeker的代码量，一个脚本里代码太多不容易维护
 * @作者 落日故人 QQ 583051842
 * 
 */
export default class CornerRoadUtils 
{

    private static _instance:CornerRoadUtils;

    public static get instance():CornerRoadUtils
    {
        if(this._instance == null)
        {
            this._instance = new CornerRoadUtils();
        }
        return this._instance;
    }

    private _rcaRoadSeeker:RCAStarRoadSeeker;

    /**
     *地图路点数据 
     */		
    private _roadNodes:{[key:number]:RoadNode} = {};

    /**
     * 外墙角检测方形数组
     */
    private cornerDirArr:number[][] = [[-1,-1],[-1,1],[1,-1],[1,1]];

    private maxCol:number = 0; //总数据行
    private maxRow:number = 0; //总数据列

    public init(rcaRoadSeeker:RCAStarRoadSeeker, roadNodes:{[key:number]:RoadNode})
    {
        this._rcaRoadSeeker = rcaRoadSeeker;
        this._roadNodes = roadNodes;

        var maxCol:number  = MapRoadUtils.instance.col;
        var maxRow:number  = MapRoadUtils.instance.row;

        if(MapRoadUtils.instance.mapType == MapType.angle45)
        {
            var maxRoadNode = MapRoadUtils.instance.getNodeByDerect(maxCol,maxRow);

            //var maxGrideSize = Math.max(maxRoadNode.cx,maxRoadNode.cy);
            //this.maxCol = maxGrideSize;
            //this.maxRow = maxGrideSize;

            this.maxCol = maxRoadNode.cx;
            this.maxRow = maxRoadNode.cx - 1;

        }else
        {
            this.maxCol = maxCol;
            this.maxRow = maxRow;
        }
    }

    /**
	 * 根据世界坐标获得路节点
	 * @param cx 
	 * @param cy 
	 * @returns 
	 */
	public getRoadNode(cx:number, cy:number):RoadNode
    {
        var roadNode:RoadNode = this._rcaRoadSeeker.getRoadNode(cx, cy);
        return roadNode;
    }

    /**
	 * 根据世界坐标获得路节点
	 * @param cx 
	 * @param cy 
	 * @returns 
	 */
	public getCornerRoadNode(cx:number, cy:number):CornerRoadNode
    {
        var conerRoadNode:CornerRoadNode = this._rcaRoadSeeker.getCornerRoadNode(cx, cy);
        return conerRoadNode;
    }

    /**
     * 是否是可通过的点 
     * @param node 
     */
    private isPassNode(node:RoadNode):boolean
    {
        return this._rcaRoadSeeker.isPassNode(node);
    }

    /**
     * 用绘图工具显示墙角点及其链接关系，测试用，方便debug寻路。
     * @param graphics 
     */
    public showAllCorner(graphics:Graphics)
    {
        var outSideCornerList:CornerRoadNode[] = this.getOutSideCornerList(); 
        var inSideCornerList:CornerRoadNode[] = this.getInSideCornerList(); 
        //this._rcaRoadSeeker.linkAllCornerNodes(outSideCornerList,inSideCornerList);

        graphics.clear();

        //--------------------------------------------绘制墙角的图形标记 begin---------------------------------------------------
        var halfNodeWidth:number = MapRoadUtils.instance.halfNodeWidth;
        var halfNodeHeight:number = MapRoadUtils.instance.halfNodeHeight;

        graphics.fillColor.fromHEX("#ff000099");
        var outSideCornerNum:number = 0;
        for(var i:number = 0; i < outSideCornerList.length; i++)
        {
            outSideCornerNum ++;

            //绘制外墙角标识
            var cornerRoadNode:CornerRoadNode = outSideCornerList[i];
            graphics.circle(cornerRoadNode.roadNode.px, cornerRoadNode.roadNode.py, Math.min(halfNodeWidth,halfNodeHeight) * 0.75);
            graphics.fill();
        }

        graphics.fillColor.fromHEX("#ffff0099");
        var inSideCornerNum:number = 0;
        for(var i:number = 0; i < inSideCornerList.length; i++)
        {
            inSideCornerNum ++;

            //绘制内墙角标识
            var cornerRoadNode:CornerRoadNode = inSideCornerList[i];
            graphics.circle(cornerRoadNode.roadNode.px, cornerRoadNode.roadNode.py, Math.min(halfNodeWidth,halfNodeHeight) * 0.75);
            graphics.fill();
        }
        //--------------------------------------------绘制墙角的图形标记 end---------------------------------------------------

        
        //--------------------------------------------绘制墙角之间的链接线段 begin---------------------------------------------------
        /*
        var keyLinkDic:{[key:string]:boolean} = {};

        graphics.lineWidth = 2.4;
        graphics.strokeColor.fromHEX("#ffff00");

        for(var i:number = 0; i < outSideCornerList.length; i++)
        {
            var cornerRoadNode1:CornerRoadNode = outSideCornerList[i];
            var linkCornerNodes:CornerRoadNode[] = cornerRoadNode1.linkOtherNodes;

            for(var j:number = 0; j < linkCornerNodes.length; j++)
            {
                var cornerRoadNode2:CornerRoadNode = linkCornerNodes[j];
                var key1:string = cornerRoadNode1.roadNode.cx + "_" + cornerRoadNode1.roadNode.cy;
                var key2:string = cornerRoadNode2.roadNode.cx + "_" + cornerRoadNode2.roadNode.cy;

                if(!keyLinkDic[key1 + "_" + key2] && !keyLinkDic[key2 + "_" + key1])
                {
                    graphics.moveTo(cornerRoadNode1.roadNode.px, cornerRoadNode1.roadNode.py);
                    graphics.lineTo(cornerRoadNode2.roadNode.px, cornerRoadNode2.roadNode.py);
                    graphics.stroke();
                    keyLinkDic[key1 + "_" + key2] = true;
                    keyLinkDic[key2 + "_" + key1] = true;

                }

            }
        }


        graphics.lineWidth = 2.4;
        graphics.strokeColor.fromHEX("#00ffff");

        for(var i:number = 0; i < inSideCornerList.length; i++)
        {
            var cornerRoadNode1:CornerRoadNode = inSideCornerList[i];
            var linkCornerNodes:CornerRoadNode[] = cornerRoadNode1.linkOtherNodes;

            for(var j:number = 0; j < linkCornerNodes.length; j++)
            {
                var cornerRoadNode2:CornerRoadNode = linkCornerNodes[j];
                var key1:string = cornerRoadNode1.roadNode.cx + "_" + cornerRoadNode1.roadNode.cy;
                var key2:string = cornerRoadNode2.roadNode.cx + "_" + cornerRoadNode2.roadNode.cy;

                if(!keyLinkDic[key1 + "_" + key2] && !keyLinkDic[key2 + "_" + key1])
                {
                    graphics.moveTo(cornerRoadNode1.roadNode.px, cornerRoadNode1.roadNode.py);
                    graphics.lineTo(cornerRoadNode2.roadNode.px, cornerRoadNode2.roadNode.py);
                    graphics.stroke();

                    keyLinkDic[key1 + "_" + key2] = true;
                    keyLinkDic[key2 + "_" + key1] = true;

                }

            }
        }
        */
        //--------------------------------------------绘制墙角的链接线段 end--------------------------------------------------

        console.log("外墙角数量",outSideCornerNum,"内角数量",inSideCornerNum);
    }

    //-------------------------------------------------射线算法相关 begin---------------------------------------------------------------------

    /**
     * 两点之间射线检测，如果检测到障碍物路点则返回射线碰撞到的路点
     * 跟 RCAStarRoadSeeker.isArriveBetweenTwoNodes 函数的功能是一样的，不过不同的是那个函数是返回bool值，而rayBetweenTwoNodes返回的是射线碰撞点信息
     * @param startNode 
     * @param targetNode 
     * @returns 
     */
    public rayBetweenTwoNodes(startNode:RoadNode,targetNode:RoadNode):RoadNode[]
    {
        if(startNode == targetNode)
        {
            return null;
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

                var hitNode:RoadNode = this.isRayHitNode(node1,node2);
                if(hitNode != null)
                {
                    return [node1,hitNode];
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

                var hitNode:RoadNode = this.isRayHitNode(node1,node2);
                if(hitNode)
                {
                    return [node1,hitNode];
                }
            }
        }
        
        return null;
    }

    /**
     * 判断两个相邻的点是否可通过
     * @param node1 
     * @param node2 
     */
    private isRayHitNode(node1:RoadNode,node2:RoadNode):RoadNode
    {
        //下一个点不能通过就不能通过
        
        if(!this.isPassNode(node2))
        {
            return node2;
        }

        var dirX = node2.cx - node1.cx;
        var dirY = node2.cy - node1.cy

        //如果相邻的点是在同一行，或者同一列，则判定为可通过
        if((node1.cx == node2.cx) || (node1.cy == node2.cy))
        {
            return null;
        }

        //只剩对角情况了

        var cornerNode1:RoadNode = this.getRoadNode(node1.cx,node1.cy + dirY);
        var cornerNode2:RoadNode = this.getRoadNode((node1.cx + dirX),node1.cy);

        var conerNode1Canpass:boolean = this.isPassNode(cornerNode1);
        var conerNode2Canpass:boolean = this.isPassNode(cornerNode2);

        /*if(!conerNode1Canpass && !conerNode2Canpass)
        {

        }else */
        if(!conerNode1Canpass)
        {
            return cornerNode1;
        }else if(!conerNode2Canpass)
        {
            return cornerNode2;
        }

        return null;
    }

    //-------------------------------------------------射线算法相关 end---------------------------------------------------------------------


    //-------------------------------------------------射线碰撞点摸墙角运算 begin------------------------------------------------------------------------------------
    /**
     * 获得射线碰撞点附近最近的墙角路点。 也就是摸墙找墙角，根据射线碰撞到墙的方向是水平还是垂直，做上下还是左右摸索
     * @param brforeHitWallNode 射线碰撞墙前的路点
     * @param wallNode 射线碰撞墙后的路点
     * @returns 
     */
    public getRayHitNearestCorner(brforeHitWallNode:RoadNode, wallNode:RoadNode):CornerRoadNode
    {

        var nearestOutSideCorner:CornerRoadNode = null; //声明距离碰撞点最近的外墙角变量
        var nearestInSideCorner:CornerRoadNode = null; //声明距离碰撞点最近的内墙角变量

        var rayHitRoadNode:CornerRoadNode = null; //射线碰撞点，预设变量，保存是否是墙角
        if(this.checkIsCorner(brforeHitWallNode))
        {
            rayHitRoadNode = this.getCornerRoadNode(brforeHitWallNode.cx,brforeHitWallNode.cy);
            if(rayHitRoadNode == null)
            {
               console.error("墙角数据有误，墙角节点找不到对应的墙角数据，请检查原因：brforeHitWallNode = " + brforeHitWallNode.toString()); 
               return null;
            }

            if(rayHitRoadNode.cornerType == CornerRoadNodeType.outSideCorner) //如果碰撞处是正好是外墙角
            {
                //PathLog.log("射线碰撞墙的位置就是墙角!");
                nearestOutSideCorner = rayHitRoadNode;
            }else
            {
                nearestInSideCorner = rayHitRoadNode;
            }
        }

        var dirX:number = Math.abs(wallNode.cx - brforeHitWallNode.cx);
        var dirY:number = Math.abs(wallNode.cy - brforeHitWallNode.cy);

        var searchDirX:number = 0; //水平检索方向，0代表左右同时检索，1代表向右检索，-1代表向左边检索
        var searchDirY:number = 0; //垂直检索方向，0代表上下同时检索，1代表向上检索，-1代表向下边检索
    
        var hitH:boolean = false; //水平碰撞到
        var hitV:boolean = false; //垂直碰撞到

        if(dirX == 0)
        {
            hitV = true;
        }else if(dirY == 0)
        {
            hitH = true;
        }else
        {
            //只剩碰撞前和碰撞后两个点之间的两个对角情况了
            var cornerNode1:RoadNode = this.getRoadNode(brforeHitWallNode.cx, wallNode.cy); //角落1路点
            var cornerNode2:RoadNode = this.getRoadNode(wallNode.cx, brforeHitWallNode.cy); //角落1路点

            var cornerNode1Pass:boolean = this.isPassNode(cornerNode1); //角落1路点是否可走
            var cornerNode2Pass:boolean = this.isPassNode(cornerNode2); //角落2路点是否可走

            if(!cornerNode1Pass && cornerNode2Pass)
            {
                if(cornerNode1.cx != brforeHitWallNode.cx)
                {
                    hitH = true;
                }else
                {
                    hitV = true;
                }
            }else if(cornerNode1Pass && !cornerNode2Pass)
            {
                if(cornerNode2.cx != brforeHitWallNode.cx)
                {
                    hitH = true;
                }else
                {
                    hitV = true;
                }
            }else if(!cornerNode1Pass && !cornerNode2Pass)
            {
                //碰墙前点刚好是内墙角情况
                hitH = true;
                hitV = true;
                //内墙角的情况做检索方向特殊处理，比如墙角在右上角，因为左边和下边被障碍卡住，所以只需对右边和上边检索。也就是射线方向的反方向水平和垂直检索
                searchDirX = -(wallNode.cx - brforeHitWallNode.cx);
                searchDirY = -(wallNode.cy - brforeHitWallNode.cy);
            }else
            {
                //碰墙前点刚好是外墙角情况
                hitH = true;
                hitV = true;

                //外墙角的情况做检索方向特殊处理，比如墙角在右上角，只需水平方向向左检索，垂直方向向下检索，水平向右和垂直向上因为没有和射线碰到的墙有接触所有无需检索
                searchDirX = wallNode.cx - brforeHitWallNode.cx;
                searchDirY = wallNode.cy - brforeHitWallNode.cy;
            }

        }
        

        if(hitV) //垂直方向碰到墙壁了
        {
            var maxStep = Math.max(wallNode.cx, this.maxCol - wallNode.cx); 

            var leftSearch:boolean = searchDirX <= 0; //左边继续搜索标识
            var rightSearch:boolean = searchDirX >= 0; //右边继续搜索标识

            var leftConerRoadNode:CornerRoadNode = null; //左边的墙角
            var rightConerRoadNode:CornerRoadNode = null; //右边的墙角

            for(var i:number = 1 ; i < maxStep ; i++) //左右查询墙角点
            {
                //垂直方向碰墙y轴不变，x轴左右摸索墙壁
                var cy:number = brforeHitWallNode.cy; 

                var cx:number = brforeHitWallNode.cx + i;
                if(rightSearch && cx < this.maxCol)
                {
                    var rightNode:RoadNode = this.getRoadNode(cx,cy);
                    if(!this.isPassNode(rightNode))
                    {
                        rightSearch = false
                    }else if(this.checkIsCorner(rightNode))
                    {
                        //右边找到墙角
                        rightSearch = false; //已经找到墙角了，关闭继续向右搜索标识
                        rightConerRoadNode = this.getCornerRoadNode(rightNode.cx,rightNode.cy);
                        if(rightConerRoadNode == null)
                        {
                            console.error("墙角数据有误，墙角节点找不到对应的墙角数据，请检查原因：rightConerRoadNode = " + rightConerRoadNode.toString()); 
                            return null;
                        }

                        if(rightConerRoadNode.cornerType == CornerRoadNodeType.outSideCorner)
                        {
                            //右边摸到外墙角,和最近的一个其它外墙角比较F值，谁小选谁
                            nearestOutSideCorner = this.getMinFValueCornerNodeBetweenTwoNodes(nearestOutSideCorner, rightConerRoadNode);
                        }else
                        {
                            //右边摸到内墙角,和最近的一个其它内墙角比较F值，谁小选谁
                            nearestInSideCorner = this.getMinFValueCornerNodeBetweenTwoNodes(nearestInSideCorner, rightConerRoadNode);
                        }
                    }

                }
                
                cx = brforeHitWallNode.cx - i;
                if(leftSearch && cx >= 0)
                {
                    var leftNode:RoadNode = this.getRoadNode(cx,cy);
                    if(!this.isPassNode(leftNode))
                    {
                        leftSearch = false
                    }else if(this.checkIsCorner(leftNode))
                    {
                        //左边找到墙角
                        leftSearch = false; //已经找到墙角了，关闭继续向左搜索标识
                        leftConerRoadNode = this.getCornerRoadNode(leftNode.cx,leftNode.cy);
                        if(leftConerRoadNode == null)
                        {
                            console.error("墙角数据有误，墙角节点找不到对应的墙角数据，请检查原因：leftConerRoadNode = " + leftConerRoadNode.toString()); 
                            return null;
                        }

                        if(leftConerRoadNode.cornerType == CornerRoadNodeType.outSideCorner)
                        {
                            //左边摸到外墙角,和最近的一个其它外墙角比较F值，谁小选谁
                            nearestOutSideCorner = this.getMinFValueCornerNodeBetweenTwoNodes(nearestOutSideCorner, leftConerRoadNode);
                        }else
                        {
                            //左边摸到内墙角,和最近的一个其它内墙角比较F值，谁小选谁
                            nearestInSideCorner = this.getMinFValueCornerNodeBetweenTwoNodes(nearestInSideCorner, leftConerRoadNode);
                        }
                    }
                }

                if(!leftSearch && !rightSearch) //左右都不可搜索时结束搜索
                {
                    break;
                }
            }
        }
        
        if(hitH) //水平方向碰到墙壁了
        {
            var maxStep = Math.max(wallNode.cy, this.maxRow - wallNode.cy); 

            var downSearch:boolean = searchDirY <= 0; //下边继续搜索标识
            var upSearch:boolean = searchDirY >= 0; //上边继续搜索标识

            var downConerRoadNode:CornerRoadNode = null; //下边的墙角
            var upConerRoadNode:CornerRoadNode = null; //上边的墙角

            for(var i:number = 1 ; i < maxStep ; i++) //上下查询墙角点
            {
                //水平方向碰到墙，x轴不变，y轴上下摸索墙壁
                var cx:number = brforeHitWallNode.cx;
                var cy:number = brforeHitWallNode.cy + i;

                if(upSearch && cy < this.maxRow)
                {
                    var upNode:RoadNode = this.getRoadNode(cx,cy);
                    if(!this.isPassNode(upNode))
                    {
                        upSearch = false
                    }else if(this.checkIsCorner(upNode))
                    {
                        //上边找到墙角
                        upSearch = false; //已经找到墙角了，关闭继续向上搜索标识
                        upConerRoadNode = this.getCornerRoadNode(upNode.cx, upNode.cy);
                        if(upConerRoadNode == null)
                        {
                            console.error("墙角数据有误，墙角节点找不到对应的墙角数据，请检查原因：upConerRoadNode = " + upConerRoadNode.toString()); 
                            return null;
                        }

                        
                        if(upConerRoadNode.cornerType == CornerRoadNodeType.outSideCorner)
                        {
                            //上边摸到外墙角,和最近的一个其它外墙角比较F值，谁小选谁
                            nearestOutSideCorner = this.getMinFValueCornerNodeBetweenTwoNodes(nearestOutSideCorner, upConerRoadNode);
                        }else
                        {
                            //上边摸到内墙角,和最近的一个其它内墙角比较F值，谁小选谁
                            nearestInSideCorner = this.getMinFValueCornerNodeBetweenTwoNodes(nearestInSideCorner, upConerRoadNode);
                        }
                    }
                }
                
                cy = brforeHitWallNode.cy - i;
                if(downSearch && cy >= 0)
                {
                    var downNode:RoadNode = this.getRoadNode(cx,cy);
                    if(!this.isPassNode(downNode)) //当某个摸索方向是障碍或者左右两边都可走(说明离开墙壁了)，摸索结束
                    {
                        downSearch = false
                    }else if(this.checkIsCorner(downNode))
                    {
                        //下边找到墙角
                        downSearch = false; //已经找到墙角了，关闭继续向下搜索标识
                        downConerRoadNode = this.getCornerRoadNode(downNode.cx, downNode.cy);
                        if(downConerRoadNode == null)
                        {
                            console.error("墙角数据有误，墙角节点找不到对应的墙角数据，请检查原因：downConerRoadNode = " + downConerRoadNode.toString()); 
                            return null;
                        }


                        if(downConerRoadNode.cornerType == CornerRoadNodeType.outSideCorner)
                        {
                            //下边摸到外墙角,和最近的一个其它外墙角比较F值，谁小选谁
                            nearestOutSideCorner = this.getMinFValueCornerNodeBetweenTwoNodes(nearestOutSideCorner, downConerRoadNode);
                        }else
                        {
                            //下边摸到内墙角,和最近的一个其它内墙角比较F值，谁小选谁
                            nearestInSideCorner = this.getMinFValueCornerNodeBetweenTwoNodes(nearestInSideCorner, downConerRoadNode);
                        }
                    }
                }

                if(!downSearch && !upSearch) //上下都不可搜索时结束搜索
                {
                    break;
                }
            }
        }

        if(nearestOutSideCorner != null)
        {
            return nearestOutSideCorner;
        }

        if(nearestInSideCorner != null)
        {
            return nearestInSideCorner;
        }

        return null;
    }

    /**
     * 两个节点间找到一个从起始点到当前墙角点到目标点之间估值最小的一个点
     * @param oldCornerNode 
     * @param newCornerNode 
     */
    private getMinFValueCornerNodeBetweenTwoNodes(oldCornerNode:CornerRoadNode, newCornerNode:CornerRoadNode):CornerRoadNode
    {
        if(oldCornerNode == null)
        {
            return newCornerNode;
        }

        if(this._rcaRoadSeeker.getFValueFromStartToTarget(newCornerNode.roadNode) < this._rcaRoadSeeker.getFValueFromStartToTarget(oldCornerNode.roadNode))
        {
           return newCornerNode;
        }

        return oldCornerNode;
    }

    //-------------------------------------------------射线碰撞点摸墙角运算 end------------------------------------------------------------------------------------


    /**
     * 在碰墙壁前的点到起始点这条射线经过的所有路点中，找出一个能直达离起始点和最近的那个外墙角点的路点，（有种特殊情况，找到的最近外墙角点不可直达起始点，这种情况要做优化）
     * @param startNode 寻路的起始点
     * @param beforeHitWallNode 起始点发生射线的碰墙前点
     * @param nearestOutCornerNode 已经找到的最近外墙角点，但是这个外墙角不可直达起始点，所以这个函数的目的就是在 startNode 和 beforeHitWallNode两点之间经过的所有点中查找一个可直达这个外墙角点的拐点，这样能保证拿到最短路径
     * @returns 
     */
    public getBestLinkOutCornerNode(startNode:RoadNode, beforeHitWallNode:RoadNode, nearestOutCornerNode:CornerRoadNode):RoadNode
    {
        if(startNode == nearestOutCornerNode.roadNode)
        {
            //起始点本身就是外墙角点
            return startNode;
        }

        var disX:number = Math.abs(beforeHitWallNode.cx - startNode.cx);
        var disY:number = Math.abs(beforeHitWallNode.cy - startNode.cy);

        var dirX = 0;

        if(beforeHitWallNode.cx > startNode.cx)
        {
            dirX = 1;
        }else if(beforeHitWallNode.cx < startNode.cx)
        {
            dirX = -1;
        }

        var dirY = 0;

        if(beforeHitWallNode.cy > startNode.cy)
        {
            dirY = 1;
        }else if(beforeHitWallNode.cy < startNode.cy)
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

            for(var i = 1 ; i < disX ; i++) //起始点不用计算，所有i的索引从1开始计算。因为起始点startNode已经提前确认是不可到达最近外墙角的
            {
                ry = startNode.cy + i * dirY * rate;
                intNum = Math.floor(ry);
                decimal = ry % 1;

                var cx:number = startNode.cx + i * dirX;
                var cy:number = decimal <= 0.5 ? intNum : intNum + 1;

                var node:RoadNode = this.getRoadNode(cx,cy);
                
                if(this.rayBetweenTwoNodes(node, nearestOutCornerNode.roadNode) == null)
                {
                    return node;
                }

                //cc.log(i + "  :: " + node1.cy," yy ",startNode.cy + i * rate,ry % 1);
            }

        }else
        {
            var rate:number = disX / disY;

            for(var i = 1 ; i < disY ; i++) //起始点不用计算，所有i的索引从1开始计算。因为起始点startNode已经提前确认是不可到达最近外墙角的
            {
                rx = i * dirX * rate;
                intNum = dirX > 0 ? Math.floor(startNode.cx + rx) : Math.ceil(startNode.cx + rx);
                decimal = Math.abs(rx % 1);

                var cx:number = decimal <= 0.5 ? intNum : intNum + 1 * dirX;
                var cy:number = startNode.cy + i * dirY;

                var node:RoadNode = this.getRoadNode(cx,cy);
                
                if(this.rayBetweenTwoNodes(node, nearestOutCornerNode.roadNode) == null)
                {
                    return node;
                }
            }
        }
        
        return null;
    }

    /**
     * 检测一个节点是否是墙角
     * @param node 
     * @returns 
     */
    private checkIsCorner(node:RoadNode):boolean
    {
        if(this.isOutSideCorner(node))
        {
            //是外墙角
            return true;
        }

        if(this.isInSideCorner(node,false))
        {
            //是内墙角
            return true;
        }

        return false;

    }

    /**
     * 获得所有外墙角列表
     * @returns 
     */
    public getOutSideCornerList():CornerRoadNode[]
    {
        var outSideCornerList:CornerRoadNode[] = [];

        for(var key in this._roadNodes)
        {
            var roadNode:RoadNode = this._roadNodes[key];
            if(this.isOutSideCorner(roadNode))
            {
                var cornerRoadNode:CornerRoadNode = new CornerRoadNode();
                cornerRoadNode.roadNode = roadNode;
                cornerRoadNode.cornerType = 0;
                outSideCornerList.push(cornerRoadNode);
            }
        }

        return outSideCornerList;
    }

    /**
     * 获得所有内墙角列表
     * @returns 
     */
    public getInSideCornerList():CornerRoadNode[]
    {
        var inSideCornerList:CornerRoadNode[] = [];

        for(var key in this._roadNodes)
        {
            var roadNode:RoadNode = this._roadNodes[key];
            if(this.isInSideCorner(roadNode))
            {
                var cornerRoadNode:CornerRoadNode = new CornerRoadNode();
                cornerRoadNode.roadNode = roadNode;
                cornerRoadNode.cornerType = 1;
                inSideCornerList.push(cornerRoadNode);
            }
        }

        return inSideCornerList;
    }

    /**
     * 获得所有外墙角和内墙角列表，这样合在一个循环离写效率稍微高一点
     * @returns 
     */
    public getOutSideAndInSideCornerList():CornerRoadNode[][]
    {
        var outSideCornerList:CornerRoadNode[] = [];
        var inSideCornerList:CornerRoadNode[] = [];

        for(var key in this._roadNodes)
        {
            var roadNode:RoadNode = this._roadNodes[key];

            if(this.isOutSideCorner(roadNode))
            {
                var cornerRoadNode:CornerRoadNode = new CornerRoadNode();
                cornerRoadNode.roadNode = roadNode;
                cornerRoadNode.cornerType = 0;
                outSideCornerList.push(cornerRoadNode);
            }else if(this.isInSideCorner(roadNode))
            {
                var cornerRoadNode:CornerRoadNode = new CornerRoadNode();
                cornerRoadNode.roadNode = roadNode;
                cornerRoadNode.cornerType = 1;
                inSideCornerList.push(cornerRoadNode);
            }
        }

        return [outSideCornerList,inSideCornerList];
    }

    /**
     *节点是否是外墙角
     * @return 
     */		
    public isOutSideCorner(roadNode:RoadNode):Boolean
    {
        if(!this.isPassNode(roadNode))
        {
            return false;
        }
        
        for(var i:number = 0 ; i < this.cornerDirArr.length; i++)
        {
            var dirX:number = this.cornerDirArr[i][0];
            var dirY:number = this.cornerDirArr[i][1];

            //找出指定路点在指定方向的3个路点
            var isHorizonalNode:RoadNode = this.getRoadNode(roadNode.cx + dirX, roadNode.cy); //水平位置路点
            var isVerticalNode:RoadNode = this.getRoadNode(roadNode.cx , roadNode.cy + dirY); //垂直位置路点
            var diagonalNode:RoadNode = this.getRoadNode(roadNode.cx + dirX, roadNode.cy + dirY); //对角路点

            //如果水平和垂直的路点是可通行的，而对角路点不可通行，则这个路点是外墙角路点
            if(this.isPassNode(isHorizonalNode) && this.isPassNode(isVerticalNode) && !this.isPassNode(diagonalNode)) 
            {
                return true;
            }

        }

        return false;

    }

    /**
     *节点是否是内墙角
     * @return 
     */		
    public isInSideCorner(roadNode:RoadNode, isIgnoreOutSideCorner:boolean = true):Boolean
    {
        if(!this.isPassNode(roadNode))
        {
            return false;
        }

        //有些墙角既然内墙又是外墙角，这种情况是否忽略掉
        if(isIgnoreOutSideCorner)
        {
            //如果要忽略掉外墙角的情况，是外墙角就不属于内墙角
            if(this.isOutSideCorner(roadNode)) 
            {
                //既是内墙角，又是外墙角的情况，只默认是外墙角，可以减少寻路和链接的计算量
                return false;
            }
        }

        var leftNode:RoadNode = this.getRoadNode(roadNode.cx - 1, roadNode.cy);
        var rightNode:RoadNode = this.getRoadNode(roadNode.cx + 1, roadNode.cy);
        var upNode:RoadNode = this.getRoadNode(roadNode.cx, roadNode.cy + 1);
        var downNode:RoadNode = this.getRoadNode(roadNode.cx, roadNode.cy - 1);

        //指定节点的水平方向节点最少有一侧不能通过并且垂直方向节点最少有一侧不能通过，那么这个点即可判断为内墙角
        if((!this.isPassNode(leftNode) || !this.isPassNode(rightNode)) && (!this.isPassNode(downNode) || !this.isPassNode(upNode))) 
        {
            return true;
        }
        
        /*
        var isHorizonalCorner:boolean = (this.isPassNode(leftNode) && !this.isPassNode(rightNode)) || (!this.isPassNode(leftNode) && this.isPassNode(rightNode));
        var isVerticalCorner:boolean = (this.isPassNode(upNode) && !this.isPassNode(downNode)) || (!this.isPassNode(upNode) && this.isPassNode(downNode));

        if(isHorizonalCorner && isVerticalCorner)
        {
            return true;
        }*/
        

        return false;
    }

}
