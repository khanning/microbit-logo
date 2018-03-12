var frame;
var isiPad;
var DEGTOR = Math.PI/180;
var eventDispatch = {};
var t0;

////////////////////////////////////////
// Library calls
///////////////////////////////////////

function libInit(){
	isiPad = (window.orientation != undefined);
	frame = document.getElementById('frame');
	eventDispatch["start"] = isiPad ? "ontouchstart" : "onmousedown";
	eventDispatch["move"] = isiPad ? "ontouchmove" : "onmousemove";
	eventDispatch["end"] = isiPad ? "ontouchend" : "onmouseup";
}

function resett () {t0 = Date.now()}
function timer () {return Date.now() - t0}

function flatten(a){return [].concat.apply([], a);}

function rl(){window.location.reload(true);}

String.prototype.replaceAt=function(index, replacement) {
    return this.substr(0, index) + replacement+ this.substr(index + replacement.length);
}

function getDocumentHeight(){
	return	Math.max(document.body.clientHeight, document.documentElement.clientHeight);
}

function getDocumentWidth(){
	return Math.max(document.body.clientWidth, document.documentElement.clientWidth);
}

function newHTML(type, c, p) {
	var e = document.createElement(type);
	if (c) e.setAttribute ("class", c);
	if (p) p.appendChild(e);
	return e;
}

function waituntil (waitcond, fcn){
	if (waitcond()) fcn();
	else setTimeout(function (){waituntil(waitcond, fcn)}, 500);
}

function setCanvasSize(c, w, h){
	c.width = w;
	c.height = h;
	c.style.width = w+'px';
	c.style.height = h+'px';
}

function localx(el, gx){return gx-el.getBoundingClientRect().left;}
function localy(el, gy){return gy-el.getBoundingClientRect().top;}
function globalx(el){return el.getBoundingClientRect().left;}
function globaly(el){return el.getBoundingClientRect().top;}
function client2body (pt){return {x: pt.x +  document.body.scrollLeft, y: pt.y + document.body.scrollTop};}
function body2client (pt){return {x: pt.x -  document.body.scrollLeft, y: pt.y - document.body.scrollTop};}

function setProps(object, props){for(var i in props) object[i] = props[i];}
function rad(a){return a*2*Math.PI/360;}
function deg(a){return a*360/(2*Math.PI);}
function sindeg(x){return Math.sin(x*2*Math.PI/360);}
function cosdeg(x){return Math.cos(x*2*Math.PI/360);}
Number.prototype.mod = function(n) {return ((this%n)+n)%n;}
String.prototype.splice = function(start, delCount, newSubStr) { return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));};

function gn(str) {return document.getElementById(str);}

function getUrlVars(){
	if (window.location.href.indexOf('?') < 0) return [];
	var args = window.location.href.slice(window.location.href.indexOf('?') + 1);
	var vars = [], hash;
	
	var hashes = args.split('&');
	for(var i = 0; i < hashes.length; i++){
		hash = hashes[i].split('=');
		vars.push(hash[0]);
		vars[hash[0]] = hash[1];
	}
  return vars;
}

function findKeyframesRule(rulename){
	var ss = document.styleSheets;
  for (var i = 0; i < ss.length; ++i) {
  	for (var j = 0; j < ss[i].cssRules.length; ++j) {
  		if  (CSSStyleRule.prototype.isPrototypeOf(ss[i].cssRules[j])) {
  			var rule  = ss[i].cssRules[j];
  			if ( rulename ==rule.selectorText) return rule.style;
  		}
  		else if (ss[i].cssRules[j].styleSheet) {
  			var styles = ss[i].cssRules[j].styleSheet.rules;
  			for (var k = 0; k < styles.length; ++k) {
	 				if (styles[k].type == window.CSSRule.WEBKIT_KEYFRAMES_RULE && styles[k].name == rulename) return styles[k];
    		}
  		}
    }
  } // rule not found
  return null;
}
