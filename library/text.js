const fileutil = require('./file-util');
const path = fileutil.path;
const fs = fileutil.fs;
const WXFS = wx.getFileSystemManager();

/**
 * 重写的文本加载器，代替引擎默认的文本加载器
 * 该代码中包含了大量日志用于辅助开发者调试
 * 正式上线时请开发者手动删除这些注释
 */
class TextProcessor {

    onLoadStart(host, resource) {
        const {
            root,
            url
        } = resource;

        return new Promise((resolve, reject) => {
            let xhrURL = url.indexOf('://') >= 0 ? url : root + url; //获取网络加载url
            if (RES['getVirtualUrl']) {
                xhrURL = RES['getVirtualUrl'](xhrURL);
            }
            //本地加载
            if (!path.isRemotePath(xhrURL)) { //判断是本地加载还是网络加载
                let fullPath = xhrURL;
                if (window.isShowLoading) {
                    //sync
                    let data = fs.readSync(fullPath, 'utf-8')
                    resolve(data);
                } else {
                    //async
                    fs.readFile(fullPath, 'utf-8', (v) => {
                        resolve(v.data)
                    }, (e) => {
                        reject(e);
                    });
                }
                return;
            }
            //无需缓存，正常url加载
            if (!needCache(root, url)) {
                return loadText(xhrURL).then((content) => {
                    resolve(content);
                }).catch((e) => {
                    reject(e);
                })
            }
            //缓存加载
            const targetFilename = path.getLocalFilePath(xhrURL);
            return fs.exists(targetFilename, window.isShowLoading).then(() => {
                let fullPath = path.getWxUserPath(targetFilename);
                if (window.isShowLoading) {
                    //sync
                    let data = fs.readSync(fullPath, 'utf-8')
                    resolve(data);
                } else {
                    //async
                    fs.readFile(fullPath, 'utf-8', (v) => {
                        resolve(v.data)
                    }, (e) => {
                        reject(e);
                    });
                }
            }).catch((e) => {
                fs.downloadFile(xhrURL, targetFilename, true).then((result) => {
                    if (window.isShowLoading) {
                        //sync
                        let data = fs.readSync(result.tempFilePath, 'utf-8')
                        resolve(data);
                        fs.saveFile(result.tempFilePath, result.filePath)
                    } else {
                        //async
                        fs.readFile(result.tempFilePath, 'utf-8', (v) => {
                            resolve(v.data)
                            fs.saveFile(result.tempFilePath, result.filePath)
                        }, (e) => {
                            reject(e);
                        });
                    }
                }).catch((e) => {
                    console.error(e);
                    const error = new RES.ResourceManagerError(1001, xhrURL,"");
                    reject(error);
                });
            });
        });
    }

    onRemoveStart(host, resource) {
        return Promise.resolve();
    }
}



function loadText(xhrURL) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            if (xhr.status >= 400) {
                const message = `加载失败:${xhrURL}`;
                console.error(message);
                reject(message);
            } else {
                resolve(xhr.responseText);
            }
        }
        xhr.onerror = (e) => {
            console.error(e);
            const error = new RES.ResourceManagerError(1001, xhrURL,"");
            reject(error);
        }
        xhr.open("get", xhrURL);
        xhr.send();
    })
}

function needCache(root, url) {
    //console.info("text needCache",url)
    if (url.indexOf("/config.json") >= 0 || url.indexOf("default.res.json") >= 0 || url.indexOf("loading.res.json") >= 0) {
        return false;
    } else {
        return true;
    }
}


const processor = new TextProcessor();
RES.processor.map("text", processor);