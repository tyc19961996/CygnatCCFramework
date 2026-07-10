import { sys } from "cc";
import FileBase from "../FileBase";
import { READ_FILE_TYPE, FileReaderData,JsZIPFileData, filedataType } from "../FileEnum";
import FileTools from "../FileTools";
import { Log } from "../../Logger/Log";

export default  class FileWeb extends FileBase{
    onLoad() {
        
    }
    openLocalDirectoryCallBack(CallBack: Function, accept?: string) {
       
    }
    GlobalWriteStringToFile(file_txt: string, filepath?: string) {
        
    }
    CreateDirectory(path: string) {
        
    }
    openLocalDirectory(accept: string, callback: (file: any) => void) {
       
    }
    readLocalFile(file: any, readType: any, callback: (result: any) => void) {
      this.ReadFileInfo2(file,callback);
    }

    /**
     * 写入文件
     * @param file_txt 需要写入的文本
     * @param fileName 文件名记得自己加后缀
     */
    ProjectWriteStringToFile(file_txt: string, fileName: string) {
        if (sys.isBrowser) {
            let textFileAsBlob = new Blob([file_txt], { type: 'application/json' });
            let downloadLink = document.createElement("a");
            downloadLink.download = fileName;
            downloadLink.innerHTML = "Download File";
            if (window.webkitURL != null) {         
                downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
            } else {
                downloadLink.href = window.URL.createObjectURL(textFileAsBlob);        
                downloadLink.style.display = "none";
                document.body.appendChild(downloadLink);
            }
            downloadLink.click();
        }
    }

    /**
     * 打开文件选择器
     *
     * @param {string} accept
     * @param {(file: File) => void} callback
     * @memberof FileMgr
     */
    openLocalFile(accept: string, callback: (file: File) => void) {
        let inputEl: HTMLInputElement = <HTMLInputElement>document.getElementById('file_input');
        //if (!inputEl) {
            // Log('xxxxxx createElement input');
            inputEl = document.createElement('input');
            inputEl.id = 'file_input';
            inputEl.setAttribute('id', 'file_input');
            inputEl.setAttribute('type', 'file');
            inputEl.setAttribute('class', 'fileToUpload');
            inputEl.style.opacity = '0';
            inputEl.style.position = 'absolute';
            inputEl.setAttribute('left', '-999px');
            document.body.appendChild(inputEl);
        //}

        accept = accept || ".*";
        inputEl.setAttribute('accept', accept);
        inputEl.onchange = (event) => {
            let files = inputEl.files
            if (files && files.length > 0) {
                var file = files[0];
                if (callback) callback(file);
            }
        }
        inputEl.click();
    }

    /**
   * 打开文件选择器+读取数据
   *
   * @memberof WriteFile
   */
    openLocalFileCallBack(CallBack: Function,accept:string=".*") {
        // 打开文件选择器
        this.openLocalFile(accept, (file) => {
            // 读取数据
            this.readLocalFile(file, 1, (result) => {
                CallBack && CallBack(result, file);
            })

        });
    }
    
    CretedropHandler(TempdropHandler: Function) {
        var oDragWrap = document.body;
        //拖进
        oDragWrap.addEventListener(
            "dragenter",
            function (e) {
                e.preventDefault();
            },
            false
        );
        //拖离
        oDragWrap.addEventListener(
            "dragleave",
            function (e) {
                //dragleaveHandler(e);
                e.preventDefault();
            },
            false
        );
        //拖来拖去 , 一定要注意dragover事件一定要清除默认事件
        //不然会无法触发后面的drop事件
        oDragWrap.addEventListener(
            "dragover",
            function (e) {
                e.preventDefault();
            },
            false
        );
        //扔
        oDragWrap.addEventListener(
            "drop",
            function (e) {
                e.preventDefault()
                dropHandler(e);
            },
            false
        );
        var dropHandler = (function (e) {
            //将本地图片拖拽到页面中后要进行的处理都在这
            //let listing  = document.getElementById("listing");
            let fileList = e.dataTransfer.files;
            Log(fileList);
            let items = e.dataTransfer.items;
            //listing.innerHTML = "";

            let DataList: FileReaderData[] = [];

            if (items && items.length) {
                for (let i = 0; i < items.length; i++) {
                    // file 对象（按实例拖拽的内容）转换成 FileSystemFileEntry 对象 或 FileSystemDirectoryEntry 对象
                    let item = items[i].webkitGetAsEntry();
                    if (item) {
                        // 如果是目录，则递归读取
                        if (item.isDirectory) {
                            this.ReadDirectoryReader(item,DataList,TempdropHandler,item.name);
                        } else {
                            if(item.isFile){
                                item.file((file)=>{
                                    this.ReadFileInfo(file, DataList, TempdropHandler, this);
                                });
                             }
                        }
                    }
                }

                if (fileList && fileList.length) {
                    for (let i = 0; i < fileList.length; i++) {
                        const file = fileList[i];
                        this.ReadFileInfo(file, DataList, TempdropHandler, this);
                    }
                };
            }
        }).bind(this)

    }

    ReadDirectoryReader(item,DataList: FileReaderData[],TempdropHandler,path:string=""){
        //使用目录实体来创建 FileSystemDirectoryReader 实例
        let directoryReader = item.createReader();
        // 上面只是创建了 reader 实例，现在使用 reader 实例来读取 目录实体（读取目录内容）
        directoryReader.readEntries(((function (entries) {
            // 循环目录内容
            entries.forEach((function (entry) {
                // 处理内容（递归）
                if (entry.isFile) {
                    entry.file((file) => {
                        this.ReadFileInfo(file, DataList, TempdropHandler, this,path);
                    });
                }else{
                    this.ReadDirectoryReader(entry, DataList, TempdropHandler, path + item.name);
                }
                //scanFiles(entry, directoryContainer);
            }).bind(this));
        }).bind(this)).bind(this));
    }

   
    ReadFileInfo(file:File, datalist: FileReaderData[], TempdropHandler, targt,path:string="") {
        let tdata = new FileReaderData();

        if (file.type.includes("image")) {
            tdata.Type = filedataType.image;
        } else if (file.type.includes("text")) {
            tdata.Type = filedataType.text;
        } else if (file.type.includes("json")) {
            tdata.Type = filedataType.Json;
        } else {
            if(file.name .includes(".atlas")){
                tdata.Type = filedataType.atlas;
            }else{
                tdata.Type = filedataType.null;
                return;
            }
        }
        datalist.push(tdata);
        tdata.path = path;
        tdata.name = file.name;
        //创建一个文件读取对象的实例
        let reader = new FileReader()
        switch (tdata.Type) {
            case filedataType.image:
                reader.readAsDataURL(file)
                break;
            case filedataType.text:
                reader.readAsText(file)
                break;
            case filedataType.Json:
                reader.readAsText(file)
                break;
            case filedataType.atlas:
                reader.readAsText(file)
                break;
            case filedataType.null:
                reader.readAsDataURL(file);
                break;
        }
        // 此实例的方法
        // reader.readAsBinaryString(file)  //使用原始二进制的字符串来展示文件数据
        // reader.readAsDataURL()   //使用URL来展示文件数据
        // raeder.readAsArrayBuffer()   //使用指定的二进制对象来读取内容
        // raeder.readAsText()  //使用文本字符串来展示文件数据
        reader.onloadend = (e) => {
            // 在执行下面内容时，要先判断其状态。其中属性readyState代表文件当前状态，
            // 1为loading，表示正在加载；
            // 0为empty，未加载任何数据；
            // 2为done，表示加载完毕
            if (e.target.readyState === FileReader.DONE) {    // 判断文件加载完毕，执行以下内容
                let result = reader.result;
                tdata.value = result;
                switch (tdata.Type) {
                    case filedataType.image:
                        FileTools.base64ToTexture2D(result as string, (texture) => {
                            tdata.texture = texture;
                            tdata.state = 2;
                            if (targt.CheckList(datalist)) {
                                Log("全部读取完成");
                                TempdropHandler && TempdropHandler(datalist);
                            }
                        });
                        break;
                    default:
                        tdata.state = 2;
                        if (targt.CheckList(datalist)) {
                            Log("全部读取完成");
                            TempdropHandler && TempdropHandler(datalist);
                        }
                        break;
                }
               
            }
        }
    }

     
    ReadFileInfo2(file:File, TempdropHandler) {
        let tdata = new FileReaderData();

        if (file.type.includes("image")) {
            tdata.Type = filedataType.image;
        } else if (file.type.includes("text")) {
            tdata.Type = filedataType.text;
        } else if (file.type.includes("json")) {
            tdata.Type = filedataType.Json;
        } else {
            if(file.name .includes(".atlas")){
                tdata.Type = filedataType.atlas;
            }else{
                tdata.Type = filedataType.null;
                return;
            }
        }
        tdata.name = file.name;
        //创建一个文件读取对象的实例
        let reader = new FileReader()
        switch (tdata.Type) {
            case filedataType.image:
                reader.readAsDataURL(file)
                break;
            case filedataType.text:
                reader.readAsText(file)
                break;
            case filedataType.Json:
                reader.readAsText(file)
                break;
            case filedataType.atlas:
                reader.readAsText(file)
                break;
            case filedataType.null:
                reader.readAsDataURL(file);
                break;
        }
        // 此实例的方法
        // reader.readAsBinaryString(file)  //使用原始二进制的字符串来展示文件数据
        // reader.readAsDataURL()   //使用URL来展示文件数据
        // raeder.readAsArrayBuffer()   //使用指定的二进制对象来读取内容
        // raeder.readAsText()  //使用文本字符串来展示文件数据
        reader.onloadend = (e) => {
            // 在执行下面内容时，要先判断其状态。其中属性readyState代表文件当前状态，
            // 1为loading，表示正在加载；
            // 0为empty，未加载任何数据；
            // 2为done，表示加载完毕
            if (e.target.readyState === FileReader.DONE) {    // 判断文件加载完毕，执行以下内容
                let result = reader.result;
                tdata.value = result;
                switch (tdata.Type) {
                    case filedataType.image:
                        FileTools.base64ToTexture2D(result as string, (texture) => {
                            tdata.texture = texture;
                            tdata.state = 2;
                            TempdropHandler && TempdropHandler(tdata);
                        });
                        break;
                    default:
                        tdata.state = 2;
                        TempdropHandler && TempdropHandler(tdata);
                        break;
                }
               
            }
        }


    }

    CheckList(datalist: FileReaderData[]){
        for (let i = 0; i < datalist.length; i++) {
            const element = datalist[i];
            if (!element.state) {
                return false
            }
        }
        //var zip = new JSZip();
        return true;
    }

    CreateZip(JsZIPFileData:JsZIPFileData[],zipName:string) {
        // if (sys.isBrowser && JsZIPFileData.length) {
        //     let downloadLink = document.createElement("a");
        //     downloadLink.download = `${zipName}.zip`;
        //     downloadLink.innerHTML = "Download File";
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
        //             if(flie.Type == filedataType.image){
        //                 let image = flie.value as string;
        //                 image = image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
        //                 tZip = tZip.file(flie.name,image,{base64: true});
        //             }else{
        //                 tZip = tZip.file(flie.name,flie.value);
        //             }
        //         }
        //     }
        //     zip.generateAsync({
		// 		type: 'blob',
		// 		compression: 'DEFLATE',  // STORE: 默认不压缩， DEFLATE：需要压缩
        //  		compressionOptions: {
        //    			level: 1          // 压缩等级 1~9   1 压缩速度最快， 9 最优压缩方式
        //  		}
		// 	}).then((res: any) => {
        //         if (window.webkitURL != null) {
        //             downloadLink.href = window.webkitURL.createObjectURL(res);
        //         } else {
        //             downloadLink.href = window.URL.createObjectURL(res);         
        //             downloadLink.style.display = "none";
        //             document.body.appendChild(downloadLink);
        //         }
        //         downloadLink.click();
		// 	})

        // }
    }

  
}
