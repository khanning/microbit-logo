/* Paula Bonta  2018 */

////////////////////////////////////////
// Scripts
////////////////////////////////////////

class Scripts {

	constructor (isFlyout, blocks) {	
		this.downloading = false
		this.isFlyout = isFlyout;
		this.timeout = false
		let myblocks = blocks
		if (isFlyout) {
			myblocks = new Blocks();
			myblocks.blocks = blocks;
		}
		this.blocksContainer = myblocks
		this.commands =[]	
		this.stack=[];
		this.thisblock = undefined
	}

	clean (){this.blocksContainer._blocks = {}}


	getHats (str){
		var blks = this.blocksContainer._blocks;
		var res  = [];
		for(var i in blks){
			var b = blks[i];
			var op = b.opcode.split("_")[1];
			if (op == str) res.push(b);			
		}
		return res;
	}

 /* callback from blocks.js */

	handleVM(e) {
		if (this != Code.scripts) return;
	//	console.log ("handleVM", timer())
		switch (e.type) {
			case 'ui': 
			case 'create': break;	
			case 'delete':
			case 'move':
			case 'change': 
				if  (!Code.workspace.blockDB_[e.blockId]) break;
				if  (e.element == "mutation") Code.updatePalette();
			//	if (HW.isConnected) Code.silentDownload (whenDone); 
			//	else if (!UI.isLoading) console.log (this.blocksToString())
				break;
		}	
	function  whenDone(){}
	}
			
	 /* ScratchBlocks callbaks */
	 handleUI (e){
		switch (e.element){
			case 'stackclick':
				if (!this.ignoreNext) this.runBlock(e.blockId)
				this.ignoreNext = false
				break;
			case 'selected': this.selectionStarts(e); break;
			case "click": if (!this.isFlyout) this.handleClick(e); break;
			default:  console.log ("ui not handled", e); break;
		}
	}
	
	handleClick (e){
		switch (UI.toolmode){
			case "scissors":
				this.cutBlocks(e.blockId);
				UI.selectTool(undefined);
				this.ignoreNext = true;
				break;
			case "clone":
				this.getClone(e.blockId);
				UI.selectTool(undefined);
				this.ignoreNext = true;
				break;
		}
	}

	runBlock (id){
		let blockID = this.blocksContainer.getTopLevelScript(id)
		let block = this.blocksContainer.getBlock(blockID);
		var opcode = this.blocksContainer.getOpcode(block);
    var prim = opcode.split ("_")[1]
    
		if (Defs.primtives[prim][1] == "r") {
			var t =  new Thread(this, block);
			var token=Prim[block.opcode];			
			var value = t.getArgs (block);
			var str = Number(value.toString()).toString() == "NaN" ? value.toString() : value.trim(2).toString()
			Code.workspace.reportValue(id, str);	
		}  
		else  Runtime.addScript(this, block)
	}	
	
	
	cutBlocks (id){
		let topblockID = this.blocksContainer.getTopLevelScript(id)
		let block = this.blocksContainer.getBlock(id);
		if (!block) return
		 // PB  under the hood dispose
		 Code.workspace.blockDB_[id].dispose()
	}
	
	deleteBlocks (id, whenDone){
		let topblockID = this.blocksContainer.getTopLevelScript(id)
		let block = this.blocksContainer.getBlock(id);
		var args = block ? (new Thread (this, block)).getArgs(block) : null
		let isProcDef = block  && (block.opcode == "myblocks_definition")  && (args["arg0"].replace(/^[\s\xa0]+|[\s\xa0]+$/g, '') != "");
		Runtime.stopThreadForBlock(this.blocksContainer.getBlock(topblockID), doNext);
		function doNext(){
			if (isProcDef) Code.updatePalette()
			whenDone()
		}	
	}

	getClone (id){
		var block = Code.workspace.blockDB_[id]
		  //this.blocksContainer.getBlock(id);
		if (!block) return;
		var xml = document.createElement('xml');
		xml.appendChild(Blockly.Xml.blockToDomWithXY(block, true));
		var b = xml.childNodes[0];
		var attr = Adapter.getAttributes(b);
		var x = attr["x"] ? Number(attr["x"]) + 30 : 203;
		var y = attr["y"] ? Number(attr["y"]) + 30 : 103;
		b.setAttribute("x", x);
		b.setAttribute("y", y);
		if (attr.type == "myblocks_definition") this.changeProcNameTo (b, Blockly.CustomBlocks.PROC_DEFAULT);
		Blockly.Xml.domToWorkspace(xml, Code.workspace);
	}

	changeProcNameTo (blockDOM,val) {
		for (var i = 0; i < blockDOM.children.length; i++) {
			var xmlChild = blockDOM.children[i];
			var childattr = Adapter.getAttributes(xmlChild);
			switch (xmlChild.tagName.toLowerCase()) {
			case 'field':
					var fieldName = childattr.name;
					if (fieldName == "arg0")  xmlChild.textContent  =  val;
					break;
			case 'mutation':
					xmlChild.setAttribute("values", val);
					break;
			}
		}
	}
	
	quietGlow(blockId) {
	//	console.log ("quietGlow",blockId)
	}

////////////////////////
// On Play
////////////////////////
	
	triggerHats (type){	
	 	let blocks = this.getHats("onbuttona");
		for (var i=0; i < blocks.length; i++) Runtime.addScript(this, blocks[i]);
	}
		
////////////////////////
// Sensing
////////////////////////
		

triggerButton (type){
	let strips = []
	let hats = {"apressed": "onbuttona", 
				  "bpressed" : "onbuttonb",
				  "abpressed" : "onbuttonab"};	
	if (this[type] == HW.state[type]) return strips;
	if (HW.state[type]) strips = this.getHats(hats[type]);	
	this[type] = HW.state[type];
	return strips;
}


triggerBroadast (type){
	var blocks = [];
	if (type == 255) return blocks;
	var strips = this.getHats("onreceive");
	for (let i=0; i < strips.length; i++){
		let b=strips[i]
		var t = new Thread (this, b)
		var args = t.getArgs(b);
		var n = Prim.toNum(args["BROADCAST_OPTION"])
		if (n == type) blocks.push(b)
	}
	return blocks;
}


		
////////////////////////
// Stacks to string
////////////////////////

	blocksToString (){
		var topblocksIDs = this.blocksContainer.getScripts()
		var topblocks = []
		for (let i=0; i < topblocksIDs.length; i++) {
			let blockID =  topblocksIDs[i]
			let block = this.blocksContainer.getBlock(blockID)
			if (!block) continue;
			let op = block.opcode.split("_")[1];
			let trigger = !Defs.primtives[op] ?  false: (Defs.primtives[op][1] == "s")
			if (!trigger) continue;
			topblocks.push (block)
		}
		
		let code =  this.getCodeText(topblocks, false)
		return code
	}

	getCodeText (topblocks, isDirect){
		var res  = []
		for (let i=0; i < topblocks.length; i++) {
			let t = new Thread(this, topblocks[i]);
			res = res.concat (t.decode(i));
			res.push("")
		}
		console.log (res.join("\n"))
		return res.join("\n");
	}

	
}

