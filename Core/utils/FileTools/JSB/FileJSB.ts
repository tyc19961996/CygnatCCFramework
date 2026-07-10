import { JSB } from "cc/env";
import FileBase from "../FileBase";
import FileConfig from "../FileConfig";
import { READ_FILE_TYPE, FileReaderData, JsZIPFileData, filedataType } from "../FileEnum";
import FileTools from "../FileTools";
import { sys, error, native } from "cc";
import { Com, Error as LogError, Log } from "../../Logger/Log";

export default class FileJSB extends FileBase {
    openLocalDirectoryCallBack(CallBack: Function, accept?: string) {
        throw new Error("Method not implemented.");
    }
    openLocalDirectory(accept: string, callback: (file: any) => void) {
        throw new Error("Method not implemented.");
    }
    
    /**获取 写入文件的根路径 */
    /**获取 写入文件的根路径 */
    get ProjectPath(): string {
        if (JSB) {
            if (this.m_ProjectFile) {
                return this.m_ProjectFile.project_path + "/assets/";
            } else {
                return "";
            }
        } else {
            return '';
        }
    }
    onLoad() {
        let readPath: string = '';


        switch (sys.os) {
            case sys.OS.OSX:
                readPath = FileConfig.mDarwinPath + '/' + FileConfig.CnfJson;
                break;
            case sys.OS.WINDOWS:
                readPath = FileConfig.mWin32Path + '/' + FileConfig.CnfJson;
                break;
        }
        
        if (readPath == '') { return; }
        if (!native.fileUtils.isFileExist(readPath)) {
            LogError('项目配置文件不存在，请先打开项目');
            return;
        }
        let config = native.fileUtils.getStringFromFile(readPath);
        this.m_ProjectFile = JSON.parse(config);
        Log('项目配置文件读取成功', this.m_ProjectFile);
    }

    GlobalWriteStringToFile(file_txt: string, filepath: string) {
        throw new Error("Method not implemented.");
    }
    /**
     * 写入文件
     * @param file_txt 需要写入的文本
     * @param fileName 文件名记得自己加后缀
     */
    ProjectWriteStringToFile(file_txt: string, fileName: string) {
        if (JSB) {
            let path = this.ProjectPath + fileName;
            this.CreateDirectory(path);
            let write = native.fileUtils.writeStringToFile(file_txt, path);
            if (write) {
                Com("写入成功", fileName);
            } else {
                LogError("写入失败", path);
            }
        }
    }
    /**
     * 创建文件夹
     * @param path 路径
     */
    CreateDirectory(path: string) {
        let Directory = path.substring(0, path.lastIndexOf('/'));
        if (!native.fileUtils.isDirectoryExist(Directory)) {
            native.fileUtils.createDirectory(Directory);
        }
    }
    /**
     * 打开文件选择器
     *
     * @param {string} accept
     * @param {(file: File) => void} callback
     * @memberof FileMgr
     */
    openLocalFile(accept: string, callback: (file: File) => void) { }
    /**
    * 读取本地文件数据
    *
    * @param {File} file
    * @param {READ_FILE_TYPE} readType
    * @param {((result: string | ArrayBuffer) => void)} callback
    * @memberof FileMgr
    */
    readLocalFile(file: File, readType: READ_FILE_TYPE, callback: (result: string | ArrayBuffer) => void) { }
    /**
   * 打开文件选择器+读取数据
   *
   * @memberof WriteFile
   */
    openLocalFileCallBack(CallBack: Function, accept: string = ".*") {

    }

    CretedropHandler(TempdropHandler: Function) {

    }
    ReadDirectoryReader(item, DataList: FileReaderData[], TempdropHandler, path: string = "") {

    }

    ReadFileInfo(file, datalist: FileReaderData[], TempdropHandler, targt, path: string = "") {

    }

    CheckList(datalist: FileReaderData[]) {
        return true;
    }

    CreateZip(JsZIPFileData: JsZIPFileData[], zipName: string) {
        // if (JsZIPFileData.length) {
        //     let ZipName = `${zipName}.zip`;
        //     const zip = new JSZip()
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
        //             level: 1          // 压缩等级 1~9   1 压缩速度最快， 9 最优压缩方式
        //         }
        //     }).then((res: any) => {
        //         this.SaveZip(res, ZipName);
        //     })
        // }
    }

    SaveZip(blob, ZipName) {
        let fileUtil = native.fileUtils;
        let writablePath = fileUtil.getWritablePath();
        if (!fileUtil.isDirectoryExist(writablePath)) {
            fileUtil.createDirectory(writablePath);
        }
        let filePath = writablePath + ZipName;
        let success = fileUtil["writeDataToFile"](FileTools.arrayBuffer(blob.data), filePath);
        if (success) {
            Log('save file successful:', filePath);
        } else {
            Log('save file failed');
        }
    }


}
