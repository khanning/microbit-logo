UI = function() {};

UI.toolmode = undefined;
UI.tooldown = false;
UI.projectID = undefined;	
UI.shiftKey = false;

UI.setup = function(){
	gn("microbitstate")[eventDispatch["start"]] =  UI.checkState;
	gn('filemenu')[eventDispatch["start"]] = UI.toggleMenu;
 	gn("playbutton")[eventDispatch["start"]] = Code.togglePlay;
	window[eventDispatch["start"]] = UI.checkStatus;
	UI.setupToolbar(gn("toolbarmenu"), ["scissors", "clone", "undo", "redo"]);
	ShapeEditor.init();
	UI.resize();
	window.onresize = UI.resize;
	window.onkeydown = UI.handleKeyDown;
	window.onkeyup = UI.handleKeyUp;
}

UI.handleKeyDown = function(e) {UI.shiftKey = e.shiftKey;}
UI.handleKeyUp = function(e) { UI.shiftKey = e.shiftKey;}


UI.resize = function(e) {
	var h = getDocumentHeight();
	var dh = gn("topbar").offsetHeight;
	var w = getDocumentWidth();
	gn("contents").style.height = (h - dh)+ "px";
	gn("contents").style.top =  dh + "px";
	gn("contents").style.width = (w - gn("rightpanel").offsetWidth)+ "px";
	gn("rightpanel").style.height = (h - dh)+ "px";
	gn("palette").style.height = (h - gn("grid").offsetTop - gn("grid").offsetHeight - dh)+ "px";
	Blockly.hideChaff(true);
  Blockly.svgResize(Code.workspace);	
}

UI.updateRunStopButtons = function() {
  gn("playbutton").className = Runtime.isActive() ? "play on" : "play off";
}

UI.checkState= function (e){
	e.preventDefault();
	e.stopPropagation();
	if (UI.shiftKey){
		if (Runtime.intervalId) Runtime.stopTimer()
		else Runtime.startTimer()
		return;
	}
	if (gn("microbitstate").className == "microbit fail") HW.setup();
	else Code.download();
}

UI.checkStatus = function (e){
	UI.unfocus();
}	
	
UI.unfocus =  function (){
	 UI.closeDropdown();
}
	
UI.toggleMenu = function (e){
	e.preventDefault();
	e.stopPropagation();
	if (gn('appmenu')) UI.closeDropdown();
	else {	
		var hasValidName = UI.projectName && !UI.projectSamples[UI.projectName];
		var options = ["New", "Load", "Save", "Save As"];
		var optionfcns = ["newProject", "loadProject", "doSave", "doSaveAs"];
		UI.openBalloon(frame,options,optionfcns);
		gn('appmenu')[eventDispatch["start"]] = UI.doAction;
	}
}

UI.doAction = function(e){
	var t = e.target;
	t.className = "selectmenu";
	if (t.fcn) UI[t.fcn](e);
	var endfcn = function () {
		if (gn('appmenu')) gn('appmenu').parentNode.removeChild(gn('appmenu'));
 	}
 	setTimeout(endfcn, 100);
}

UI.cleanWorkspace =  function (){
	Code.workspace.clear();
	Scripts.blocks = {};
}

UI.cleanUndo = function (){
	Code.workspace.clearUndo();
	UI.updateToolsState(undefined);
}

UI.closeDropdown =  function (){if (gn('appmenu')) gn('appmenu').parentNode.removeChild(gn('appmenu'))}


///////////////////
// Tools
///////////////////
 
UI.setupToolbar = function(p, tools){
	for (var i=0; i < tools.length; i++) {
		var ul =  newHTML("ul", undefined, p);
		var li = newHTML("li", "icon " + tools[i], ul);
		li.id = tools[i];
	}
	UI.selectTool(undefined);
	gn('extratools')[eventDispatch["start"]] = UI.pressTool;
	gn('extratools')[eventDispatch["end"]] = UI.releaseTool;
}

UI.pressTool = function(e){
	e.preventDefault();
	e.stopPropagation();
	var t = e.target;
	UI.selectTool(t);
	UI.tooldown = true;
}

UI.releaseTool = function(e){
	var t = e.target;
	var b = t.id;
	if(b=='undo') Code.workspace.undo(false);
	if(b=='redo') Code.workspace.undo(true);
	UI.tooldown = false;
}

UI.selectTool = function(t){
	if (t && (UI.toolmode  == t.id)) t = undefined;
	UI.updateToolsState(t);
	UI.toolmode = (t) ? t.id : undefined;
}

UI.updateToolsState = function(t){
	var p = gn('extratools');
	if (!p) return;	
	for(var i=0;i< p.children.length;i++){
		var mt = p.children[i];
		if (!mt.id) continue;
		if ((mt.id == "undo") || (mt.id == "redo")) mt.className =  Code.workspace[mt.id+"Stack_"].length > 0 ?  "icon "+  mt.id : "icon "+  mt.id + " NA";
		else mt.className = (mt == t) ? "icon "+  mt.id+" on": "icon "+  mt.id;
 }
}


///////////////////
// UI
///////////////////



///////////////////
// new
///////////////////

UI.newProject =  function (e){
	Runtime.stopThreads(Code.scripts);
	UI.cleanWorkspace(); 
  var empty = '<xml><variables><variable type="" id="trovb#~|j,=tov4e-`Q]">box1</variable><variable type="" id="s-r)ps3/xflDW$lmeWGD">box2</variable></variables></xml>';
	var xml = Blockly.Xml.textToDom(empty);
	Blockly.Xml.domToWorkspace(xml, Code.workspace);
	ShapeEditor.newSet();	
	UI.projectID = undefined;
	UI.cleanUndo();
}

///////////////////
// Save
///////////////////

UI.doSaveAs = function (e){
	e.preventDefault();
	e.stopPropagation();	
	UI.saveAs((UI.projectID==undefined)?'noname.txt': UI.projectID.name);
}

UI.saveAs = function (name){	
	Runtime.stopThreads(Code.scripts);
	chrome.fileSystem.chooseEntry({type: "saveFile", suggestedName: name}, next1)
	function next1(fe){
		if(fe!=undefined){
			UI.projectID=fe; 
			UI.save(fe);
		}
	}
}

UI.doSave = function (e){
	e.preventDefault();
	e.stopPropagation();	
	if(UI.projectID==undefined) UI.saveAs('noname.txt');
	else UI.save(UI.projectID)
} 

UI.save = function (fe){
	Runtime.stopThreads(Code.scripts);
	var content = UI.getProjectContents();
	var blob = new Blob([content], {type: 'plain/text'});
	fe.createWriter(next1);
	function next1(writer){
		writer.onwriteend = next2; 
		writer.write(blob);
	}
	function next2(){
		writer.onwriteend=undefined; 
		writer.truncate(blob.size);	
	}
}
	
UI.openBalloon = function(p, labels, fcns){
	var mm = newHTML("div", 'dropdownballoon', p);
	var barrow = newHTML("div", "menuarrow up", mm);
	var mdd= newHTML("div", "dropdown", mm);
	mm.setAttribute('id', 'appmenu');
	for (var i=0; i < labels.length; i++) {
		var ul =  newHTML("ul", undefined, mdd);
		var li = newHTML("li", undefined, ul);
		li.setAttribute("key", labels[i]);
		li.textContent =  labels[i];
		li.fcn = fcns[i];
  	if (i < labels.length - 1)  var div = newHTML("li", 'divider', ul); 
	}
}	

///////////////////
// Load
///////////////////

UI.loadProject = function (e){
	e.preventDefault();
	e.stopPropagation();	
	Runtime.stopThreads(Code.scripts);
  var fr = new FileReader();
  fr.onload = function(e){doNext(e.target.result)};
	chrome.fileSystem.chooseEntry(next)
		function next(fe){
		if(fe!=undefined) {
			UI.projectID=fe;
			fe.file(next2);
		}
	}
  function next2(file){fr.readAsText(file);}
  function doNext(str){
  	UI.cleanWorkspace(); 
  	UI.loadXML(str, whenDone);
  }
  
  function whenDone(){
  	Code.updatePalette()	
  	UI.cleanUndo();
  }
}
	
UI.loadXML = function (str, whenDone){ 
//	console.log(str) 
	var data = str.split("\n")
	ShapeEditor.shapes =  data[1] == "" ? [] : JSON.parse(data[1]);
	var xml = Blockly.Xml.textToDom([data]);
	Blockly.Xml.domToWorkspace(xml, Code.workspace);
  ShapeEditor.displayAll(); 
  ShapeEditor.unfocus();
  if (whenDone) whenDone()
}

UI.getProjectContents = function (){
	var xml = Blockly.Xml.workspaceToDom(Code.workspace, true);
	var str =  Blockly.Xml.domToText(xml);
	str +="\n"
	str += JSON.stringify(ShapeEditor.shapes)
	str +="\n"
	return str
}
