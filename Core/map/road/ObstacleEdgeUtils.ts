
import { Graphics } from "cc";
import { MapType } from "../base/MapType";
import MapRoadUtils from "./MapRoadUtils";
import PathFindingAgent from "./PathFindingAgent";
import RoadNode from "./RoadNode";

/**
 * 地图障碍边缘算法工具
 * @作者 落日故人 QQ 583051842
 */
export default class ObstacleEdgeUtils{

    private static _instance:ObstacleEdgeUtils;

    public static get instance():ObstacleEdgeUtils
    {
        if(this._instance == null)
        {
            this._instance = new ObstacleEdgeUtils();
        }
        return this._instance;
    }

    /**
     * 用绘图工具显示障碍边缘，测试用
     * @param graphics 
     */
    public showObstacleEdge(graphics:Graphics)
    {
        var pointDic:{[key:string]:QuadNode} = ObstacleEdgeUtils.instance.getEdge(); 
        ObstacleEdgeUtils.instance.optimizeEdge(pointDic);
        var obstacleLines:ObstacleLine[] = ObstacleEdgeUtils.instance.getObstacleEdge();

        graphics.clear();
        graphics.lineWidth = 2.4;
        graphics.strokeColor.fromHEX("#ffff00");
        graphics.fillColor.fromHEX("#ff0000");

        var nodeWidth:number = MapRoadUtils.instance.nodeWidth;
        var nodeHeight:number = MapRoadUtils.instance.nodeHeight;
        var halfNodeWidth:number = nodeWidth / 2;
        var halfNodeHeight:number = nodeHeight / 2;

        var mapType:MapType = MapRoadUtils.instance.mapType;

        var pointNum:number = 0;

        for(var key in pointDic)
        {
            if(pointDic[key] == null)
            {
                continue;
            }

            pointNum ++;

            var roadNode:RoadNode = MapRoadUtils.instance.getNodeByWorldPoint(pointDic[key].x + 0.5, pointDic[key].y + 0.5)

            if(mapType == MapType.angle45)
            {
                //菱形
                //console.log("edge",key,roadNode.px - halfNodeWidth, roadNode.py - halfNodeHeight);
                graphics.circle(roadNode.px, roadNode.py - halfNodeHeight, 5);
                graphics.fill();
            }else if(mapType == MapType.angle90)
            {
                //矩形
                //console.log("edge",key,roadNode.px - halfNodeWidth, roadNode.py - halfNodeHeight);
                graphics.circle(roadNode.px - halfNodeWidth, roadNode.py - halfNodeHeight, 5);
                graphics.fill();
            }
        }

        //this.drawEdge(pointDic);

        var len:number = obstacleLines.length;
        for(var i = 0 ; i < len ; i++)
        {
            graphics.moveTo(obstacleLines[i].startX, obstacleLines[i].startY);
            graphics.lineTo(obstacleLines[i].endX, obstacleLines[i].endY);
            graphics.stroke();
        }

        //console.log("点数量",pointNum,"线数量",len);
    }

    public getObstacleEdge():ObstacleLine[]
    {
        var pointDic:{[key:string]:QuadNode} = this.getEdge();
        this.optimizeEdge(pointDic);
        return this.getEdgeLine(pointDic);
    }

    public optimizeEdge(pointDic:{[key:string]:QuadNode})
    {
        var invalidKeys:string[] = []; //要删除的key列表

        for(var key in pointDic)
        {
            var quadNode:QuadNode = pointDic[key];

            var isHorizonalLine = (quadNode.left != null && quadNode.right != null);
            var isVerticalLine = (quadNode.up != null  && quadNode.down != null);

            if(isHorizonalLine && !isVerticalLine)
            {
                quadNode.left.right = quadNode.right;
                quadNode.right.left = quadNode.left;
                quadNode.left = null;
                quadNode.right = null;
                invalidKeys.push(key);
            }

            if(!isHorizonalLine && isVerticalLine)
            {
                quadNode.up.down = quadNode.down;
                quadNode.down.up = quadNode.up;
                quadNode.up = null;
                quadNode.down = null;
                invalidKeys.push(key);
            }
        }

        var len:number = invalidKeys.length;

        for(var i = 0 ; i < len; i++)
        {
            var key:string = invalidKeys[i];
            pointDic[key] = null;
            delete pointDic[key];
        }
    }

    public getEdgeLine(pointDic:{[key:string]:QuadNode}):ObstacleLine[]
    {
        var nodeWidth:number = MapRoadUtils.instance.nodeWidth;
        var nodeHeight:number = MapRoadUtils.instance.nodeHeight;

        var halfNodeWidth:number = nodeWidth / 2;
        var halfNodeHeight:number = nodeHeight / 2;
        
        var mapType:MapType = MapRoadUtils.instance.mapType;

        var quadNode:QuadNode = null;
        var roadNode1:RoadNode = null;
        var roadNode2:RoadNode = null;

        var startX:number = 0;
        var startY:number = 0;

        var endX:number = 0;
        var endY:number = 0;

        var obstacleLines:ObstacleLine[] = [];

        for(var key in pointDic)
        {
            quadNode = pointDic[key];

            roadNode1 = MapRoadUtils.instance.getNodeByWorldPoint(quadNode.x + 0.5, quadNode.y + 0.5)

            if(mapType == MapType.angle45)
            {
                startX = roadNode1.px;
            }else if(mapType == MapType.angle90)
            {
                startX = roadNode1.px - halfNodeWidth;
            }

            startY = roadNode1.py - halfNodeHeight;

            if(quadNode.left != null && !quadNode.connectLeft)
            {
                
                roadNode2 = MapRoadUtils.instance.getNodeByWorldPoint(quadNode.left.x + 0.5, quadNode.left.y + 0.5);
                
                if(mapType == MapType.angle45)
                {
                    endX = roadNode2.px;
                }else if(mapType == MapType.angle90)
                {
                    endX = roadNode2.px - halfNodeWidth;
                }
                
                endY = roadNode2.py - halfNodeHeight;

                var obstacleLine:ObstacleLine = new ObstacleLine();
                obstacleLine.moveTo(startX, startY);
                obstacleLine.lineTo(endX, endY);
                obstacleLines.push(obstacleLine);

                quadNode.connectLeft = true;
                quadNode.left.connectRight = true;
            }

            if(quadNode.up != null && !quadNode.connectUp)
            {
                roadNode2 = MapRoadUtils.instance.getNodeByWorldPoint(quadNode.up.x + 0.5, quadNode.up.y + 0.5);
                
                if(mapType == MapType.angle45)
                {
                    endX = roadNode2.px;
                }else if(mapType == MapType.angle90)
                {
                    endX = roadNode2.px - halfNodeWidth;
                }

                endY = roadNode2.py - halfNodeHeight;

                var obstacleLine:ObstacleLine = new ObstacleLine();
                obstacleLine.moveTo(startX, startY);
                obstacleLine.lineTo(endX, endY);
                obstacleLines.push(obstacleLine);

                quadNode.connectUp = true;
                quadNode.up.connectDown = true;
            }

            if(quadNode.right != null && !quadNode.connectRight)
            {
                roadNode2 = MapRoadUtils.instance.getNodeByWorldPoint(quadNode.right.x + 0.5, quadNode.right.y + 0.5);
                
                if(mapType == MapType.angle45)
                {
                    endX = roadNode2.px;
                }else if(mapType == MapType.angle90)
                {
                    endX = roadNode2.px - halfNodeWidth;
                }

                endY = roadNode2.py - halfNodeHeight;

                var obstacleLine:ObstacleLine = new ObstacleLine();
                obstacleLine.moveTo(startX, startY);
                obstacleLine.lineTo(endX, endY);
                obstacleLines.push(obstacleLine);

                quadNode.connectRight = true;
                quadNode.right.connectLeft = true;
            }

            if(quadNode.down != null && !quadNode.connectDown)
            {
                roadNode2 = MapRoadUtils.instance.getNodeByWorldPoint(quadNode.down.x + 0.5, quadNode.down.y + 0.5);
                
                if(mapType == MapType.angle45)
                {
                    endX = roadNode2.px;
                }else if(mapType == MapType.angle90)
                {
                    endX = roadNode2.px - halfNodeWidth;
                }

                endY = roadNode2.py - halfNodeHeight;

                var obstacleLine:ObstacleLine = new ObstacleLine();
                obstacleLine.moveTo(startX, startY);
                obstacleLine.lineTo(endX, endY);
                obstacleLines.push(obstacleLine);

                quadNode.connectDown = true;
                quadNode.down.connectUp = true;
            }
            
        }

        return obstacleLines;
    }

    public getEdge():{[key:string]:QuadNode}
    {
        var mapType:MapType = MapRoadUtils.instance.mapType;

        if(mapType == MapType.angle45)
        {
            return this.getEdge45Angle();
        }else if(mapType == MapType.angle90)
        {
            return this.getEdge90Angle();
        }
        return {};
    }

    public getEdge45Angle():{[key:string]:QuadNode}
    {
        var row:number = MapRoadUtils.instance.row;
        var col:number = MapRoadUtils.instance.col;

        var cx:number = 0;
        var cy:number = 0;

        var pointDic:{[key:string]:QuadNode} = {};

        for(var i = 0 ; i <=  row; i ++)
        {
            for(var j = 0 ; j <=  col; j ++)
            {
                var roadNode:RoadNode = MapRoadUtils.instance.getNodeByDerect(j,i);
                cx = roadNode.cx;
                cy = roadNode.cy;

                if(roadNode.dx == 0 && roadNode.dy % 2 == 0) //特殊处理最左边边缘
                {
                    var currQuadNode:QuadNode = new QuadNode(cx - 0.5, cy + 0.5);
                    var key:string = currQuadNode.x + "_" + currQuadNode.y;
                    pointDic[key] = currQuadNode;
                }

                if(roadNode.dx < col && roadNode.dy == row) //特殊处理最上边边缘
                {
                    var currQuadNode:QuadNode = new QuadNode(cx + 0.5, cy - 0.5);
                    var key:string = currQuadNode.x + "_" + currQuadNode.y;
                    pointDic[key] = currQuadNode;
                }
                
                if((roadNode.dx == col && roadNode.dy % 2 == 0 ) || roadNode.dy == row)
                {
                    this.saveLeftDownCornerQuadData(cx,cy,pointDic);
                }else
                {
                    var rightUp:RoadNode = PathFindingAgent.instance.getRoadNode(cx, cy);

                    if(rightUp == null)
                    {
                        continue;
                    }

                    var leftUp:RoadNode = PathFindingAgent.instance.getRoadNode(cx - 1, cy);
                    var leftDown:RoadNode = PathFindingAgent.instance.getRoadNode(cx - 1, cy - 1);
                    var rightDown:RoadNode = PathFindingAgent.instance.getRoadNode(cx, cy - 1);

                    if(this.isEnableValue(rightUp.value))
                    {
                        if(this.isOutEdgeNode(leftUp) || this.isOutEdgeNode(leftDown) || this.isOutEdgeNode(rightDown))
                        {
                            this.saveLeftDownCornerQuadData(cx,cy,pointDic);
                        }
                    }else if(this.isDisableValue(rightUp.value))
                    {
                        if(!this.isOutEdgeNode(leftUp) || !this.isOutEdgeNode(leftDown) || !this.isOutEdgeNode(rightDown))
                        {
                            this.saveLeftDownCornerQuadData(cx,cy,pointDic);
                        }
                    }
                }
            }
        }

        return pointDic;
    }

    public getEdge90Angle():{[key:string]:QuadNode}
    {
        var row:number = MapRoadUtils.instance.row;
        var col:number = MapRoadUtils.instance.col;

        var cx:number = 0;
        var cy:number = 0;

        var pointDic:{[key:string]:QuadNode} = {};

        for(var i = 0 ; i <= row; i ++)
        {
            for(var j = 0 ; j <= col; j ++)
            {
                cx = j;
                cy = i;
                
                if(cx == col || cy == row)
                {
                    this.saveLeftDownCornerQuadData(cx,cy,pointDic);
                }else
                {
                    var rightUp:RoadNode = PathFindingAgent.instance.getRoadNode(cx, cy);

                    var leftUp:RoadNode = PathFindingAgent.instance.getRoadNode(cx - 1, cy);
                    var leftDown:RoadNode = PathFindingAgent.instance.getRoadNode(cx - 1, cy - 1);
                    var rightDown:RoadNode = PathFindingAgent.instance.getRoadNode(cx, cy - 1);
    
                    if(this.isEnableValue(rightUp.value))
                    {
                        if(this.isOutEdgeNode(leftUp) || this.isOutEdgeNode(leftDown) || this.isOutEdgeNode(rightDown))
                        {
                            this.saveLeftDownCornerQuadData(cx,cy,pointDic);
                        }
                    }else if(this.isDisableValue(rightUp.value))
                    {
                        if(!this.isOutEdgeNode(leftUp) || !this.isOutEdgeNode(leftDown) || !this.isOutEdgeNode(rightDown))
                        {
                            this.saveLeftDownCornerQuadData(cx,cy,pointDic);
                        }
                    }
                }
            }
        }

        return pointDic;
    }

    private saveLeftDownCornerQuadData(cx:number, cy:number, pointDic:{[key:string]:QuadNode})
    {
        var currQuadNode:QuadNode = new QuadNode(cx - 0.5, cy - 0.5);
        var key:string = currQuadNode.x + "_" + currQuadNode.y;
        pointDic[key] = currQuadNode;

        var leftUp:RoadNode = PathFindingAgent.instance.getRoadNode(currQuadNode.x - 0.5, currQuadNode.y + 0.5);
        var rightUp:RoadNode = PathFindingAgent.instance.getRoadNode(currQuadNode.x + 0.5, currQuadNode.y + 0.5);
        var rightDown:RoadNode = PathFindingAgent.instance.getRoadNode(currQuadNode.x + 0.5, currQuadNode.y - 0.5);
        var leftDown:RoadNode = PathFindingAgent.instance.getRoadNode(currQuadNode.x - 0.5, currQuadNode.y - 0.5);

        var leftQuadNode = pointDic[(currQuadNode.x - 1) + "_" + currQuadNode.y];
        if(leftQuadNode != null)
        {
            
            if((!this.isOutEdgeNode(leftUp) &&  this.isOutEdgeNode(leftDown)) || 
                (this.isOutEdgeNode(leftUp) &&  !this.isOutEdgeNode(leftDown))
                ){
                currQuadNode.left = leftQuadNode;
                leftQuadNode.right = currQuadNode;
            }
        }

        var upQuadNode = pointDic[currQuadNode.x + "_" + (currQuadNode.y + 1)];
        if(upQuadNode != null)
        {
            if((!this.isOutEdgeNode(leftUp) &&  this.isOutEdgeNode(rightUp)) || 
                   (this.isOutEdgeNode(leftUp) &&  !this.isOutEdgeNode(rightUp))
                ){
                    currQuadNode.up = upQuadNode;
                    upQuadNode.down = currQuadNode;
                }
        }

        var rightQuadNode = pointDic[(currQuadNode.x + 1) + "_" + currQuadNode.y];
        if(rightQuadNode != null)
        {
            if((!this.isOutEdgeNode(rightUp) &&  this.isOutEdgeNode(rightDown)) || 
                   (this.isOutEdgeNode(rightUp) &&  !this.isOutEdgeNode(rightDown))
                ){
                    currQuadNode.right = rightQuadNode;
                    rightQuadNode.left = currQuadNode;
                }
        }

        var downQuadNode = pointDic[currQuadNode.x + "_" + (currQuadNode.y - 1)];
        if(downQuadNode != null)
        {
            if((!this.isOutEdgeNode(leftDown) &&  this.isOutEdgeNode(rightDown)) || 
                   (this.isOutEdgeNode(leftDown) &&  !this.isOutEdgeNode(rightDown))
                ){
                    currQuadNode.down = downQuadNode;
                    downQuadNode.up = currQuadNode;
                }
        }
    }

    public isEnableValue(value:number)
    {
        if(value != 1)
        {
            return true;
        }
    }

    public isDisableValue(value:number)
    {
        if(value == 1)
        {
            return true;
        }
    }

    public isOutEdgeNode(node:RoadNode):boolean
    {
        if(node == null || this.isDisableValue(node.value))
        {
            return true;
        }

        return false;
    }
  
}

export class ObstacleLine
{
    public startX:number = 0;
    public startY:number = 0;

    public endX:number = 0;
    public endY:number = 0;

    public moveTo(x:number,y:number)
    {
        this.startX = x;
        this.startY = y;
    }

    public lineTo(x:number,y:number)
    {
        this.endX = x;
        this.endY = y;
    }
}

class QuadNode
{
    public x:number = 0;
    public y:number = 0;

    public constructor(x:number = 0 , y:number = 0)
    {
        this.x = x;
        this.y = y;
    }

    public left:QuadNode = null;
    public up:QuadNode = null;
    public right:QuadNode = null;
    public down:QuadNode = null;

    public connectLeft:boolean = false;
    public connectUp:boolean = false;
    public connectRight:boolean = false;
    public connectDown:boolean = false;
}


