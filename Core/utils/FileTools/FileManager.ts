import { Component, Scene, _decorator, director, sys,Node } from "cc";
import FileEnditor from "./Enditor/FileEnditor";
import FileBase from "./FileBase";
import FileJSB from "./JSB/FileJSB";
import FileWeb from "./web/FileWeb";
import { EDITOR, JSB } from "cc/env";



export class FileManager{
    public static get fileTool(): FileBase {
        if(!this.mFileTools){
            this.initialize();
        }
        return this.mFileTools;
    }

    // static CreateFileManagerNode(): FileManager {
    //     let tNode: Node = null;
    //     var scene:Scene = director.getScene();
    //     if (EDITOR) {
    //         tNode = new Node("FileManager");
    //         scene.addChild(tNode);
    //     } else if (sys.isBrowser) {
    //         tNode = new Node("FileManager");
    //         scene.addChild(tNode);
    //     } else if (JSB) {
    //         tNode = new Node("FileManager");
    //         scene.addChild(tNode);
    //     }
    //     return tNode.addComponent(FileManager);
    // }

    private static mFileTools:FileBase;
    private static initialize() {
        if(EDITOR){
            this.mFileTools = new FileEnditor();
        }else if(sys.isBrowser){
            this.mFileTools = new FileWeb();
        }else if(JSB){
            this.mFileTools = new FileJSB();
        }
        this.mFileTools.onLoad();
    }
}
