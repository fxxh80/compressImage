const fileutil = require('./file-util');
const path = fileutil.path;
const fs = fileutil.fs;
const WXFS = wx.getFileSystemManager();

var loadImage = window.loadImage;

/**
 * 重写的图片加载器，代替引擎默认的图片加载器
 * 该代码中包含了大量日志用于辅助开发者调试
 * 正式上线时请开发者手动删除这些注释
 */
class ImageProcessor {

  onLoadStart(host, resource) {
    let scale9Grid;
    const {
      root,
      url,
      scale9grid
    } = resource;

    if (scale9grid) {
      const list = resource.scale9grid.split(",");
      scale9Grid = new egret.Rectangle(parseInt(list[0]), parseInt(list[1]), parseInt(list[2]), parseInt(list[3]));
    }
    return new Promise((resolve, reject) => {
      let imageSrc = root + url;
      if (RES['getVirtualUrl']) {
        imageSrc = RES['getVirtualUrl'](imageSrc);
      }

      if(imageSrc.indexOf("loading/bg2.jpg") != -1){
        imageSrc = "loading/bg2.jpg"
        console.warn("**use loacal loading/bg2.jpg ")
      }

      //正常本地加载
      if (!path.isRemotePath(imageSrc)) { //判断是本地加载还是网络加载
        return loadImage(imageSrc, scale9Grid, resolve, reject)
      }
      //无需缓存加载
      if (!needCache(root, url)) {
        return loadImage(imageSrc, scale9Grid, resolve, reject);
      }
      //缓存加载
      const targetFilename = path.getLocalFilePath(imageSrc);
      return fs.exists(targetFilename, window.isShowLoading).then(() => {
        return loadImage(path.getWxUserPath(targetFilename), scale9Grid, resolve, reject);
      }).catch(() => {
        fs.downloadFile(imageSrc, targetFilename, true).then((result) => {
          loadImage(result.tempFilePath, scale9Grid, (texture) => {
            resolve(texture)
            fs.saveFile(result.tempFilePath, result.filePath)
          }, reject);
        }).catch((e) => {
          console.error(e);
          const error = new RES.ResourceManagerError(1001, imageSrc,"");
          reject(error);
        });
      });
    });
  }

  onRemoveStart(host, resource) {
    let texture = host.get(resource);
    texture.dispose();
    return Promise.resolve();
  }
}



function needCache(root, url) {
  //console.info("image needCache",url)
  // if (url.indexOf("assets/") >= 0 || url.indexOf("image/map/") >= 0 || url.indexOf("image/role") >= 0 || url.indexOf("image/item") >= 0 || url.indexOf("image/buff") >= 0 || url.indexOf("image/shadow") >= 0 || url.indexOf("image/other") >= 0 || url.indexOf("image/res") >= 0) {
  //   return true;
  // } else {
  //   // if (url.indexOf("image/monster") >= 0)
  //   //   return false;
  //   if (window.LIVETIME < 7200)
  //     return true
  //   return false;
  // }
  return true
}

const processor = new ImageProcessor();
RES.processor.map("image", processor);