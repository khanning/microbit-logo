/* Paula Bont� 2017 */

Prim = function() {};

Prim.currentShape = {n: undefined, dx:0, dy: 0}
Prim.pace = 0.5;

//////////////////////////////////
//  Microbit Primitives
/////////////////////////////////

Prim.events_onbuttona = function ()	{Prim.doNext();}
Prim.events_onbuttonb = function (){Prim.doNext();}
Prim.events_onreceive = function (){Prim.doNext();}
Prim.myblocks_definition = function (){Prim.doNext();}

Prim.doNext = function (){ Runtime.thread.thisblock =  Runtime.thread.next();}

Prim.done = function (){ 
	 Runtime.thread.stop();
	 console.log ("Prim.done", Runtime.thread.firstBlock.opcode);
}

Prim.missing  = function (){ 
	var thread =  Runtime.thread;
	var b = thread.thisblock;
	console.warn ("no prim found for " + b.opcode)
	Prim.doNext();
}


////////////////////////
//  Control
////////////////////////

Prim.control_wait = function() {
	var thread =  Runtime.thread;
	var b = thread.thisblock;
	var args = thread.getArgs(b);
	var value = Prim.toNum(args.DURATION);
	value = Math.max(0,value)
	var future = (1000 * value) + Date.now()
	if (future > 0) thread.waitFcn = function (){return Prim.waitForTime(future);}
	Prim.doNext();
}

Prim.control_repeat = function (){		
	var t = Runtime.thread;
	var b = t.thisblock;
	var args = t.getArgs(b);
	var n = Prim.toNum(args.TIMES);
	var flow = t.getSubStack (b, "SUBSTACK")
//	console.log ("repeat", n);
	if (n < 1){
		Prim.doNext();
	}
	else {	
		t.stack.push(t.next());
		t.stack.push(n);
		t.stack.push(flow);
		t.stack.push('repeatAgain');
		t.thisblock = flow;
	//	console.log ("start", t.stack.length);
	}
}

Prim.repeatAgain = function(){
	var t = Runtime.thread;
	var b = t.stack.pop();
	var n = t.stack.pop();
	n--;
	if(n>0){
		t.stack.push(n);
		t.thisblock = b;
		t.stack.push(b);
		t.stack.push('repeatAgain');
	}
	else  {
		t.thisblock = t.stack.pop();
	}
}

Prim.control_forever = function (){		
	var t = Runtime.thread;
	var b = t.thisblock;
	var flow = t.getSubStack (b, "SUBSTACK")
	t.stack.push(flow);
	t.stack.push('foreverLoop');
	t.thisblock = flow;
}

Prim.foreverLoop = function(){
	var t = Runtime.thread;
	var flow = t.stack.pop();
	t.stack.push(flow);
	t.stack.push('foreverLoop');
	t.thisblock = flow;
}

Prim.control_if = function (){		
	var t = Runtime.thread;
	var b = t.thisblock;
	var args = t.getArgs(b);
	if  (Prim.toBool(args.CONDITION)){
		var flow = t.getSubStack (b, "SUBSTACK")
		t.stack.push(t.next());
		t.thisblock = flow;
	}
	else 	Prim.doNext();
}

Prim.control_ifelse = function (){		
	var t = Runtime.thread;
	var b = t.thisblock;
	var args = t.getArgs(b);
	t.stack.push(t.next());
	var flow =  t.getSubStack (b, Prim.toBool(args.CONDITION) ? "SUBSTACK" : "SUBSTACK2")
	t.thisblock = flow;
}

Prim.control_wait_until = function (){		
	var t = Runtime.thread;
	var b = t.thisblock;
	var args = t.getArgs(b);
	if (Prim.toBool(args.CONDITION)) Prim.doNext();
	else Runtime.yield=true;
}

Prim.control_repeat_until = function (){		
	var t = Runtime.thread;
	var b = t.thisblock;
	var args = t.getArgs(b);
	if  (!Prim.toBool(args.CONDITION)){
		var flow = t.getSubStack (b, "SUBSTACK")
		t.stack.push(b);
		t.stack.push(flow);
		t.stack.push('repeatUntil');
		t.thisblock = flow;	
	}
	else Prim.doNext();
}

Prim.repeatUntil = function(){
	var t = Runtime.thread;
	var flow = t.stack.pop();
	var b = t.stack.pop();
	var args = t.getArgs(b);
	n--;
	if (!Prim.toBool(args.CONDITION)){
		t.stack.push(b);
		t.stack.push(flow);
		t.stack.push('repeatUntil');
		t.thisblock = flow;	
	}
	else  {
		t.thisblock = b.next();
	}
}

Prim.waitForTime = function (future){
	return (future - Date.now()) <= 0;
}

Prim.control_stop = function (b){
	var t = Runtime.thread;
	var b = t.thisblock;
	var args = t.getArgs(b);
	switch (args.STOP_OPTION){
		case "stopall": Runtime.stopThreads(t.sc); break;
		case "stop":
			Runtime.stopThread(t, function(t){t.stop();});
			break;
		case "stopothers": Runtime.stopOthers(t); break;
	}
	Prim.doNext();
}

Prim.events_broadcast = function (){
	var t = Runtime.thread;
	var b = t.thisblock;
	var args = t.getArgs(b);
	var num = Prim.toNum (args.BROADCAST_OPTION);
	if (HW.messages.indexOf(num) < 0) HW.messages.push(num);
	var blocks = Code.scripts.triggerBroadast(num);
	for (var i=0; i < blocks.length; i++) Runtime.addScript(Code.scripts, blocks[i]);
	Prim.doNext();
}

//////////////////////
//  Lights
////////////////////////

Prim.lights_clean = function (){
	var thread =  Runtime.thread;
	Prim.currentShape = {n: undefined, dx:0, dy: 0}
	HW.shape = [0,0,0,0,0];		
	Prim.doNext();
}

Prim.lights_doton = function (){
	let thread =  Runtime.thread;
	let b = thread.thisblock;
	let args = thread.getArgs(b);
	let states = ShapeEditor.convertRowToState(HW.shape);
	let pos =  ((4 - Prim.toNum(args.Y).mod(5)) * 5) + Prim.toNum(args.X).mod(5)
	states [pos] = 1;
	let list  = ShapeEditor.convertState2Number(states)
	HW.shape = list;
//	Prim.setShape(thread, ShapeEditor.convertState2Number(states));
	Prim.doNext();
}

Prim.lights_dotoff = function (){
	let thread =  Runtime.thread;
	let b = thread.thisblock;
	let args = thread.getArgs(b);
	let states = ShapeEditor.convertRowToState(HW.shape);
	let pos =  ((4 - Prim.toNum(args.Y).mod(5)) * 5) + Prim.toNum(args.X).mod(5)
	states [pos] = 0;
	let list  = ShapeEditor.convertState2Number(states)
	HW.shape = list;
//	Prim.setShape(thread, ShapeEditor.convertState2Number(states));
	Prim.doNext();
}

Prim.lights_setshape = function (){
	let thread =  Runtime.thread;
	let b = thread.thisblock;
	let args = thread.getArgs(b);
	let n = Prim.mapValueShape(Prim.toInt(args.NUM) - 1);
	Prim.currentShape = {n: n, dx:0, dy: 0}
	let shape = ShapeEditor.getShapeData(Prim.currentShape)
	Prim.setShape(thread, shape);
	Prim.doNext();
}

Prim.lights_setpace = function (){
	var thread =  Runtime.thread;
	let b = thread.thisblock;
	let args = thread.getArgs(b);
	let val = Prim.toNum(args.NUM)
	Prim.pace = val;
	Prim.doNext();
}

Prim.setShape = function (thread, list, faster){
	if (Prim.pace > 0) {
		var future = faster ? (200 * Prim.pace) + Date.now() :  (1000 * Prim.pace) + Date.now();
		thread.waitFcn = function (){return Prim.waitForTime(future);}
	}
	HW.shape = list;
//	console.log ("Prim.setShape", HW.shape)
}
	
Prim.lights_setbrightness = function (){
	let thread =  Runtime.thread;
	let b = thread.thisblock;
	let args = thread.getArgs(b);
	let val = Prim.toNum(args.NUM)
	HW.brightness = val;
	Prim.doNext();
}

Prim.lights_nextshape = function (){
	let thread =  Runtime.thread;
	let b = thread.thisblock;
	Prim.nextShape();
	let shape = ShapeEditor.getShapeData(Prim.currentShape)
	Prim.setShape(thread, shape);		
	Prim.doNext();
}

Prim.lights_previousshape = function (){
	let thread =  Runtime.thread;
	let b = thread.thisblock;
	Prim.previousShape()
	let shape = ShapeEditor.getShapeData(Prim.currentShape)
	Prim.setShape(thread, shape);		
	Prim.doNext();
}

Prim.nextShape = function (){
	let n = Prim.currentShape.n;
	n = (n != undefined) ? n + 1 : 0;	
	Prim.currentShape = {n: Prim.mapValueShape(n), dx:0, dy: 0};
} 

Prim.mapValueShape= function (n){ return n.mod(ShapeEditor.shapes.length)}

Prim.previousShape = function (){
	let n = Prim.currentShape.n;
	n =  (n != undefined) ? n -  1 : -1;
	Prim.currentShape = {n: Prim.mapValueShape(n), dx:0, dy: 0};
} 

Prim.lights_scroll = function (){
	let thread =  Runtime.thread;
	let b = thread.thisblock;
	let args = thread.getArgs(b);
	let option = args.SCROLL_OPTION;
	switch (option) {
		case 'right': 		
			Prim.currentShape.dy = 0;
			if (Prim.currentShape.dx > 0) Prim.currentShape.dx--; 
			else { 
				let n = Prim.currentShape.n;
				n = n ? n-- : 0;
				Prim.currentShape = {n: Prim.mapValueShape(n), dx:4, dy: 0};
				} 	
			break;
		case 'left':
			Prim.currentShape.dy = 0;
			Prim.currentShape.dx++; 
			if (Prim.currentShape.dx == 5) Prim.nextShape();
			break;
	  case 'up':
	  	Prim.currentShape.dx = 0;
			if (Prim.currentShape.dy > 0) Prim.currentShape.dy--; 
			else  {
				let n = Prim.currentShape.n;
				n = n ? n++ : 0;
				Prim.currentShape = {n: Prim.mapValueShape(n), dx:0, dy: 4};
			}
			break;
		case 'down': 
			Prim.currentShape.dx = 0; Prim.currentShape.dy++;
			if (Prim.currentShape.dy == 5) Prim.previousShape(); 
			break;
	}
	let shape = ShapeEditor.getShapeData(Prim.currentShape)
	Prim.setShape(thread, shape, true);		
	Prim.doNext();
}

///////////////////////
//  Sensing
////////////////////////

Prim.sensing_resett = function () {
	resett();
	Prim.doNext();
}

///////////////////////
//  My Blocks
////////////////////////

Prim.myblocks_procedure = function () {
	var thread = Runtime.thread;
	var callblock = thread.getProcStack();
	if (!callblock) Prim.doNext();
	else {
		Runtime.thread.stack.push(callblock);
		Runtime.thread.stack.push(Runtime.thread.thisblock);
		Runtime.thread.stack.push(Runtime.thread.next());
		Runtime.thread.stack.push('exitProc');
		Runtime.thread.thisblock = callblock
		Runtime.glowStack(thread, callblock);
	}
}

Prim.exitProc = function(){
	var thread = Runtime.thread;
	var next = thread.stack.pop();
	var proccall = thread.stack.pop();
	var callblock = thread.stack.pop();
	Runtime.unglowBlock(thread, proccall);
	thread.thisblock = next;
	Runtime.unglowStack(thread, callblock);
}

Prim.myblocks_setglobal= function () {
	var thread =  Runtime.thread;
	var b = thread.thisblock;
	var args = thread.getArgs(b);
	var value = Prim.toNum(args.NUM); 
	Code.variables[args.VARIABLE] = value
	Prim.doNext();
}

Prim.myblocks_changeglobal = function () {
	var thread =  Runtime.thread;
	var b = thread.thisblock;
	var args = thread.getArgs(b);
	var value = Prim.toNum(args.NUM); 
	Code.variables[args.VARIABLE] = Code.variables[args.VARIABLE] + value;
	Prim.doNext();
}

///////////////////////
// Reporters
////////////////////////

Prim.myblocks_box = function (args) {return Code.variables[args.VARNAME]}

Prim.operators_add = function (args){return Prim.toNum(args.NUM1) + Prim.toNum(args.NUM2)}
Prim.operators_subtract = function (args){ return Prim.toNum(args.NUM1) -  Prim.toNum(args.NUM2)}
Prim.operators_multiply = function (args){ return Prim.toNum(args.NUM1) * Prim.toNum(args.NUM2)}
Prim.operators_divide = function (args){return Prim.toNum(args.NUM1)  /  Prim.toNum(args.NUM2)}
Prim.operators_modulo = function (args){return Prim.toNum(args.NUM1).mod(Prim.toNum(args.NUM2))}

Prim.operators_lt = function (args){return Prim.toNum(args.OPERAND1) < Prim.toNum(args.OPERAND2)}
Prim.operators_equals = function (args){return Prim.toNum(args.OPERAND1) == Prim.toNum(args.OPERAND2)}
Prim.operators_gt = function (args){return Prim.toNum(args.OPERAND1) > Prim.toNum(args.OPERAND2)}

Prim.operators_and = function (args){return Prim.toBool(args.OPERAND1) && Prim.toBool(args.OPERAND2)}
Prim.operators_or = function (args){return Prim.toBool(args.OPERAND1) || Prim.toBool(args.OPERAND2)}
Prim.operators_not = function (args){return !Prim.toBool(args.OPERAND)}
 
Prim.operators_random = function (args){
	var nFrom = Prim.toNum(args.FROM);
	var nTo = Prim.toNum(args.TO);
	var low = nFrom <= nTo ? nFrom : nTo;
	var high = nFrom <= nTo ? nTo : nFrom;
  if (low === high) return low;
  if (Prim.isInt(args.FROM) && Prim.isInt(args.TO)) {
        return low + parseInt(Math.random() * ((high + 1) - low), 10);
    }
    return (Math.random() * (high - low)) + low;
}

Prim.sensing_pressed = function (args){
	let port = HW.sensorPorts.indexOf("touch");	
	var res  = (port > -1)  ? checkTouchTrigger(port) : false;
	return res;
	
	function checkTouchTrigger(p) {
	 	var value  = HW.sensorValues[p] 
	 	return value == undefined ?  false : value == 0 ? false : true;
	}
}

Prim.lights_shape = function (args) {let n = Prim.currentShape.n; return Prim.mapValueShape(n ? n : 0) + 1}
Prim.sensing_timer = function (args) {return timer() / 1000}	
Prim.sensing_apressed = function (args){return HW.state.apressed;}
Prim.sensing_bpressed = function (args){return HW.state.bpressed;}
Prim.sensing_accx = function (args){return HW.state.tilts.x;}

///////////////////////
// Tools
////////////////////////

Prim.toNum = function (value) {
 var n = Number(value);
 if (isNaN(n)) return 0;
 return n;
};

Prim.toInt = function (value) {return Math.round (Prim.toNum(value));}

Prim.toBool = function (value) {
    // Already a boolean?
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        // These specific strings are treated as false in Scratch.
        if ((value === '') ||
            (value === '0') ||
            (value.toLowerCase() === 'false')) {
            return false;
        }
        // All other strings treated as true.
        return true;
    }
    // Coerce other values and numbers.
    return Boolean(value);
};

Prim.isInt = function (val) {return val.indexOf('.') < 0;};

