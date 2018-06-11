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
 
class Comms{

constructor(){
	this.RAM = 0x20003700
	this.FONT = 0x31000;
	this.PROCS = 0x30000;
	this.serialID = undefined;
	this.packet = [];
	this.respfcns = {};
}

download(bytes, shapes, fcn){
	var t = this;
	t.vmstopThenRun(next1);
	
	function next1(){t.downloadData(t.PROCS, bytes, next2);}
	
	function next2(){
		if(shapes.length==0) {
			if (fcn) fcn();
			return;
		}
		shapes.push(0xff);
		t.downloadData(t.FONT, shapes, fcn);
	}
}

downloadshapes(shapes, fcn){
	console.log ("downloadshapes", shapes)
	var t = this;
	t.vmstopThenRun(next1);
	
	function next1(){
		if(shapes.length!=0) {
			shapes.push(0xff);
			t.downloadData(t.FONT, shapes, fcn);
		}
		else if (fcn) fcn()
	}
}

downloadData(addr, data, fcn){
	var t = this;
	t.flasherase(addr, dlram);

	function dlram(){
		if(data.length>0){
			var slice = data.slice(0,128);
			t.ramwrite(t.RAM, slice, dlflash);
		} 
		else if(fcn) fcn();
	}

	function dlflash(){
		var len = Math.min(data.length,128);
		t.flashwrite(t.RAM,addr,len,dlram);
		addr+=128;
		data=data.slice(128);
	}
}	


ccrun(l,fcn){
	var t = this;
	var stack,vm;
	t.vmstopThenRun(next);

	function next(){
		var cmd = [].concat(0xf8,l.length,l);
		t.sendReceive(cmd);
	}

}

vmstopThenRun(fcn){
	var t = this;
	t.sendl([0xf9]);		//stop the vm if running
	setTimeout(next1, 300);

	function next1(){chrome.serial.flush(t.serialID, fcn);}
}

flasherase(addr,fcn){
	var cmd = [].concat([0xfb], this.fourbytes(addr));
	this.sendReceive(cmd,fcn);
}

flashwrite(src, dst, count, fcn){
	var cmd = [].concat([0xfc], this.fourbytes(src), this.fourbytes(dst), this.twobytes(count));
	this.sendReceive(cmd,fcn);
}

ramwrite(addr,l,fcn){
	var cmd = [].concat([0xfd], this.fourbytes(addr), l.length, l);
	this.sendReceive(cmd,fcn);
}

rread(addr,len,fcn){
	var cmd = [].concat([0xfe], this.fourbytes(addr), len);
	this.sendReceive(cmd,fcn);
}

twobytes(n){return [n&0xff, (n>>8)&0xff];}
fourbytes(n){return [n&0xff, (n>>8)&0xff, (n>>16)&0xff, (n>>24)&0xff];}
	
sendReceive(l, fcn){
//	console.log('sending:',l);
	if(fcn) this.respfcns[l[0]] = fcn;
	this.sendl(l);
}

sendl(l){
//	console.log ("sendl " + l.join(' '))
	chrome.serial.send(this.serialID, new Uint8Array(l), ()=>{});
}

openSerialPort(fcn){
	var t = this;
	chrome.serial.getDevices(gotDevices);
	
	function gotDevices(devices){
		for(var i in devices){
			var d = devices[i];
//			console.log(d, validDevice(d));
			if(!validDevice(d)) continue;
			chrome.serial.connect(d.path, {bitrate: 19200}, connected);
			return;
		}
		fcn(null)
	}

	function validDevice(d){
		if(d.path.indexOf('cu.usbmodem')!=-1) return true;
		if(d.path.indexOf('ttyACM')!=-1) return true;
		if((d.productId==0x0204)&&(d.vendorId==0x0d28)) return true;
		return false;
	}


	function connected(r){
//		console.log(r);
		t.serialID = r.connectionId;
		t.packet = [];
		t.respfcns = {};
		console.log('connected');

		if (fcn) {
			fcn(t.serialID)
		}
	}
}
		
onrecc(r){
	var t = HW.comms;
	var l = Array.from(new Uint8Array(r.data));
	for(var i in l) gotChar(l[i]);

	function gotChar(c){
		if((t.packet.length==0)&&(c>=0xf0)) t.packet.push(c);
		else if(c==0xed){
			if(t.packet.length==t.packet[1]+2) handlePacket(t.packet);
			t.packet = [];
		} else t.packet.push(c);
	}

	function handlePacket(p){
		var type = p[0];
		var data = p.slice(2);
		if(type==0xf0) HW.gotString(String.fromCharCode.apply(null, data));
		if(type==0xf5) HW.gotPollPacket(data);
		else {
//				console.log('received:',p);
			if(t.respfcns[type]){
				t.respfcns[type](data);
				delete t.respfcns[type];
			}
		}
	}
}
}


