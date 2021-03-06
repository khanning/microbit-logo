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
 
HW = function(){}

HW.requiredFW = "1.13";
HW.compiler = new Compiler();
HW.comms = new Comms();

HW.state = {acount:0, bcount:0, apressed: false, bpressed: false, abpressed: false, 
						recc: 255, tilts: {x: undefined, y: undefined, z: undefined, w: undefined}};
HW.shape = [0,0,0,0,0];
HW.messages = [];
HW.brightness = 100;
HW.timeout = undefined;
 	
HW.setup = function (){	
	chrome.serial.onReceive.addListener(HW.comms.onrecc);
	chrome.serial.onReceiveError.addListener(HW.onReceiveError);
	HW.reopen();
}

HW.reopen = function(){
	chrome.serial.getConnections(closeStrayPorts);
 	gn("microbitstate").className = "microbit connecting"
 	HW.comms.openSerialPort(doNext)
 	
 	function doNext(port){
 		if (!port) whenDone("fail")
 		else  whenDone()
 	}
 	
 	function whenDone(str){
 		if (str=="fail") gn("microbitstate").className = "microbit fail";
 		else HW.fetchVersionNumber();
 		setTimeout(Runtime.startTimer, 500)	
 	}	
 	
 	function showversion (l){gn('fwversion').textContent =  l.join(".");}

 	function closeStrayPorts(l){
 		for(var i=0;i<l.length;i++) HW.serialDisconnect(l[i].connectionId);
 	}
}

HW.serialDisconnect = function (id, fcn){
	chrome.serial.disconnect(id, (res)=>{
		if(!chrome.runtime.lastError) console.log('closing', id, res);
		if (fcn) fcn();
	})
}

HW.fetchVersionNumber = function (){	
	if (HW.timeout) clearTimeout (HW.timeout)
	HW.timeout =  setTimeout (notTheRightHex, 1000);
  setTimeout (function () {HW.getVersion(showversion);}, 520);
 
 function notTheRightHex(){ 		
 	if (!HW.comms.serialID)	return;
 	else HW.serialDisconnect(HW.comms.serialID, function (){gn("microbitstate").className = "microbit badhex";});
 	HW.comms.serialID = undefined;
 }	
 
 function showversion (l){
  if (HW.timeout) clearTimeout (HW.timeout);
 	HW.timeout = undefined;
 	if (l == 'fail') gn("microbitstate").className =  "microbit fail";
 	else {
 		let version = l.join(".");
 		if (HW.requiredFW != version) notTheRightHex();
 		else gotTheRightHex(version);
 		}
 	}

 function gotTheRightHex(version){ 
	 gn("microbitstate").className = "microbit ok";
	 gn('fwversion').textContent =  version;
 }
}

HW.onReceiveError = function (err){
	HW.comms.serialID = undefined;
	HW.state = {acount:0, bcount:0, apressed: false, bpressed: false, abpressed: false, 
						  recc: 255, tilts: {x: undefined, y: undefined, z: undefined, w: undefined}};
	Runtime.stopThreads(Code.scripts);
	console.log ("onReceiveError", err);
	gn("microbitstate").className = "microbit fail";
	gn('fwversion').textContent = '';
}

HW.gotString = function (str) {console.log ("HW.gotString:", str);}

HW.poll = function () {
//	console.log ("polling");
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
//	console.log ('broadcast',HW.messages )
	let data  = [].concat([0xf4], HW.messages.length, HW.messages);
	if (HW.comms.serialID) HW.comms.sendl(data);
	HW.messages = [];
}

HW.run = function (l, fcn){HW.compiler.runCommandLine(l, fcn);}
HW.doDownload = function (str){HW.compiler.downloadProcs(str);}

HW.downloadshapes = function(l, fcn){HW.comms.downloadshapes(flatten(l), fcn);}

HW.gotPollPacket = function (l){
	let aPressed = l[0] == 1;
	let bPressed = l[1] == 1;
	if (aPressed) HW.state.acount++;
	else HW.state.acount=0;
	if (bPressed) HW.state.bcount++;
	else HW.state.bcount=0;
	let isBoth = ((HW.state.acount>0)&&(HW.state.acount<3)&&(HW.state.bcount>0)&&(HW.state.bcount<3));
	if (isBoth){
		HW.state.acount=4;
		HW.state.bcount=4;
		HW.state.abpressed=true;		
	}
	else HW.state.abpressed=false;
	HW.state.apressed = (HW.state.acount==3);
	HW.state.bpressed = (HW.state.bcount==3);
	HW.state.astate = aPressed;
	HW.state.bstate = bPressed;
	HW.state.recc = l[2];
//	console.log("HW.gotPollPacket", JSON.stringify(HW.state));

	HW.state.tilts = {x: array2float(l.slice(3, 5)), y: array2float(l.slice(5, 7)), 
							z: array2float(l.slice(7, 9)), w: array2float(l.slice(9, 11))}		
}

HW.getVersion = function (doNext){
	if (!HW.comms.serialID)  doNext ('fail')
	else HW.comms.sendReceive([0xff], doNext);
}

function array2float(l){
	var n = l[0] + (l[1] * 256);
	return (n<32768) ? n : n - 65536;
}
