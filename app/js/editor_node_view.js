/*jslint devel:true, node:true, nomen:true */
/*global SVG, svgNodeUI */
// depends: editor.js

(function (editor, password_input) {
	"use strict";
	var nui, // node ui
		nodeListTable = {},
		systemNodeListTable = {},
		instance_no = 1,
		edit_view = {},
		popupNodeList = null,
		str_rowclass = 'nodePropertyRow',
		str_nameclass = 'nodePropertyName',
		str_textclass = 'nodePropertyText',
		str_constclass = 'nodePropertyConst';
	
	function $(id) {
		return document.getElementById(id);
	}

	function clone(obj) {
		return JSON.parse(JSON.stringify(obj));
	}
	
	function makeItemNode(name, text, top) {
		var itemRow = document.createElement('div'),
			nameProp = document.createElement('div'),
			textProp = document.createElement('div');

		itemRow.classList.add(str_rowclass);
		nameProp.innerHTML = name;
		textProp.innerHTML = text;
		nameProp.classList.add(str_nameclass);
		textProp.classList.add(str_constclass);
		if (top) {
			nameProp.classList.add('nodePropertyTop');
			textProp.classList.add('nodePropertyTop');
		}
		itemRow.appendChild(nameProp);
		itemRow.appendChild(textProp);
		return itemRow;
	}
	
	function makeItemTextNode(name, text, node, type) {
		var itemRow = document.createElement('div'),
			nameProp = document.createElement('div'),
			textProp = document.createElement('input');
		if (type) {
			textProp.setAttribute('type', type);
		} else {
			textProp.setAttribute('type', 'text');
		}
		itemRow.classList.add(str_rowclass);
		nameProp.innerHTML = name;
		textProp.value = text;
		nameProp.classList.add(str_nameclass);
		textProp.classList.add(str_textclass);
		itemRow.appendChild(nameProp);
		itemRow.appendChild(textProp);
		
		textProp.addEventListener('keyup', (function (nodeData, txt) {
			return function (e) {
				nodeData[name] = txt.value;
			};
		}(node, textProp)));
		return itemRow;
	}
	
	function makeTargetMachineNode(name, value, node, type) {
		var valueRow = document.createElement('div'),
			nameProp = document.createElement('div'),
			valueProp = document.createElement('div'),
			valueSelect = document.createElement('select'),
			optionElem,
			target,
			targets,
			initialIndex = 0,
			i;
		
		valueRow.classList.add(str_rowclass);
		nameProp.innerHTML = name;
		nameProp.classList.add(str_nameclass);
		valueRow.appendChild(nameProp);
		valueProp.className = str_constclass;
		valueRow.appendChild(valueProp);
		
		// select box
		targets = node.target_machine_list.hpcpf.targets;
		valueSelect.className = "nodePropertyTargetMachine";
		for (i = 0; i < targets.length; i = i + 1) {
			target = targets[i];
			optionElem = document.createElement('option');
			
			if (target.server === 'localhost') {
				optionElem.innerHTML = 'localhost';
			} else {
				optionElem.innerHTML = target.name_hr;
			}
			valueSelect.appendChild(optionElem);
			
			if (node.value && node.value.hasOwnProperty('type')) {
				if (node.value.type === target.type) {
					initialIndex = i;
				}
			}
		}
		valueSelect.options[initialIndex].selected = "true";
		node.value = targets[initialIndex];
		valueSelect.onchange = (function (nodeData, targets) {
			return function (e) {
				nodeData.value = targets[this.selectedIndex];
			};
		}(node, targets));
		valueProp.appendChild(valueSelect);
		return [valueRow];
	}

	function addNode(nodename, nodename_hr, nx, ny, canErase) {
		var node = nodeListTable[nodename],
			instNode,
			nodeData;
		if (!node) {
			return;
		}
		node.name = nodename_hr;
		nodeData = nui.getNodeData();
		instNode = clone(node);
		//console.log(instNode);
		instNode.canErase = canErase;
		nodeData.nodeData.push(instNode);
		instNode.varname = instNode.varname + instance_no;
		instance_no += 1;
		if (nx !== undefined && ny !== undefined) {
			instNode.pos[0] = nx;
			instNode.pos[1] = ny;
		}
		nui.clearNodes();
		nui.makeNodes(nodeData);
	}
	
	function deleteNode(node) {
		console.log('DELETE:', node);
		
		var nodeData = nui.getNodeData(),
			data = nodeData.nodeData,
			i;
		for (i = 0; i < data.length; i = i + 1) {
			if (data[i].varname === node.varname) {
				data.splice(i, 1);
			}
		}
		nui.clearNodes();
		nui.makeNodes(nodeData);
	}
	
	function clearNode() {
		var nodeData;
		nui.clearNodes();
		nodeData = nui.getNodeData();
		document.getElementById("property").innerHTML = '';
	}
	
	function updateNode() {
		var nodeData = nui.getNodeData();
		console.log('updateNode');
		nui.clearNodes();
		nui.makeNodes(nodeData);
	}
	
	function colorFunction(type) {
		if (type === "string") {
			return "#14a271";
		} else if (type === "float") {
			return "#139aa5";
		} else if (type === "vec4") {
			return "#1b6ad6";
		} else if (type === "vec3") {
			return "#566f9f";
		} else if (type === "DFI" || type === "dfi") {
			return "#20cae0";
		} else if (type === "vec2") {
			return "#8222a7";
		} else if (type === "initial_data") {
			return "#ad3b78";
		} else if (type === "geometry") {
			return "#b19e14";
		} else if (type === "Any") {
			return "#be1656";
		} else if (type === "volume") {
			return "#e023e0";
		} else if (type === "target_machine") {
			return "#ad3b78";
		} else if (type === "geometory") {
			return "#17d042";
		} else if (type === "Any") {
			return "#ef8815";
		} else { // Object
			return "#c12417";
		}
	}
	
	function storeNodeToNodeListTable(nodes, callback, isSystemNode) {
		var i;
		nodes.sort(
			function (a, b) {
				return a.name > b.name;
			}
		);

		// create nodelist table
		for (i = 0; i < nodes.length; i = i + 1) {
			nodeListTable[nodes[i].name] = nodes[i];
		}
		if (isSystemNode) {
			for (i = 0; i < nodes.length; i = i + 1) {
				systemNodeListTable[nodes[i].name] = nodes[i];
			}
		}

		console.log(nodeListTable);
		
		if (callback) {
			callback(nodes);
		}
	}
	
	function updateSelectNodeList(listElement, txtval) {
		var i,
			name,
			visible,
			item,
			nodelist = systemNodeListTable;
		
		if (!listElement) { return; }
		
		listElement.innerHTML = ''; // clear
		for (i in nodelist) {
			if (nodelist.hasOwnProperty(i)) {
				//console.log(nodeListTable[i]);
				name = nodelist[i].name;
				visible = nodelist[i].visible;
				
				if ((txtval === '' || name.toLowerCase().indexOf(txtval.toLocaleLowerCase()) >= 0) && visible !== false) {
					item = document.createElement('option');
					item.setAttribute('value', name);
					item.appendChild(document.createTextNode(name));
					listElement.appendChild(item);
				}
			}
		}
	}

	function addSystemNode(listElement, cb, nx, ny) {
		return function (e) {
			var index = listElement.selectedIndex,
				text,
				node,
				instNode;
			
			if (index === -1) {
				return;
			}
			text = listElement.options[index].text;
			if (nx === undefined || ny === undefined) {
				// center
				addNode(text, text, window.innerWidth / 4, window.innerHeight / 4, true);
			} else {
				// specific pos
				addNode(text, text, nx, ny, true);
			}
			if (cb) {
				cb();
			}
		};
	}

	function createSelectNodeList(callback, mx, my) {
		var tray = document.createElement('div'),
			addbtn = document.createElement('button'),
			txt = document.createElement('input'),
			listElement = document.createElement('select'),
			item,
			name,
			i,
			width = '100%';
		
		addbtn.classList.add('menuButtonClass');
		addbtn.classList.add('noneselect');
		addbtn.classList.add('nodeAddButton');
		addbtn.innerHTML = 'Add';
		tray.appendChild(addbtn);
		tray.appendChild(txt);
		tray.appendChild(document.createElement('div'));
		tray.appendChild(listElement);
		txt.setAttribute('type', 'input');
		txt.setAttribute('placeholder', 'filter...');
		txt.className = "nodeFilterInput";
		//txt.style.width = width;
		listElement.style.width = width;
		listElement.setAttribute('size', 15);
		listElement.setAttribute('name', 'NodeList');
		listElement.className = 'selectNodeList';
		addbtn.addEventListener('click', addSystemNode(listElement, callback, mx, my));
		
		txt.timer    = null;
		txt.prev_val = txt.value;
		txt.new_val  = '';
		txt.addEventListener("focus", (function (listElement, txt) {
			return function () {
				window.clearInterval(txt.timer);
				txt.timer = window.setInterval(function () {
					txt.new_val = txt.value;
					if (txt.prev_val !== txt.new_val) {
						updateSelectNodeList(listElement, txt.new_val);
					}
					txt.prev_val = txt.new_val;
				}, 10);
			};
		}(listElement, txt)), false);
		txt.addEventListener("blur", (function (listElement, txt) {
			return function () {
				window.clearInterval(txt.timer);
			};
		}(listElement, txt)), false);
		
		updateSelectNodeList(listElement, '');
		return tray;
	}
	
	function updatePropertyDebug(nodeData) {
		var property = document.getElementById('nodeProperty'),
			key,
			value,
			iokey,
			ioval,
			iokey2,
			ioval2,
			hr;

		property.innerHTML = "";
		
		for (key in nodeData) {
			if (nodeData.hasOwnProperty(key)) {
				value = nodeData[key];
				
				property.appendChild(makeItemNode(key, "", true));
				
				if (key === 'input' || key === 'output') {
					for (iokey in value) {
						if (value.hasOwnProperty(iokey)) {
							ioval = value[iokey];
							for (iokey2 in ioval) {
								if (ioval.hasOwnProperty(iokey2)) {
									ioval2 = ioval[iokey2];
									property.appendChild(makeItemNode(iokey2, ioval2));
								}
							}
						}
					}
				} else {
					property.appendChild(makeItemNode(key, value));
				}
			}
		}
	}
	
	function makePropertyRow(type, key, val, inputNode) {
		//console.log("type key val", type, key, val);
		if (key === 'value') {
			if (type === 'target_machine') {
				return makeTargetMachineNode(key, val, inputNode);
			} else {
				return [makeItemNode(key, val)];
			}
		} else if (key === 'cores') {
			if (type === 'target_machine') {
				return [makeItemTextNode(key, val, inputNode)];
			}
		} else if (key === 'file') {
			return [makeItemTextNode(key, val, inputNode)];
		} else {
			return [makeItemNode(key, val)];
		}
	}
	
	function updateProperty(nodeData) {
		var property = document.getElementById('nodeProperty'),
			key,
			value,
			iokey,
			ioval,
			iokey2,
			ioval2,
			hr,
			inputtype,
			propertyRows,
			i;

		property.innerHTML = "";
		property.appendChild(makeItemNode('Property', 'Value', true));
		
		if (nodeData.hasOwnProperty('name')) {
			value = nodeData.name;
			property.appendChild(makeItemNode('name', value));
		}
		if (nodeData.hasOwnProperty('varname')) {
			value = nodeData.varname;
			property.appendChild(makeItemNode('varname', value));
		}
		if (nodeData.hasOwnProperty('status')) {
			value = nodeData.status;
			property.appendChild(makeItemNode('status', value));
		}
		
		for (key in nodeData) {
			if (nodeData.hasOwnProperty(key)) {
				if (key === 'input') {
					value = nodeData[key];

					for (iokey in value) {
						if (value.hasOwnProperty(iokey)) {
							ioval = value[iokey];
							if (ioval.hasOwnProperty('name')) {
								iokey2 = 'Input';
								ioval2 = ioval.name;
								property.appendChild(makeItemNode(iokey2, "", true));
							}
							if (ioval.hasOwnProperty('type')) {
								inputtype = ioval.type;
							}
							if (inputtype === 'target_machine' && !ioval.hasOwnProperty('value')) {
								ioval.value = "";
							}
							if (inputtype === 'target_machine' && !ioval.hasOwnProperty('cores')) {
								ioval.cores = 1;
							}
							for (iokey2 in ioval) {
								if (ioval.hasOwnProperty(iokey2)) {
									if (iokey2 !== 'name') {
										if (ioval.hasOwnProperty(iokey2)) {
											ioval2 = ioval[iokey2];
											propertyRows = makePropertyRow(inputtype, iokey2, ioval2, ioval);
											for (i = 0; i < propertyRows.length; i = i + 1) {
												property.appendChild(propertyRows[i]);
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
	
	editor.socket.on('connect', function () {
	});
	
	function to_lua_json(json) {
		var res = "{ \n",
			i,
			index = 0,
			jsonLength = Object.keys(json).length;
		
		for (i in json) {
			if (json.hasOwnProperty(i)) {
				if (typeof json[i] === "object") {
					res = res + "\t" + i + " = " + to_lua_json(json[i]);
					if (index === (jsonLength - 1)) {
						res = res + '\n';
					} else {
						res = res + ',\n';
					}
				} else {
					res = res + "\t" + i + ' = "' + json[i];
					if (index === (jsonLength - 1)) {
						res = res + '"\n';
					} else {
						res = res + '",\n';
					}
				}
				index = index + 1;
			}
		}
		res = res + " }";
		return res;
	}

	// local result_0 = executeCASE(name, luajson_0, isDryRun);
	// result_0 is a table of { node_varname : value, node_varname : value ... }
	function exportOneNode(id, parents, nodeData, isDryRun) {
		var i,
			innode,
			strid = id.toString(),
			strdryrun = isDryRun.toString(),
			preResult = null;

		console.log(nodeData.varname, parents, nodeData);
		if (id > 1) {
			preResult = "result_" + (id - 1).toString();
			return "local result_" + strid + " = executeCASE('" + nodeData.name + "', luajson_" + strid + ", " + strdryrun + ")\n";
		} else {
			return "local result_" + strid + " = executeCASE('" + nodeData.name + "', luajson_" + strid + ", " + strdryrun + ")\n";
		}
	}
	
	// local luajson_0 = { target_machine };
	function exportTargetMachine(id, parents, nodeData) {
		var i,
			innode,
			target_machine = {};
		if (nodeData.varname.indexOf('Case') >= 0) {
			for (i = 0; i < nodeData.input.length; i = i + 1) {
				innode = nodeData.input[i];
				if (innode.type === 'target_machine') {
					if (innode.hasOwnProperty('value') && innode.value) {
						target_machine.targetconf = innode.value;
					}
					if (innode.hasOwnProperty('cores') && innode.cores) {
						target_machine.cores = innode.cores;
					}
				}
			}
		}
		return "local luajson_" + id.toString() + " = " + to_lua_json(target_machine) + ";\n";
	}
	
	// gather password,passphrase machine
	function gatherPasswordNeedMachine(id, parents, nodeData, password_need_machines) {
		var i,
			innode,
			target_name_to_machine = {};
		if (nodeData.varname.indexOf('Case') >= 0) {
			for (i = 0; i < nodeData.input.length; i = i + 1) {
				innode = nodeData.input[i];
				if (innode.type === 'target_machine') {
					if (innode.hasOwnProperty('value') && innode.value) {
						target_name_to_machine[innode.name_hr] = innode.value;
					}
				}
			}
			for (i in target_name_to_machine) {
				if (target_name_to_machine.hasOwnProperty(i)) {
					password_need_machines.push(target_name_to_machine[i]);
				}
			}
		}
	}

	function executeWorkflow(isDryRun, endCallback) {
		nui.exportLua(function (parents, sorted, exportEndCallback) {
			var i = 0,
				nodeData,
				innode,
				password_need_machines = [],
				node;
			
			// gather password,passphrase machine
			for (i = 0; i < sorted.length; i = i + 1) {
				node = sorted[i];
				nodeData = node.nodeData;
				if (parents.hasOwnProperty(nodeData.varname)) {
					gatherPasswordNeedMachine(i, parents[nodeData.varname], nodeData, password_need_machines);
				} else {
					gatherPasswordNeedMachine(i, null, nodeData, password_need_machines);
				}
			}
			
			// show password,passphrase input dialog
			password_input.createPasswordInputView(editor.socket, password_need_machines, function () {
				var node,
					nodeData,
					script = "require('hpcpf')\n";
				for (i = 0; i < sorted.length; i = i + 1) {
					node = sorted[i];
					nodeData = node.nodeData;
					if (parents.hasOwnProperty(nodeData.varname)) {
						// has parents
						script = script + exportTargetMachine(i, parents[nodeData.varname], nodeData, password_need_machines);
						script = script + exportOneNode(i, parents[nodeData.varname], nodeData, isDryRun);
					} else {
						// root node
						script = script + exportTargetMachine(i, null, nodeData, password_need_machines);
						script = script + exportOneNode(i, null, nodeData, isDryRun);
					}
				}
				if (exportEndCallback) {
					exportEndCallback(script);
				}
			});
		}, function (script) {
			console.log("finish creating script:", script);
			if (endCallback) {
				endCallback(script);
			}
		});
	}
	
	function showAddNodeMenu(show, sx, sy, popupmode) {
		var callback = null;
		if (show === true) {
			if (popupmode) {
				callback = function () {
					document.body.removeChild(popupNodeList);
					popupNodeList = null;
				};
			}
			popupNodeList = createSelectNodeList(callback, sx, sy);
			popupNodeList.setAttribute('style', 'position:absolute;top:' + sy + 'px;left:' + sx + 'px');
			popupNodeList.className = "popupNodeList";
			document.body.appendChild(popupNodeList);
			
			// filter focus
			if (popupmode) {
				popupNodeList.children[1].focus();
			}
		} else {
			if (popupNodeList !== null) {
				document.body.removeChild(popupNodeList);
			}
			popupNodeList = null;
		}
	}
	
	/*
	function doubleClickCanvas(e) {
		showAddNodeMenu(true, e.clientX, e.clientY, true);
	}
	function clickCanvas(e) {
		//console.log(e.clientX, e.clientY);
		showAddNodeMenu(false);
	}
	*/
	
	editor.socket.on('init', function () {
		var draw = SVG('nodecanvas'),
			propertyTab,
			pos = { x : 0, y : 0 },
			onMiddleButtonDown = false,
			nodecanvas   = document.getElementById('nodecanvas'),
			selectNodeList;
		
		nui = svgNodeUI(draw);
		nui.clearNodes();
		nui.setTypeColorFunction(colorFunction);
		nui.nodeClickEvent(function (nodeData) {
			console.log("node cliecked");
			//updatePropertyDebug(nodeData);
			updateProperty(nodeData);
		});
		nui.nodeDeleteEvent(deleteNode);
		
		/*
		nodecanvas.onclick = clickCanvas;
		nodecanvas.ondblclick = doubleClickCanvas;
		*/
		
		//selectNodeList = createSelectNodeList();
		//document.getElementById('nodeList').appendChild(selectNodeList);
		
		editor.socket.emit('reqReloadNodeList');
		//editor.socket.on('reloadNodeList', function (caseNodeList, systemNodeList) {
		editor.socket.on('reloadNodeList', function (caseNodeList) {
			var i,
				caseNodes = JSON.parse(caseNodeList);
			
			/*
			storeNodeToNodeListTable(JSON.parse(systemNodeList), function (nodes) {
				var listElement = selectNodeList.getElementsByClassName('selectNodeList')[0];
				updateSelectNodeList(listElement, '');
			}, true);
			*/
			storeNodeToNodeListTable(caseNodes, function (nodes) {
				for (i = 0; i < nodes.length; i = i + 1) {
					console.log(nodes[i].name);
					addNode(nodes[i].name, nodes[i].name_hr, 300, 100, false);
				}
			}, false);
		});
		
		propertyTab = window.animtab.create('right', {
			'rightTab' : { min : '0px', max : 'auto' }
		}, {
			'nodePropertyTab' : { min : '0px', max : '200px' }
		}, 'property');
		propertyTab(false);
		
		
		document.getElementById('node_area').onmousedown = function (evt) {
			onMiddleButtonDown = (evt.button === 1);
			if (onMiddleButtonDown) {
				evt.preventDefault();
				pos.x = evt.pageX;
				pos.y = evt.pageY;
			}
		};
		document.getElementById('node_area').onmousemove = function (evt) {
			var mx, my;
			if (onMiddleButtonDown) {
				evt.preventDefault();
				mx = evt.pageX - pos.x;
				my = evt.pageY - pos.y;
				nui.moveAll(mx, my);
				pos.x = evt.pageX;
				pos.y = evt.pageY;
			}
		};
		document.getElementById('node_area').onmouseup = function (evt) {
			onMiddleButtonDown = false;
		};
		
	});
	
	window.node_edit_view = edit_view;
	window.node_edit_view.executeWorkflow = function (endcallback) {
		return executeWorkflow(false, endcallback);
	};
	window.node_edit_view.dryrunWorkflow = function (endcallback) {
		return executeWorkflow(true, endcallback);
	};
	
}(window.editor, window.password_input));
