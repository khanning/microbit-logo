/* Paula Bontá 2016 */

SVGTools = function() {};

SVGTools.xmlns =  "http://www.w3.org/2000/svg";
SVGTools.startx = 0;
SVGTools.starty = 0;
SVGTools.pathx = 0;
SVGTools.pathy = 0;
SVGTools.angle = 0;
SVGTools.aCurve = false;

SVGTools.create = function(parent, w,h){
	var el = document.createElementNS(SVGTools.xmlns,"svg");
	el.setAttributeNS(null, 'version', 1.1);
	if (w) el.setAttributeNS(null,'width',w);
	if (h) el.setAttributeNS(null, 'height', h);
	if (parent) parent.appendChild(el);
	return el;
}

SVGTools.setSVGSize = function(el, w,h){
	el.setAttributeNS(null, 'version', 1.1);
	if (w) el.setAttributeNS(null,'width',w);
	if (h) el.setAttributeNS(null, 'height', h);
}

SVGTools.addChild = function (div, type, attr){
	var	shape = document.createElementNS(SVGTools.xmlns, type);
	for (var val in attr) shape.setAttribute(val, attr[val]);
	if (div) div.appendChild(shape);
	return shape;
}

SVGTools.getCopy = function(spr){return SVGTools.toObject(SVGTools.svg2string(spr));}

SVGTools.svg2string = function(elem){
	var str = (new XMLSerializer()).serializeToString(elem);
	var header =  '<svg xmlns="' +  SVGTools.xmlns + '" xmlns:xlink="' + SVGTools.xmlnslink + '">';
	str = str.replace(/ href="data:image/g,' xlink:href="data:image');	
	return header + str + '</svg>';
}

SVGTools.toObject= function(str){
	str.replace(/>\s*</g,'><');
	var xmlDoc = (new DOMParser()).parseFromString(str, "text/xml");
	var node = document.importNode(xmlDoc.documentElement.firstChild, true);
	return node;
}

 SVGTools.createGroup = function(parent, id){
	var el = document.createElementNS(SVGTools.xmlns,"g");
	if (id) el.setAttribute("id", id);
	if (parent) parent.appendChild(el);
	return el;
}

SVGTools.stringToXML = function (str){
	str = str.replace(/>\s*</g,'><');
	var xmlDoc=new DOMParser().parseFromString(str, "text/xml");
	var extxml = document.importNode(xmlDoc.documentElement, true);
	return extxml;
}

SVGTools.requestFromServer =function (url, whenDone) { 
  var xmlrequest=new XMLHttpRequest();
  xmlrequest.addEventListener("error", transferFailed, false);
  xmlrequest.onreadystatechange=  function(){
    if (xmlrequest.readyState == 4)  whenDone(SVGTools.stringToXML(xmlrequest.responseText));
    }
  xmlrequest.open("GET", url, true);
  xmlrequest.send(null);    
  function transferFailed(e){
    e.preventDefault();
    e.stopPropagation();
    console.log ("Failed Loading", url);
  }
}