import { EDITOR } from "cc/env";
import FileConfig from "./FileConfig";
import { FileReaderData, JsZIPFileData, projectFileInfo } from "./FileEnum";
import FileFs from "./FileFs";
import FileFuntion from "./FileFuntion";
import { sys } from "cc";

export default abstract class FileBase extends FileFuntion {

    m_ProjectFile: projectFileInfo = new projectFileInfo();
    /**编辑器使用的 文件写入类 */
    EnditorFSOrOs: FileFs;
    /**项目 目录 */
    get ProjectPath(): string { return ""; }
    /**项目Assets 目录 */
    get AssetsPath(): string { return ""; }
    /**系统 目录 */
    get systemPath(): string {


        // /**Mac OSX 系统下 */
        // if (sys.platform == sys.Platform.MACOS) {
        //     return FileConfig.mDarwinPath + FileConfig.CnfJson;
        // }
        // /**Windows 系统下 */
        // else
         if (sys.Platform.EDITOR_PAGE == sys.platform) {
            return FileConfig.mWin32Path + FileConfig.CnfJson;
        }
        if (EDITOR) {
            ConsoleEx.Error('没有找到对应平台的配置');
        } else {
            ConsoleEx.Error('没有找到对应平台的配置');
        }
        return ''
    }
    abstract onLoad();
    /**
     * 写入文件  全局路径都可
     * @param file_txt 
     * @param filepath  传入绝对路径
     */
    abstract GlobalWriteStringToFile(file_txt: string| ArrayBuffer, fileName: string, FilePath?: string);
    /**
     * 写入文件
     * @param file_txt 需要写入的文本
     * @param fileName 文件名记得自己加后缀
     */
    abstract ProjectWriteStringToFile(file_txt: string, fileName: string, FilePath?: string,refreshCallBack?:Function);
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
    /**打开文件夹 */
    abstract openLocalDirectory(accept: string, callback: (file: any) => void);

    /**
    * 读取本地文件数据
    *
    * @param {File} file
    * @param {READ_FILE_TYPE} readType
    * @param {((result: string | ArrayBuffer) => void)} callback
    * @memberof FileMgr
    */
    abstract readLocalFile(file: any, readType: any, callback: (result: any) => void);
    /**
   * 打开文件选择器+读取数据
   *
   * @memberof WriteFile
   * ".*"
   */
    abstract openLocalFileCallBack(CallBack: Function, accept?: string)

    abstract openLocalDirectoryCallBack(CallBack: Function, accept?: string);
    /**创建拖拽文件资源返回 */
    abstract CretedropHandler(TempdropHandler: Function);

    /**读取文件目录 */
    abstract ReadDirectoryReader(item, DataList: FileReaderData[], TempdropHandler, path?: string);

    /**读取文件信息 */
    abstract ReadFileInfo(file, datalist: FileReaderData[], TempdropHandler, targt, path?: string);

    /**检测文件是否全部读取完成 */
    abstract CheckList(datalist: FileReaderData[]);

    /**创建zip 压缩包 */
    abstract CreateZip(JsZIPFileData: JsZIPFileData[], zipName: string,path:string);




}