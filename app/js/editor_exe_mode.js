// depends: editor.js

socket.on('connect', function () {
	"use strict";
});

socket.on('stdout', function (data) {
	var s = $('exe_log')
	s.innerHTML += data.toString() + '</br>';
	s.scrollTop = s.scrollHeight;
});

socket.on('stderr', function (data) {
	var s = $('exe_log')
	s.innerHTML += data.toString() + '</br>';
	s.scrollTop = s.scrollHeight;
});

function runWorkflow() {
	"use strict";
	var targetFile = "pwf.lua";
	
	console.log("procRun");
	
	clearOutput();
	socket.emit('run',{file:"pwf.lua"});
}

function stopProject() {
	"use strict";
	console.log("stop");
	socket.emit('stop');
}

function clearOutput() {
	$('exe_log').innerHTML = '';
}