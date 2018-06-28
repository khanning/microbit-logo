/**
 * @license
 *
 * Copyright 2017 Playful Invention Company
 * Modifications Copyright 2018 Kids Code Jeunesse
 * All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 
UI = function() {};

UI.toolmode = undefined;
UI.tooldown = false;
UI.projectID = undefined;	
UI.undoStack = [];
UI.redoStack = [];
UI.blocklyStacks = {undo: 0, redo: 0};

UI.setup = function(){
	gn('nametag').textContent = Defs.translation["editor"]["shapes"];
	gn("microbitstate")[eventDispatch["start"]] =  UI.checkState;
	gn('filemenu')[eventDispatch["start"]] = UI.toggleMenu;
	gn('lang')[eventDispatch["start"]] = UI.changeLang;
	gn('about')[eventDispatch["start"]] = UI.openAbout;
 	gn("playbutton")[eventDispatch["start"]] = Code.togglePlay;
	window[eventDispatch["start"]] = UI.checkStatus;
	
	UI.setupToolbar(gn("toolbarmenu"), ["scissors", "clone", "undo", "redo"]);
	ShapeEditor.init();
	UI.resize();
	window.onresize = UI.resize;
	window.onkeydown = UI.handleKeyDown;
}

UI.handleKeyDown = function(e) {
	if (document.activeElement.nodeName.toLowerCase() == "input") return;
	if (e.keyCode == 8) ShapeEditor.clearShape();
}

UI.resize = function(e) {
	var h = getDocumentHeight();
	var dh = gn("topbar").offsetHeight;
	var w = getDocumentWidth();
	gn("contents").style.height = (h - dh)+ "px";
	gn("contents").style.top =  dh + "px";
	gn("contents").style.width = (w - gn("rightpanel").offsetWidth)+ "px";
	gn("rightpanel").style.height = (h - dh)+ "px";
	gn("palette").style.height = (h - gn("grid").offsetTop - gn("grid").offsetHeight - dh - gn("shapesbar").offsetHeight)+ "px";
	gn("alertdialog").style.top = Math.floor((h-292) / 2) + "px";
	gn("alertdialog").style.left = Math.floor((w-670) / 2) + "px";
	gn('playbutton').style.left = (gn('extratools').offsetLeft +  gn('extratools').offsetWidth) + "px";
	Blockly.hideChaff(true);
  Blockly.svgResize(Code.workspace);	
}

UI.updateRunStopButtons = function() {
  gn("playbutton").className = Runtime.isActive() ? "play on" : "play off";
}

UI.checkState= function (e){
	e.preventDefault();
	e.stopPropagation();
	if (e.shiftKey){
		UI.downloadVM();
		return;
	}
	let key = gn("microbitstate").className.split(' ')[1];
	switch (key) {
		case 'ok': Code.download(); break; // download stacks to on brick VM
		case 'badhex': UI.downloadVM(); break; // download the firmware
		case 'connecting': 
		case 'fail': HW.reopen(); break; // try to re-connnect
	}
}

UI.checkStatus = function (e){
	Code.unfocus(e);
	UI.unfocus();
}	
	
UI.unfocus =  function (){
	 UI.closeDropdown();
}

UI.changeLang = function (e){
	e.preventDefault();
	e.stopPropagation();
	let menus = Defs.translation["editor"]["menu"];
	if (gn('appmenu')) UI.closeDropdown();
	else {	
		var hasValidName = UI.projectName && !UI.projectSamples[UI.projectName];	
		var options = ['Français', "English"];
		var optionfcns = ["loadFr", "loadEn"];
		UI.openBalloon(e.target, "topright", options, optionfcns);
		gn('appmenu')[eventDispatch["start"]] = UI.doAction;
	}
}

UI.toggleMenu = function (e){
	e.preventDefault();
	e.stopPropagation();
	let menus = Defs.translation["editor"]["menu"];
	if (gn('appmenu')) UI.closeDropdown();
	else {	
		var hasValidName = UI.projectName && !UI.projectSamples[UI.projectName];	
		var options = [menus["new"], menus["load"], menus["save"], menus["saveas"]];
		var optionfcns = ["newProject", "loadProject", "doSave", "doSaveAs"];
		UI.openBalloon(frame,"topleft", options, optionfcns);
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
	UI.cleanUndo();
	Code.workspace.clear();
	UI.blocks = {};
	Prim.pace = 0.5;
}

UI.cleanUndo = function (){
	UI.undoStack = [];
	UI.redoStack = [];
	UI.blocklyStacks = {undo: 0, redo: 0};
	Code.workspace.clearUndo();
	UI.updateToolsState(undefined);
}

UI.closeDropdown =  function (){if (gn('appmenu')) gn('appmenu').parentNode.removeChild(gn('appmenu'))}

///////////////////
// Tools
///////////////////
 
UI.setupToolbar = function(p, tools){
	UI.selectTool(undefined);
	gn('extratools')[eventDispatch["start"]] = UI.pressTool;
	gn('extratools')[eventDispatch["end"]] = UI.releaseTool;
}

UI.pressTool = function(e){
	e.preventDefault();
	e.stopPropagation();
	Code.unfocus();
	UI.unfocus();
	var t = e.target;
	UI.selectTool(t);
	UI.tooldown = true;
}

UI.releaseTool = function(e){
	var t = e.target;
	var b = t.id;
//	if(b=='undo') Code.workspace.undo(false);
//	if(b=='redo') Code.workspace.undo(true);
	if(b=='undo') UI.undo();
	if(b=='redo') UI.redo();
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
		if ((mt.id == "undo") || (mt.id == "redo")) mt.className =  UI.getStackState(mt.id) ?  "icon "+  mt.id : "icon "+  mt.id + " NA";
		else mt.className = (mt == t) ? "icon "+  mt.id+" on": "icon "+  mt.id;
 }
}

///////////////////
// NEW
///////////////////

UI.newProject =  function (e){
	Runtime.stopThreads(Code.scripts);
	UI.cleanWorkspace(); 
  var empty = '<xml></xml>';
	var xml = Blockly.Xml.textToDom(empty);
	Blockly.Xml.domToWorkspace(xml, Code.workspace);
	Code.createDefaultVars();
	ShapeEditor.shapes = [];
	ShapeEditor.unfocus();
	ShapeEditor.displayAll();
	UI.projectID = undefined;
	UI.cleanUndo();
}

///////////////////
// Save
///////////////////

UI.loadFr = function (e){
	e.preventDefault();
	e.stopPropagation();	
	UI.changeLanguageTo("fr")
}

UI.loadEn = function (e){
	e.preventDefault();
	e.stopPropagation();	
	UI.changeLanguageTo("en")
}

UI.changeLanguageTo = function (str){
	if (Defs.lang == str) return;
	Runtime.stopThreads(Code.scripts);
	var content = UI.getProjectContents();
	chrome.storage.sync.set({'lang': str}, doNext);
	
	function doNext (){
		Defs.lang = str;
		Defs.loadLanguage(doTranslate);
	}
	
	function doTranslate (){
		Code.workspace.dispose();
		Code.reset(content);
		gn('nametag').textContent = Defs.translation["editor"]["shapes"];
	}
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
	let attr = {type: "saveFile", suggestedName: name, accepts: [{description: 'art:bit projects (*.txt)', mimeTypes: ['text/plain'], extensions: ['txt']}]};        
	chrome.fileSystem.chooseEntry(attr, next1)
	function next1(fe){
	 	if(chrome.runtime.lastError) console.warn(chrome.runtime.lastError.message);
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
	
UI.openBalloon = function(p, type,  labels, fcns){
	var mm = newHTML("div", 'dropdownballoon ' + type, p);
	var barrow = newHTML("div", "menuarrow " + type, mm);
	let csstype = type == 'topleft' ? "dropdown " + Defs.lang : 'dropdown en';
	var mdd= newHTML("div",csstype, mm);
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
  let attr = {type: "openFile", accepts: [{description: 'art:bit projects (*.txt)', mimeTypes: ['text/plain'], extensions: ['txt']}]}     
  chrome.fileSystem.chooseEntry(attr, next)
	function next(fe){	
		 if(chrome.runtime.lastError) console.warn(chrome.runtime.lastError.message);
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
  	Code.createDefaultVars();
  	Code.updatePalette()	
  	UI.cleanUndo();
  }
}
	
UI.loadXML = function (str, whenDone){ 
//	console.log(str) 
	var data = str.split("\n")
	try {
		let watermark = data[0].split(" ");
		if (watermark[0] != "art:bit") loadempty();
		else {
			let code = data [1];
			var xml = Blockly.Xml.textToDom([code]);
			ShapeEditor.shapes =  data[2] == "" ? [] : JSON.parse(data[2]);
			Blockly.Xml.domToWorkspace(xml, Code.workspace);
  		ShapeEditor.displayAll(); 
  		ShapeEditor.unfocus();
 	 		if (whenDone) whenDone()
		}
	} catch(e){
		console.log (e)
		loadempty();
	}
	function loadempty(){
		ShapeEditor.shapes = [[0,0,4,0,0], [0,14,10,14,0], [31, 17,17,17, 31]];
  	ShapeEditor.displayAll(); 
  	ShapeEditor.unfocus();
		whenDone();
	}

}
	
UI.getProjectContents = function (){
	var xml = Blockly.Xml.workspaceToDom(Code.workspace, true);
	let str = "art:bit 1.0";
	str +="\n"
	str +=  Blockly.Xml.domToText(xml);
	str +="\n"
	str += JSON.stringify(ShapeEditor.shapes)
	str +="\n"
	return str;
}

/*blockly overrrides */
Blockly.VerticalFlyout.prototype.DEFAULT_WIDTH = 230;

/////////////////////////
//
// Download VM
//
/////////////////////////

UI.downloadVM = function (){
	Runtime.stopTimer();
	Runtime.stopThreads(Code.scripts);
	gn("microbitstate").className = "microbit fail";
	let id  =HW.comms.serialID;
	if (id) chrome.serial.disconnect(id, (res)=>{if(!chrome.runtime.lastError) console.log('closing', id, res)})
  var req=new XMLHttpRequest()
  req.onreadystatechange=next1;
  req.open('GET','VMhex/bitscratch-vm-combined.hex',true)
  req.send(null);

	function next1(){
	  if (req.readyState!=4) return;
	  if (req.status!=200) return;
		chrome.fileSystem.chooseEntry({type: 'saveFile', suggestedName: 'ARTbitVM.hex'}, next2)
	}

	function next2(fe){
		var blob = new Blob([req.response], {type: 'plain/text'});
		fe.createWriter(next3);
	
		function next3(writer){
			writer.onwriteend = next4; 
			writer.write(blob);

			function next4(){
				writer.onwriteend=undefined; 
				writer.truncate(blob.size);	
			}
			
		}
	}
}

/////////////////////////
//
//  undo/redo
//
/////////////////////////

UI.openAbout  =  function(e){
	e.preventDefault();
	e.stopPropagation();
	gn("backdrop").setAttribute("class","modal-backdrop fade in");
	setProps(gn("backdrop").style, {display: 'block'});
	gn("alertdialog").setAttribute("class","alertdialog fade in");	
	gn("OK")[eventDispatch["start"]] = function(e) {	UI.closeDialog();};
}

UI.closeDialog   =  function(){
	gn("backdrop").setAttribute("class","modal-backdrop fade out");
	setProps(gn("backdrop").style, {display: 'none'});
	gn("alertdialog").setAttribute("class","alertdialog fade out");	
}


/////////////////////////
//
//  undo/redo
//
/////////////////////////

UI.saveForUndo = function(state){
	let skip = state ? false : UI.shouldSkipBlocklyAction();
	if (skip) return;
	UI.undoStack.push(UI.getShapesState(state));
	UI.redoStack = [];
	UI.updateToolsState(undefined);
}

 UI.shouldSkipBlocklyAction = function () {
 		let redolength = Code.workspace.redoStack_.length;
		let undolength = Code.workspace.undoStack_.length
 		let flag = true; // redo is not zero
		if ((UI.blocklyStacks.undo + UI.blocklyStacks.redo) != (undolength + redolength)) flag = false; // added something new
		UI.blocklyStacks = {redo: redolength, undo: undolength};		
		return flag;
	}
		
UI.undo = function(){
	var obj = UI.undoStack.pop();	
	if (obj) {
		if (obj.isEditor) UI.redoStack.push(UI.getShapesState(true));
		else UI.redoStack.push(UI.getShapesState(false));
		UI.restoreState(obj, false);	
	}
	else if (Code.workspace.undoStack_.length > 0) Code.workspace.undo(false);
	UI.updateToolsState(undefined);
}

UI.redo = function(){
	var obj = UI.redoStack.pop();
	if (obj) {
		if (obj.isEditor) UI.undoStack.push(UI.getShapesState(true));
		else UI.undoStack.push(UI.getShapesState(false));
		UI.restoreState(obj, true);	
	}
	else if (Code.workspace.redoStack_.length > 0) Code.workspace.undo(true);
	UI.updateToolsState(undefined);
}


UI.getShapesState = function(state){
	return  {isEditor: state, bloclky: {undos: Code.workspace.undoStack_.length, redos: Code.workspace.redoStack_.length},  editor: ShapeEditor.getState ()};
}

UI.restoreState = function(obj, isRedo){
//	console.log ('restoreState is editor', obj.isEditor, isRedo,UI.undoStack.length, UI.redoStack.length );
	if (!obj.isEditor) Code.workspace.undo(isRedo);
	else ShapeEditor.setState(obj.editor);
}

UI.getStackState = function(type){
	if (Code.workspace[type+"Stack_"].length > 0) return true;
	if (UI[type+"Stack"].length == 0) return false;
	if ((Code.workspace[type+"Stack_"].length == 0) && stackNotEditor(UI[type+"Stack"])) return false;
	return (UI[type+"Stack"].length > 0 );
	
	function stackNotEditor(list){
		for (let i=0; i< list.length; i++) {
			if (list[i].isEditor) return false;
		}
		return true;
	}	
}


// ENABLE only clean up (align stacks) individual blocks BLOCKLY context menus

Blockly.WorkspaceSvg.prototype.showContextMenu_ = function(e) {
  if (this.options.readOnly || this.isFlyout) {
    return;
  }
  var menuOptions = [];
  var topBlocks = this.getTopBlocks(true);
  var ws = this;

  // Option to clean up blocks.
  if (this.scrollbar) {
    menuOptions.push(
        Blockly.ContextMenu.wsCleanupOption(this,topBlocks.length));
  }

  Blockly.ContextMenu.show(e, menuOptions, this.RTL);
};

// DISABLE individual blocks BLOCKLY context menus

Blockly.BlockSvg.prototype.showContextMenu_ = function(e) {}
