/**
 * 封装微信小游戏的文件系统
 */
const wxFs = wx.getFileSystemManager();
const WX_ROOT = wx.env.USER_DATA_PATH + "/";
const CACHE_ROOT = "cache/"
let bRemoveingSaveFiles = false

function sendUnzipWorker(filePath, data) {
  if (filePath.indexOf("zip") != -1) {
    var iStartTime = Date.now()
    if (worker) {
      worker.postMessage({
        msg: "unzip",
        filePath: filePath,
        data: data,
      })
    }
    console.info("sendUnzipWorker", Date.now() - iStartTime, filePath)
  }
}

let localfs_cache = {};
//同名文件夹 + / + 版本文件名
function getLocalFilePathWithPath(srcPath) {
  // console.info("getLocalFilePath1", srcPath)
  srcPath = srcPath.replace(window.egret_resource_root, "")
  let result = localfs_cache[srcPath]
  if (result)
    return result

  let version = "v1";
  let lSplit
  let versionDir = ""
  let p = srcPath
  if (p.indexOf("?") >= 0) {
    lSplit = p.split("?");
    p = lSplit[0];
    version = lSplit[1].replace("=", "");
  }
  lSplit = p.split("/");
  let filename = lSplit[lSplit.length - 1]
  filename = version + "_" + filename;

  //未设置key值，将按照地址名整理出资源路径，进行存储
  if (p.indexOf(":") >= 0 || p.indexOf('#') >= 0 || p.indexOf('?') >= 0) {
    p = p.replace(/[^a-z0-9.]/gi, "/");
  }

  // //fast path
  while (p.indexOf("/") >= 0)
    p = p.replace("/", "")
  while (p.indexOf(".") >= 0)
    p = p.replace(".", "")

  versionDir = path.normailze(p) + "/";
  p = CACHE_ROOT + versionDir + filename;
  // console.info("getLocalFilePath2", p)
  localfs_cache[srcPath] = p
  return p;
}

//文件名 + 版本
function getLocalFilePathNoPath(srcPath) {
  // console.info("getLocalFilePath1", srcPath)
  srcPath = srcPath.replace(window.egret_resource_root, "")
  let result = localfs_cache[srcPath]
  if (result)
    return result

  let version = "v1";
  let lSplit
  let versionDir = ""
  let p = srcPath
  if (p.indexOf("?") >= 0) {
    lSplit = p.split("?");
    p = lSplit[0];
    version = lSplit[1].replace("=", "");
  }
  // lSplit = p.split("/");
  // let filename = lSplit[lSplit.length - 1]
  // p = p.replace(filename,"")
  // filename = version + "_" + filename; 


  //未设置key值，将按照地址名整理出资源路径，进行存储
  if (p.indexOf(":") >= 0 || p.indexOf('#') >= 0 || p.indexOf('?') >= 0) {
    p = p.replace(/[^a-z0-9.]/gi, "/");
  }

  // //fast path
  while (p.indexOf("/") >= 0)
    p = p.replace("/", "")
  while (p.indexOf("_") >= 0)
    p = p.replace("_", "")
  p = CACHE_ROOT + version + "&__" + path.normailze(p)
  // console.info("getLocalFilePath2", p)
  localfs_cache[srcPath] = p
  return p;
}

// function walkFile(dirname, bSync, callback) {
//   if (bSync) {
//     const files = wxFs.readdirSync(dirname)
//     for (let f of files) {
//       const file = dirname + "/" + f;
//       const stat = wxFs.statSync(file);
//       if (stat.isDirectory()) {
//         walkFile(file, bSync, callback);
//       } else {
//         callback(file, false)
//       }
//     }
//     callback(dirname, true)
//   } else {
//     wxFs.readdir({
//       dirPath: dirname,
//       success: (res) => {
//         var files = res.files
//         for (let f of files) {
//           const file = dirname + "/" + f;
//           wxFs.stat({
//             path: file,
//             success: (res) => {
//               var stat = res.stats
//               if (stat.isDirectory()) {
//                 walkFile(file, bSync, callback);
//               } else {
//                 callback(file, false)
//               }
//             },
//             fail: (e) => {
//               console.error("wxFs.stat fail", e.errMsg, file);
//             }
//           });
//         }
//         callback(dirname, true)
//       },
//       fail: (e) => {
//         console.error("wxFs.readdir fail", e.errMsg, dirname);
//       }
//     })
//   }
// }


function walkFile2(files, bSync, onFile, onComplete) {
  if (files.length == 0) {
    onComplete()
    return
  }
  let file = files.pop()
  if (bSync) {
    const stat = wxFs.statSync(file);
    if (stat.isDirectory()) {
      for (let f of wxFs.readdirSync(file)) {
        files.push(file + "/" + f)
      }
      walkFile2(files, bSync, onFile, onComplete)
    } else {
      onFile(file, files, bSync, onFile, onComplete)
    }
  } else {
    wxFs.stat({
      path: file,
      success: (res) => {
        var stat = res.stats
        if (stat.isDirectory()) {
          wxFs.readdir({
            dirPath: file,
            success: (res) => {
              // console.error("wxFs.readdir success", file);
              for (let f of res.files) {
                files.push(file + "/" + f)
              }
              walkFile2(files, bSync, onFile, onComplete)
            },
            fail: (e) => {
              console.error("wxFs.readdir fail", e.errMsg, file);
              walkFile2(files, bSync, onFile, onComplete)
            }
          })
        } else {
          onFile(file, files, bSync, onFile, onComplete)
        }
      },
      fail: (e) => {
        console.error("wxFs.stat fail", e.errMsg, file);
        walkFile2(files, bSync, onFile, onComplete)
      }
    });
  }
}

function random(iMin, iMax) {
  if (!iMax) {
    iMax = iMin
    iMin = 0
  }
  return Math.ceil(Math.random() * (iMax - iMin)) + iMin
}

function removeAllSaveFiles() {
  try {
    //兼容缓存在根目录的旧版本
    if (!window.REMOVE_WXROOT) {
      fs.removeAllSaveFiles("", false, 0)
      window.REMOVE_WXROOT = true
      wx.setStorageSync('REMOVE_WXROOT', window.REMOVE_WXROOT)
    }
    fs.removeAllSaveFiles(CACHE_ROOT, false, random(5, 10))
  } catch (e) {
    console.error("*removeAllSaveFiles", e)
    return false;
  }
}

var testRemove = false
function test_removeAllSaveFiles() {
  if (!testRemove) {
    testRemove = true
    removeAllSaveFiles()
  }
}

/** 错误信息
 *
 * 可选值：
 * - 'fail no such file or directory, open ${filePath}': 指定的 filePath 所在目录不存在;
 * - 'fail permission denied, open ${dirPath}': 指定的 filePath 路径没有写权限;
 * - 'fail the maximum size of the file storage limit is exceeded': 存储空间不足; */
function isFailStorageLimit(errMsg) {
  return errMsg.indexOf("maximum") != -1
}

let fs_cache = {};

let dSave_cache = {};
let lSave_cache = [];
let bSaveing = false;
let iSaveHandler = 0

function updateFileCache(file, iState) {
  var p = file.replace(WX_ROOT, "");
  p = path.normailze(p);
  if (fs_cache[p]) {
    fs_cache[p] = iState;
  }
}

const fs = {

  /**
   * 使用版本管理来写文件
   */
  writeSyncUseVersion: (fileName, content, bRetry) => {
    console.info("writeSyncUseVersion", fileName)
    try {
      //写入本地
      const dirname = path.dirname(fileName);
      //删除旧的缓存文件
      fs.removeSync(dirname)
      fs.mkdirsSync(dirname);
      if (content) {
        fs.writeSync(fileName, content);
      }
      return true;
    } catch (e) {
      console.error("writeSyncUseVersion", e, fileName)
      if (bRetry) {
        if (fs.existsSync(WX_ROOT))
          return fs.writeSyncUseVersionWithClear(fileName, content, false);
      }
      return false;
    }
  },

  /**
   * 使用版本管理来写文件
   */
  writeSyncUseVersionWithClear: (fileName, content, bRetry) => {
    try {
      fs.removeAllSaveFiles(CACHE_ROOT, true)
    } catch (e) {
      console.error("*writeSyncUseVersionWithClear", e, fileName)
      return false;
    }
    if (fs.writeSyncUseVersion(fileName, content, false)) {
      console.info("*re writeSyncUseVersionWithClear success!!", fileName)
      return true;
    }
    return false;
  },

  //iRemoveInterva非空时，每iRemoveInterval个文件执行一次删除
  removeAllSaveFiles: (root, bSync, iRemoveInterval) => {
    if (bRemoveingSaveFiles)
      return
    try {
      bRemoveingSaveFiles = true;
      const time1 = Date.now();
      let fileName = path.dirname(root)
      console.warn("*removeAllSaveFiles", fileName, iRemoveInterval)
      fs.remove(fileName, bSync, iRemoveInterval, () => {
        bRemoveingSaveFiles = false;
        const time2 = Date.now() - time1;
        console.log(`*removeAllSaveFiles1: ${fileName} ${time2} ms`)
        //reset livetime
        window.LIVETIME = 0
        window.recoreLivteTime();
      })
    } catch (e) {
      console.error("*removeAllSaveFiles2", e, root)
    }
  },

  /**
   * 遍历删除文件夹
   */
  remove: (dirname, bSync, iRemoveInterval, onComplete) => {
    if (dirname != "" && !fs.existsSync(dirname)) //根目录也可以被清除
      return;
    // const time1 = Date.now();
    const globalDirname = WX_ROOT + dirname;
    let bSelecCacheFiles = false
    let cache_dirname = "cache"
    walkFile2([globalDirname], bSync, (file, files, bSync, onFile, onComplete) => {
      //old cache root,clear all old files
      if (dirname == "" && file.indexOf(cache_dirname) == -1) {
        fs.removeFiles([file], bSync, () => {
          walkFile2(files, bSync, onFile, onComplete);
        })
      } else if (dirname == cache_dirname) {
        //new ache root,clear some files by iRemoveInterval
        if (!bSelecCacheFiles) {
          bSelecCacheFiles = true
          if (iRemoveInterval) {
            let clearfiles = [];
            for (let i = 0, len = files.length; i < len; i += iRemoveInterval) {
              clearfiles.push(files[i]);
            }
            console.info("*****will remove", files.length, clearfiles.length, iRemoveInterval)
            files = clearfiles;
          }
          walkFile2(files, bSync, onFile, onComplete)
        } else {
          fs.removeFiles([file], bSync, () => {
            walkFile2(files, bSync, onFile, onComplete)
          })
        }
      } else {
        fs.removeFiles([file], bSync, () => {
          walkFile2(files, bSync, onFile, onComplete);
        })
      }
    }, onComplete)
    // const time2 = Date.now() - time1;
    // console.log(`removeSync: ${time2} ms ${dirname}`)
  },

  removeFiles: (files, bSync, onComplete) => {
    if (files.length == 0) {
      onComplete()
      return
    }
    let file = files.pop()
    if (bSync) {
      wxFs.unlinkSync(file);
      updateFileCache(file, 0);
      fs.removeFiles(files, bSync, onComplete)
    } else {
      wxFs.unlink({
        filePath: file,
        success: (res) => {
          console.info("wxFs.unlink success", file)
          updateFileCache(file, 0);
          fs.removeFiles(files, bSync, onComplete)
        },
        fail: (e) => {
          console.error("wxFs.unlink fail", e.errMsg, file);
          fs.removeFiles(files, bSync, onComplete)
        }
      });
    }
  },

  removeDirs: (files, bSync, onComplete) => {
    if (files.length == 0) {
      onComplete()
      return
    }
    let file = files.pop()
    if (bSync) {
      wxFs.rmdirSync(file);
      updateFileCache(file, 0);
      fs.removeDirs(files, bSync, onComplete)
    } else {
      wxFs.rmdir({
        dirPath: file,
        success: (res) => {
          console.info("wxFs.rmdir success", file)
          updateFileCache(file, 0);
          fs.removeDirs(files, bSync, onComplete)
        },
        fail: (e) => {
          console.error("wxFs.rmdir fail", e.errMsg, file);
        }
      })
    }
  },

  /**
   * 检查文件是否存在
   */
  exists: (p, bSync) => {
    // console.info("fs.exist",window.isShowLoading,p)
    return new Promise((resolve, reject) => {
      p = path.normailze(p);
      const cache = fs_cache[p];
      if (cache == 0) {
        reject();
      } else if (cache == 1) {
        resolve();
      } else {
        if (bSync) {
          try {
            wxFs.accessSync(WX_ROOT + p);
            fs_cache[p] = 1;
            resolve();
          } catch (e) {
            fs_cache[p] = 0;
            reject();
          }
        } else {
          try {
            wxFs.access({
              path: WX_ROOT + p,
              success: (res) => {
                fs_cache[p] = 1;
                resolve();
              },
              fail: (e) => {
                fs_cache[p] = 0;
                reject();
              }
            });
          } catch (e) {
            fs_cache[p] = 0;
            reject();
          }
        }
      }
    })
  },

  /**
   * 检查文件是否存在
   */
  existsSync: (p) => {
    p = path.normailze(p);
    const cache = fs_cache[p];
    if (cache == 0) {
      return false;
    } else if (cache == 1) {
      return true;
    } else {
      try {
        wxFs.accessSync(WX_ROOT + p);
        fs_cache[p] = 1;
        return true;
      } catch (e) {
        fs_cache[p] = 0;
        return false;
      }
    }
  },


  writeSync: (p, content) => {
    p = path.normailze(p);
    wxFs.writeFileSync(WX_ROOT + p, content);
    fs_cache[p] = 1;
  },


  write: (p, content) => {
    p = path.normailze(p);
    wxFs.writeFile({
      filePath: WX_ROOT + p,
      data: content,
      success: (v) => {
        // console.info("wxFs.writeFile success", p);
        fs_cache[p] = 1;
      },
      fail: (e) => {
        console.info("wxFs.writeFile fail", e, p);
      }
    });
  },

  readSync: (filePath, format) => {
    //var iStartTime = Date.now()
    // format = format || 'utf-8';
    let data = wxFs.readFileSync(filePath, format);
    //console.info("readSync：",Date.now() - iStartTime,filePath)
    //sendUnzipWorker(filePath,data)
    return data
  },

  readFile: (filePath, encoding, resolve, reject) => {
    var iStartTime = Date.now()
    var option = {
      filePath: filePath,
      success: (v) => {
        resolve(v);
        // console.info("readFile success", Date.now() - iStartTime, filePath)
      },
      fail: (e) => {
        reject(e);
        console.info("readFile fail", Date.now() - iStartTime, filePath)
      }
    }
    if (encoding)
      option["encoding"] = encoding
    wxFs.readFile(option)
    // console.info("readFile:",Date.now() - iStartTime,filePath)
  },



  /**
   * 创建文件夹
   */
  mkdirsSync: (p) => {
    // console.log(`mkdir: ${p}`)
    p = path.normailze(p)
    if (fs.existsSync(p))
      return;
    // const time1 = Date.now();
    // wxFs.mkdirSync(WX_ROOT + p)
    let current = "";
    const dirs = p.split('/');

    for (let i = 0; i < dirs.length; i++) {
      const dir = dirs[i]
      current += dir + "/";
      if (!fs.existsSync(current)) {
        wxFs.mkdirSync(WX_ROOT + current)
        let p = path.normailze(current);
        fs_cache[p] = 1;
      }
    }
    // const time2 = Date.now() - time1;
    // console.log(`mkdir: ${time2} ms ${p}`)
  },


  /**
   * 解压 zip 文件
   */
  unzip: (zipFilePath, targetPath) => {
    zipFilePath = WX_ROOT + zipFilePath;
    targetPath = WX_ROOT + targetPath;
    return new Promise((resolve, reject) => {
      //console.log(zipFilePath)
      wxFs.unzip({
        zipFilePath,
        targetPath,
        success: () => {
          //console.log('success')
          resolve();
        },
        fail(e) {
          //console.log(e)
          reject(e)
        }
      })
    })
  },
  /////
  setFsCache: (p, value) => {
    fs_cache[p] = value;
  },

  saveFile: (tempFilePath, filePath) => {
    if (lSave_cache.length >= 500)
      return
    if (!tempFilePath || !filePath)
      return
    if (dSave_cache[filePath])
      return
    dSave_cache[filePath] = tempFilePath;
    lSave_cache.push([tempFilePath, filePath]);
    fs.autoRun(1500)
  },

  autoRun: (itime) => {
    if (bSaveing)
      return
    clearTimeout(iSaveHandler)
    iSaveHandler = setTimeout(fs.runSaveFileTask, itime)
  },

  runSaveFileTask: () => {
    if (bSaveing)
      return
    if (lSave_cache.length <= 0)
      return
    if (lSave_cache.length % 5 == 0)
      console.info("runSaveFileTask:", lSave_cache.length)
    if (bRemoveingSaveFiles)
      return
    let taskinfo = lSave_cache.pop();
    fs._saveFile(taskinfo[0], taskinfo[1], false);
  },

  //保存到本地
  _saveFile: (tempFilePath, filePath, bSync) => {
    if (!tempFilePath || !filePath)
      return
    // console.info("saveFile", tempFilePath, filePath)
    try {
      // var iStartTime = Date.now()
      bSaveing = true;
      // if (fs.writeSyncUseVersion(filePath, null, true)) {
      fs.mkdirsSync(CACHE_ROOT);
      // console.info("saveFile1:", Date.now() - iStartTime, filePath)
      if (bSync) {
        //sync
        wxFs.saveFileSync(tempFilePath, WX_ROOT + filePath)
        // console.info("saveFile2:", Date.now() - iStartTime, filePath)
        bSaveing = false;
        fs.autoRun(window.SAVE_INTERVAL)
      } else {
        //ansy
        wxFs.saveFile({
          tempFilePath: tempFilePath,
          filePath: WX_ROOT + filePath,
          success: (v) => {
            // console.info("wxFs.saveFile success", filePath);
            // console.info("saveFile2:", Date.now() - iStartTime, filePath)
            // //清空存储空间
            //test_removeAllSaveFiles()
          },
          fail: (e) => {
            console.error("wxFs.saveFile fail", e.errMsg, filePath);
            //清空存储空间
            if (isFailStorageLimit(e.errMsg)) {
              removeAllSaveFiles()
            }
          },
          complete: () => {
            // console.info("saveFile2:", Date.now() - iStartTime, filePath)
            bSaveing = false;
            fs.autoRun(window.SAVE_INTERVAL)
          }
        })
      }
      return;
      // }
    } catch (e) {
      console.error("wxFs.saveFile fail2", e.errMsg, filePath);
    }
    bSaveing = false;
  },

  downloadFile: (url, filePath, bSaveFile) => {
    return new Promise((resolve, reject) => {
      // console.info("downloadFile", url, filePath)
      // var iStartTime = Date.now()
      wx.downloadFile({
        url: url,
        // filePath:WX_ROOT + filePath,
        success: (v) => {
          // console.info("downloadFile1:", Date.now() - iStartTime, filePath)
          if (v.statusCode >= 400) {
            try {
              wxFs.accessSync(v.tempFilePath);
              wxFs.unlinkSync(v.tempFilePath);
            } catch (e) {}
            const message = `加载失败:${url}`;
            reject(message);
          } else {
            // console.info("wxFs.downloadFile success", v.tempFilePath, filePath);
            resolve({
              tempFilePath: v.tempFilePath,
              filePath: filePath
            });
          }
          // console.info("downloadFile2:", Date.now() - iStartTime, filePath)
          // if (bSaveFile) {
          //   //保存到本地
          //   fs.saveFile(v.tempFilePath, filePath)
          // }
        },
        fail: (e) => {
          console.error(e);
          reject(e);
        }
      });
    });
  }
}

const path = {

  dirname: (p) => {
    const arr = p.split("/");
    arr.pop();
    return arr.join('/');
  },


  isRemotePath: (p) => {
    return p.indexOf("http://") == 0 || p.indexOf("https://") == 0;
  },

  normailze: (p) => {
    let arr = p.split("/");
    let original = p.split("/");
    for (let a of arr) {
      if (a == '' || a == null) {
        let index = original.indexOf(a);
        original.splice(index, 1);
      }
    }
    if (original.length > 0) {
      return original.join('/');
    }
  },

  //文件名 + 版本
  getLocalFilePath: (srcPath) => {
    return getLocalFilePathNoPath(srcPath)
  },

  // 获取微信的用户缓存地址
  getWxUserPath: (p) => {
    return WX_ROOT + p;
  }
}
module.exports.fs = fs;
module.exports.path = path;