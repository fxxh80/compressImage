const fs = require('fs')
const { pack } = require('texture-compressor');
 
 function walkFile(files, onFile, onComplete) {
	if (files.length == 0) {
		onComplete()
		return
	}
	let file = files.pop()
	// console.info("walkFile",file)
	fs.stat(file,(err,stats) => {
		if(err ||!stats){
			console.error("fs.stat fail", err, file);
			walkFile(files, onFile, onComplete)
			return
		}
		if (stats.isDirectory()){
			fs.readdir(file,(err,files2)=>{
				if(err) 
					return console.warn(err)
				for (let f of files2) {
					files.push(file + "/" + f)
				}
				walkFile(files, onFile, onComplete)
			});
		} else {
		  onFile(file, files, onFile, onComplete)
		}
	});
}

function dirname(path){
 	var arr = path.split("/")
 	arr.pop();
 	return arr.join("/");
 }
function existsSync(filePath){
	if(fs_cache[filePath] == 1){
		// console.info("fs_cache",filePath)
		return true
	}
	if (fs.existsSync(filePath)) {
		fs_cache[filePath] = 1
		return true
	}
}


function mkdir(filePath, onComplete){
 	var filePath = dirname(filePath)
	if (!existsSync(filePath)) {
		onComplete()
		return 
	}
	
	let current = "";
    const dirs = filePath.split('/');
    for (let i = 0; i < dirs.length; i++) {
      const dir = dirs[i]
      current += dir + "/";
      if (!existsSync(current)) {
        fs.mkdirSync(current)
		fs_cache[current] = 1
      }
    }
	onComplete()
}
 
var iPackingCnt=0
var iPackedCnt=0
function _compressImage(inputPath,outputPath,files, onComplete,type,compression,quality,outputExt){
    if (files.length == 0) {
      onComplete()
      return
    }
    let inputFile = files.pop()
	iPackingCnt+=1
	logTime("packing:"+iPackingCnt + " " + inputFile + " " + type)
	var outputFile
	if(inputFile.indexOf(".jpg") != -1)
		outputFile = inputFile.replace(".jpg",outputExt)
	else if(inputFile.indexOf(".png") != -1)
		outputFile = inputFile.replace(".png",outputExt)
	else{
		_compressImage(inputPath,outputPath,files, onComplete,type,compression,quality,outputExt)
		return
	}
	outputFile = outputFile.replace(inputPath,outputPath)
	mkdir(outputFile,()=>{		
		pack({
		  type: type,
		  input: inputFile,
		  output: outputFile,
		  compression: compression,
		  quality: quality,
		  verbose: false,
		}).then(() =>{
			iPackedCnt+=1
			logTime("packed:"+iPackedCnt + " " + inputFile + " " + type)
			 // _compressImage(inputPath,outputPath,files, onComplete,type,compression,quality,outputExt)
		});
	})
	_compressImage(inputPath,outputPath,files, onComplete,type,compression,quality,outputExt)
 }


function compressImage(inputPath,outputPath,onComplete,type,compression,quality,outputExt){
	walkFile([inputPath], (file, files, onFile, onComplete) => {
      _compressImage(inputPath,outputPath,[file],()=>{
		  walkFile(files, onFile, onComplete)
	  },type,compression,quality,outputExt)
	  // walkFile(files, onFile, onComplete)
    }, onComplete)
}

const time1 = Date.now();

function logTime(msg="logTime"){
	console.info(msg,Date.now() - time1)
}
	

function main(){
	logTime("start...")
	console.info("process.argv",process.argv)
	var inputPath= process.argv[2] || ""
	var outputFile = process.argv[3] || inputPath
	inputPath = dirname(inputPath)
	outputFile = dirname(outputFile)
	
	compressImage(inputPath,outputFile,()=>{
		logTime("pack etc finish!")
	},'etc','ETC2_RGB','etcfast','.etc.ktx')
	
	compressImage(inputPath,outputFile,()=>{
		logTime("pack pvrtc finish!")
	},'pvrtc','PVRTC1_2','pvrtcnormal','.pvr.ktx')
}

main()