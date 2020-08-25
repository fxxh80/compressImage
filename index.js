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

function mkdir(filePath){
function mkdir(filePath, onComplete){
 	var filePath = dirname(filePath)
	//require  nodejs v10.0+
 	// if(!fs.existsSync(filePath)){
	 	// fs.mkdir(filePath, { recursive: true }, (err) => {
		  // if (err) console.error(err);
		  // onComplete()
		// });
		// return
 	// }
	// onComplete()
	
	let current = "";
    const dirs = filePath.split('/');
    for (let i = 0; i < dirs.length; i++) {
      const dir = dirs[i]
      current += dir + "/";
      if (!fs.existsSync(current)) {
        fs.mkdirSync(current)
      }
    }
	onComplete()
 }

function _compressImage(inputPath,outputPath,files, onComplete,type,compression,quality,outputExt){
    if (files.length == 0) {
      onComplete()
      return
    }
    let inputFile = files.pop()

	logTime("packing:"+inputFile)
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
			// console.log('done!')
			logTime("packed:"+inputFile)
			 _compressImage(inputPath,outputPath,files, onComplete,type,compression,quality,outputExt)
		});
	})
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
		
		compressImage(inputPath,outputFile,()=>{
			logTime("pack pvrtc finish!")
		},'pvrtc','PVRTC1_2','pvrtcnormal','.pvr.ktx')
	},'etc','ETC2_RGB','etcfast','.etc.ktx')
	
	// compressImage(inputPath,outputFile,()=>{
		// logTime("pack pvrtc finish!")
	// },'pvrtc','PVRTC1_2','pvrtcnormal','.pvr.ktx')
}

main()