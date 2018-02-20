class Comms{

constructor(){
	this.RAM = 0x20003700
	this.FONT = 0x31000;
	this.PROCS = 0x30000;

	this.monstr = '';
	this.packetcallback = null;
}

download(bytes, shapes, fcn){
	var t = this;
	t.vmstopThenRun(next1);
	
	function next1(){t.downloadData(t.PROCS, bytes, next2);}
	
	function next2(){
		if(shapes.length==0) {if(fcn) fcn();}
		else {
			shapes.push(0xff);
			t.downloadData(t.FONT, shapes, fcn);
		}
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
	t.vmstopThenRun(next1);

	function next1(){t.getaddrs(next2);}

	function next2(a){
		stack = a[0]+7*512;
		vm = a[1];
		t.ramwrite(stack+0x1c0,l,next3);
	}

	function next3(){
		var header = [].concat(t.fourbytes(stack+20),t.fourbytes(vm),t.fourbytes(stack+0x1c0),0,0,0,0,0,0,0,0);
		t.ramwrite(stack,header,fcn);
	}

}

vmstopThenRun(fcn){
	var t = this;
	t.sendl([0xf8]);		//stop the vm if runninf
	setTimeout(next1, 300);

	function next1(){chrome.serial.flush(t.serialID, fcn);}
}

flasherase(addr,fcn){
	var cmd = [].concat([0xfa], this.fourbytes(addr));
	this.sendReceive(cmd,1,fcn);
}

flashwrite(src, dst, count, fcn){
	var cmd = [].concat([0xfb], this.fourbytes(src), this.fourbytes(dst), this.twobytes(count));
	this.sendReceive(cmd,1,fcn);
}

ramwrite(addr,l,fcn){
	var cmd = [].concat([0xfd], this.fourbytes(addr), this.twobytes(l.length), l);
	this.sendReceive(cmd,l.length,fcn);
}

rread(addr,len,fcn){
	var cmd = [].concat([0xfe], this.fourbytes(addr), this.twobytes(len));
	this.sendReceive(cmd,len,fcn);
}

getaddrs(fcn){
	this.sendReceive([0xf7],8,next1);

	function next1(l){fcn([l[0]+(l[1]<<8)+(l[2]<<16)+(l[3]<<24),l[4]+(l[5]<<8)+(l[6]<<16)+(l[7]<<24)]);}
//	function next1(l){fcn(l);}
}

twobytes(n){return [n&0xff, (n>>8)&0xff];}
fourbytes(n){return [n&0xff, (n>>8)&0xff, (n>>16)&0xff, (n>>24)&0xff];}
	
sendReceive(l, n, fcn){
	var rec = {response: [], rlen: 0, fcn: fcn, t: this};
	this.packetcallback = (c)=>{srrecc(c,rec);}
//	console.log('sending: ',l);
	this.sendl(l);

	function srrecc(c,rec){
		rec.response.push(c);
//		console.log('received:',l,rec.response.length,n,);
		if(rec.response.length!=n) return;
		rec.t.packetcallback=null; 
		if(rec.fcn) rec.fcn(rec.response);
	}
}

sendl(l){
	chrome.serial.send(this.serialID, new Uint8Array(l), ()=>{});
}


openSerialPort(){
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
	}

	function validDevice(d){
		if(d.path.indexOf('cu.usbmodem')!=-1) return true;
		if(d.path.indexOf('ttyACM')!=-1) return true;
		if((d.productId==0x0204)&&(d.vendorId==0x0d28)) return true;
		return false;
	}


	function connected(r){
//		console.log(r);
		if(t.serialID==undefined) chrome.serial.onReceive.addListener(onrecc);
		t.serialID = r.connectionId;
		println('connected');

		function onrecc(r){
			var l = Array.from(new Uint8Array(r.data));
			for(var i in l) {
				if (t.packetcallback!=null) t.packetcallback(l[i]);
				else gotChar(l[i]);
			}

			function gotChar(c){
				if(c==10){println(t.monstr); t.monstr='';}
				if(c<32) return;
				if(c==207) return;
				t.monstr+= String.fromCharCode(c);
			}
		}
	}
}

}