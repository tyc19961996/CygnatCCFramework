import { Texture2D } from "cc";

export class projectFileInfo {
    project_name: string = '';
    project_path: string = '';
}

// 读取文件方式
export enum READ_FILE_TYPE {
    /**编码数据 64位 */
    DATA_URL,// readAsDataURL, base64
    /**文本 */
    TEXT,// readAsText
    /**二进制 */
    BINARY,// readAsBinaryString
    /**数组 */
    ARRAYBUFFER,// readAsArrayBuffer
}

export class JsZIPFileData {
    /**文件夹 */
    folder: string[] = [];
    File: FileReaderData[] = [];
}


export class FileReaderData {
    path:string;
    name: string;
    Type: string;
    value: string | ArrayBuffer;
    state: number = 0;
    texture:Texture2D;
}

export enum filedataType {
    null="",
    image = "image",
    Json = "json",
    text = "text",
    atlas = "atlas"
}