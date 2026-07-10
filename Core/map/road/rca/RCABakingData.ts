
/**
 * RCA烘焙数据，用来存储提前烘焙的数据，游戏运行时用烘焙数据初始化就可以了。
 * 不用提前烘焙数据，RCA寻路就需要在游戏运行时自动烘焙，这样会消耗一定的时间，消耗多少时间会根据地图大小和客户端设备性能而异。
 */
export default class RCABakingData
{
    /**
     * 所有的外墙角坐标
     */
    public outSideCornerCoordinates:number[][] = [];

    /**
     * 所有的内墙角坐标
     */
    public inSideCornerCoordinates:number[][] = [];

    /**
     * 所有外墙角间的链接数据。（只链接所有可直达的两个墙角）  每4个数组元素为一对墙角的连接数据
     */
    public linkBetweenTwoOutSideCornerDatas:number[] = [];

    /**
     * 所有内墙角单向链接外墙角的链接数据。（只链接所有可直达的两个墙角）  每4个数组元素为一对墙角的连接数据
     */
     public linkBetweenInSideCornerToOutSideCornerDatas:number[] = [];
    
}

/**
 * RCA墙角连接数据。（暂时不用这个方式）
 */
export class RCACornerLinkData
{
    /**
     * 墙角1坐标
     */
    public corner1_coordinates:number[] = [];

    /**
     * 墙角2坐标
     */
    public corner2_coordinates:number[] = [];

    /**
     * 链接的距离，距离以格子为单位，1个格子的距离代表1
     */
    public linkDistance:number = 0;
}
