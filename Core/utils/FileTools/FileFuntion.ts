import { READ_FILE_TYPE, FileReaderData,JsZIPFileData, projectFileInfo } from "./FileEnum";

export default abstract class FileFuntion{
    /**
     * 写入文件  全局路径都可
     * @param file_txt  文件内容
     * @param FilePath  文件全路径(带文件名称)
     * @param FileName  文件名称(传入该参数 会将其与 FilePath链接)
     */
    abstract GlobalWriteStringToFile(file_txt: string, FilePath?: string,FileName?:string);
    /**
     * 写入文件
     * @param file_txt 需要写入的文本
     * @param FilePath 文件全路径(带文件名称)
     * @param FileName  文件名称(传入该参数 会将其与 FilePath链接)
     */
    abstract ProjectWriteStringToFile(file_txt: string, FilePath?: string,FileName?:string);
    /**
     * 创建文件夹
     * @param path 路径
     */
    abstract CreateDirectory(path: string);
    /**
     * 打开文件选择器
     *
     * @param {string} accept
     * @param {(file: File) => void} callback
     * @memberof FileMgr
     */
    abstract openLocalFile(accept: string, callback: (file: any) => void);

    /**
     * 
     * @param accept 打开目录选择器
     * @param callback 
     */
    abstract openLocalDirectory(accept: string, callback: (file: any) => void);

    /**
    * 读取本地文件数据
    *
    * @param {File} file
    * @param {READ_FILE_TYPE} readType
    * @param {((result: string | ArrayBuffer) => void)} callback
    * @memberof FileMgr
    */
    abstract readLocalFile(file: any, readType: any, callback: (result: any) => void) ;
    /**
   * 打开文件选择器+读取数据
   *
   * @memberof WriteFile
   */
    openLocalFileCallBack(CallBack: Function,accept:string=".*") {}
    /**打开本地文件目录并返回 */
    openLocalDirectoryCallBack(CallBack: Function,accept:string=null) {}

    /**创建拖拽文件资源返回 */
    abstract CretedropHandler(TempdropHandler: Function) ;

    /**读取文件目录 */
    ReadDirectoryReader(item, DataList: FileReaderData[], TempdropHandler, path: string = "") {

    }

    /**读取文件信息 */
    ReadFileInfo(file, datalist: FileReaderData[], TempdropHandler, targt,path:string="") {

    }

    /**检测文件是否全部读取完成 */
    CheckList(datalist: FileReaderData[]){
       return true;
    }

    /**创建zip 压缩包 */
    CreateZip(JsZIPFileData:JsZIPFileData[],zipName:string,path:string) {

    }

  


}