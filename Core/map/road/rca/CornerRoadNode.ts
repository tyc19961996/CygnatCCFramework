import RoadNode from "../RoadNode";

/**
 * 墙角路点     
 * @作者 落日故人 QQ 583051842
 *
 * 备注：给路点封装了一层壳，用来表示墙角路点。
 * (1)、墙角分为外墙角和内墙角两种类型
 * (2)、每个墙角路点都链接着周围的其它可直达的墙角路点。
 * 重点说明一下墙角链接规则：外墙角之间互相链接，外墙角不会链接内墙角；内墙角只会单向链接外墙角，内墙角不会链接其它内墙角；墙角的链接条件必须是两点一线可直达的，如果之间有障碍不可链接
 */
export default class CornerRoadNode 
{
    public roadNode:RoadNode = null;

    /**
     * 0是外墙角，1是内墙角
     */
    public cornerType:number = 0;

    /**
     * 当这个节点是内墙角时，链接的全是周围可直达的外墙角，不会有内墙角。当这个节点是外墙角时，链接的也全是周围可直达的外墙角，不会有内墙角。
     */
    public linkOtherNodes:CornerRoadNode[] = []; //这个链接其它外墙角节点的列表是否需要在烘焙阶段完成时自动完成排序，还是用到的时候排序（从近到远排序），因为烘焙节点运算消耗大，所以放到使用节点再排序。备注，不排序寻路可能得不到最短路径

    /**
     * 是否已经对linkOtherNodes由近到远排序过
     */
    private hasSort:boolean = false;
    

    /**
     *链接其它墙角。（这个墙角是指外墙角，因为根据规则：外墙角之间互相链接，内墙角只会单向链接外墙角）
     * @param other 
     */
    public addLinkNode(other:CornerRoadNode)
    {
        var index:number = this.linkOtherNodes.indexOf(other);
        if(index == -1)
        {
            this.linkOtherNodes.push(other);
        }
    }

    /**
     * 删除链接关系。（这个函数好像用不到，先写着也没关系，之后如果存在某些特殊情况需要解除链接关系时再使用）
     * @param other 
     */
    public removeLinkNode(other:CornerRoadNode)
    {
        var index:number = this.linkOtherNodes.indexOf(other);
        if(index != -1)
        {
            this.linkOtherNodes.splice(index,1);
        }
    }

    /**
     * 获得排序过后的链接的外墙角
     */
    public getAndSortLinkOutCornerRoadNodes():CornerRoadNode[]
    {
        if(!this.hasSort) //如果没有排序过，先排序
        {
            //这一步排序很关键，在起始点到目标点射线碰撞到的障碍点处找到离碰撞点最近的内墙角点的情况，找这个内墙角关联的外墙角要从近到远找，不然可能寻不到最短路径
            this.linkOtherNodes.sort((cornerNode1:CornerRoadNode,cornerNode2:CornerRoadNode):number=>
            {
                var dist1:number = Math.abs(cornerNode1.roadNode.cx - this.roadNode.cx) + Math.abs(cornerNode1.roadNode.cy - this.roadNode.cy);
                var dist2:number = (Math.abs(cornerNode2.roadNode.cx - this.roadNode.cx) + Math.abs(cornerNode2.roadNode.cy - this.roadNode.cy));
                return dist1 - dist2;
            });

            this.hasSort = true;
        }

        return this.linkOtherNodes;
    }
}

/**
 * 墙角类型
 */
export enum CornerRoadNodeType
{
    /**
     * 外墙角
     */
    outSideCorner = 0,

    /**
     * 内墙角
     */
    inSideCorner = 1,
}