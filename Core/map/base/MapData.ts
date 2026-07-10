import RCABakingData from "../road/rca/RCABakingData";
import { MapType } from "./MapType";

export default class MapData {

    /**
     * 地图名称
     */
    public name:string = "";

    /**
     * 地图背景资源名
     */
    public bgName:string = "";

    /**
     * 地图类型
     */
    public type:MapType = MapType.angle45;

    /**
     * 地图宽
     */
    public mapWidth:number = 0;

    /**
     * 地图高
     */
    public mapHeight:number = 0;

    /**
     * 地图路点宽
     */
    public nodeWidth:number = 0;
    
    /**
     * 地图路点高
     */
    public nodeHeight:number = 0;

    /**
     * 地图路点数据
     */
    public roadDataArr:number[][] = [];

    /**
     * rca寻路需要的烘焙数据，如果地图编辑器不导出烘焙数据则这个字段是空，rca寻路初始化时会自动烘焙，不为空rca寻路就用烘焙数据初始化。
     * 自动烘焙耗时间，用提前烘焙数据省时间但是会增大文件大小，开发者如果用rca寻路，是自动烘焙还是用提前烘焙数据，开发者自己看着选方案。
     */
    public racBakingData:RCABakingData = null;

    /**
     * 地图上编辑的所有元素（npc，怪，传送门等）
     */
    public mapItems:any[] = [];

    /**
     * 对齐方式：0，左下角; 1,左上角
     */
    public alignment:number = 0; 

    /**
     * 偏移量X
     */
    public offsetX:number = 0;
    
    /**
     * 偏移量Y
     */
    public offsetY:number = 0;    

}
