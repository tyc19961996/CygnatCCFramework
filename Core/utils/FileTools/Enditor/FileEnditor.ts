import { EDITOR } from "cc/env";
import FileBase from "../FileBase";
import FileConfig from "../FileConfig";
import { FileReaderData, JsZIPFileData, filedataType } from "../FileEnum";
import FileTools from "../FileTools";
import { Asset, SpriteFrame, assetManager, sys } from "cc";
import { Error as LogError, Log } from "../../Logger/Log";

export default class FileEnditor extends FileBase {
    /**获取 写入文件的根路径 */
    get ProjectPath(): string { return Editor.Project.path; }
    /**项目Assets 目录 */
    get AssetsPath(): string { return this.ProjectPath + `/assets`; }
    onLoad() {
        if (EDITOR) {
            //@ts-ignore
            this.EnditorFSOrOs = window.require("fs");
            switch (sys.os) {
                case sys.OS.OSX:
                    this.CreateDirectory(FileConfig.mDarwinPath)
                    break;
                case sys.OS.WINDOWS:
                    this.CreateDirectory(FileConfig.mWin32Path)
                    break;
            }
            this.m_ProjectFile.project_name = Editor.Project.name;
            this.m_ProjectFile.project_path = Editor.Project.path;
            let configStr = JSON.stringify(this.m_ProjectFile, null, 4);
            this.GlobalWriteStringToFile(configStr, this.systemPath, "");
        }
    }

    GlobalWriteStringToFile(file_txt: string | ArrayBuffer, fileName: string, FilePath?: string) {
        let path = FilePath + fileName;
        this.EnditorFSOrOs.writeFileSync(path, file_txt);
    }

    /**
     * 写入文件
     * @param file_txt 需要写入的文本
     * @param fileName 文件名记得自己加后缀
     */
    ProjectWriteStringToFile(file_txt: string, fileName: string, FilePath: string = this.ProjectPath,refreshCallBack?:Function) {
        let path = FilePath + fileName;
        let dirIndex = path.lastIndexOf("/")
        let Directory = path.slice(0, dirIndex);
        Directory = Directory.replace("\\", "/")
        let ReflashDirectory =  this.CreateDirectory(Directory)
        this.EnditorFSOrOs.writeFileSync(path, file_txt);
        //let time = new Date().getTime();
        //console.time();
        let url  =`db://${Directory.slice(Directory.indexOf("assets"))}${ReflashDirectory?"":`/${path.slice(dirIndex)}`}`;
        Editor.Message.request('asset-db', 'refresh-asset', url).then((res)=>{
            refreshCallBack && refreshCallBack();
        });
    }
    /**
     * 创建文件夹
     * @param path 路径
     */
    CreateDirectory(path: string) {
        if (!this.EnditorFSOrOs.existsSync(path)) {
            let temp  = this.EnditorFSOrOs.mkdirSync(path)
            if(!temp){
                Log('创建文件夹成功')
                return true
            }else{
                LogError('创建失败',temp)
                return false;
            }
        }else{
            return false;
        }
    }
    /**
     * 打开文件选择器
     *
     * @param {string} accept
     * @param {(file: File) => void} callback
     * @memberof FileMgr
     */
    openLocalFile(accept: string, callback: (file: string[]) => void) {

        Editor.Dialog.select({
            title: "文件选择", path: '', button: "确定", filters: [
                // { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
                // { name: 'Movies', extensions: ['mkv', 'avi', 'mp4'] },
                // { name: 'Custom File Type', extensions: ['as'] },
                { name: 'All Files', extensions: [`*`, accept] }
            ],
            multi: true
        }).then((res) => {
            callback(res.filePaths);
        });
    }

    /**
    * 读取本地文件数据
    *
    * @param {string} file
    * @param { Asset} readType
    * @param {((Asset) => void)} callback
    * @memberof FileMgr
    */
    readLocalFile(file: string, callback: (res: Asset) => void) {
        assetManager.loadRemote<SpriteFrame>(file, (err, res: Asset) => {
            if (err) {
                LogError(err);
                return;
            }
            callback(res);
        });
    }

    /**
    * 打开文件选择器+读取数据
    *
    * @memberof WriteFile
    */
    openLocalFileCallBack(CallBack: (res: Asset) => void, accept: string = ".*") {
        // 打开文件选择器
        this.openLocalFile(accept, (file) => {
            for (let i = 0; i < file.length; i++) {
                const path = file[i];
                // 读取数据
                this.readLocalFile(path, CallBack)
            }
        });
    }

    /**
  * 打开本地目录选择器
  *
  * @param {string} accept
  * @param {(file: File) => void} callback
  * @memberof FileMgr
  */
    openLocalDirectory(accept: string, callback: (file: string[]) => void) {

        // let selectfile: string | string[] = Editor.Dialog.openFile({
        //     title: "选择保存的目录", defaultPath: '', buttonLabel: "确定", filters: [
        //         // { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
        //         // { name: 'Movies', extensions: ['mkv', 'avi', 'mp4'] },
        //         // { name: 'Custom File Type', extensions: ['as'] },
        //         { name: 'All Files', extensions: [`Directory`] }
        //     ],
        //     properties: ["createDirectory", "openDirectory"]
        // })

        // if (selectfile == "-1") {
        //     Log("未选择文件");
        //     return;
        // }
        // if (Array.isArray(selectfile)) {
        //     callback(selectfile);
        // } else {
        //     callback([selectfile]);
        // }
    }


    /**
 * 打开文件选择器+读取数据
 *
 * @memberof WriteFile
 */
    openLocalDirectoryCallBack(CallBack: (res: string) => void, accept: string = null) {
        // 打开文件选择器
        this.openLocalDirectory(accept, (path: string[]) => {
            CallBack(path[0]);
        });
    }
    CretedropHandler(TempdropHandler: Function) {}
    ReadDirectoryReader(item, DataList: FileReaderData[], TempdropHandler, path: string = "") {}
    ReadFileInfo(file, datalist: FileReaderData[], TempdropHandler, targt, path: string = "") {}
    CheckList(datalist: FileReaderData[]) { return true;}
    
    CreateZip(JsZIPFileData: JsZIPFileData[], zipName: string,path:string) {
        // if (JsZIPFileData.length) {
        //     let ZipName = `${zipName}`;
        //     let zip = new JSZip()
        //     for (let i = 0; i < JsZIPFileData.length; i++) {
        //         let tZip = zip;
        //         const data = JsZIPFileData[i];
        //         for (let j = 0; j < data.folder.length; j++) {
        //             const folder = data.folder[j];
        //             tZip = tZip.folder(folder);
        //         }
        //         for (let j = 0; j < data.File.length; j++) {
        //             const flie = data.File[j];
        //             if (flie.Type == filedataType.image) {
        //                 let image = flie.value as string;
        //                 image = image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
        //                 tZip = tZip.file(flie.name, image, { base64: true });
        //             } else {
        //                 tZip = tZip.file(flie.name, flie.value);
        //             }
        //         }
        //     }
        //     zip.generateAsync({
        //         type: 'blob',
        //         compression: 'DEFLATE',  // STORE: 默认不压缩， DEFLATE：需要压缩
        //         compressionOptions: {
        //             level: 9          // 压缩等级 1~9   1 压缩速度最快， 9 最优压缩方式
        //         }
        //     }).then((res: any) => {
        //         this.SaveZip(res, ZipName,path);
        //     })
        // }
    }

    SaveZip(blob, ZipName,path:string) {
        const reader = new FileReader()
        reader.onload = (() => {
            let result: string = reader.result as string;
            this.GlobalWriteStringToFile(FileTools.arrayBuffer(result), ZipName, path + "/");
        }).bind(this)
        reader.readAsBinaryString(blob)
    }

}
