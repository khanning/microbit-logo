ShapeEditor = function() {};
ShapeEditor.gridsize = 5;
ShapeEditor.mindist = 10;
ShapeEditor.threshold = 150; //required min distance traveled to be considered swipe
ShapeEditor.allowedTime = 300; // max time
ShapeEditor.paintingShape = undefined;
ShapeEditor.shapes = [[0,0,4,0,0], [0,14,10,14,0], [31, 17,17,17, 31]];

//////////////////////
// Initialization
/////////////////////

ShapeEditor.init = function (){	
	ShapeEditor.initShapeBox ();
	ShapeEditor.displayAll();	
}

ShapeEditor.newSet = function (){	
	ShapeEditor.shapes = [[0,0,4,0,0], [0,14,10,14,0], [31, 17,17,17, 31]];
	ShapeEditor.unfocus();
	ShapeEditor.displayAll();	
}

ShapeEditor.initShapeBox = function (){	
	var div = gn("grid");
	div[eventDispatch["start"]] = ShapeEditor.startPaint;
	for (var i=0;  i < ShapeEditor.gridsize * ShapeEditor.gridsize; i++) {
		var dot = newHTML('div', 'griddot', div);
		var slot = newHTML('div', 'gridslot', dot);
		dot.color = 0;
	}
}	

ShapeEditor.displayAll  =  function (){
	var pal = gn('palette');
	while (pal.childElementCount > 0) pal.removeChild(pal.childNodes[0]);
	ShapeEditor.addNew();
	for (var i=0; i < ShapeEditor.shapes.length; i++) ShapeEditor.addThumb(i, ShapeEditor.shapes[i]);
}

ShapeEditor.addNew = function(){
  var parent = gn('palette');
  var tb = newHTML("div", "thumbslot", parent);
 	var num = newHTML("div", "thumbnum", tb);
 	var img = newHTML("div", "thumbimg newshape", tb);
 	img.textContent = "+";
 	tb.key = "new";
	tb[eventDispatch["start"]] = ShapeEditor.markstart;
	tb[eventDispatch["end"]] = ShapeEditor.doAction;
}

ShapeEditor.addThumb = function(i, list){
  var parent = gn('palette');
  var tb = newHTML("div", "thumbslot", parent);
  tb.id = "thumb_" + i;
 	var num = newHTML("div", "thumbnum", tb);
 	num.textContent = (i+1) +".";
 	var img = newHTML("div", "thumbimg", tb);
 	tb.type = 'thumb';
 	tb.key = i;
 	var	svg = SVGTools.create(img, img.offsetWidth - 6, img.offsetHeight - 6);
	ShapeEditor.displayShape(svg, list);
	tb[eventDispatch["start"]] = ShapeEditor.markstart;
	tb[eventDispatch["end"]] = ShapeEditor.doAction;
	return tb;
}

ShapeEditor.markstart =  function (e){
	ShapeEditor.startScroll = Events.getTargetPoint(e);
}

ShapeEditor.doAction =  function (e){
	var pt = Events.getTargetPoint(e);
	var dx = ShapeEditor.startScroll.x - pt.x; var dy =  ShapeEditor.startScroll.y - pt.y;
  if  (Events.distance(dx,dy) >  30) return;
	e.preventDefault();
	e.stopPropagation();
	var t = e.target;
	while (t && (t.key== undefined) && (t.parentNode != frame))  t = t.parentNode;
	if (t== undefined) return;
	if (t.key== undefined) return;
	let n =  t.key;
	Runtime.stopThreads(Code.scripts);
	switch(UI.toolmode) {
		case "clone":
			var shape =  ShapeEditor.shapes[n];
			ShapeEditor.shapes.push(shape);
			ShapeEditor.displayAll();	
			var list = ShapeEditor.editShape(ShapeEditor.shapes.length - 1);
			HW.shape = list;			
			UI.selectTool(undefined);
			break;
		case "scissors":
			ShapeEditor.shapes.splice(n,1);
			ShapeEditor.displayAll();	
			UI.selectTool(undefined);
			break;
		default:
			HW.shape = ShapeEditor.editShape(t.key);
			break;
	}
}

ShapeEditor.getShapeData =  function (data){  // prim
	let n = data.n ? data.n : 0;
	if ((data.dx == 0) && (data.dy == 0)) return ShapeEditor.shapes[n];
	else if (data.dx != 0) return ShapeEditor.interPolateHorizontal(n, data.dx)
	else return ShapeEditor.interPolateVertical(n, data.dy)
}	

ShapeEditor.interPolateHorizontal =  function (n, dx){  // prim
	dx = dx.mod(5)
	let lefts =  ShapeEditor.shapes[n]
	let rights =  ShapeEditor.shapes[(n + 1).mod(ShapeEditor.shapes.length)];
	let line1 = ((lefts[0]<<dx)&31)+ ((rights[0]>>(5-dx))&31);
	let line2 = ((lefts[1]<<dx)&31)+ ((rights[1]>>(5-dx))&31);
  let line3 = ((lefts[2]<<dx)&31)+ ((rights[2]>>(5-dx))&31);
  let line4 = ((lefts[3]<<dx)&31)+ ((rights[3]>>(5-dx))&31);
  let line5 = ((lefts[4]<<dx)&31)+ ((rights[4]>>(5-dx))&31);
  return [line1,line2,line3,line4,line5];
}	

ShapeEditor.interPolateVertical =  function (n, dy){  // prim
	dy = dy.mod(5)
	let down = ShapeEditor.shapes[n]
 	let up = ShapeEditor.shapes[(n-1).mod(ShapeEditor.shapes.length)];
 	let newshape = up.concat(down)
 	return newshape.slice(5-dy,(5-dy) + 5)
}


//////////////////////////////
// Draw shape in svg
// Either as the blocks's icon
// or as the shape
////////////////////////////////

ShapeEditor.displayShape= function(svg, list){
	var states = ShapeEditor.convertRowToState(list);
	var t = "translate(" + 3  + " " + 3 + ")";
	var g = SVGTools.addChild(svg, "g", {transform: t});
	ShapeEditor.drawShape(states, g, 12 , 2.5);
}

ShapeEditor.drawShape = function (array, g, spacing, size){	
	for (var y=0; y < ShapeEditor.gridsize; y++) {	
		for (var x=0; x < ShapeEditor.gridsize; x++) {
			var i = x + y * ShapeEditor.gridsize;
		 	var val  = i < array.length ? array[i] : 0;
 			var c = val == 1 ? "#DD1A22" : "#cccccc";
			ShapeEditor.createDot(g,  x, y, spacing, size, c);
		}
	}
}

ShapeEditor.createDot = function(g, x, y, spacing, size, c){
	var attr = {fill: c, opacity: 0.75, stroke:"#000000", 
			"stroke-miterlimit": 10, "stroke-opacity": 0.2,  r: size,
			cx: size + x*spacing, cy: size + y*spacing}
	SVGTools.addChild(g, 'circle', attr)
}


//////////////////////////////
//  Pattern functions
///////////////////////////

	ShapeEditor.unfocus = function (){
		ShapeEditor.clear();
		if (ShapeEditor.paintingShape) ShapeEditor.paintingShape.className = "thumbslot";
		ShapeEditor.paintingShape = undefined;
	}
	
	ShapeEditor.clear = function (){
		var pos  = 15
		for (var i=0; i < gn("grid").childElementCount; i++) {
			var kid = gn("grid").childNodes[i];
			kid.childNodes[0].style.background = "#cccccc"
			kid.color = 0;
		}
	}

	ShapeEditor.refresh = function (list){ 
 		var states = ShapeEditor.convertRowToState(list);
 		for (var i=0; i < gn("grid").childElementCount; i++) {
 			var kid = gn("grid").childNodes[i];
 			kid.color = states[i];
 			kid.childNodes[0].style.background = 	kid.color == 1 ? "#DD1A22" : "#cccccc";
 	 }
 	}

ShapeEditor.convertRowToState = function (list) {
	var result = new Array(ShapeEditor.gridsize*ShapeEditor.gridsize);
	for (var i=0; i < list.length; i++) {
			var val = getValue(list[i]);
			var y = i;
			for (var j = 0; j < val.length; j++){
				var x =  ShapeEditor.gridsize - 1 -j;
				var pos =  y*ShapeEditor.gridsize + x; 
				var isOn = val.charAt(x) == "1" ;
				result [pos] = 	isOn ? 1 : 0;
		}
	}
	return result;
	
		function getValue (n){
			var b = n.toString(2);
			while(b.length < 5) b= "0"+b;
			return b;
		}
}

ShapeEditor.convertState2Number = function (list) {
	var result = new Array(5);
	for (var i=0; i < result.length; i++) result[i] = "00000";
	for (var j=0; j < list.length; j++) {
			var val = list [j];
			var x = (j%5);
			var y = Math.floor(j / 5);
			var pos =  x + y*ShapeEditor.gridsize; 	
		//	var dy = ShapeEditor.gridsize - 1 -  y;
			var dx = ShapeEditor.gridsize - 1 -  x;
			result [y] = result[y].replaceAt(x, list[pos].toString());
	}
	for (var i=0; i < result.length; i++) result[i] = Number("0b"+result[i]);
	return result;
}


//////////////////////////
// Editor UI/UX
/////////////////////////

ShapeEditor.startPaint  = function(e) {
	e.preventDefault();
	e.stopPropagation();
	var t = e.target;
	ShapeEditor.lastPainted = undefined;
	if (t.className == "gridslot")  t = t.parentNode;
	if (t.className != "griddot") return;
	Runtime.stopThreads(Code.scripts);
	var isOn = t.color == 1;
	t.childNodes[0].style.background = isOn ?  "#cccccc" : "#DD1A22";
	t.color = isOn ?  0 : 1;
	ShapeEditor.lastPainted = t;
	window[eventDispatch["move"]] = ShapeEditor.switchColor;
	window[eventDispatch["end"]] = ShapeEditor.endPaint;
	ShapeEditor.update();
}

ShapeEditor.switchColor = function(e) {
	e.preventDefault();
	e.stopPropagation();
	Runtime.stopThreads(Code.scripts);
	var pt = Events.getTargetPoint(e);
	var t = document.elementFromPoint(pt.x, pt.y);
	if (t.className == "gridslot")  t = t.parentNode;
	if (t.className != "griddot") return;
	if (ShapeEditor.lastPainted == t) return;
	var isOn = t.color == 1;
	t.childNodes[0].style.background = isOn ?  "#cccccc" : "#DD1A22";
	t.color = isOn ?  0 : 1;
	ShapeEditor.lastPainted = t;
	ShapeEditor.update();
}

ShapeEditor.endPaint = function(e) {
	e.preventDefault();
	e.stopPropagation();
	Runtime.stopThreads(Code.scripts);
	window[eventDispatch["move"]] = undefined;
	window[eventDispatch["end"]] =  undefined;
	ShapeEditor.lastPainted = undefined;
	ShapeEditor.update();
}

ShapeEditor.update = function (){
	if (!ShapeEditor.paintingShape) ShapeEditor.editShape("new");
	var pos = Number(ShapeEditor.paintingShape.id.split("_")[1]);
	var val = ShapeEditor.convertState2Number(ShapeEditor.getShape());
	ShapeEditor.shapes[pos] = val;
	var states = ShapeEditor.convertRowToState(val);
	HW.shape = val;
	var svg = ShapeEditor.paintingShape.childNodes[1].childNodes[0];
	while (svg.childElementCount > 0) svg.removeChild(svg.childNodes[0]);
	var t = "translate(" + 3  + " " + 3 + ")";
	var g = SVGTools.addChild(svg, "g", {transform: t});
	ShapeEditor.drawShape(states, g, 12 , 2.5);
}

ShapeEditor.getShape = function (){
	var res = [];
	for (var i=0; i < gn("grid").childElementCount; i++) res.push(gn("grid").childNodes[i].color);
	return res;
}

ShapeEditor.editShape =  function (key){
	if (ShapeEditor.paintingShape) ShapeEditor.paintingShape.className = "thumbslot";
	if (key == "new") {
		var shape = ShapeEditor.createShape();
		key = shape.id.split("_")[1];
	}
	gn("thumb_"+key).className = "thumbslot selected";
	ShapeEditor.paintingShape  = gn("thumb_"+key);
	var list  = ShapeEditor.shapes[Number(key)] ?ShapeEditor.shapes[Number(key)] : [0,0,0,0,0];
	ShapeEditor.refresh(list);
	return list;
}

ShapeEditor.createShape = function (){
		var key = ShapeEditor.shapes.length;
		ShapeEditor.shapes.push([0,0,0,0,0]);	
		return ShapeEditor.addThumb(key, ShapeEditor.shapes[key]);
	}

