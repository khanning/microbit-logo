var textdiv, cc;
var thisfe;

window.onload = start;

var compiler = new Compiler();
var comms = new Comms();

function start(){
	var titleheight = window.outerHeight-window.innerHeight;
	window.resizeTo(1090,titleheight+623);
	cc = document.getElementById('cc');
	cc.onkeydown = function(e){handleCCKeyDown(e);}
	load.onclick = doLoad;
	saveas.onclick = doSaveAs;
	save.onclick = doSave;
	downloadbutton.onclick = doDownload;
	compiler.setup();
	println('Welcome to Micro:Bit Logo');
	comms.openSerialPort();
}

function handleCCKeyDown(e) {
	var k = e.keyCode;
	if(k==13){
		if(e.shiftKey) insertcr(e);
		else handlecr(e);
	}
	else if(k==220) {e.preventDefault(); comms.openSerialPort();}		// backslash
}

function handlecr(e){
	var selstart = cc.selectionStart;
	var selend = cc.selectionEnd;
	var t = cc.value;
	if(selstart==selend){
		var start=t.lastIndexOf('\n', selstart-1), end=t.indexOf('\n', selstart);
		if(end<0) end=t.length;
		cc.selectionStart = end+1;
		if(end!=t.length) e.preventDefault();
		sendLine(t.substring(start+1,end));
	} else {
		e.preventDefault();
		sendLine(t.substring(selstart, selend));
		cc.selectionStart = cc.selectionEnd;
	}
}

function sendLine(str){
	setTimeout(function(){runLine(str);}, 100);
}

function runLine(str){
	if (str.substring(0,1)=='.'){
		try {insert(eval(str.substring(1))+'\n');} 
		catch (e) {insert(e.message+'\n');}
	} else {compiler.runCommandLine(str,0);}
}


function insert(str){
	var startpos = cc.selectionStart;
	var endpos = cc.selectionEnd;
	var t = cc.value;
	var before = t.substring(0,startpos);
	var after = t.substring(endpos);
	var oldtop = cc.scrollTop;
	cc.value = before+str;
	var halfscroll = cc.scrollHeight-cc.scrollTop-cc.offsetHeight;
	cc.value = before+str+after;
	cc.selectionStart = startpos+str.length;
	cc.selectionEnd = startpos+str.length;
	if(halfscroll>0) cc.scrollTop+=halfscroll;
	else cc.scrollTop = oldtop;
}

function insertcr(e){
	e.preventDefault();
	var pos = cc.selectionStart;
	var t = cc.value;
	var before = t.substring(0,pos);
	var after = t.substring(pos);
	cc.value = before+'\n'+after;
	cc.selectionStart = pos+1;
	cc.selectionEnd = pos+1;
}

function doDownload(){
	compiler.downloadProcs(procspane.value);
}

function doLoad(){
    var fr = new FileReader();
    fr.onload = function(e){procspane.value=e.target.result;};
    chrome.fileSystem.chooseEntry(next)

    function next(fe){thisfe=fe; fe.file(next2);}
    function next2(file){fr.readAsText(file);}
}

function doSave(){
	if(thisfe==undefined) doSaveAs();
	else {
    var blob = new Blob([procspane.value], {type: 'plain/text'});
    thisfe.createWriter(next1);
    function next1(writer){
    	writer.onwriteend = next2; 
    	writer.write(blob);
	    function next2(){writer.onwriteend=undefined; writer.truncate(blob.size);}
	  }
  }
}

function doSaveAs(){
		var name = (thisfe==undefined)?'default.txt':thisfe.name;
    var blob = new Blob([procspane.value], {type: 'plain/text'});
    chrome.fileSystem.chooseEntry({type: "saveFile", suggestedName: name}, next1)
    function next1(fe){if(fe!=undefined){thisfe=fe; fe.createWriter(next2);}}
    function next2(writer){writer.write(blob);}
    function next3(writer){console.log(blob.size); writer.truncate(blob.size);}
}


function println(x){insert(x.toString()+'\n'); console.log(x);}
function rl (){window.location.reload(true);}

