const fileutil = require('./file-util');
const path = fileutil.path;
const fs = fileutil.fs;
const WXFS = wx.getFileSystemManager();

class BinaryProcessor {

    onLoadStart(host, resource) {
        const {
            root,
            url
        } = resource;

        return new Promise((resolve, reject) => {

            let xhrURL = url.indexOf('://') >= 0 ? url : root + url;
            if (RES['getVirtualUrl']) {
                xhrURL = RES['getVirtualUrl'](xhrURL);
            }
            if (!path.isRemotePath(xhrURL)) {
                //本地加载
                try {
                    let fullPath = xhrURL;
                    if (window.isShowLoading) {
                        //sync
                        let data = fs.readSync(fullPath)
                        resolve(data);
                    } else {
                        //async
                        fs.readFile(fullPath, "null", (v) => {
                            resolve(v.data)
                        }, (e) => {
                            reject(e);
                        });
                    }
                } catch (e) {
                    resolve(null);
                }
                return;
            }
            //不用缓存直接加载
            if (!needCache(xhrURL)) {
                loadBinary(xhrURL).then((content) => {
                    resolve(content);
                }).catch((e) => {
                    reject(e);
                });
                return
            }
            //缓存加载
            const targetFilename = path.getLocalFilePath(xhrURL);
            fs.exists(targetFilename,window.isShowLoading).then(() => {
                let fullPath = path.getWxUserPath(targetFilename)
                if (window.isShowLoading) {
                    //sync
                    let data = fs.readSync(fullPath)
                    resolve(data);
                } else {
                    //async
                    fs.readFile(fullPath, null, (v) => {
                        resolve(v.data)
                    }, (e) => {
                        reject(e);
                    });
                }
            }).catch((e) => {
                fs.downloadFile(xhrURL, targetFilename, true).then((result) => {
                    if (window.isShowLoading) {
                        //sync
                        let data = fs.readSync(result.tempFilePath)
                        resolve(data);
                        fs.saveFile(result.tempFilePath, result.filePath)
                    } else {
                        //async
                        fs.readFile(result.tempFilePath, null, (v) => {
                            resolve(v.data)
                            fs.saveFile(result.tempFilePath, result.filePath)
                        }, (e) => {
                            reject(e);
                        });
                    }
                }).catch((e) => {
                    reject(e);
                });
            })

        });
    }

    onRemoveStart(host, resource) {
        return Promise.resolve();
    }
}

let wxSystemInfo;

function needReadFile() {
    if (!wxSystemInfo) {
        wxSystemInfo = wx.getSystemInfoSync();
    }
    let sdkVersion = wxSystemInfo.SDKVersion;
    let platform = wxSystemInfo.system.split(" ").shift();
    return (sdkVersion <= '2.2.3') && (platform == 'iOS');
}

function loadBinary(xhrURL) {
    return new Promise((resolve, reject) => {
        wx.request({
            url: xhrURL,
            method: 'get',
            responseType: 'arraybuffer',
            success: function success(_ref) {
                resolve(_ref.data)
            },
            fail: function fail(e) {
                console.error('load binary error', xhrURL, e);
                const error = new RES.ResourceManagerError(1001, xhrURL,"");
                reject(error)
            }
        });
    });

}

/**
 * 由于微信小游戏限制只有50M的资源可以本地存储，
 * 所以开发者应根据URL进行判断，将特定资源进行本地缓存
 */
function needCache(url) {
    //console.info("binary needCache",url)
    // if (url.indexOf(".zip") >= 0 || url.indexOf(".fui") >= 0 || url.indexOf(".dt2") >= 0) {
    //     return true;
    // } else {
    //     return false;
    // }
    return true;
}

const processor = new BinaryProcessor();
RES.processor.map("bin", processor);