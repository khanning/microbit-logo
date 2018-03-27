Doc = function() {};

/////////////////////////////////////////////////////////////////
// tool For documentation and data to svg rendering
// keep the savesvg,php on the folder for testing purposes
/////////////////////////////////////////////////////////////////

Doc.xmlns =  "http://www.w3.org/2000/.svg";
Doc.xmlnslink = "http://www.w3.org/1999/xlink";

Doc.print = function (){
	var svg = SVGTools.create(undefined, 792, 612)
	Doc.printStacks(svg)
	var p =  SVGTools.createGroup(svg)
	var mtx ="matrix( 1 0 0 1 " + 572 + " " + 0+")" ;
	p.setAttribute("transform", mtx);	
	Doc.dumpShapes(p);
	let svgstr = (new XMLSerializer()).serializeToString(svg)
	Doc.saveContent (svgstr)
}


Doc.printStacks = function(svg){	
	let blocks = Code.workspace.svgBlockCanvas_;	
	for (let i=0; i < blocks.childElementCount; i++) {
		var rect = new Rectangle(200000,200000,0,0);
		var g = Doc.getStack(svg, blocks.childNodes[i], rect)
		let dx =  rect.x
		let dy = rect.y;
		var mtx ="matrix(0.5 0 0 0.5 " + (dx/2) + " " + (dy/2)+")" ;
		g.setAttribute("transform", mtx);	
		svg.appendChild(g)
	}

}

Doc.getStack = function(svg, p, rect){
	var g =  SVGTools.createGroup(svg)
	var pc = p.getAttribute('class')
	switch (p.tagName.toLowerCase()){
		case 'g':
			if (pc == 'blocklyIcon') {
				g.setAttribute("height", p.getAttribute("height"));
				g.setAttribute("width", p.getAttribute("width"));
				g.setAttribute("x", p.getAttribute("x"));
				g.setAttribute("y", p.getAttribute("y"));
			}
			break;
	}
	var mtx = new WebKitCSSMatrix(window.getComputedStyle(p).webkitTransform);
	let dx =  mtx.e
	let dy =  mtx.f;
	if (rect.x > dx)  rect.x = dx;
	if (rect.y > dy)  rect.y = dy;
	for (let i=0; i < p.childElementCount; i++ ) {
		let kid = p.childNodes[i];		
		if (kid.style.visibility == "hidden") continue;
	//	console.log (kid.tagName)
		switch (kid.tagName.toLowerCase()) {
			case 'path':
				 var elem = SVGTools.getCopy(kid);
				 g.appendChild(elem)
				break;
			case 'rect':	
				var elem = SVGTools.getCopy(kid);
				g.appendChild(elem)	
				break;		; 
			case 'image':	
				let icon = Doc.getImage(kid, p); 
				if (icon) g.appendChild(icon); 
				break;
			case 'text': g.appendChild(Doc.getText(kid, p)); break;
			case "g": 
				var grouprect = new Rectangle(200000,200000,0,0);
				var newblock =  Doc.getStack (g, kid, grouprect)
				var mtx ="matrix( 1 0 0 1 " + grouprect.x + " " + grouprect.y+")" ;
				newblock.setAttribute("transform", mtx);	
				break;
		}
	}
	var mtx ="matrix( 1 0 0 1 " + rect.x + " " + rect.y+")" ;
	g.setAttribute("transform", mtx);	
	return g;
}

Doc.getImage = function(kid, p)	{
	let name  = kid.getAttribute("xlink:href")
	if (!name) return null;
	var iconstr = Doc.icons[name]
	if (!iconstr) {
		console.warn ("Please add image", name)
	}
	if (!iconstr) return null;
	var icon = SVGTools.toObject(iconstr);
	var val = new WebKitCSSMatrix(window.getComputedStyle(kid).webkitTransform);
	var shouldScale  = name.indexOf ('sensing_microbit') > -1;
	var t =  shouldScale ?  "matrix( 0.75 0 0 0.75 " + val.e + " " + (val.f + 6.5)+")" :  "translate(" + val.e + ", " + val.f+")";
	icon.setAttribute("transform",t);	
	icon.setAttribute("height", kid.getAttribute("height"));
	icon.setAttribute("width", kid.getAttribute("width"));
	return icon
}
				
Doc.getText = function(kid, p){			
	let white  = 'fill: rgb(255, 255, 255); ';
	let black =  'fill: rgb(87, 94, 117); '
	var style = 'font-family: "Helvetica Neue", Helvetica, sans-serif; font-size: 16px; font-weight: 500;'
	var txt = SVGTools.getCopy(kid);
	var cn = kid.getAttribute('class')
	var pcn = p.getAttribute('class')
	var val = new WebKitCSSMatrix(window.getComputedStyle(kid).webkitTransform);
	console.log ("getText", cn, "---", pcn)
	switch (cn){
		case "blocklyText":
			style =  pcn == 'blocklyEditableText' ? black + style : white + style;	
			var t =  "translate(" + val.e + ", " + (val.f + 4)+")" 
			break;
		case "blocklyText blocklyEditableLabel":
		case "blocklyText blocklyDropdownText":
			style =  white + style;	
			var t =  "translate(" + val.e + ", " + (val.f + 4)+")" 
			break;		
	}
	txt.removeAttribute('class')
	if (txt.getAttribute('xmlns') != "") 	txt.removeAttribute('xmlns')
	txt.setAttribute("style", style)
	if (t) txt.setAttribute("transform",t);	
	return txt;
}
 
Doc.saveContent = function (str){		
	let name =  'noname.svg';                
	chrome.fileSystem.chooseEntry({type: "saveFile", suggestedName: name}, next1)
	function next1(fe){
		if(fe!=undefined) Doc.save(fe, str);
		else console.log ("cancelled")
	}
}

Doc.save = function (fe, content){
	var blob = new Blob([content], {type: 'plain/text'});
	fe.createWriter(next1);
	function next1(writer){
		writer.onwriteend = next2; 
		writer.write(blob);
	}
	function next2(){writer.onwriteend=undefined; writer.truncate(blob.size);}
}

Doc.create = function(parent, w,h){
	var el = document.createElementNS(Doc.xmlns,".svg");
	el.setAttributeNS(null, 'version', 1.1);
	if (w) el.setAttributeNS(null,'width',w);
	if (h) el.setAttributeNS(null, 'height', h);
	if (parent) parent.appendChild(el);
	return el;
}

Doc.saveShapes = function (){
	var p = SVGTools.create();	
	Doc.dumpShapes(p);
	Doc.saveContent((new XMLSerializer()).serializeToString(p));
}

Doc.roundRect = "M0.5,0.5M2.5,0.5A 2 2 0 0 1 4.5 -1.5L60.5,-1.5A 2 2 0 0 1 62.5 0.5L62.5,56.5A 2 2 0 0 1 60.5 58.5L4.5,58.5A 2 2 0 0 1 2.5 56.5z"
Doc.font= 'Lucida Grande';// 'Lucida Grande';
Doc.labelsize = 15;
Doc.argsize = 9;

Doc.dumpShapes = function (p){
	p.setAttributeNS(null,'width', 150 * 2);
	p.setAttributeNS(null, 'height',( 1 + (ShapeEditor.shapes.length / 2)) * 150 );
	var dotsize = 5;
	var palette = gn("palette")
	for (var i= 0; i < ShapeEditor.shapes.length; i++) {
		var dx = 5 + (i % 2) * 120;
		var dy = 5 + Math.floor (i / 2) * 80;
		var g = SVGTools.createGroup(p);
		var attr = {"transform": 'matrix(1 0 0 1 ' +  dx + " " + dy + ')'};
	 	for (var val in attr) g.setAttribute(val, attr[val]);
	 	
	 	Doc.addframe(g, 60,  60);	
		var attr = {"transform": 'matrix(1 0 0 1 ' + 0 + " "+ 12 +')',
		fill: "#8e8e8e", "font-family": Doc.font, "font-size": 12, "font-weight": "bold"};
		var kid = SVGTools.addChild(g, "text", attr);
		kid.textContent = (i+1) + ".";
		var sh = SVGTools.createGroup(g);
		var attr = {"transform": 'matrix(1 0 0 1 23 -1)'};
	 	for (var val in attr) sh.setAttribute(val, attr[val]);
	 	var obj  = palette.childNodes[i];
	 	if (!obj) return;
	 	obj = obj.childNodes[1].childNodes[0]
		let shape = SVGTools.getCopy(obj)
		sh.appendChild(shape.childNodes[0])
	}
}
	 
Doc.addframe = function (g, w, h){
	var shape = document.createElementNS(SVGTools.xmlns, "path");	
	g.appendChild(shape);
	let attr = {'d': Doc.roundRect, "transform": 'matrix(1 0 0 1 20 0)', fill: "#FFFFFF", "stroke-width": 1, stroke: "#d3d4d5"};	
	for (var val in attr) shape.setAttribute(val, attr[val]);
}	

Doc.saveStage = function (name){
	var p = SVGTools.create();
	Doc.dumpStage(p);
	SVGTools.save(name + ".svg", (new XMLSerializer()).serializeToString(p));
}

Doc.dumpStage = function (p){
	var w =	gn("stage").offsetWidth - 14;
	var h = gn("stage").offsetHeight - 8;
	p.setAttributeNS(null,'width', w);
	p.setAttributeNS(null, 'height', h);
	var g = SVGTools.createGroup(p);
	var attr = {"transform": 'matrix(1 0 0 1 0 0)', width: w, height: h, fill: "#f2f2f2"};
	var  bkg = SVGTools.addChild(g, "rect", attr);
	var div = gn("grid");
	for (var i=0; i <div.childElementCount; i++){
		var kid = div.childNodes[i];
		var radius = kid.offsetWidth / 2;
		var color = kid.style.background;
 		var x = kid.offsetLeft + radius - 2;
 		var y = kid.offsetTop + radius - 2;
 		var attr = {"transform": 'matrix(1 0 0 1 ' +x + " "+  y +')', r: radius, "stroke-width": 1, fill: color, stroke: "#222222"};
		var kid = SVGTools.addChild(g, "circle", attr);
	}
}

Doc.displayTime = function (){
	gn("currenttime").textContent = Runtime.seconds.toFixed(1);
}

function setnumbers (n, dist){
	var mold = 	'<tspan x="0" y="%a" font-family="%c" font-size="13px">%b</tspan>';
	var str = "";
	for (var i = 0; i < n ; i++){
			var num = n - i - 1;
			var entry = mold.replace("%a", i*dist);
			entry = entry.replace("%b", num);
			entry = entry.replace("%c",	"'AvenirNext-DemiBold'");

			str+= entry;
	}
	return str;
}

//////////////////////////
// Tools to generate the Doc.icons data at the end of the file
///////////////////////

Doc.getImages =  function (name){
	Doc.imageDict = {}
	var json = {}
	Doc.dir('assets/media/', doNext)
	function doNext (str) {Doc.addFiles(Doc.imageDict, str, whenDone);}
	function whenDone () {
		console.log (Doc.imageDict, Doc.mediaCount)
		for (let img in Doc.imageDict) {
			var str = SVGTools.svg2string(Doc.imageDict[img]);
			json [img] = str.replace(/>\s*</g,'><');
		}
		Doc.saveIcons(name+".js", JSON.stringify (json))
	}
}

Doc.saveIcons = function (name, str){
	str = str.replace (/></g, ">\n<");
	var request = new XMLHttpRequest();
	request.onreadystatechange=function(){fileSaved(request);};
	request.open('PUT', 'savetext.php?name='+name, true);
	request.setRequestHeader("Content-Type", 'text/xml');
	request.send(str);
	function fileSaved(req, start, len){
		if (req.readyState!=4) return;
		if (req.status!=200) return;
		console.log(name+": "+req.responseText);
	}
}


Doc.addFiles = function(json, str, whenDone){
	Doc.mediaCount  = 0;
	var list  = str.split ("\n");
	for (var i=0; i < list.length; i++){
		let item = list[i]
		if (item == ".") continue;
		if (item == "..") continue;
		if (item.indexOf(".svg") < 0) continue;
		else json [item] =  Doc.getSVGData(item);
	}
	var fcn  = function (){
		var test = function(){ return Doc.mediaCount < 1;};
		if (Doc.mediaCount > 0)  waituntil(test, function () {whenDone();});
		else whenDone();
	}
	setTimeout (fcn, 1000)
	
}

Doc.getSVGData = function(url){
	let icon= SVGTools.createGroup();
	Doc.mediaCount++;
	SVGTools.requestFromServer(url, function (xml) {doNext(xml, icon);});
	function doNext(xml, div){
		Doc.mediaCount--;	
		for (let i=0; i < xml.childElementCount; i++) 	div.appendChild (xml.childNodes[i]);
		console.log (xml, div)
	}
	console.log (url, Doc.mediaCount)
	return icon;
}


Doc.dir = function(url, fcn){
  var request = new XMLHttpRequest();
  request.onreadystatechange=function(){ 
    if (request.readyState == 4) {
    	if (request.status == 200) fcn(request.responseText, url);
  	}
  }
  request.open('GET', url ? 'dir.php?dirname='+url :  Home.ip+'dir.php', true);
  request.send(null);
}

Doc.icons = {
'assets/media/microbit/sensing_microbit.svg':'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g xmlns="http://www.w3.org/2000/svg"><g><g><circle fill="#FFFFFF" cx="12.5" cy="12" r="2.3"/><path fill="#2E8EB8" d="M12.5,14.6c-1.4,0-2.6-1.2-2.6-2.6s1.2-2.6,2.6-2.6s2.6,1.2,2.6,2.6S14,14.6,12.5,14.6z M12.5,10    c-1.1,0-2,0.9-2,2s0.9,2,2,2s2-0.9,2-2S13.6,10,12.5,10z"/></g><g><circle fill="#FFFFFF" cx="31.6" cy="12" r="2.3"/><path fill="#2E8EB8" d="M31.6,14.6c-1.4,0-2.6-1.2-2.6-2.6s1.2-2.6,2.6-2.6s2.6,1.2,2.6,2.6S33,14.6,31.6,14.6z M31.6,10    c-1.1,0-2,0.9-2,2s0.9,2,2,2s2-0.9,2-2S32.7,10,31.6,10z"/></g><g><path fill="#FFFFFF" d="M16.2,4.9c2.6,0,5,0,5,0l0,0l0,0c2.5,0,3.7,0,4.6,0c0.5,0,0.9,0,1.5,0c0.9,0,2.2,0,4.5,0    c2.2,0,4.1,0.8,5.4,2.2s1.9,3.3,1.8,5.5c-0.2,3.6-3,6.3-6.6,6.4c-1.4,0-4.7,0.1-8.7,0.1c-4.1,0-8.3,0-11.4-0.1    c-2.2,0-4.1-0.8-5.4-2.2c-1.3-1.4-1.9-3.3-1.8-5.5c0.2-3.6,3-6.3,6.6-6.4C12.7,4.9,14.2,4.9,16.2,4.9 M16.2,0.3    c-1.7,0-3.4,0-4.6,0c-6,0.2-10.7,4.9-11,10.8c-0.4,7,4.6,12.4,11.7,12.5c3.2,0,7.6,0.1,11.5,0.1s7.3,0,8.9-0.1    c6-0.2,10.7-4.9,11-10.8c0.4-7-4.6-12.4-11.7-12.5c-2.5,0-3.7,0-4.6,0c-1.4,0-2.1,0-6.1,0C21.2,0.3,18.8,0.3,16.2,0.3L16.2,0.3z"/><path fill="#2E8EB8" d="M23.6,24c-4.1,0-8.4,0-11.5-0.1c-3.5,0-6.7-1.4-8.9-3.7c-2.2-2.4-3.3-5.6-3.1-9.1C0.5,5,5.4,0.2,11.5,0    c1.1,0,2.6,0,4.7,0c2.6,0,5,0,5,0c2.5,0,3.6,0,4.5,0c1.5,0,2.1,0,6.1,0c3.5,0,6.7,1.4,8.9,3.7c2.2,2.4,3.3,5.6,3.1,9.1    c-0.3,6.1-5.2,10.9-11.3,11.1C31,24,27.8,24,23.6,24z M16.2,0.6c-2,0-3.6,0-4.6,0C5.7,0.8,1.1,5.3,0.7,11.2    c-0.2,3.3,0.9,6.4,2.9,8.6c2.1,2.2,5.1,3.5,8.5,3.6c3,0,7.3,0.1,11.5,0.1s7.4,0,8.9-0.1c5.8-0.2,10.4-4.7,10.8-10.5    c0.2-3.3-0.9-6.4-2.9-8.6c-2.1-2.2-5.1-3.5-8.5-3.6c-4-0.1-4.6,0-6.1,0c-0.9,0-2.1,0-4.6,0C21.2,0.6,18.8,0.6,16.2,0.6z     M23.6,19.4c-4.1,0-8.4,0-11.4-0.1c-2.3,0-4.2-0.8-5.6-2.3c-1.3-1.4-2-3.4-1.9-5.7C5,7.7,7.9,4.8,11.6,4.7c1,0,2.5,0,4.5,0    c2.6,0,5,0,5,0c2.5,0,3.7,0,4.6,0c0.6,0,1,0,1.5,0c0.9,0,2.2,0,4.5,0s4.2,0.8,5.6,2.3c1.3,1.4,2,3.4,1.9,5.7    c-0.2,3.7-3.2,6.6-6.9,6.7C30.9,19.4,27.7,19.4,23.6,19.4z M16.2,5.2c-2,0-3.5,0-4.5,0C8.3,5.3,5.5,8,5.4,11.4    c-0.1,2.1,0.5,3.9,1.7,5.2s3,2.1,5.2,2.1c3,0,7.3,0.1,11.4,0.1s7.3,0,8.7-0.1c3.4-0.1,6.1-2.8,6.3-6.2c0.1-2.1-0.5-3.9-1.7-5.2    s-3-2.1-5.2-2.1c-2.3,0-3.6,0-4.5,0c-0.5,0-0.9,0-1.4,0c-0.9,0-2.2,0-4.6,0C21.1,5.2,18.7,5.2,16.2,5.2z"/></g></g></g></svg>',
'assets/media//repeat.svg': '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g xmlns="http://www.w3.org/2000/svg"><path fill="#CF8B17" d="M23.3,11c-0.3,0.6-0.9,1-1.5,1h-1.6c-0.1,1.3-0.5,2.5-1.1,3.6c-0.9,1.7-2.3,3.2-4.1,4.1c-1.7,0.9-3.6,1.2-5.5,0.9c-1.8-0.3-3.5-1.1-4.9-2.3c-0.7-0.7-0.7-1.9,0-2.6c0.6-0.6,1.6-0.7,2.3-0.2H7c0.9,0.6,1.9,0.9,2.9,0.9s1.9-0.3,2.7-0.9c1.1-0.8,1.8-2.1,1.8-3.5h-1.5c-0.9,0-1.7-0.7-1.7-1.7c0-0.4,0.2-0.9,0.5-1.2l4.4-4.4c0.7-0.6,1.7-0.6,2.4,0L23,9.2C23.5,9.7,23.6,10.4,23.3,11z"/><path fill="#FFFFFF" d="M21.8,11h-2.6c0,1.5-0.3,2.9-1,4.2c-0.8,1.6-2.1,2.8-3.7,3.6c-1.5,0.8-3.3,1.1-4.9,0.8c-1.6-0.2-3.2-1-4.4-2.1c-0.4-0.3-0.4-0.9-0.1-1.2c0.3-0.4,0.9-0.4,1.2-0.1l0,0c1,0.7,2.2,1.1,3.4,1.1s2.3-0.3,3.3-1c0.9-0.6,1.6-1.5,2-2.6c0.3-0.9,0.4-1.8,0.2-2.8h-2.4c-0.4,0-0.7-0.3-0.7-0.7c0-0.2,0.1-0.3,0.2-0.4l4.4-4.4c0.3-0.3,0.7-0.3,0.9,0L22,9.8c0.3,0.3,0.4,0.6,0.3,0.9S22,11,21.8,11z"/></g></svg>',
'assets/media/repeat.svg': '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g xmlns="http://www.w3.org/2000/svg"><path fill="#CF8B17" d="M23.3,11c-0.3,0.6-0.9,1-1.5,1h-1.6c-0.1,1.3-0.5,2.5-1.1,3.6c-0.9,1.7-2.3,3.2-4.1,4.1c-1.7,0.9-3.6,1.2-5.5,0.9c-1.8-0.3-3.5-1.1-4.9-2.3c-0.7-0.7-0.7-1.9,0-2.6c0.6-0.6,1.6-0.7,2.3-0.2H7c0.9,0.6,1.9,0.9,2.9,0.9s1.9-0.3,2.7-0.9c1.1-0.8,1.8-2.1,1.8-3.5h-1.5c-0.9,0-1.7-0.7-1.7-1.7c0-0.4,0.2-0.9,0.5-1.2l4.4-4.4c0.7-0.6,1.7-0.6,2.4,0L23,9.2C23.5,9.7,23.6,10.4,23.3,11z"/><path fill="#FFFFFF" d="M21.8,11h-2.6c0,1.5-0.3,2.9-1,4.2c-0.8,1.6-2.1,2.8-3.7,3.6c-1.5,0.8-3.3,1.1-4.9,0.8c-1.6-0.2-3.2-1-4.4-2.1c-0.4-0.3-0.4-0.9-0.1-1.2c0.3-0.4,0.9-0.4,1.2-0.1l0,0c1,0.7,2.2,1.1,3.4,1.1s2.3-0.3,3.3-1c0.9-0.6,1.6-1.5,2-2.6c0.3-0.9,0.4-1.8,0.2-2.8h-2.4c-0.4,0-0.7-0.3-0.7-0.7c0-0.2,0.1-0.3,0.2-0.4l4.4-4.4c0.3-0.3,0.7-0.3,0.9,0L22,9.8c0.3,0.3,0.4,0.6,0.3,0.9S22,11,21.8,11z"/></g></svg>',
'assets/media/dropdown-arrow.svg':'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g xmlns="http://www.w3.org/2000/svg"><path d="M6.36,7.79a1.43,1.43,0,0,1-1-.42L1.42,3.45a1.44,1.44,0,0,1,0-2c0.56-.56,9.31-0.56,9.87,0a1.44,1.44,0,0,1,0,2L7.37,7.37A1.43,1.43,0,0,1,6.36,7.79Z" fill="#fff"/></g></svg>',
'assets/media/microbit/event_onpressa.svg':'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><path fill="#FFFFFF" d="M32,32.5H0.2L32,0.5V32.5z M26.6,29.3h1.7l-3.8-10.9h-1.3l-3.8,10.9H21l0.8-2.4h4L26.6,29.3z M22.3,25.4  l1.5-4.8l0,0l1.5,4.8C25.3,25.4,22.3,25.4,22.3,25.4z"/></g></svg>',
'assets/media/microbit/event_onpressb.svg':'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><path fill="#FFFFFF" d="M0,0h31.8L0,32V0z M4.9,14.5h4.4c0.8,0,1.5-0.3,2.1-0.9c0.6-0.5,0.8-1.3,0.9-2.2c0-0.6-0.1-1.1-0.4-1.6  c-0.3-0.5-0.7-0.8-1.3-0.9l0,0c0.3-0.1,0.6-0.3,0.8-0.5s0.4-0.4,0.5-0.6C12,7.4,12.2,7,12.1,6.5c0-0.9-0.3-1.6-0.8-2.1  S10.1,3.6,9,3.6H4.9V14.5z M8.8,5.1c0.6,0,1,0.2,1.3,0.4c0.3,0.3,0.4,0.7,0.4,1.1s-0.1,0.8-0.4,1.1C9.8,8,9.4,8.2,8.8,8.2H6.5V5.1  H8.8z M9,9.7c0.6,0,1,0.2,1.3,0.5s0.4,0.7,0.4,1.2c0,0.4-0.1,0.8-0.4,1.1C10,12.8,9.6,12.9,9,12.9H6.5V9.7H9z"/></g></svg>',
'assets/media/microbit/event_onrecc.svg':'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><g><g><circle fill="#FFFFFF" cx="12.5" cy="12" r="2.3"/><path fill="#CE8C2A" d="M12.5,14.6c-1.4,0-2.6-1.2-2.6-2.6s1.2-2.6,2.6-2.6s2.6,1.2,2.6,2.6S14,14.6,12.5,14.6z M12.5,10    c-1.1,0-2,0.9-2,2s0.9,2,2,2s2-0.9,2-2S13.6,10,12.5,10z"/></g><g><circle fill="#FFFFFF" cx="31.6" cy="12" r="2.3"/><path fill="#CE8C2A" d="M31.6,14.6c-1.4,0-2.6-1.2-2.6-2.6s1.2-2.6,2.6-2.6s2.6,1.2,2.6,2.6S33,14.6,31.6,14.6z M31.6,10    c-1.1,0-2,0.9-2,2s0.9,2,2,2s2-0.9,2-2S32.7,10,31.6,10z"/></g><g><path fill="#FFFFFF" d="M16.2,4.9c2.6,0,5,0,5,0l0,0l0,0c2.5,0,3.7,0,4.6,0c0.5,0,0.9,0,1.5,0c0.9,0,2.2,0,4.5,0    c2.2,0,4.1,0.8,5.4,2.2s1.9,3.3,1.8,5.5c-0.2,3.6-3,6.3-6.6,6.4c-1.4,0-4.7,0.1-8.7,0.1c-4.1,0-8.3,0-11.4-0.1    c-2.2,0-4.1-0.8-5.4-2.2c-1.3-1.4-1.9-3.3-1.8-5.5c0.2-3.6,3-6.3,6.6-6.4C12.7,4.9,14.2,4.9,16.2,4.9 M16.2,0.3    c-1.7,0-3.4,0-4.6,0c-6,0.2-10.7,4.9-11,10.8c-0.4,7,4.6,12.4,11.7,12.5c3.2,0,7.6,0.1,11.5,0.1s7.3,0,8.9-0.1    c6-0.2,10.7-4.9,11-10.8c0.4-7-4.6-12.4-11.7-12.5c-2.5,0-3.7,0-4.6,0c-1.4,0-2.1,0-6.1,0C21.2,0.3,18.8,0.3,16.2,0.3L16.2,0.3z"/><path fill="#CE8C2A" d="M23.6,24c-4.1,0-8.4,0-11.5-0.1c-3.5,0-6.7-1.4-8.9-3.7c-2.2-2.4-3.3-5.6-3.1-9.1C0.5,5,5.4,0.2,11.5,0    c1.1,0,2.6,0,4.7,0c2.6,0,5,0,5,0c2.5,0,3.6,0,4.5,0c1.5,0,2.1,0,6.1,0c3.5,0,6.7,1.4,8.9,3.7c2.2,2.4,3.3,5.6,3.1,9.1    c-0.3,6.1-5.2,10.9-11.3,11.1C31,24,27.8,24,23.6,24z M16.2,0.6c-2,0-3.6,0-4.6,0C5.7,0.8,1.1,5.3,0.7,11.2    c-0.2,3.3,0.9,6.4,2.9,8.6c2.1,2.2,5.1,3.5,8.5,3.6c3,0,7.3,0.1,11.5,0.1s7.4,0,8.9-0.1c5.8-0.2,10.4-4.7,10.8-10.5    c0.2-3.3-0.9-6.4-2.9-8.6c-2.1-2.2-5.1-3.5-8.5-3.6c-4-0.1-4.6,0-6.1,0c-0.9,0-2.1,0-4.6,0C21.2,0.6,18.8,0.6,16.2,0.6z     M23.6,19.4c-4.1,0-8.4,0-11.4-0.1c-2.3,0-4.2-0.8-5.6-2.3c-1.3-1.4-2-3.4-1.9-5.7C5,7.7,7.9,4.8,11.6,4.7c1,0,2.5,0,4.5,0    c2.6,0,5,0,5,0c2.5,0,3.7,0,4.6,0c0.6,0,1,0,1.5,0c0.9,0,2.2,0,4.5,0s4.2,0.8,5.6,2.3c1.3,1.4,2,3.4,1.9,5.7    c-0.2,3.7-3.2,6.6-6.9,6.7C30.9,19.4,27.7,19.4,23.6,19.4z M16.2,5.2c-2,0-3.5,0-4.5,0C8.3,5.3,5.5,8,5.4,11.4    c-0.1,2.1,0.5,3.9,1.7,5.2s3,2.1,5.2,2.1c3,0,7.3,0.1,11.4,0.1s7.3,0,8.7-0.1c3.4-0.1,6.1-2.8,6.3-6.2c0.1-2.1-0.5-3.9-1.7-5.2    s-3-2.1-5.2-2.1c-2.3,0-3.6,0-4.5,0c-0.5,0-0.9,0-1.4,0c-0.9,0-2.2,0-4.6,0C21.1,5.2,18.7,5.2,16.2,5.2z"/></g></g></g></svg>',
'assets/media/microbit/sensing_pressa.svg':'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><path fill="#FFFFFF" d="M32,32.5H0.2L32,0.5V32.5z M26.6,29.3h1.7l-3.8-10.9h-1.3l-3.8,10.9H21l0.8-2.4h4L26.6,29.3z M22.3,25.4  l1.5-4.8l0,0l1.5,4.8C25.3,25.4,22.3,25.4,22.3,25.4z"/></g></svg>',
'assets/media/microbit/sensing_pressb.svg':'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><path fill="#FFFFFF" d="M0,0h31.8L0,32V0z M4.9,14.5h4.4c0.8,0,1.5-0.3,2.1-0.9c0.6-0.5,0.8-1.3,0.9-2.2c0-0.6-0.1-1.1-0.4-1.6  c-0.3-0.5-0.7-0.8-1.3-0.9l0,0c0.3-0.1,0.6-0.3,0.8-0.5s0.4-0.4,0.5-0.6C12,7.4,12.2,7,12.1,6.5c0-0.9-0.3-1.6-0.8-2.1  S10.1,3.6,9,3.6H4.9V14.5z M8.8,5.1c0.6,0,1,0.2,1.3,0.4c0.3,0.3,0.4,0.7,0.4,1.1s-0.1,0.8-0.4,1.1C9.8,8,9.4,8.2,8.8,8.2H6.5V5.1  H8.8z M9,9.7c0.6,0,1,0.2,1.3,0.5s0.4,0.7,0.4,1.2c0,0.4-0.1,0.8-0.4,1.1C10,12.8,9.6,12.9,9,12.9H6.5V9.7H9z"/></g></svg>',
'assets/media/microbit/event_broadcast_blue.svg': '<svg version="1.1" id="Icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40"><g><path fill="#4C97FF" d="M35.8,30.5H11.1c-1,0-1.8-0.8-1.8-1.7l0,0l0.1-17.3c0-1,0.8-1.7,1.8-1.7h24.5c1,0,1.8,0.8,1.8,1.8v17.3C37.5,29.7,36.7,30.5,35.8,30.5z"/><polyline fill="none" stroke="#3D79CC" stroke-linecap="round" stroke-linejoin="round" points="10.4,29.6 23.5,18.7 36.6,29.6"/><g opacity="0.1"><path fill="#231F20" d="M37.9,12.8L26,25.1c-1.3,1.4-3.5,1.4-4.9,0.1L21,25.1L9.1,12.8C9,12.7,8.9,12.4,9,12.3C9.1,12.1,9.3,12,9.5,12h28c0.2,0,0.4,0.1,0.5,0.3C38,12.5,38,12.7,37.9,12.8z"/></g><path fill="#4C97FF" stroke="#3D79CC" stroke-linecap="round" stroke-linejoin="round" d="M37.5,11.5l-12,10.3c-1.1,1-2.8,1-3.9,0L9.5,11.5"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="12" x2="4.5" y2="12"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="20" x2="4.5" y2="20"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="28" x2="4.5" y2="28"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="24" x2="1" y2="24"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="16" x2="1" y2="16"/><path fill="none" stroke="#3D79CC" stroke-linecap="round" stroke-linejoin="round" d="M35.8,30.5H11.1c-1,0-1.8-0.8-1.8-1.7l0,0l0.1-17.3c0-1,0.8-1.7,1.8-1.7h24.5c1,0,1.8,0.8,1.8,1.8v17.3C37.5,29.7,36.7,30.5,35.8,30.5z"/></g></svg>',
'assets/media/microbit/event_broadcast_coral.svg':'<svg version="1.1" id="Icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40"><g><path fill="#F26D83" d="M35.8,30.5H11.1c-1,0-1.8-0.8-1.8-1.7l0,0l0.1-17.3c0-1,0.8-1.7,1.8-1.7h24.5c1,0,1.8,0.8,1.8,1.8v17.3C37.5,29.7,36.7,30.5,35.8,30.5z"/><polyline fill="none" stroke="#BF5668" stroke-linecap="round" stroke-linejoin="round" points="10.4,29.6 23.5,18.7 36.6,29.6"/><g opacity="0.1"><path fill="#231F20" d="M37.9,12.8L26,25.1c-1.3,1.4-3.5,1.4-4.9,0.1L21,25.1L9.1,12.8C9,12.7,8.9,12.4,9,12.3C9.1,12.1,9.3,12,9.5,12h28c0.2,0,0.4,0.1,0.5,0.3C38,12.5,38,12.7,37.9,12.8z"/></g><path fill="#F26D83" stroke="#BF5668" stroke-linecap="round" stroke-linejoin="round" d="M37.5,11.5l-12,10.3c-1.1,1-2.8,1-3.9,0L9.5,11.5"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="12" x2="4.5" y2="12"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="20" x2="4.5" y2="20"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="28" x2="4.5" y2="28"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="24" x2="1" y2="24"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="16" x2="1" y2="16"/><path fill="none" stroke="#BF5668" stroke-linecap="round" stroke-linejoin="round" d="M35.8,30.5H11.1c-1,0-1.8-0.8-1.8-1.7l0,0l0.1-17.3c0-1,0.8-1.7,1.8-1.7h24.5c1,0,1.8,0.8,1.8,1.8v17.3C37.5,29.7,36.7,30.5,35.8,30.5z"/></g></svg>',
'assets/media/microbit/event_broadcast_green.svg': '<svg version="1.1" id="Icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40"><g><path fill="#4CBF56" d="M35.8,30.5H11.1c-1,0-1.8-0.8-1.8-1.7l0,0l0.1-17.3c0-1,0.8-1.7,1.8-1.7h24.5c1,0,1.8,0.8,1.8,1.8v17.3C37.5,29.7,36.7,30.5,35.8,30.5z"/><polyline fill="none" stroke="#45993D" stroke-linecap="round" stroke-linejoin="round" points="10.4,29.6 23.5,18.7 36.6,29.6"/><g opacity="0.1"><path fill="#231F20" d="M37.9,12.8L26,25.1c-1.3,1.4-3.5,1.4-4.9,0.1L21,25.1L9.1,12.8C9,12.7,8.9,12.4,9,12.3C9.1,12.1,9.3,12,9.5,12h28c0.2,0,0.4,0.1,0.5,0.3C38,12.5,38,12.7,37.9,12.8z"/></g><path fill="#4CBF56" stroke="#45993D" stroke-linecap="round" stroke-linejoin="round" d="M37.5,11.5l-12,10.3c-1.1,1-2.8,1-3.9,0L9.5,11.5"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="12" x2="4.5" y2="12"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="20" x2="4.5" y2="20"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="28" x2="4.5" y2="28"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="24" x2="1" y2="24"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="16" x2="1" y2="16"/><path fill="none" stroke="#45993D" stroke-linecap="round" stroke-linejoin="round" d="M35.8,30.5H11.1c-1,0-1.8-0.8-1.8-1.7l0,0l0.1-17.3c0-1,0.8-1.7,1.8-1.7h24.5c1,0,1.8,0.8,1.8,1.8v17.3C37.5,29.7,36.7,30.5,35.8,30.5z"/></g></svg>',
'assets/media/microbit/event_broadcast_magenta.svg':'<svg version="1.1" id="Icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40"><g><path fill="#D65CD6" d="M35.8,30.5H11.1c-1,0-1.8-0.8-1.8-1.7l0,0l0.1-17.3c0-1,0.8-1.7,1.8-1.7h24.5c1,0,1.8,0.8,1.8,1.8v17.3C37.5,29.7,36.7,30.5,35.8,30.5z"/><polyline fill="none" stroke="#A63FA6" stroke-linecap="round" stroke-linejoin="round" points="10.4,29.6 23.5,18.7 36.6,29.6"/><g opacity="0.1"><path fill="#231F20" d="M37.9,12.8L26,25.1c-1.3,1.4-3.5,1.4-4.9,0.1L21,25.1L9.1,12.8C9,12.7,8.9,12.4,9,12.3C9.1,12.1,9.3,12,9.5,12h28c0.2,0,0.4,0.1,0.5,0.3C38,12.5,38,12.7,37.9,12.8z"/></g><path fill="#D65CD6" stroke="#A63FA6" stroke-linecap="round" stroke-linejoin="round" d="M37.5,11.5l-12,10.3c-1.1,1-2.8,1-3.9,0L9.5,11.5"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="12" x2="4.5" y2="12"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="20" x2="4.5" y2="20"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="28" x2="4.5" y2="28"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="24" x2="1" y2="24"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="16" x2="1" y2="16"/><path fill="none" stroke="#A63FA6" stroke-linecap="round" stroke-linejoin="round" d="M35.8,30.5H11.1c-1,0-1.8-0.8-1.8-1.7l0,0l0.1-17.3c0-1,0.8-1.7,1.8-1.7h24.5c1,0,1.8,0.8,1.8,1.8v17.3C37.5,29.7,36.7,30.5,35.8,30.5z"/></g></svg>',
'assets/media/microbit/event_broadcast_purple.svg': '<svg version="1.1" id="Icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40"><g><path fill="#9966FF" d="M35.8,30.5H11.1c-1,0-1.8-0.8-1.8-1.7l0,0l0.1-17.3c0-1,0.8-1.7,1.8-1.7h24.5c1,0,1.8,0.8,1.8,1.8v17.3C37.5,29.7,36.7,30.5,35.8,30.5z"/><polyline fill="none" stroke="#774DCB" stroke-linecap="round" stroke-linejoin="round" points="10.4,29.6 23.5,18.7 36.6,29.6"/><g opacity="0.1"><path fill="#231F20" d="M37.9,12.8L26,25.1c-1.3,1.4-3.5,1.4-4.9,0.1L21,25.1L9.1,12.8C9,12.7,8.9,12.4,9,12.3C9.1,12.1,9.3,12,9.5,12h28c0.2,0,0.4,0.1,0.5,0.3C38,12.5,38,12.7,37.9,12.8z"/></g><path fill="#9966FF" stroke="#774DCB" stroke-linecap="round" stroke-linejoin="round" d="M37.5,11.5l-12,10.3c-1.1,1-2.8,1-3.9,0L9.5,11.5"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="12" x2="4.5" y2="12"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="20" x2="4.5" y2="20"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="28" x2="4.5" y2="28"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="24" x2="1" y2="24"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="16" x2="1" y2="16"/><path fill="none" stroke="#774DCB" stroke-linecap="round" stroke-linejoin="round" d="M35.8,30.5H11.1c-1,0-1.8-0.8-1.8-1.7l0,0l0.1-17.3c0-1,0.8-1.7,1.8-1.7h24.5c1,0,1.8,0.8,1.8,1.8v17.3C37.5,29.7,36.7,30.5,35.8,30.5z"/></g></svg>',
'assets/media/microbit/event_broadcast_cyan.svg': '<svg version="1.1" id="Icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40"><g><path fill="#70E3F2" d="M35.8,30.5H11.1c-1,0-1.8-0.8-1.8-1.7l0,0l0.1-17.3c0-1,0.8-1.7,1.8-1.7h24.5c1,0,1.8,0.8,1.8,1.8v17.3C37.5,29.7,36.7,30.5,35.8,30.5z"/><polyline fill="none" stroke="#1DB7CC" stroke-linecap="round" stroke-linejoin="round" points="10.4,29.6 23.5,18.7 36.6,29.6"/><g opacity="0.1"><path fill="#231F20" d="M37.9,12.8L26,25.1c-1.3,1.4-3.5,1.4-4.9,0.1L21,25.1L9.1,12.8C9,12.7,8.9,12.4,9,12.3C9.1,12.1,9.3,12,9.5,12h28c0.2,0,0.4,0.1,0.5,0.3C38,12.5,38,12.7,37.9,12.8z"/></g><path fill="#70E3F2" stroke="#1DB7CC" stroke-linecap="round" stroke-linejoin="round" d="M37.5,11.5l-12,10.3c-1.1,1-2.8,1-3.9,0L9.5,11.5"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="12" x2="4.5" y2="12"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="20" x2="4.5" y2="20"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="28" x2="4.5" y2="28"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="24" x2="1" y2="24"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="16" x2="1" y2="16"/><path fill="none" stroke="#1DB7CC" stroke-linecap="round" stroke-linejoin="round" d="M35.8,30.5H11.1c-1,0-1.8-0.8-1.8-1.7l0,0l0.1-17.3c0-1,0.8-1.7,1.8-1.7h24.5c1,0,1.8,0.8,1.8,1.8v17.3C37.5,29.7,36.7,30.5,35.8,30.5z"/></g></svg>',
'assets/media/microbit/event_broadcast_orange.svg': '<svg version="1.1" id="Icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40"><g><path fill="#FF841F" d="M35.8,30.5H11.1c-1,0-1.8-0.8-1.8-1.7l0,0l0.1-17.3c0-1,0.8-1.7,1.8-1.7h24.5c1,0,1.8,0.8,1.8,1.8v17.3C37.5,29.7,36.7,30.5,35.8,30.5z"/><polyline fill="none" stroke="#CE6B19" stroke-linecap="round" stroke-linejoin="round" points="10.4,29.6 23.5,18.7 36.6,29.6"/><g opacity="0.1"><path fill="#231F20" d="M37.9,12.8L26,25.1c-1.3,1.4-3.5,1.4-4.9,0.1L21,25.1L9.1,12.8C9,12.7,8.9,12.4,9,12.3C9.1,12.1,9.3,12,9.5,12h28c0.2,0,0.4,0.1,0.5,0.3C38,12.5,38,12.7,37.9,12.8z"/></g><path fill="#FF841F" stroke="#CE6B19" stroke-linecap="round" stroke-linejoin="round" d="M37.5,11.5l-12,10.3c-1.1,1-2.8,1-3.9,0L9.5,11.5"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="12" x2="4.5" y2="12"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="20" x2="4.5" y2="20"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="28" x2="4.5" y2="28"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="24" x2="1" y2="24"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="16" x2="1" y2="16"/><path fill="none" stroke="#CE6B19" stroke-linecap="round" stroke-linejoin="round" d="M35.8,30.5H11.1c-1,0-1.8-0.8-1.8-1.7l0,0l0.1-17.3c0-1,0.8-1.7,1.8-1.7h24.5c1,0,1.8,0.8,1.8,1.8v17.3C37.5,29.7,36.7,30.5,35.8,30.5z"/></g></svg>',
'assets/media/microbit/event_broadcast_yellow.svg': '<svg version="1.1" id="Icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40"><g><path fill="#FFEA24" d="M35.8,30.5H11.1c-1,0-1.8-0.8-1.8-1.7l0,0l0.1-17.3c0-1,0.8-1.7,1.8-1.7h24.5c1,0,1.8,0.8,1.8,1.8v17.3C37.5,29.7,36.7,30.5,35.8,30.5z"/><polyline fill="none" stroke="#CCAA1B" stroke-linecap="round" stroke-linejoin="round" points="10.4,29.6 23.5,18.7 36.6,29.6"/><g opacity="0.1"><path fill="#231F20" d="M37.9,12.8L26,25.1c-1.3,1.4-3.5,1.4-4.9,0.1L21,25.1L9.1,12.8C9,12.7,8.9,12.4,9,12.3C9.1,12.1,9.3,12,9.5,12h28c0.2,0,0.4,0.1,0.5,0.3C38,12.5,38,12.7,37.9,12.8z"/></g><path fill="#FFEA24" stroke="#CCAA1B" stroke-linecap="round" stroke-linejoin="round" d="M37.5,11.5l-12,10.3c-1.1,1-2.8,1-3.9,0L9.5,11.5"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="12" x2="4.5" y2="12"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="20" x2="4.5" y2="20"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="28" x2="4.5" y2="28"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="24" x2="1" y2="24"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="7" y1="16" x2="1" y2="16"/><path fill="none" stroke="#CCAA1B" stroke-linecap="round" stroke-linejoin="round" d="M35.8,30.5H11.1c-1,0-1.8-0.8-1.8-1.7l0,0l0.1-17.3c0-1,0.8-1.7,1.8-1.7h24.5c1,0,1.8,0.8,1.8,1.8v17.3C37.5,29.7,36.7,30.5,35.8,30.5z"/></g></svg>',
'assets/media/microbit/event_when-broadcast-received_orange.svg': '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40"><g><path fill="#FF841F" stroke="#CC6B1B" stroke-linecap="round" stroke-linejoin="round" d="M34,36H5.9c-1.1,0-2-0.9-2-2L4,17c0-0.6,0.3-1.2,0.8-1.6l14-10.5c0.7-0.5,1.7-0.5,2.4,0l14,10.5c0.5,0.4,0.8,1,0.8,1.6v17C36,35.1,35.1,36,34,36z"/><path fill="#F9F8FF" stroke="#CC6B1B" stroke-linecap="round" stroke-linejoin="round" d="M10,8h20c1.1,0,2,0.9,2,2v16c0,1.1-0.9,2-2,2H10c-1.1,0-2-0.9-2-2V10C8,8.9,8.9,8,10,8z"/><g opacity="0.1"><path fill="#231F20" d="M36.5,17v1c0,0.2-0.1,0.3-0.2,0.4l-14.9,9.3c-0.4,0.3-0.9,0.4-1.3,0.4c-0.5,0-0.9-0.1-1.3-0.4l-15-9.4c-0.1-0.1-0.2-0.3-0.2-0.4v-1.2c0.1-0.7,0.4-1.3,1-1.8l0.7-0.5c0.2-0.1,0.4-0.1,0.6,0l11.3,7l1.5-1.1c0.9-0.7,2.1-0.7,3,0l1.5,1.1l11.3-7.1c0.2-0.1,0.4-0.1,0.6,0l0.6,0.5C36.1,15.5,36.5,16.2,36.5,17z"/></g><path fill="#FF841F" stroke="#CC6B1B" stroke-linecap="round" stroke-linejoin="round" d="M36,18l-14.9,9.3c-0.6,0.4-1.5,0.4-2.1,0L4,18v16c0,1.1,0.9,2,2,2h28c1.1,0,2-0.9,2-2V18z"/><path fill="#FF841F" stroke="#CC6B1B" stroke-linecap="round" stroke-linejoin="round" d="M4.9,35l13.9-10.1c0.7-0.5,1.7-0.5,2.4,0L35,35"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="11.8" y1="4.1" x2="10.1" y2="1"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="5.3" y1="11" x2="2" y2="8.6"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="28.2" y1="4.1" x2="29.8" y2="1"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="34.7" y1="11" x2="37.9" y2="8.6"/></g></svg>',
'assets/media/microbit/event_when-broadcast-received_yellow.svg': '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40"><g><path fill="#FFEA24" stroke="#CCAA1B" stroke-linecap="round" stroke-linejoin="round" d="M34,36H5.9c-1.1,0-2-0.9-2-2L4,17c0-0.6,0.3-1.2,0.8-1.6l14-10.5c0.7-0.5,1.7-0.5,2.4,0l14,10.5c0.5,0.4,0.8,1,0.8,1.6v17C36,35.1,35.1,36,34,36z"/><path fill="#F9F8FF" stroke="#CCAA1B" stroke-linecap="round" stroke-linejoin="round" d="M10,8h20c1.1,0,2,0.9,2,2v16c0,1.1-0.9,2-2,2H10c-1.1,0-2-0.9-2-2V10C8,8.9,8.9,8,10,8z"/><g opacity="0.1"><path fill="#231F20" d="M36.5,17v1c0,0.2-0.1,0.3-0.2,0.4l-14.9,9.3c-0.4,0.3-0.9,0.4-1.3,0.4c-0.5,0-0.9-0.1-1.3-0.4l-15-9.4c-0.1-0.1-0.2-0.3-0.2-0.4v-1.2c0.1-0.7,0.4-1.3,1-1.8l0.7-0.5c0.2-0.1,0.4-0.1,0.6,0l11.3,7l1.5-1.1c0.9-0.7,2.1-0.7,3,0l1.5,1.1l11.3-7.1c0.2-0.1,0.4-0.1,0.6,0l0.6,0.5C36.1,15.5,36.5,16.2,36.5,17z"/></g><path fill="#FFEA24" stroke="#CCAA1B" stroke-linecap="round" stroke-linejoin="round" d="M36,18l-14.9,9.3c-0.6,0.4-1.5,0.4-2.1,0L4,18v16c0,1.1,0.9,2,2,2h28c1.1,0,2-0.9,2-2V18z"/><path fill="#FFEA24" stroke="#CCAA1B" stroke-linecap="round" stroke-linejoin="round" d="M4.9,35l13.9-10.1c0.7-0.5,1.7-0.5,2.4,0L35,35"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="11.8" y1="4.1" x2="10.1" y2="1"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="5.3" y1="11" x2="2" y2="8.6"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="28.2" y1="4.1" x2="29.8" y2="1"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="34.7" y1="11" x2="37.9" y2="8.6"/></g></svg>',
'assets/media/microbit/event_when-broadcast-received_blue.svg': '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40"><g><path fill="#4C97FF" stroke="#3D79CC" stroke-linecap="round" stroke-linejoin="round" d="M34,36H5.9c-1.1,0-2-0.9-2-2L4,17c0-0.6,0.3-1.2,0.8-1.6l14-10.5c0.7-0.5,1.7-0.5,2.4,0l14,10.5c0.5,0.4,0.8,1,0.8,1.6v17C36,35.1,35.1,36,34,36z"/><path fill="#F9F8FF" stroke="#3D79CC" stroke-linecap="round" stroke-linejoin="round" d="M10,8h20c1.1,0,2,0.9,2,2v16c0,1.1-0.9,2-2,2H10c-1.1,0-2-0.9-2-2V10C8,8.9,8.9,8,10,8z"/><g opacity="0.1"><path fill="#231F20" d="M36.5,17v1c0,0.2-0.1,0.3-0.2,0.4l-14.9,9.3c-0.4,0.3-0.9,0.4-1.3,0.4c-0.5,0-0.9-0.1-1.3-0.4l-15-9.4c-0.1-0.1-0.2-0.3-0.2-0.4v-1.2c0.1-0.7,0.4-1.3,1-1.8l0.7-0.5c0.2-0.1,0.4-0.1,0.6,0l11.3,7l1.5-1.1c0.9-0.7,2.1-0.7,3,0l1.5,1.1l11.3-7.1c0.2-0.1,0.4-0.1,0.6,0l0.6,0.5C36.1,15.5,36.5,16.2,36.5,17z"/></g><path fill="#4C97FF" stroke="#3D79CC" stroke-linecap="round" stroke-linejoin="round" d="M36,18l-14.9,9.3c-0.6,0.4-1.5,0.4-2.1,0L4,18v16c0,1.1,0.9,2,2,2h28c1.1,0,2-0.9,2-2V18z"/><path fill="#4C97FF" stroke="#3D79CC" stroke-linecap="round" stroke-linejoin="round" d="M4.9,35l13.9-10.1c0.7-0.5,1.7-0.5,2.4,0L35,35"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="11.8" y1="4.1" x2="10.1" y2="1"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="5.3" y1="11" x2="2" y2="8.6"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="28.2" y1="4.1" x2="29.8" y2="1"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="34.7" y1="11" x2="37.9" y2="8.6"/></g></svg>',
'assets/media/microbit/event_when-broadcast-received_coral.svg': '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40"><g><path fill="#F26D83" stroke="#BF5668" stroke-linecap="round" stroke-linejoin="round" d="M34,36H5.9c-1.1,0-2-0.9-2-2L4,17c0-0.6,0.3-1.2,0.8-1.6l14-10.5c0.7-0.5,1.7-0.5,2.4,0l14,10.5c0.5,0.4,0.8,1,0.8,1.6v17C36,35.1,35.1,36,34,36z"/><path fill="#F9F8FF" stroke="#BF5668" stroke-linecap="round" stroke-linejoin="round" d="M10,8h20c1.1,0,2,0.9,2,2v16c0,1.1-0.9,2-2,2H10c-1.1,0-2-0.9-2-2V10C8,8.9,8.9,8,10,8z"/><g opacity="0.1"><path fill="#231F20" d="M36.5,17v1c0,0.2-0.1,0.3-0.2,0.4l-14.9,9.3c-0.4,0.3-0.9,0.4-1.3,0.4c-0.5,0-0.9-0.1-1.3-0.4l-15-9.4c-0.1-0.1-0.2-0.3-0.2-0.4v-1.2c0.1-0.7,0.4-1.3,1-1.8l0.7-0.5c0.2-0.1,0.4-0.1,0.6,0l11.3,7l1.5-1.1c0.9-0.7,2.1-0.7,3,0l1.5,1.1l11.3-7.1c0.2-0.1,0.4-0.1,0.6,0l0.6,0.5C36.1,15.5,36.5,16.2,36.5,17z"/></g><path fill="#F26D83" stroke="#BF5668" stroke-linecap="round" stroke-linejoin="round" d="M36,18l-14.9,9.3c-0.6,0.4-1.5,0.4-2.1,0L4,18v16c0,1.1,0.9,2,2,2h28c1.1,0,2-0.9,2-2V18z"/><path fill="#F26D83" stroke="#BF5668" stroke-linecap="round" stroke-linejoin="round" d="M4.9,35l13.9-10.1c0.7-0.5,1.7-0.5,2.4,0L35,35"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="11.8" y1="4.1" x2="10.1" y2="1"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="5.3" y1="11" x2="2" y2="8.6"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="28.2" y1="4.1" x2="29.8" y2="1"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="34.7" y1="11" x2="37.9" y2="8.6"/></g></svg>',
'assets/media/microbit/event_when-broadcast-received_green.svg': '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40"><g><path fill="#4CBF56" stroke="#45993D" stroke-linecap="round" stroke-linejoin="round" d="M34,36H5.9c-1.1,0-2-0.9-2-2L4,17c0-0.6,0.3-1.2,0.8-1.6l14-10.5c0.7-0.5,1.7-0.5,2.4,0l14,10.5c0.5,0.4,0.8,1,0.8,1.6v17C36,35.1,35.1,36,34,36z"/><path fill="#F9F8FF" stroke="#45993D" stroke-linecap="round" stroke-linejoin="round" d="M10,8h20c1.1,0,2,0.9,2,2v16c0,1.1-0.9,2-2,2H10c-1.1,0-2-0.9-2-2V10C8,8.9,8.9,8,10,8z"/><g opacity="0.1"><path fill="#231F20" d="M36.5,17v1c0,0.2-0.1,0.3-0.2,0.4l-14.9,9.3c-0.4,0.3-0.9,0.4-1.3,0.4c-0.5,0-0.9-0.1-1.3-0.4l-15-9.4c-0.1-0.1-0.2-0.3-0.2-0.4v-1.2c0.1-0.7,0.4-1.3,1-1.8l0.7-0.5c0.2-0.1,0.4-0.1,0.6,0l11.3,7l1.5-1.1c0.9-0.7,2.1-0.7,3,0l1.5,1.1l11.3-7.1c0.2-0.1,0.4-0.1,0.6,0l0.6,0.5C36.1,15.5,36.5,16.2,36.5,17z"/></g><path fill="#4CBF56" stroke="#45993D" stroke-linecap="round" stroke-linejoin="round" d="M36,18l-14.9,9.3c-0.6,0.4-1.5,0.4-2.1,0L4,18v16c0,1.1,0.9,2,2,2h28c1.1,0,2-0.9,2-2V18z"/><path fill="#4CBF56" stroke="#45993D" stroke-linecap="round" stroke-linejoin="round" d="M4.9,35l13.9-10.1c0.7-0.5,1.7-0.5,2.4,0L35,35"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="11.8" y1="4.1" x2="10.1" y2="1"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="5.3" y1="11" x2="2" y2="8.6"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="28.2" y1="4.1" x2="29.8" y2="1"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="34.7" y1="11" x2="37.9" y2="8.6"/></g></svg>',
'assets/media/microbit/event_when-broadcast-received_magenta.svg': '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40"><g><path fill="#D65CD6" stroke="#A63FA6" stroke-linecap="round" stroke-linejoin="round" d="M34,36H5.9c-1.1,0-2-0.9-2-2L4,17c0-0.6,0.3-1.2,0.8-1.6l14-10.5c0.7-0.5,1.7-0.5,2.4,0l14,10.5c0.5,0.4,0.8,1,0.8,1.6v17C36,35.1,35.1,36,34,36z"/><path fill="#F9F8FF" stroke="#A63FA6" stroke-linecap="round" stroke-linejoin="round" d="M10,8h20c1.1,0,2,0.9,2,2v16c0,1.1-0.9,2-2,2H10c-1.1,0-2-0.9-2-2V10C8,8.9,8.9,8,10,8z"/><g opacity="0.1"><path fill="#231F20" d="M36.5,17v1c0,0.2-0.1,0.3-0.2,0.4l-14.9,9.3c-0.4,0.3-0.9,0.4-1.3,0.4c-0.5,0-0.9-0.1-1.3-0.4l-15-9.4c-0.1-0.1-0.2-0.3-0.2-0.4v-1.2c0.1-0.7,0.4-1.3,1-1.8l0.7-0.5c0.2-0.1,0.4-0.1,0.6,0l11.3,7l1.5-1.1c0.9-0.7,2.1-0.7,3,0l1.5,1.1l11.3-7.1c0.2-0.1,0.4-0.1,0.6,0l0.6,0.5C36.1,15.5,36.5,16.2,36.5,17z"/></g><path fill="#D65CD6" stroke="#A63FA6" stroke-linecap="round" stroke-linejoin="round" d="M36,18l-14.9,9.3c-0.6,0.4-1.5,0.4-2.1,0L4,18v16c0,1.1,0.9,2,2,2h28c1.1,0,2-0.9,2-2V18z"/><path fill="#D65CD6" stroke="#A63FA6" stroke-linecap="round" stroke-linejoin="round" d="M4.9,35l13.9-10.1c0.7-0.5,1.7-0.5,2.4,0L35,35"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="11.8" y1="4.1" x2="10.1" y2="1"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="5.3" y1="11" x2="2" y2="8.6"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="28.2" y1="4.1" x2="29.8" y2="1"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="34.7" y1="11" x2="37.9" y2="8.6"/></g></svg>',
'assets/media/microbit/event_when-broadcast-received_purple.svg': '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40"><g><path fill="#9966FF" stroke="#774DCB" stroke-linecap="round" stroke-linejoin="round" d="M34,36H5.9c-1.1,0-2-0.9-2-2L4,17c0-0.6,0.3-1.2,0.8-1.6l14-10.5c0.7-0.5,1.7-0.5,2.4,0l14,10.5c0.5,0.4,0.8,1,0.8,1.6v17C36,35.1,35.1,36,34,36z"/><path fill="#F9F8FF" stroke="#774DCB" stroke-linecap="round" stroke-linejoin="round" d="M10,8h20c1.1,0,2,0.9,2,2v16c0,1.1-0.9,2-2,2H10c-1.1,0-2-0.9-2-2V10C8,8.9,8.9,8,10,8z"/><g opacity="0.1"><path fill="#231F20" d="M36.5,17v1c0,0.2-0.1,0.3-0.2,0.4l-14.9,9.3c-0.4,0.3-0.9,0.4-1.3,0.4c-0.5,0-0.9-0.1-1.3-0.4l-15-9.4c-0.1-0.1-0.2-0.3-0.2-0.4v-1.2c0.1-0.7,0.4-1.3,1-1.8l0.7-0.5c0.2-0.1,0.4-0.1,0.6,0l11.3,7l1.5-1.1c0.9-0.7,2.1-0.7,3,0l1.5,1.1l11.3-7.1c0.2-0.1,0.4-0.1,0.6,0l0.6,0.5C36.1,15.5,36.5,16.2,36.5,17z"/></g><path fill="#9966FF" stroke="#774DCB" stroke-linecap="round" stroke-linejoin="round" d="M36,18l-14.9,9.3c-0.6,0.4-1.5,0.4-2.1,0L4,18v16c0,1.1,0.9,2,2,2h28c1.1,0,2-0.9,2-2V18z"/><path fill="#9966FF" stroke="#774DCB" stroke-linecap="round" stroke-linejoin="round" d="M4.9,35l13.9-10.1c0.7-0.5,1.7-0.5,2.4,0L35,35"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="11.8" y1="4.1" x2="10.1" y2="1"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="5.3" y1="11" x2="2" y2="8.6"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="28.2" y1="4.1" x2="29.8" y2="1"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="34.7" y1="11" x2="37.9" y2="8.6"/></g></svg>',
'assets/media/microbit/event_when-broadcast-received_cyan.svg': '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 40 40"><g><path fill="#70E3F2" stroke="#1DB7CC" stroke-linecap="round" stroke-linejoin="round" d="M34,36H5.9c-1.1,0-2-0.9-2-2L4,17c0-0.6,0.3-1.2,0.8-1.6l14-10.5c0.7-0.5,1.7-0.5,2.4,0l14,10.5c0.5,0.4,0.8,1,0.8,1.6v17C36,35.1,35.1,36,34,36z"/><path fill="#F9F8FF" stroke="#1DB7CC" stroke-linecap="round" stroke-linejoin="round" d="M10,8h20c1.1,0,2,0.9,2,2v16c0,1.1-0.9,2-2,2H10c-1.1,0-2-0.9-2-2V10C8,8.9,8.9,8,10,8z"/><g opacity="0.1"><path fill="#231F20" d="M36.5,17v1c0,0.2-0.1,0.3-0.2,0.4l-14.9,9.3c-0.4,0.3-0.9,0.4-1.3,0.4c-0.5,0-0.9-0.1-1.3-0.4l-15-9.4c-0.1-0.1-0.2-0.3-0.2-0.4v-1.2c0.1-0.7,0.4-1.3,1-1.8l0.7-0.5c0.2-0.1,0.4-0.1,0.6,0l11.3,7l1.5-1.1c0.9-0.7,2.1-0.7,3,0l1.5,1.1l11.3-7.1c0.2-0.1,0.4-0.1,0.6,0l0.6,0.5C36.1,15.5,36.5,16.2,36.5,17z"/></g><path fill="#70E3F2" stroke="#1DB7CC" stroke-linecap="round" stroke-linejoin="round" d="M36,18l-14.9,9.3c-0.6,0.4-1.5,0.4-2.1,0L4,18v16c0,1.1,0.9,2,2,2h28c1.1,0,2-0.9,2-2V18z"/><path fill="#70E3F2" stroke="#1DB7CC" stroke-linecap="round" stroke-linejoin="round" d="M4.9,35l13.9-10.1c0.7-0.5,1.7-0.5,2.4,0L35,35"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="11.8" y1="4.1" x2="10.1" y2="1"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="5.3" y1="11" x2="2" y2="8.6"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="28.2" y1="4.1" x2="29.8" y2="1"/><line fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" x1="34.7" y1="11" x2="37.9" y2="8.6"/></g></svg>'
}
