/**
 * Listens for the app launching then creates the window
 *
 * @see http://developer.chrome.com/apps/app.runtime.html
 * @see http://developer.chrome.com/apps/app.window.html
 */
chrome.app.runtime.onLaunched.addListener(function() {
  // Center window on screen.
  var screenWidth = screen.availWidth;
  var screenHeight = screen.availHeight;
	var spec  = {
    id: "microbitScratch3",
    outerBounds: {
      width: screenWidth,
      height: screenHeight,
      left: 0,
      top: 0
    }
  };

 var closefcn = function(win) { 
  win.onClosed.addListener(function () {closeAll()});
 };

 chrome.app.window.create('index.html', spec, closefcn);  
 
});

function closeAll (){
	chrome.serial.getConnections(closeStrayPorts);

	function closeStrayPorts(l){
 		for(var i=0;i<l.length;i++) {
 			let id = l[i].connectionId;
 			chrome.serial.disconnect(id, (res)=>{})
 		}
 	}
}

