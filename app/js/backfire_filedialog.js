/*jslint devel:true*/
/*global require, module*/

if (typeof window === 'undefined') { // Node.js
	var fs = require('fs'),
		path = require('path'),
		fsWatcheClients = {},
		excludePath = require('./exclude_path'),
		CEI_JSON_FILENAME = 'cei.json',
		Filedialog = {
			
			Disconnect: function (socketId) {
				'use strict';
				var fsWatches = fsWatcheClients[socketId],
					i;
				if (!fsWatches) {
					return;
				}
				console.log('filedialog:Disconnect:', socketId);
				for (i in fsWatches) {
					if (fsWatches.hasOwnProperty(i)) {
						console.log('STOP WATCH:', i);
						fsWatches[i].close();
						delete fsWatches[i];
					}
				}
				delete fsWatcheClients[socketId];
			},
			SocketEvent: function (socket, skname, isSecondTime) {
				'use strict';
				var workpath = "",
					fsWatches = {},
					reqFileListFunc = (function (skt) {
						return function (relativepath) {
							console.log('PATH = ' + relativepath);
							updateFileList(relativepath, skt);
						};
					}(socket)),
					unwatchDirFunc = (function (skt) {
						return function (relativePath) {
							unwatchDir(relativePath, skt);
						};
					}(socket)),
					setRootPathFunc = (function (skt) {
						return function (data) {
							var i,
								file,
								files,
								absolutePath,
								relativePath;
							workpath = data.path;
							console.log('setRootPath:', workpath);
							updateFileList('/', skt);

							// for cei.json, update(watch) all case list.
							absolutePath = makeAbsolutePath('/');
							files = fs.readdirSync(absolutePath);
							for (i in files) {
								if (files.hasOwnProperty(i)) {
									file = absolutePath + '/' + files[i];
									if (fs.statSync(file).isDirectory()) {
										relativePath = path.relative(workpath, file).split(path.sep).join('/');
										console.log("setRootPath - watch case:", relativePath);
										updateFileList(relativePath, skt);
									}
								}
							}
						};
					}(socket));
				
				fsWatcheClients[socket.id] = fsWatches;
				
				function loadFileList(dir, callback) {
					var i,
						name,
						relativePath,
						dom,
						lst = [],
						//childlist,
						files = fs.readdirSync(dir),
						isExcludePath = false;
					if (!files) {
						return;
					}
					for (i in files) {
						if (files.hasOwnProperty(i)) {
							name = dir + files[i];
							relativePath = path.relative(workpath, name).split(path.sep).join('/');
							isExcludePath = excludePath.isExcludePath(excludePath.TypeWorkSpace, relativePath);
							try {
								if (fs.statSync(name).isDirectory()) {
									dom = {"name": files[i], "type": "dir", "path": relativePath, "extract": false, "child": null, "exclude" : isExcludePath};
									lst.push(dom);
								} else if (files[i].substring(0, 1) !== '.') {
									lst.push({"name": files[i], "type": "file", "path": relativePath, "exclude" : isExcludePath});
								}
							} catch (err) {
								console.log("not found dir:" + dir, err);
							}
						}
					}
					if (callback) {
						callback(dir, lst);
					}
				}
				function getFiles(dir, socketId, callback) {
					var wt,
						fsWatches;
					
					if (dir.substr(dir.length - 1) !== "/") {
						dir += "/";
					}
					
					// start watch
					fsWatches = fsWatcheClients[socketId];
					if (!fsWatches) {
						console.error('ERROR: not found fsWatchClient');
						fsWatches = {};
					}
					wt = fsWatches[dir];
					if (wt === undefined) {
						console.log('[WATCH START]:', dir);
						try {
							wt = fs.watch(dir, (function (dir, callback) {
								return function (event, filename) {
									// Update callback, if any changes
									loadFileList(dir, callback);
								};
							}(dir, callback)));
							fsWatches[dir] = wt;
						} catch (e) {
							console.error('ERROR: Failed to watch');
						}
					} else {
						console.log('[WATCH ALREADY]:', dir);
					}
					// Update callback immediately for First time.
					loadFileList(dir, callback);
				}
				function makeAbsolutePath(relativePath) {
					var absolutePath;
					if (workpath.length === 0) {
						console.log("project path error");
						return "";
					}
					
					//absolutePath = path.join(workpath, relativePath); // TODO: windows native path
					
					// It's okay
					if (relativePath === '/') {
						absolutePath = workpath; // root
					} else {
						absolutePath = workpath + '/' + relativePath;
					}
					return absolutePath;
				}
				function updateFileList(relativePath, skt) {
					var absolutePath;
					if (workpath.length === 0) {
						console.log("project path error");
						return;
					}
					try {
						absolutePath = makeAbsolutePath(relativePath);
						console.log("updateFileList:" + absolutePath);
						getFiles(absolutePath, skt.id, (function (name, skt) {
							return function (dir, list) {
								var msg = name + ':FileDialogUpdateList',
									body = JSON.stringify({dirpath: dir, filelist: list});
								
								skt.emit(msg, body);
							};
						}(skname, skt)));
					} catch (e) {
						console.log("Failed getfile");
					}
				}
				function unwatchDir(relativePath, skt) {
					var fsWatches,
						wpath,
						absolutePath,
						key;
					
					absolutePath = makeAbsolutePath(relativePath);
					if (absolutePath[absolutePath.length - 1] !== '/') {
						absolutePath += '/';
					}

					console.log('[WATCH END] PATH = ' + absolutePath, skt.id);
					fsWatches = fsWatcheClients[skt.id];
					if (!fsWatches) {
						console.error('not found socket.id:', skt.id);
						return;
					}
					if (!fsWatches[absolutePath]) {
						console.error('not found relativepath:', absolutePath);
						return;
					}

					for (key in fsWatches) {
						if (fsWatches.hasOwnProperty(key)) {
							if (key.indexOf(absolutePath) === 0) {
								fsWatches[key].close();
								delete fsWatches[key];
								console.log(key + ' > unwatch');
							}
						}
					}
				}
				
				if (!isSecondTime) {
					// get for subdir
					socket.on(skname + ':FileDialogReqFileList', reqFileListFunc);

					// get for subdir
					socket.on(skname + ':UnwatchDir', unwatchDirFunc);

					// set for root
					socket.on(skname + ':setRootPath', setRootPathFunc);
				}
			}
		};
	module.exports = Filedialog;

} else { // Browser
	
	var FileDialog = (function () {
		'use strict';

		var FileDialog = function (name, domElement, ignoreDotFile, dirOnly) {
			this.name = name;
			this.ignoreDotFile = ignoreDotFile;
			this.dirOnly = dirOnly;
			this.tarDir = "/";
			this.domElement = domElement;
			this.fileClickCallback = (function () {}());
			this.ceiJSONChangeCallback  = (function () {}());
			this.isAlwaysWatchRootDirCallback  = (function () {}());
			this.dirClickCallback = (function () {}());
			this.dirStatusChangeCallback = (function () {}());
			this.openingDirList = {};
		};

		FileDialog.prototype.registerSocketEvent = function (socket) {
			this.socket = socket;
			var eventname = this.name + ':FileDialogUpdateList';
			console.log('FileDialog:' + eventname);
			function eventFunc(thisptr) {
				return function (data) {
					var dt = JSON.parse(data);
					thisptr.changeDirStatus(dt.dirpath, dt.filelist);
				};
			}
			socket.on(eventname, eventFunc(this));
			
			function extractFunc(thisptr) {
				return function (data) {
					console.log(data);
					thisptr.extractDir(data);
				};
			}
			socket.on(this.name + ':FileDialogReqExtractDir', extractFunc(this));
		};
		
		FileDialog.prototype.setFileClickCallback = function (callback) {
			this.fileClickCallback = callback;
		};
		
		FileDialog.prototype.setDirClickCallback = function (callback) {
			this.dirClickCallback = callback;
		};
		
		FileDialog.prototype.setCeiJSONChangeCallback = function (callback) {
			this.ceiJSONChangeCallback = callback;
		};
		
		FileDialog.prototype.setIsAlwaysWatchRootDirCallback = function (callback) {
			this.isAlwaysWatchRootDirCallback = callback;
		};

		FileDialog.prototype.setDirStatusChangeCallback = function (callback) {
			this.dirStatusChangeCallback = callback;
		};
		
		FileDialog.prototype.FileList = function (relativePath) {
			console.log("Filelist:" + relativePath);
			this.socket.emit(this.name + ":FileDialogReqFileList", relativePath);
		};
		FileDialog.prototype.UnwatchDir = function (relativePath) {
			console.log("UnwatchDir:" + relativePath);
			this.socket.emit(this.name + ":UnwatchDir", relativePath);
		};

		//--------------
		FileDialog.prototype.makeFilelist = function (ls, list, level, parentDir) {
			console.log("makeFilelist");
			ls.innerHTML = ''; // clear
			var skip,
				i,
				node = null;
			for (i in list) {
				if (list.hasOwnProperty(i)) {
					skip = false;
					if (list[i].type !== "file" && list[i].type !== "dir") {
						console.log("Unknown file type -> " + list[i].type);
						skip = true;
					}
					if (list[i].name.charAt(0) === "." && this.ignoreDotFile) {
						skip = true;
					}
					if (list[i].type === "file" && this.dirOnly) { // ignore files
						skip = true;
					}
					if (!skip) {
						node = this.makeNode(ls, list[i], level,  parentDir);
					}
					
					// Recursive
					if (node) {
						if ((list[i].type === "dir") && this.openingDirList['/' + list[i].path + '/']) {
							this.registerDirDom(list[i].path, list[i].childElement);
						}
					}
				}
			}
		};

		FileDialog.prototype.registerRootDom = function (fullpath, domElem) {
			this.openingDirList['/'] = domElem;
			this.tarDir = fullpath;
			this.socket.emit(this.name + ':setRootPath', {path: fullpath});
		};
		FileDialog.prototype.registerDirDom = function (relativepath, domElem) {
			//console.log('REGISTER:', '/' + relativepath + '/', domElem);
			this.openingDirList['/' + relativepath + '/'] = domElem; // Register
			this.FileList(relativepath); // get file list for First
		};
		FileDialog.prototype.removeDirDom = function (relativepath) {
			var slashRelativePath = '/' + relativepath + '/',
				elem = this.openingDirList[slashRelativePath];
			delete this.openingDirList[slashRelativePath];
			if (elem) {
				elem.innerHTML = ''; // clear dom
			}
			// widthout root dirs for watching cei.json
			if (this.isAlwaysWatchRootDirCallback) {
				if (!this.isAlwaysWatchRootDirCallback()) {
					if (relativepath.indexOf('/') >= 0) {
						console.log("UNWATCH:", relativepath);
						this.UnwatchDir(relativepath); // unwatch dir
					}
				}
			} else {
				if (relativepath.indexOf('/') >= 0) {
					console.log("UNWATCH:", relativepath);
					this.UnwatchDir(relativepath); // unwatch dir
				}
			}
		};
		
		
		FileDialog.prototype.makeNode = function (ls, listitem, level, parentDir) {
			var name    = listitem.name,
				relativePath    = listitem.path,
				type    = listitem.type,
				extract = listitem.extract,
				isdisable = listitem.exclude || (ls.className.indexOf('disabled') >= 0),
				newbtn    = document.createElement('div'),
				fileicon  = document.createElement('div'),
				filelabel = document.createElement('p'),
				childls,
				i,
				sizer;
			
			console.log("createElement");
			for (i = 0; i < level; i = i + 1) {
				sizer = document.createElement('div');
				sizer.setAttribute('class', "nodesizer");
				sizer.setAttribute('draggable', "false");
				newbtn.appendChild(sizer);
			}
			
			if (isdisable) {
				newbtn.setAttribute('class', "fileitem fileitem_disabled");
			} else {
				newbtn.setAttribute('class', "fileitem");
			}
			newbtn.setAttribute('draggable', "false");
			fileicon.setAttribute('class', type);
			newbtn.appendChild(fileicon);

			if (isdisable) {
				filelabel.setAttribute('class', "filelabel filelabel_disabled");
			} else {
				filelabel.setAttribute('class', "filelabel");
			}
			filelabel.innerHTML = name;
			newbtn.appendChild(filelabel);
			if (type === "dir") {
				newbtn.addEventListener('click', (function (relativePath, listitem, fileDialog, element) { return function () {
					listitem.extract = !listitem.extract;
					console.log('Extract Dir:' + relativePath);
					if (listitem.extract) {
						console.log('OPEN  DIR:', relativePath);
						fileDialog.registerDirDom(relativePath, listitem.childElement);// add watch request
					} else {
						console.log('CLOSE DIR:', relativePath);
						fileDialog.removeDirDom(relativePath);// remove watch request
					}
					if (fileDialog.dirClickCallback) {
						fileDialog.dirClickCallback(fileDialog, element, parentDir, relativePath);
					}
				}; }(relativePath, listitem, this, newbtn)));
				ls.appendChild(newbtn);
				
				// create child div
				childls = document.createElement('div');
				ls.appendChild(childls);
				if (isdisable) {
					childls.className = "disabled";
				}
				listitem.childElement = childls;
				childls.parentDom = newbtn;
					
			} else if (type === "file") {
				newbtn.addEventListener('click', (function (fileDialog, element) {
					return function () {
						if (fileDialog.fileClickCallback) {
							fileDialog.fileClickCallback(fileDialog, element, parentDir, relativePath);
						}
					};
				}(this, newbtn)));
				ls.appendChild(newbtn);
			}
			return newbtn;
		};
		
		FileDialog.prototype.changeDirStatus = function (dirpath, filelist) {
			console.log('ChangeEvent DIR=', dirpath, 'ROOT DIR=', this.tarDir);
			var relativepath,
				elem,
				depth;
			if (dirpath.indexOf(this.tarDir) === 0) { // matchig dir
				relativepath = dirpath.substring(this.tarDir.length);
				elem = this.openingDirList[relativepath];
				//console.log(relativepath, elem);
				if (elem !== undefined) { // is waching?
					depth = relativepath.split('/').length - 2;
					this.makeFilelist(elem, filelist, depth, relativepath); // update
				}
				if (this.ceiJSONChangeCallback) {
					this.ceiJSONChangeCallback(this, dirpath);
				}
			}
			if (this.dirStatusChangeCallback) {
				this.dirStatusChangeCallback(this, dirpath);
			}
		};
		
		FileDialog.prototype.findFileElement = function (dirpath, filename) {
			var relativepath,
				elems,
				elem,
				el,
				i,
				k,
				file = filename.split('/').pop();
			console.log("file:" + file);
			console.log("dirpath:" + dirpath);
			if (dirpath.indexOf(this.tarDir) === 0) { // matchig dir
				relativepath = dirpath.substring(this.tarDir.length);
				elems = this.openingDirList[relativepath];
				console.log("elems:" + elems);
				for (i = 0; i < elems.childNodes.length; i = i + 1) {
					elem = elems.childNodes[i];
					for (k = 0; k < elem.childNodes.length; k = k + 1) {
						el = elem.childNodes[k];
						if (el.innerHTML === file) {
							console.log("findElement", el);
							return elem;
						}
					}
				}
			}
			return null;
		};
		
		FileDialog.prototype.setWorkingPath = function (path) {
			console.log('ROOT PATH:', path);
			if (path.substring(path.length - 1) === '/') {
				path = path.substring(0, path.length - 1);
			}
			
			// register root
			this.registerRootDom(path, this.domElement);
		};
		
		return FileDialog;
	}());
}
