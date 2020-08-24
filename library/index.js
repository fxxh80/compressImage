// 启动微信小游戏本地缓存，如果开发者不需要此功能，只需注释即可
// 只有使用 assetsmanager 的项目可以使用
if (window.USE_LOCAL_CACHE && window.RES && RES.processor) {
  require('./image.js');
  require('./text.js');
  require('./sound.js');
  require('./binary.js');
  console.info('已启动微信小游戏本地缓存')
} else {
  console.info('未启动微信小游戏本地缓存')
}

