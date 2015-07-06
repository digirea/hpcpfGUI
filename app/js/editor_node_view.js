/*jslint devel:true, node:true, nomen:true */
/*global SVG, svgNodeUI */
// depends: editor.js

(function (editor) {
	"use strict";
	var nui, // node ui
		nodeListTable = {},
		instance_no = 1,
		edit_view = {},
		popupNodeList = null;
	
	function $(id) {
		return document.getElementById(id);
	}

	function clone(obj) {
		return JSON.parse(JSON.stringify(obj));
	}
	
	function makeItemNode(name, text, top) {
		var itemNode = document.createElement('div'),
			nameNode = document.createElement('div'),
			textNode = document.createElement('div');

		itemNode.classList.add('nodePropertyRow');
		nameNode.innerHTML = name;
		textNode.innerHTML = text;
		nameNode.classList.add('nodePropertyName');
		textNode.classList.add('nodePropertyConst');
		if (top) {
			nameNode.classList.add('nodePropertyTop');
			textNode.classList.add('nodePropertyTop');
		}
		itemNode.appendChild(nameNode);
		itemNode.appendChild(textNode);
		return itemNode;
	}
	
	function makeItemTextNode(name, text, node, type) {
		var itemNode = document.createElement('div'),
			nameNode = document.createElement('div'),
			textNode = document.createElement('input');
		if (type) {
			textNode.setAttribute('type', type);
		} else {
			textNode.setAttribute('type', 'text');
		}
		itemNode.classList.add('nodePropertyRow');
		nameNode.innerHTML = '[' + name + ']';
		textNode.value = text;
		nameNode.classList.add('nodePropertyName');
		textNode.classList.add('nodePropertyText');
		itemNode.appendChild(nameNode);
		itemNode.appendChild(textNode);
		
		/*
		textNode.addEventListener('keyup', (function (nodeData, txt) {
			return function (e) {
				nodeData.value = txt.value;
			};
		}(node, textNode)));
		*/
		return itemNode;
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
			return "#20cae0";
		} else if (type === "geometory") {
			return "#17d042";
		} else if (type === "Any") {
			return "#ef8815";
		} else { // Object
			return "#c12417";
		}
	}
	
	function storeNodeToNodeListTable(nodes, callback) {
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

		console.log(nodeListTable);
		
		if (callback) {
			callback(nodes);
		}
	}
	
	function updateSelectNodeList(nodelist) {
		var i,
			name,
			visible,
			item,
			lst = document.getElementById('selectNodeList');
		
		lst.innerHTML = ''; // clear
		for (i in nodelist) {
			if (nodelist.hasOwnProperty(i)) {
				//console.log(nodeListTable[i]);
				name = nodelist[i].name;
				visible = nodelist[i].visible;
				
				if (visible !== false) {
					item = document.createElement('option');
					item.setAttribute('value', name);
					item.appendChild(document.createTextNode(name));
					lst.appendChild(item);
				}
			}
		}
	}

	function addSystemNode(cb, nx, ny) {
		return function (e) {
			var lst = document.getElementById('selectNodeList'),
				index = lst.selectedIndex,
				text,
				node,
				instNode;
			
			if (index === -1) {
				return;
			}
			text = lst.options[index].text;
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

	function createNodeList(callback, mx, my) {
		var tray = document.createElement('div'),
			addbtn = document.createElement('button'),
			txt = document.createElement('input'),
			lst = document.createElement('select'),
			item,
			name,
			i,
			width = '100%';
		
		addbtn.addEventListener('click', addSystemNode(callback, mx, my));
		addbtn.classList.add('menuButtonClass');
		addbtn.classList.add('noneselect');
		addbtn.classList.add('nodeAddButton');
		addbtn.innerHTML = 'Add';
		tray.appendChild(addbtn);
		tray.appendChild(txt);
		tray.appendChild(document.createElement('div'));
		tray.appendChild(lst);
		txt.setAttribute('type', 'input');
		txt.setAttribute('placeholder', 'filter...');
		txt.className = "nodeFilterInput";
		txt.style.width = width;
		lst.style.width = width;
		lst.setAttribute('size', 15);
		lst.setAttribute('name', 'NodeList');
		lst.id = 'selectNodeList';
		
		txt.timer    = null;
		txt.prev_val = txt.value;
		txt.new_val  = '';
		txt.addEventListener("blur", (function (lst, txt) {
			return function () {
				window.clearInterval(txt.timer);
			};
		}(lst, txt)), false);
		
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
	
	function updateProperty(nodeData) {
		var property = document.getElementById('nodeProperty'),
			key,
			value,
			iokey,
			ioval,
			iokey2,
			ioval2,
			hr;

		property.innerHTML = "";
		property.appendChild(makeItemNode('Property Name', 'Value', true));
		
		if (nodeData.hasOwnProperty('name')) {
			value = nodeData.name;
			property.appendChild(makeItemNode('name', value));
		}
		if (nodeData.hasOwnProperty('varname')) {
			value = nodeData.varname;
			property.appendChild(makeItemNode('varname', value));
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
								property.appendChild(makeItemNode(iokey2, ioval2, true));
							}
							for (iokey2 in ioval) {
								if (ioval.hasOwnProperty(iokey2)) {
									if (iokey2 !== 'name') {
										if (ioval.hasOwnProperty(iokey2)) {
											ioval2 = ioval[iokey2];
											property.appendChild(makeItemNode(iokey2, ioval2));
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
	
	function test_lua() {
		console.log("test_lua:", nui.exportLua());
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
			popupNodeList = createNodeList(callback, sx, sy);
			popupNodeList.setAttribute('style', 'position:absolute;top:' + sy + 'px;left:' + sx + 'px');
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
	
	function doubleClickCanvas(e) {
		showAddNodeMenu(true, e.clientX, e.clientY, true);
	}
	function clickCanvas(e) {
		//console.log(e.clientX, e.clientY);
		showAddNodeMenu(false);
	}
	
	editor.socket.on('init', function () {
		var draw = SVG('nodecanvas'),
			propertyTab,
			pos = { x : 0, y : 0 },
			onMiddleButtonDown = false,
			nodecanvas   = document.getElementById('nodecanvas');
		
		nui = svgNodeUI(draw);
		nui.clearNodes();
		nui.setTypeColorFunction(colorFunction);
		nui.nodeClickEvent(function (nodeData) {
			console.log("node cliecked");
			//updatePropertyDebug(nodeData);
			updateProperty(nodeData);
		});
		nui.nodeDeleteEvent(deleteNode);
		
		nodecanvas.onclick = clickCanvas;
		nodecanvas.ondblclick = doubleClickCanvas;
		document.getElementById('nodeList').appendChild(createNodeList());
		
		editor.socket.emit('reqReloadNodeList');
		editor.socket.on('reloadNodeList', function (systemNodeList, caseNodeList) {
			
			storeNodeToNodeListTable(JSON.parse(systemNodeList), function (nodes) {
				updateSelectNodeList(nodes);
				//addNode("Render", 100, 100, true);
				//addNode("Render", "hrender", 100, 100, true);
				//addNode("File", 200, 100, true);
				//addNode("File", "File", 200, 100, true);
			});
			storeNodeToNodeListTable(JSON.parse(caseNodeList), function (nodes) {
				var headerNode = null,
					footerNode = null,
					i;
				
				console.log(nodes);
				for (i = 0; i < nodes.length; i = i + 1) {
					console.log(nodes[i]);
					addNode(nodes[i].name, nodes[i].name_hr, 300, 100, false);
				}
				
				if (nodeListTable.hasOwnProperty('headerNode')) {
					nui.setHeaderCode(headerNode.customfunc);
				}
				if (nodeListTable.hasOwnProperty('footerNode')) {
					nui.setFooterCode(footerNode.customfunc);
				}
				
				//test_lua();
				//clearProperty()
			});
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
	window.node_edit_view.test_lua = test_lua;
	
}(window.editor));
