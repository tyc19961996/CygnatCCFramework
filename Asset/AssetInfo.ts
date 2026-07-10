
/**
 * 关键资源点名字枚举
 */
export enum EKeyResName {
    /**Json配置表目录 */
    Json = 'Json',
    /**预制体 */
    Prefabs = 'Prefabs',
    /**UI预制体 */
    UIPrefabs = 'UIPrefabs',
    /**spine动画文件 */
    Spine = 'Spine',
    /**图片文件 */
    Texture = 'Texture',
    /**图集 */
    Atlas = "Atlas",
    /** 字体目录 */
    Font = 'Font',
    /** 音效文件目录 */
    Sound = 'Sound',
}


/**
 * 必要的游戏资源路径
 */
export class ResUrls {

    /**
     * 获取配置表Json文件RUL
     * @param _name 配置表名字
     */
    public static Json(_name: string): string {
        return `${EKeyResName.Json}/${_name}`;
    }
    
    /**
     * 获取预制体文件的URL
     * @param _name 
     * @returns 
     */
    public static Prefabs(_name): string {
        return `${EKeyResName.Prefabs}/${_name}`;
    }
    
    /**
     * 获取UI预制体文件的URL
     * @param _name 
     * @returns 
     */
    public static UIPrefabs(_name): string {
        return `${EKeyResName.UIPrefabs}/${_name}`;
    }
    
    /**
     * 获取动画文件的URL
     * @param _name 
     * @returns 
     */
    public static Spine(_name): string {
        return `${EKeyResName.Spine}/${_name}`;
    }

      /**
     * 获取动画文件的URL
     * @param _name 
     * @returns 
     */
      public static Texture(_name): string {
        return `${EKeyResName.Texture}/${_name}`;
    }

      /**
     * 获取动画文件的URL
     * @param _name 
     * @returns 
     */
      public static Atlas(_name): string {
        return `${EKeyResName.Atlas}/${_name}`;
    }
    /**
     * 字体地址
     * @param _name 字体名字，加后缀
     */
    public static FontURL(_name): string {
        return `${EKeyResName.Font}/${_name}`;
    }
    
    /**
     * 获取音效文件URL
     * @param _name 
     * @returns 
     */
    public static Sound(_name): string {
        return `${EKeyResName.Sound}/${_name}`;
    }

}



