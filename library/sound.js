const fileutil = require('./file-util');
const path = fileutil.path;
const fs = fileutil.fs;
const WXFS = wx.getFileSystemManager();


/**
 * 重写的声音加载器，代替引擎默认的声音加载器
 * 该代码中包含了大量日志用于辅助开发者调试
 * 正式上线时请开发者手动删除这些注释
 */
class SoundProcessor {

    onLoadStart(host, resource) {
        const {
            root,
            url
        } = resource;
        let soundSrc = root + url;
        if (RES['getVirtualUrl']) {
            soundSrc = RES['getVirtualUrl'](soundSrc);
        }
        return new Promise((resolve, reject) => {
            //正常本地加载
            if (!path.isRemotePath(soundSrc)) { //判断是本地加载还是网络加载
                return loadSound(soundSrc, null, resolve, reject);
            }
            //无需缓存加载
            if (!needCache(root, url)) {
                return loadSound(soundSrc, null, resolve, reject);
            }
            //缓存加载
            const targetFilename = path.getLocalFilePath(soundSrc);
            return fs.exists(targetFilename, window.isShowLoading).then(() => {
                return loadSound(path.getWxUserPath(targetFilename), null, resolve, reject);
            }).catch(() => {
                return fs.downloadFile(soundSrc, targetFilename, true).then((result) => {
                    return loadSound(result.tempFilePath, result.filePath, resolve, reject);
                }).catch((e) => {
                    console.error(e);
                    const error = new RES.ResourceManagerError(1001, soundSrc,"");
                    reject(error);
                });
            });
        });
    }

    onRemoveStart(host, resource) {
        return Promise.resolve();
    }
}

function loadSound(tempFilePath, filePath, resolve, reject) {
    let sound = new egret.Sound();
    let onSuccess = () => {
        resolve(sound);
        fs.saveFile(tempFilePath, filePath)
    }

    let onError = (e) => {
        console.error(e);
        const error = new RES.ResourceManagerError(1001, tempFilePath,"");
        reject(error);
    }
    sound.addEventListener(egret.Event.COMPLETE, onSuccess, this);
    sound.addEventListener(egret.IOErrorEvent.IO_ERROR, onError, this);
    sound.load(tempFilePath);
}


function needCache(root, url) {
    //console.info("sound needCache",url)
    // if (window.LIVETIME < 7200)
    //     return true
    // if (url.indexOf("map") >= 0 || url.indexOf("ui") >= 0) {
    //     return true;
    // } else {
    //     return false;
    // }
    return true
}


const processor = new SoundProcessor();
RES.processor.map("sound", processor);