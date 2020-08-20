const fs = require('fs')
const { pack } = require('texture-compressor');
 

function compressImage(inputPath,outputPath,type,compression,quality,outputExt){
	fs.readdir(inputPath,(err,files)=>{
		if(err) return console.warn(err)
		var inputFile,outputFile
		for(let i=0,len = files.length;i<len;i++){
			inputFile = files[i]
			outputFile = inputFile.replace(".jpg",outputExt).replace(".png",outputExt)
			console.info("packing file:",inputFile)
			
			pack({
			  type: type,
			  input: inputPath + inputFile,
			  output: outputPath + outputFile,
			  compression: compression,
			  quality: quality,
			  verbose: true,
			}).then(() => console.log('done!'));
		}
	});
}


function main(){
	console.info("process.argv",process.argv)
	var inputPath= process.argv[2] || ""
	var outputFile = process.argv[3] || inputPath
	fs.mkdir(outputFile, { recursive: true }, (err) => {
	  if (err) throw err;
	});
	
	compressImage(inputPath,outputFile,'etc','ETC2_RGB','etcfast','.etc.ktx')
	compressImage(inputPath,outputFile,'pvrtc','PVRTC1_2','pvrtcnormal','.pvr.ktx')
}

main()