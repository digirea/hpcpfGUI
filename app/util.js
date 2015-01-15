var fs = require('fs'),
	path = require('path');

//-------------------------------------
// Utility functions
//-------------------------------------
function getFiles(dir, list){
	var files;
	try {
		files = fs.readdirSync(dir);
	} catch (e) {
		list = {};
		return;
	}
	if (!files)
		return;
	if (dir.substr(dir.length - 1) != "/")
		dir += "/";
	for(var i in files){
		if (!files.hasOwnProperty(i)) continue;
		var name = dir+files[i];
		try {
			if (fs.statSync(name).isDirectory()){
				//getFiles(name,list);
				console.log(name)
				list.push({"name":files[i],"type":"dir","path":name});
			} else if (files[i].substring(0,1) == '.') {
				// ignore
			}else{
				console.log(name)
				list.push({"name":files[i],"type":"file","path":name});
			}
		} catch(e){
			console.log("not found dir:"+dir);
		}
	}
}

function getExtention(fileName) {
	var ret;
	if (!fileName)
		return ret;
	var fileTypes = fileName.split(".");
	var len = fileTypes.length;
	if (len === 0)
		return ret;
	ret = fileTypes[len - 1];
	return ret.toString().toLowerCase();
}

function isRelative(p) {
	var normal = path.normalize(p),
		absolute = path.resolve(p);
	return normal != absolute;
}

module.exports.getExtention = getExtention;
module.exports.getFiles = getFiles;
module.exports.isRelative = isRelative;