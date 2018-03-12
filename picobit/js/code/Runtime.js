/* Paula Bontá 2017 */

Runtime = function() {};

Runtime.threadsRunning=[];
Runtime.thread;
Runtime.intervalId;
Runtime.yield=false;
Runtime.ticker = 50;
Runtime.counter=0;
Runtime.shape = [0,0,0,0,0];
Runtime.brightness = 100;

Runtime.startTimer = function() {
	resett()
	Runtime.stopTimer ()
	Runtime.intervalId = window.setInterval(function (){Runtime.tickTask();}, Runtime.ticker);
	if (!HW.comms.serialID) gn('microbitstate').className = "microbit fail";
	else gn('microbitstate').className = "microbit ok";
}

Runtime.stopTimer = function(){
	if(Runtime.intervalId != null) window.clearInterval(Runtime.intervalId);
	Runtime.intervalId = null;
	Runtime.stopThreads(Code.scripts);
	UI.updateRunStopButtons(); 	
	gn('microbitstate').className = "microbit debug";
}

Runtime.stopThreads = function(sc) {
	Runtime.turnOffStacks(sc);
	for (var i=0; i <  Runtime.threadsRunning.length; i++) {
		if (Runtime.threadsRunning[i].isRunning) {
			Runtime.stopThread(Runtime.threadsRunning[i], doNext);
		}
	}	
	function doNext(thread){thread.stop();}		
}

Runtime.stopOthers = function(t) {
	for (var i=0; i <  Runtime.threadsRunning.length; i++) {
		if (Runtime.threadsRunning[i] ==  t) continue;
		if (Runtime.threadsRunning[i].isRunning) {
			Runtime.stopThread(Runtime.threadsRunning[i], doNext);
		}
	}	
	function doNext(thread){thread.stop();}		
}

Runtime.turnOffStacks = function(sc) {
	var topblocks = sc.blocksContainer.getScripts()
	for (var i=0; i <  topblocks.length; i++) {
		var id = topblocks[i]
		if (Runtime.isBlock(sc, id))Code.workspace.glowStack(id, false)
	}	
}
	
Runtime.tickTask = function() { 
	Runtime.send();
	HW.poll();
	Runtime.run();
}

Runtime.send = function() { 
	if (HW.shape.join(' ') != Runtime.shape.join(' ')) HW.sendShape();
	if (HW.brightness !=  Runtime.brightness) HW.sendBrightness();
	HW.broadcast()
	Runtime.shape = HW.shape ;
	Runtime.brightness = HW.brightness;	
}

Runtime.run = function() { 
	Runtime.updateThreads();
	UI.updateRunStopButtons();
	Runtime.scanTriggers();
	for (var i=0; i < Runtime.threadsRunning.length; i++) Runtime.step(i);
}
	
Runtime.isBlock = function(sc, id) { 
	 var bc = sc.blocksContainer;
	 var b = bc.getBlock(id)
	 if (!b) return false
	 var opcode = bc.getOpcode(b);
	 var prim = opcode.split ("_")[1]
	 var blockFunction =  Prim[opcode];
	 var isreporter =  (Defs.primtives[prim]) ?  Defs.primtives[prim][1] == "r" : true;
	 if (!blockFunction || isreporter) return false;
	 return true
 }

Runtime.updateThreads = function (){
 	var activeThreads=[];
  for (var i=0; i < Runtime.threadsRunning.length; i++) {if (Runtime.threadsRunning[i].isRunning) activeThreads.push(Runtime.threadsRunning[i]);}
	Runtime.threadsRunning = activeThreads;
}

Runtime.isActive = function (){return (Runtime.threadsRunning.length > 0)}

Runtime.step = function (n){
	Runtime.yield=false;
	Runtime.thread=Runtime.threadsRunning[n];
	while (true) {
		if (Runtime.thread.waitFcn) {
			if (!Runtime.thread.waitFcn()){
				Runtime.yield=true;
				break;
			}
			else Runtime.thread.waitFcn = undefined
			} 
		if (Runtime.yield) break;
		if (Runtime.thread.thisblock == undefined) {
			Runtime.endCase(); 
			Runtime.yield=true;
		}
		else Runtime.runPrim();
	}			
}

Runtime.runPrim = function() {
	var b = Runtime.thread.thisblock;
//	console.log (timer(), "runPrim", (typeof b)=='string' ? b : b.opcode);
	if((typeof b)=='string') Prim[b]();
	else {
		if (!Runtime.thread.getBlock(b.id)) Runtime.thread.cancel()
		else Runtime.runBlock(b);
	}
}

Runtime.scanTriggers = function (){
	var blocks = []
	for (let type in HW.state) {	
		switch (type){	
			case "apressed": 
			case "bpressed": 
				blocks = blocks.concat (Code.scripts.triggerButton(type))	
				break;
			case "recc": 
				blocks = blocks.concat (Code.scripts.triggerBroadast(HW.state[type]))
				break;
		}
	}
	for (var i=0; i < blocks.length; i++) Runtime.addScript(Code.scripts, blocks[i]);
}

Runtime.runBlock = function(b) {	
	var token=Prim[b.opcode];
	if (!token) token=Prim["missing"];
//	console.log (b.opcode)
	let keepOn = ["myblocks_definition"]
	if (keepOn.indexOf(b.opcode) < 0) {
		Runtime.unglowBlock(Runtime.thread, Runtime.thread.onblock);
		Runtime.thread.onblock = null;
	}
	var setoff = ["missing", 'control_onstart', 'control_onpress', 'control_ondistance', 'control_onbrightness', 'control_onstart', 'control_onpress', 'control_ondistance', 'control_repeat']
	if (setoff.indexOf(b.opcode) < 0) {
		Runtime.time = new Date().getTime();
		Runtime.glowBlock(Runtime.thread, b);
		Runtime.thread.onblock = b;
	}
	token();
}

Runtime.endCase = function () {
  if (Runtime.thread.stack.length == 0) Prim.done();
  else {  
    var b = (Runtime.thread.stack).pop();
    Runtime.thread.thisblock = b;
  //  Runtime.runPrim();
  }
}

Runtime.addScript = function(sc, block){
//	console.log("Runtime.addScript", sc, block)
	var  newThread =  new Thread(sc, block);
	Runtime.restartThread(newThread);
}

Runtime.restartThread = function (newThread) {
  var wasRunning = false;
  for (var i = 0; i < Runtime.threadsRunning.length; i++) {  	
   	if (Runtime.threadsRunning[i].firstBlock == newThread.firstBlock) {
      wasRunning = true;
  //    var thread = Runtime.threadsRunning[i];
  //    if (thread.trigger) Runtime.stopThread(thread, doNext);
    }
  }
  if (!wasRunning) {
  	 Runtime.threadsRunning.push(newThread);
  	 newThread.startGlow();
  	}
  
//  function doNext (value){thread.restart();}
}

Runtime.stopThread = function (thread, fcn) {
	if (thread.onblock){
		var procId = thread.sc.blocksContainer.getTopLevelScript(thread.onblock.id)
		var opcode = thread.sc.blocksContainer.getBlock(procId).opcode
		if (opcode == "myblocks_definition") thread.exitProcedure()
	}
	var b = thread.onblock;
	if (b) {
		var op = b.opcode.split("_")[1];
		var isLight =  Defs.primtives[op][2] == "motion"
		if (isLight) lightOff(thread, b)
		else fcn(thread);
	}
	else lightDone();
	
	function lightOff (thread, b){
	//	HW.sendShape([0,0,0,0,0]);
	//	else 
		lightDone()
	}
	
	function lightDone (val){fcn(thread)}	
}

Runtime.stopThreadForBlock = function (topblock, whenDone) {
	var running = false
 	for (var i = 0; i < Runtime.threadsRunning.length; i++) {  
 		var thread = 	Runtime.threadsRunning[i]
   	if (thread.firstBlock.id == topblock.id) {
			running = true; 
			Runtime.stopThread(thread, doNext);
   	}
 	}
 	if (!running) whenDone()
 	function doNext(thread){
 		thread.stop()
 		whenDone()
 	}
}	
	
Runtime.glowBlock = function(t, b) {if (b && t.blockExists(b.id)) Code.workspace.glowBlock(b.id, true);}
Runtime.unglowBlock = function(t, b) {if (b && t.blockExists(b.id)) Code.workspace.glowBlock(b.id, false);}

Runtime.glowStack = function(t, b) {if (b && t.blockExists(b.id)) Code.workspace.glowStack(b.id, true);}
Runtime.unglowStack = function(t, b) {if (b && t.blockExists(b.id)) Code.workspace.glowStack(b.id, false);}
