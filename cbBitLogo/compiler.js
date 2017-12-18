var primlist = 
 ['stop','c',0,   'output','c',1,   'call','c',1,   'run','c',1,   'runmacro','c',1, 
  'repeat','c',2,   'loop','c',1,   'if','c',2,   'ifelse','c',3,   'waituntil','c',1, 
  'gwrite','c',2,   'gread','r',1, 
  '+','r',-1,  '-','r',-1,   '*','r',-1,   '/','r',-1,   '%','r',-1,   'random','r',1, 
  'extend','r',1,   'extendb','r',1, 
  '=','r',-1,   '!=','r',-1,   '>','r',-1,   '<','r',-1, 
  'and','r',-1,   'or','r',-1,   'xor','r',-1,  'not','r',1,   'lsh','r',2, 
  'readb','r',1,   'writeb','c',2,   'readh','r',1,   'writeh','c',2,   'read','r',1,   'write','c',2, 
  'sp','r',0];

var extlist = 
 ['print','c',1,   'prh','c',1,   'prhb','c',1,   'prhh','c',1,   
  'prs','c',1,   'prf','c',2, 
  'dots','c',1,   'dprint','c',2,   
  'char','c',1,   'shape','c',1,   'clear','c',0,   'setbrightness','c',1, 
  'flashwrite','c',2,   'flasherase','c',1, 
  'resett','c',0,   'timer','r',0,   'ticks','r',0,   'mwait','c',1, 
  'buttona','r',0,   'buttonb','r',0, 
  'accx','r',0,   'accy','r',0,   'accz','r',0, 
  'startticker','c',1,   'stopticker','c',0, 
  'send','c',1,   'recv','r',0, 
  'nextshape','c',0,  'doton','c',2,  'dotoff','c',2];


class Compiler {


/////////////////////////////////
// 
// Entry Points
//
/////////////////////////////////
runCommandLine(str){
	this.pc = 0;
	try {
		this.thisproc = undefined;
		var compiledtokens = this.compileCommands(parse(str));
		console.log(compiledtokens);
		var code = this.encodeItems(compiledtokens);
		code.push(0);
		console.log(code);
 		if(comms.serialID) comms.ccrun(code);
 	} catch (e) {println(e);}
}

downloadProcs(str){
	this.pc = this.vectorlen;
	try {
		this.setup();
		var bytes = this.compileProcs(str);
		console.log(bytes);
		if(comms.serialID) comms.download(bytes, compiler.shapes, ()=>{println('downloaded.')});
 	} catch (e) {println(e);}
}


/////////////////////////////////
// 
// Procedure Compiler
//
/////////////////////////////////

compileProcs(str){
	var t = this;
	var tk = new Tokenizer(str);
	while(!tk.eof()) onePass1Command();
	console.log(t);
	for(var i in t.procnames) compileProcBody(t.procnames[i]);
	return [].concat(t.vectors(), t.encodeProcs());

	function onePass1Command(){
		var sol = tk.offset;
		var parsed = parse(tk.nextLine());
		if(parsed.length==0) return;
			if(parsed[0]=='to') parseTo();
			else if(parsed[0]=='shapes') parseShapes();
			else if(parsed[0]=='global') parseGlobal();
		
		function parseTo(){
			var name = parsed[1];
			var proc = {};
			parseTitleLine();
			proc.type = 'ufun';
			proc.len = 3;
			proc.nargs = parsed.length-2;
			proc.body = gatherBody();
			proc.outputs = proc.body.match(/(^|\s)output\s/);
			t.oblist[name] = proc;
			t.procnames.push(name);

			function parseTitleLine(){
				if(parsed.length==1) throw '"to" needs to be followed by a name'; 
				if((typeof parsed[1])!='string') throw parsed[1]+' can\'t be used as a name'; 
				proc.args = [];
				proc.locals = [];
				var args = parsed.slice(2);
				for(var i in args){
					var arg = args[i];
					if((typeof arg)!='string') throw '"'+arg.toString().replace(',',' ')+'" can\'t be used as an input name'; 
					if(arg[0]!=':') throw '"'+arg+'" needs a ":" to be an input';
					t.oblist[arg] = {type: 'getlocal', outputs: true};
					t.oblist['set'+arg] = {type: 'setlocal', outputs: false};
					proc.args.push(arg); 
				}
			}

			function gatherBody(){
				var res = [];
				while(true){
					if(tk.eof()) return res;
					var line = tk.nextLine();
					if(line=='end') return res;
					res = res+line+'\n';
				}
			}
		}
		
		function parseGlobal(){
			backup();
			var globals = tk.readToken();
			for(var i in globals) setupGlobal(globals[i]);
		}
		
		function parseShapes(){
			backup();
			t.shapes = t.shapes.concat(tk.readToken().map(shapeNum));

			function shapeNum(s){
				var res = 0;
				s.split('').map(function(c){res=res*2+((c=='x')?1:0);});
				return res;
			}
		}
		
		function backup(){tk.offset=sol; tk.readToken();}
	}
	
	function compileProcBody(name){
		var proc = t.oblist[name];
		t.thisproc = name;
		proc.addr = t.pc;
		t.pc += 2;
		proc.items = t.compileCommands(parse(proc.body+'stop\n'));
	}

}

	

/////////////////////////////////
// 
// Vectors
//
/////////////////////////////////

vectors(){
	var t = this;
	var res = [];
	for(var i=0;i<t.vectorlen;i++) res.push(0);
	setupVector('on-tick', 0);
	setupVector('on-buttona', 4);
	setupVector('on-buttonb', 8);
	setupVector('on-recv', 12);
	return res;

	function setupVector(name, offset){
		var proc = t.oblist[name];
		if(proc==undefined) return;
		var addr = proc.addr;
		res[offset] = 8
		res[offset+1] = addr&0xff;
		res[offset+2] = (addr>>8)&0xff;
	}
}

/////////////////////////////////
// 
// Command Compiler
//
/////////////////////////////////

compileCommands(list){
	var t = this;
	var res = [];
	while(list.length>0) compileItem(list.shift());
	return res;

	function compileItem(item, inputfor){
		var type = typeof item;
		if(type=='number') compileNumber(item);
		else if(type=='object') compileList(item);
		else if(item.substring(0,1)=="'") compileString(item);
		else if(item.substring(0,1)==':') compileLocalGet(item);
		else if(item.substring(0,4)=='set:') compileLocalSet(item);
		else if(item=='let') compileLet();
		else compileSymbol(item);
		var command = (t.oblist[item])&&!t.oblist[item].outputs;
		if((!command)&&(inputfor==undefined)) throw 'you don\'t say what to do with '+item+thisProc();
		if(inputfor&&command) throw item+' doesn\'t output to '+inputfor+thisProc();
	}

	function compileNumber(n){
		if((n<256)&&(n>=0)) addAndCount(['byte',n],2);
		else addAndCount(['number',n],5)
	}

	function compileList(l){
		addAndCount(['list',0],3)
		var oldlist = list;
		list = l;
		while(list.length>0) compileItem(list.shift());
		list = oldlist;
		addAndCount(['eol',0],1)
	}

	function compileString(str){
		str = str.substring(1);
		str = str.substring(0,str.length-1);
		str = str.replace('\\n', '\n');
		str += String.fromCharCode(0);
		addAndCount(['string',str],str.length+3);
	}
	
	function compileLocalGet(name){
		var index = localIndex(name);
		if(index==undefined) throw name+' has no value'+thisProc();
		addAndCount(['localget',index],2);
	}

	function compileLocalSet(setname){
		var name = setname.substring(3);
		var index = localIndex(name);
		if(index==undefined) throw name+' has no value'+thisProc();
		argloop(1, setname);
		addAndCount(['localset',index],2);
	}

	function compileSymbol(name){
		var sym = t.oblist[name];
		if(sym==undefined) throw 'I don\'t know how to '+name+thisProc();
		else if(sym.type=='global') compileGlobalGet(sym.index);
		else if(sym.type=='setglobal') compileGlobalSet(sym.index);
		else compileCallSym();

		function compileCallSym(){
			argloop(sym.nargs, name);
			addAndCount([sym.type, name], sym.len);
		}

		function compileGlobalGet(index){
			addAndCount(['byte',index],2);
			addAndCount(['prim','gread'],1);
			infixCheck();
		}

		function compileGlobalSet(index){
			addAndCount(['byte',index],2);
			argloop(1, name);
			addAndCount(['prim','gwrite'],1);
		}

	}

	function argloop(nargs, name){
		for(var i=0;i<nargs;i++) {
			if(list.length==0) throw name+' needs more inputs'+thisProc();
			compileItem(list.shift(),name);
			infixCheck();
		}
	}

	function infixCheck(){
		var infixnext = (list.length>0)&&(t.oblist[list[0]])&&(t.oblist[list[0]].nargs==-1);
		if(!infixnext) return;
		var isym = list.shift();
		if(list.length==0) throw isym+' needs more inputs'+thisProc();
		compileItem(list.shift(),isym);
		addAndCount(['prim',isym],1);
		infixCheck();
	}

	function localIndex(name){
		if(t.thisproc==undefined) return undefined;
		var args = t.oblist[t.thisproc].args;
		var index = args.indexOf(name);
		if(index!=-1) return args.length-1-index;
		var locals = t.oblist[t.thisproc].locals;
		index = locals.indexOf(name);
		if(index==-1) return undefined;
		return 0xff&-index-1;
	}

	function thisProc(){
		if(t.thisproc) return ' in '+t.thisproc;
		else return '';
	}

	function addAndCount(x,n){
		res.push([t.pc].concat(x));
		t.pc+=n;
	}

// Special cases

	function compileLet(){
		if(t.thisproc==undefined) throw 'let can only be used in a procedure';
		var old = list;
		list = old.shift();
		while(list.length>0){
			var local = ':'+list.shift();
			t.oblist[local] = {type: 'getlocal', outputs: true};
			t.oblist['set'+local] = {type: 'setlocal', outputs: false};
			t.oblist[t.thisproc].locals.push(local); 
			compileLocalSet('set'+local);
		}
		list = old;
	}

}




/////////////////////////////////
// 
// Generate ByteCodes
//
/////////////////////////////////

encodeItems(items){
	var res = [];
	var lists = [];
	for(var i in items) this.encodeItem(items[i], res, lists);
	return res;
}

encodeProcs(){
	var res = [];
	var lists = [];
	for(var i in this.procnames){
		var proc = this.oblist[this.procnames[i]];
		var items = proc.items;
		res.push(proc.args.length);
		res.push(proc.locals.length);
		for(var i in items) this.encodeItem(items[i], res, lists);
	}
	return res;
}

encodeItem(i, res, lists){
	var val = i[2];
	switch(i[1]){
	case 'byte':
		res.push(1);
		res.push(val&0xff);
		break;
	case 'number':
		res.push(2);
		res.push(val&0xff);
		res.push((val>>8)&0xff);
		res.push((val>>16)&0xff);
		res.push((val>>24)&0xff);
		break;
	case 'list':
		res.push(3);
		lists.push(res.length);
		res.push(0);
		res.push(0);
		break;
	case 'string':
		res.push(3);
		res.push(val.length&0xff);
		res.push((val.length>>8)&0xff);
		val.split('').map(function(x){res.push(x.charCodeAt(0));});
		break;
	case 'eol':
		addEOL(4);
		break;
	case 'localget':
		res.push(6);
		res.push(val);
		break;
	case 'localset':
		res.push(7);
		res.push(val);
		break;
	case 'prim':
		res.push(this.oblist[val].code);
		break;
	case 'ufun':
		res.push(8);
		res.push(this.oblist[val].addr&0xff);
		res.push((this.oblist[val].addr>>8)&0xff);
		break;
	case 'ext':
		res.push(this.oblist[val].outputs?11:10);
		res.push(this.oblist[val].code);
		break;
	default: 
		res.push(i[1]);
		break;
	}

	function addEOL(n){
		res.push(n);
		var offset = lists.pop();
		var len = res.length-offset-2;
		res[offset] = len&0xff;
		res[offset+1] = (len>>8)&0xff;
	}
}


/////////////////////////////////
// 
// Setup
//
/////////////////////////////////

setupGlobal(name){
	this.oblist[name] = {type: 'global', index: this.nextglobal, outputs: true};
	this.oblist['set'+name] = {type: 'setglobal', index: this.nextglobal, outputs: false};;
	this.nextglobal++;
}


setup(){
	var t = this;
	this.vectorlen = 32;
	this.oblist = {};
	this.nextglobal = 0;
	this.procnames = [];
	this.shapes = [];
	setupBuiltIns('prim', primlist, 12, 1);
	setupBuiltIns('ext', extlist, 0, 2);
	this.oblist['let'] = {type: 'let', outputs: false};
	this.setupGlobal('box1');
	this.setupGlobal('box2');

	function setupBuiltIns(type, list, index, len){
		list = [].concat(list);
		while(list.length>0){
			var name = list.shift();
			var ops = list.shift()=='r';
			var nargs = list.shift();
			t.oblist[name] = {type: type, len: len, code: index++, nargs: nargs, outputs: ops};
		}
	}

}

}