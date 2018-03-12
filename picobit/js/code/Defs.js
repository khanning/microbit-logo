Defs = function(){}

	Defs.primtives =  {}
	
	Defs.workspaceAttributes = {
		comments: false,
		disable: false,
		collapse: false,
		media: 'assets/media/',
		readOnly: false,
		rtl: false,
		scrollbars: true,
		toolbox: null,   
		toolboxPosition: 'start',
		horizontalLayout: false,
		trashcan: false,
		sounds: true,
		zoom: {
			controls: true,
			wheel: true,
			startScale: 0.7,
			maxScale: 3,
			minScale: 0.10,
			scaleSpeed: 1.1
		},
		colours: {
			workspace: 'transparent',
			flyout: '#F0F0F0',
			scrollbar: '#D2D3D4',
			scrollbarHover: '#B2B3B4',
			toolboxHover: "#2BB8D8",
			insertionMarker: '#949494',
			insertionMarkerOpacity: 0.3,
			fieldShadow: 'rgba(0, 0, 0, 0.3)',
			dragShadowOpacity: 0.5
		}
	}

	Defs.categoriesNames = {
		"motion" : "Lights",
		"sensing" : "Sensing",
		"control" : "Control",
		"event" : "Events",
		"operators" : "Operators",
		"more" : "More Blocks"	
	}


	Defs.verticalBlocks = [	
	
		["clean", "c", "motion", "clean"],
		[ "---" ],
		["setshape", "c", "motion", "set shape %d.math_whole_number.num", 1],
		["nextshape", "c", "motion", "next shape"],
		["previousshape", "c", "motion", "previous shape"],  
		["scroll", "c", "motion", "scroll %c..scroll_option"],
		["doton", "c", "motion", "dot on %d.math_whole_number.x %d.math_whole_number.y", 0,0],
		["dotoff", "c", "motion", "dot off %d.math_whole_number.x %d.math_whole_number.y", 0, 0],
		["setbrightness", "c", "motion", "set brightness %d.lights_brightness.num", 100],
		["setpace", "c", "motion", "set setpace %d.math_positive_number.num", 0.5],
		
		["shape", "r", "motion", "shape"],
		[ "---" ],
	//	["onstart","s","control", "When @play clicked"],  
		["onbuttona","s","event", "When @icon clicked"],  
		["onbuttonb","s","event", "When @icon clicked"],  
		["onreceive","s","event", "when @icon %c..broadcast_option"],  
		["broadcast","c","event", "broadcast @icon to %c..broadcast_option"],  
		[ "---" ],
		["wait","c","control", "wait %d.math_positive_number.duration", 1],  
		["repeat","l","control", "repeat %d.math_whole_number.times", 2],
		["forever","l","control", "forever"], 
		["if","l","control", "if %b..condition"],	
		["ifelse","l","control", "ifelse %b..condition"],
		["waituntil","c","control", "wait until %b..condition"],
 		["repeatuntil","l","control", "repeat until %b..condition"],
 		["stop","c","control", "stop %c..stop_option"],
 		
		["apressed","r","sensing", "apressed"],  
		["bpressed","r","sensing", "bpressed"], 	
		["accx","r","sensing", "tilt"],  	
		["timer","r","sensing", "timer"],  	
		["resett","r","sensing", "resett"],  	
			
		["add","r","operators", "%d..num1 + %d..num2"],  			
		["subtract","r","operators", "%d..num1 - %d..num2"],  			
		["multiply","r","operators", "%d..num1 * %d..num2"],  			
		["divide","r","operators", "%d..num1 / %d..num2"],  	
		["modulo","r","operators", "%d..num1 mod %d..num2"],  					
		["random","r","operators", "pick random from %d..from to %d..to", 0, 100],  
		["---"],
		["lt","r","operators", "%d..operand1 < %d..operand2"],  		
		["equals","r","operators", "%d..operand1 < %d..operand2"],  		
		["gt","r","operators", "%d..operand1 < %d..operand2"],  		
		["and","r","operators", "%b..operand1 and %b..operand2"],  			
		["or","r","operators",  "%b..operand1 or %b..operand2"],  			
		["not","r","operators", "not %b..operand"],  			

		["definition", "s", "more", "Define %t..name", ""],		
		["procedure", "c", "more", "%t..name", ""],	
//		["print", "c", "more", "print %d..num", ""],	
		["box", "r", "more", "%s.varname", "box1"],	
		["setglobal", "c", "more", "set %m.variable %d..num", "0"],  
		["changeglobal", "c", "more", "change %m.variable %d..num", "1"]
	]

	
	Defs.getXML = (prims) => {
		Defs.argsKeys = {};
		Defs.primtives = Defs.getDefinitions(prims)
		Defs.primtives ["doClean"] = 	["doClean","s","event", "When @icon clicked"];
		var xml = document.createElement('XML');
		xml.setAttribute("id", "toolbox-categories"); 
		xml.style.display= "none";
		document.body.appendChild(xml);
		var cat = undefined;
		for (var i=0; i < prims.length; i++) {
			var prim = prims[i];
			if (prim[0] == "---") continue;
			var cattype = prim[2];
			var catname = Defs.categoriesNames [cattype];
			var c = Blockly.Colours[cattype].primary;
			var s = Blockly.Colours[cattype].secondary ; 
			if (!cat || (cat.getAttribute ("colour") != c)) {
				cat = document.createElement('category');
				cat.setAttribute("colour", c); 
				cat.setAttribute("secondaryColour", s); 	
				cat.setAttribute("name", catname); 
				if (cattype == "more") cat.setAttribute("custom", Blockly.MINE_CATEGORY_NAME); 
				xml.appendChild(cat);
			 }
			var nextgap =  i < prims.length - 1 ?  prims[i+1][0] == "---" ? 24 : 8 : 0;
			var gap =  (prim[1] == "s") ? 24 + nextgap : 8 + nextgap ;
			if (cattype == "more") Defs.specialBlocks(prim);
			else {
				var b = Defs.createBlock(prim, gap);
				if (cat) cat.appendChild(b); 
			}
		}
//		console.log (xml);
		return xml;
	}

		 Defs.specialBlocks = (prim)  => {
			var op = prim[0];
			var cat = "myblocks";
			var s = prim.concat();
			var values = s.slice(4).concat();
			Defs.argsKeys [cat+"_"+op] = {};
		//	console.log (op)
			switch (op) {
				case "box": Defs.argsKeys[cat +"_"+op] = {args: ["varname"], values: values}; break;
				case "definition": Defs.argsKeys [cat +"_"+op] = {args: ["arg0"], values: values}; break;
				case "procedure": Defs.argsKeys [cat +"_"+op] = {args: ["input0"], values: values}; break;
				case "setglobal": Defs.argsKeys [cat +"_"+op] = {args: ["variable", "num"], values: values}; break;
				case "changeglobal": Defs.argsKeys [cat +"_"+op] = {args: ["variable","num"], values: values}; break;	
			}
		}
		
		 Defs.getDefinitions = (prims)  => {
			var obj = {};
			for (var i=0; i < prims.length; i++) {
				if (prims[i][0] == "---") continue;
				obj[prims[i][0]] = prims[i];
			}
			return obj;
		}
		
	Defs.createBlock = (prim, gap) => {
			var op = prim[0];
			var cat = Defs.categoriesNames[prim[2]].toLowerCase();
			var b = document.createElement('block');
			b.setAttribute("type", cat +"_"+op );
			Defs.addDefaultValues(b, cat, prim);
			b.setAttribute('gap', gap);
			return b;
		}

	 Defs.getBlock = (prim, values) => {
			var op = prim[0];
			var cat =  prim[2];
			var b = document.createElement('block');
			b.setAttribute("type", cat +"_"+op );
			if (!values) Defs.addDefaultValues(b, prim);
			else {
				var specs = prim.concat();
				specs.splice(4);
				specs = specs.concat(values);
				Defs.addDefaultValues(b, specs);
			}
			return b;
		}

		Defs.addDefaultValues = (b, cat, spec) => {
			if (!spec[3]) return;
			var s = spec.concat();
			var specs = s[3].split(" ");
			var values = s.slice(4).concat();
			var items = [];
			var n =0;
			var prim =  b.getAttribute("type");
			Defs.argsKeys [prim] = {values: values};
			var args = [];  
			for (var i = 0; i < specs.length; i++){
				var s = specs[i];
				if (s == "") continue;	
				if ((s.length >= 2) && (s.charAt(0) == "%")) {
					var key = s.split(".")[2];
					args.push (key);
					Defs.setArgumentDefinition(b, cat, s, values[n]);
					n++;
				}
			}
			Defs.argsKeys [prim].args = args;
			return items;
		}

	Defs.setArgumentDefinition = (b, cat, s, val) =>{	
		var type = s.charAt(1);		
		var a =  []
		a = a.concat(val);
		var key = s.split(".")
		switch (type){
			case "d": Defs.addMathNumber(b, key[1], key[2], a[0]); break;
			case "b": break;	  	  
			case "t": Defs.addText(b, key[1], key[2],  a[0]); break;	  
			case 'm': Defs.addDropDown(b,cat, key[1], key[2],  a[0]); break;
	//		case 'c': Defs.addDropImageDown(b, key[1], key[2],  a); break;
			default: break;
		}
	}
	
		Defs.addDropDown  = (b, cat, type, name, value)=>{	
		//	console.log ("addDropDown", b, cat, name, value)
			type =  type == "" ? cat+"_"+name : type
			value  = value == "?" ? Defs.getMotorValue(name, value) : value
			var val = document.createElement('value');
			b.appendChild(val); 
			val.setAttribute("name", name.toUpperCase());
			var shadow = document.createElement('shadow');
			val.appendChild(shadow); 
			shadow.setAttribute("type", type);
			var field = document.createElement('field');
			shadow.appendChild(field); 
			field.setAttribute("name",name.toUpperCase());
			field.textContent= value;
		}
		
		Defs.getMotorValue = (name, value)=>{	
				switch (name){
					case "singleportmenu":
					case "portmenu":
						return HW.getFirstAvailableMotor()
						break;
					case "portmenutwo":
						return HW.getTwoMotors ();
						break;
				}
			}
		
		Defs.addDropImageDown = (b,  type, name, value)=>{			
			var val = document.createElement('value');
			b.appendChild(val); 
			val.setAttribute("name", name.toUpperCase());
			var shadow = document.createElement('shadow');
			val.appendChild(shadow); 
			shadow.setAttribute("type", value[0]);
			var field = document.createElement('field');
			shadow.appendChild(field); 
			field.setAttribute("name",name.toUpperCase());
			field.textContent= value[1];
		}

		Defs.addText  = (b, type, name, value)=>{		
			type  = type == "" ? "text" : type
			var val = document.createElement('value');
			b.appendChild(val); 
			val.setAttribute("name", name.toUpperCase());
			var shadow = document.createElement('shadow');
			val.appendChild(shadow); 
			shadow.setAttribute("type", type);
			var field = document.createElement('field');
			shadow.appendChild(field); 
			field.setAttribute("name", String('num').toUpperCase());
			field.textContent= value;
		}

		Defs.addMathNumber = (b,type, name, value)=>{	
			type  = type == "" ? "math_number" : type
			var val = document.createElement('value');
			b.appendChild(val); 
			val.setAttribute("name", name.toUpperCase());
			var shadow = document.createElement('shadow');
			val.appendChild(shadow); 
			shadow.setAttribute("type", type)
			var field = document.createElement('field');
			shadow.appendChild(field); 
			field.setAttribute("name", String('num').toUpperCase());
			field.textContent= value;
		}

``