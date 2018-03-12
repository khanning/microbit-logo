HW = function(){}

HW.compiler = new Compiler();
HW.comms = new Comms();

HW.state = {apressed: false, bpressed: false, recc: 255, tilts: {x: undefined, y: undefined, z: undefined, w: undefined}};
HW.shape = [0,0,0,0,0];
HW.messages = [];
HW.brightness = 100;

HW.setup = function (){	
 	gn('microbitstate').className = "microbit connecting"
 	HW.comms.openSerialPort(doNext, HW.onReceiveError)
 	
 	function doNext(port){
 		if (!port) whenDone("fail")
 		else  whenDone()
 	}
 	
 	function whenDone(str){
 		if (str=="fail") gn('microbitstate').className = "microbit fail";
 		else gn('microbitstate').className = "microbit ok";
 		setTimeout(Runtime.startTimer, 500)
 	}	
}

HW.onReceiveError = function (err){
	console.warn ("onReceiveError", err)
	gn('microbitstate').className = "microbit fail";
}

HW.gotString = function (str) {console.log ("HW.gotString:", str);}

HW.poll = function () {
	let data  = [].concat([0xf5]);
	if (!HW.comms.serialID) return;
	HW.comms.sendl(data);
}

HW.sendBrightness = function (){
	let val = HW.brightness;
//	console.log(timer(), val)
	let num  =  Math.max (1, Math.min(val, 100));
	let value = Math.round (num * 255 / 100);
	let data  = [].concat([0xf6], value);
	if (!HW.comms.serialID) return;
	HW.comms.sendl(data);
}

HW.sendShape = function () {
//	console.log(timer(),"sendShape", HW.shape)
	let data  = [].concat([0xf7], HW.shape);
	if (!HW.comms.serialID) return;
	HW.comms.sendl(data);
}

HW.broadcast = function () {
	if (HW.messages.length == 0) return;
	console.log ('broadcast',HW.messages )
	let data  = [].concat([0xf4], HW.messages.length, HW.messages);
	if (HW.comms.serialID) HW.comms.sendl(data);
	HW.messages = [];
}

HW.run = function (l, fcn){HW.compiler.runCommandLine(l, fcn);}
HW.doDownload = function (str){HW.compiler.downloadProcs(str);}

HW.downloadshapes = function(l, fcn){HW.comms.downloadshapes(flatten(l), fcn);}

HW.gotPollPacket = function (l){
		HW.state.apressed = l[0] == 1;
		HW.state.bpressed = l[1] == 1;
		HW.state.recc = l[2];
	//	console.log("HW.gotPollPacket", l);
		HW.state.tilts = {x: array2float(l.slice(3, 5)), y: array2float(l.slice(5, 7)), 
								z: array2float(l.slice(7, 9)), w: array2float(l.slice(9, 11))}			
}

function array2float(l){
	var n = l[0] + (l[1] * 256);
	return (n<32768) ? n : n - 65536;
}