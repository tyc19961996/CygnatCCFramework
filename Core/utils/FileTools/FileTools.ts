import { SpriteFrame, Texture2D } from "cc";

export default  class FileTools{
      // base64生成Texture2D
    static  base64ToTexture2D(base64: string, callback: (this: void, texture: Texture2D) => void) {
        // if (base64) {
        //     var img = new Image();
        //     img.onload = function () {
        //         var texture = new Texture2D();
        //         texture.initWithElement(img);
        //         texture.handleLoadedTexture();
        //         if (callback) callback(texture);
        //     }
        //     img.onerror = function (err) {
        //     }
        //     if ((<any>base64).startsWith !== undefined && (<any>base64).startsWith("data:image")) {
        //         img.src = base64;
        //     } else {
        //         img.src = "data:image/png;base64," + base64;
        //     }
        // } else {
        //     if (callback) callback(null);
        // }
    }

    // base64生成cc.SpriteFrame
    static base64ToSpriteFrame(base64: string, callback: (this: void, spriteFrame: SpriteFrame) => void) {
        // this.base64ToTexture2D(base64, (texture: Texture2D) => {
        //     if (texture) {
        //         var newframe = new  SpriteFrame(texture);
        //         if (callback) callback(newframe);
        //     } else {
        //         if (callback) callback(null);
        //     }
        // });
    }

    static getBase64ImageByCCTexture(texture: Texture2D, callback) {
        //this.getBase64ImageByUrl(texture.url, callback);
    }

    static getBase64ImageByCCSpriteFrame(texture: SpriteFrame, callback) {
       // this.getBase64ImageByUrl(texture.getTexture().url, callback);
    }

    static getBase64ImageByUrl(url: string, callback) {
        var canvas = document.createElement("CANVAS");
        var ctx = canvas["getContext"]('2d');
        var img = new Image;
        img.crossOrigin = 'Anonymous';
        //'res/raw-assets/' +
        img.src = url;
        img.onload = function () {
            canvas["height"] = img.height;
            canvas["width"] = img.width;
            ctx.drawImage(img, 0, 0);
            var dataURL = canvas["toDataURL"]('image/png');
            canvas = null;
            if (callback) callback(dataURL);
        }
    }

    static  arrayBuffer(_result:string): ArrayBuffer {
        
        let charArr: Array<any> = [];
        for (var i = 0; i < _result.length; i++) { // 取出文本的charCode（10进制）
            charArr.push(_result.charCodeAt(i));
        }
        let array: Uint8Array = new Uint8Array(charArr);
        const buffer = new ArrayBuffer(array.byteLength);
        new Uint8Array(buffer).set(array);
        return buffer;
    }
}
