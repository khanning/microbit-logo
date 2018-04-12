/* Paula Bonta  2017 */

////////////////////////////////////////
// Code
////////////////////////////////////////

var Code = function() {};

Code.workspace = undefined;
Code.flyoutworkspace = undefined;
Code.scripts  = undefined;
Code.flyoutScripts  = undefined;
Code.timeout = undefined;
Code.compile = undefined;
Code.variables = {}
Code.cache = '';

// Init
Code.start = function(e){
	libInit();
	Defs.init (doNext);
	function doNext (){
		Code.workspace = Blockly.inject('blocklyDiv', Defs.workspaceAttributes);
		Code.scripts = new Scripts(false, new Blocks());
		Code.flyoutworkspace = Code.workspace.getFlyout().getWorkspace();
		Code.workspace.addChangeListener(Code.blockListener);
		Code.flyoutBlocks = new Scripts(true, Code.flyoutworkspace.blocksDB_);
		Code.flyoutworkspace.addChangeListener(Code.blockListenerFlyout);
		Code.blocklyOverrides();	
		Code.updatePalette()
		Code.createDefaultVars()
		HW.setup();
		HW.compiler.setup();
		UI.setup();
	}
 }

Code.reset = function (str){
	if (gn('blocklyDiv')) gn('blocklyDiv').parentNode.removeChild (gn('blocklyDiv'))	
	let bd = newHTML('div', undefined, gn('contents'),'blocklyDiv');
	Code.workspace = Blockly.inject('blocklyDiv', Defs.workspaceAttributes);
	Code.scripts = new Scripts(false, new Blocks());
	Code.flyoutworkspace = Code.workspace.getFlyout().getWorkspace();
	Code.workspace.addChangeListener(Code.blockListener);
	Code.flyoutBlocks = new Scripts(true, Code.flyoutworkspace.blocksDB_);
	Code.flyoutworkspace.addChangeListener(Code.blockListenerFlyout);
	Code.blocklyOverrides();	
	Code.updatePalette();
	UI.loadXML(str);
}		
		
Code.updatePalette = function (){
	var xml = Defs.getXML(Defs.verticalBlocks);
	Code.workspace.updateToolbox(xml)	
}
	
Code.createDefaultVars = function (){
	let keyname ='box';
	for (let i=1; i < 4; i++) {
	 	Code.workspace.createVariable("box" + i);
		Code.variables[keyname + i] =  0;
	}
}
	
Code.blocklyOverrides = function(){
	Code.workspace.registerToolboxCategoryCallback(Blockly.MINE_CATEGORY_NAME, Blockly.CustomBlocks.flyoutCategory);
}

Code.getToolboxElement= function () {
	var match = location.search.match(/toolbox=([^&]+)/);
	return document.getElementById('toolbox-' + (match ? match[1] : 'categories'));
}

 Code.blockListener= function(e){
 		UI.unfocus();
	 UI.updateToolsState(undefined);
   Code.scripts.blocksContainer.blocklyListen(e,  Code.scripts);
}

 Code.blockListenerFlyout = function(e){
 	UI.unfocus();
	UI.updateToolsState(undefined);
  Code.flyoutBlocks.blocksContainer.blocklyListen(e, Code.flyoutBlocks);
}

 Code.clear = function (){
	 Code.workspace.clear();
	 Code.workspace.clearUndo();
	 Code.scripts.clean(); 
}

////////////////////////
// Toggle tether run
////////////////////////

Code.togglePlay = function(e){
	e.preventDefault();
	e.stopPropagation();
	Code.startOrStop();
}

Code.startOrStop = function(){	
	UI.unfocus();
	if (Runtime.isActive()) Runtime.stopThreads(Code.scripts);
	else  Code.scripts.triggerHats("onbuttona");
}


/////////////////////////
// Download
/////////////////////////

Code.download = function (){	
	Runtime.stopTimer();
	gn("microbitstate").className = "microbit download";
	setTimeout(Code.startDownload, 500);
}

Code.startDownload = function (){		
	var downloadEnd = (a)=>	{
		gn("microbitstate").className = "microbit ok";
		Runtime.startTimer();
	}
	
	var blocktext = Code.scripts.blocksToString()
	let msg =  blocktext+' '+flatten(ShapeEditor.shapes).join(' ');
	if ((Code.cache != msg) && (blocktext != '')) HW.compiler.downloadProcs(blocktext, flatten(ShapeEditor.shapes), doNext)
	else downloadEnd();

	function doNext(str){
		var value  = str ? "ERROR: "+str : 'downloaded.'
		console.log (value)
		if (!str) Code.cache = msg;
		downloadEnd();
	}	
}

document.addEventListener("contextmenu", function(e) {e.preventDefault();});

window.onload = Code.start;
