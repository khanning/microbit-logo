/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2016 Massachusetts Institute of Technology
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

'use strict';

Blockly.Blocks['events_onbuttona'] = {
  init: function() {
    this.jsonInit({
      "message0": Defs.translation.editor.blocks["onpressed"],
      "args0": [
        {
 "type": "field_image",
 "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/event_onpressa.svg",
 "width": 32,
 "height": 32,
 "alt": "playicon",
 "flip_rtl": false
        }
      ],
      "category": Blockly.Categories.event,
      "extensions": ["colours_event", "shape_hat"]
    });
  }
};

Blockly.Blocks['events_onbuttonab'] = {
  init: function() {
    this.jsonInit({
      "message0": Defs.translation.editor.blocks["onpressed2"],
      "args0": [
        {
 "type": "field_image",
 "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/event_onpressa.svg",
 "width": 32,
 "height": 32,
 "alt": "playicon",
 "flip_rtl": false
        },
        {
 "type": "field_image",
 "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/event_onpressb.svg",
 "width": 32,
 "height": 32,
 "alt": "playicon",
 "flip_rtl": false
        }
      ],
      "category": Blockly.Categories.event,
      "extensions": ["colours_event", "shape_hat"]
    });
  }
};

Blockly.Blocks['events_onbuttonb'] = {
  init: function() {
    this.jsonInit({
      "message0": Defs.translation.editor.blocks["onpressed"],
      "args0": [
        {
 "type": "field_image",
 "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/event_onpressb.svg",
 "width": 32,
 "height": 32,
 "alt": "playicon",
 "flip_rtl": false
        }
      ],
      "category": Blockly.Categories.event,
      "extensions": ["colours_event", "shape_hat"]
    });
  }
};


Blockly.Blocks['events_onreceive'] = {
  init: function() {
    this.jsonInit({
      "id": "events_broadcast",
      "message0": Defs.translation.editor.blocks["onreceive"],
      "args0": [
    		{
				 "type": "field_dropdown",
				 "name": "BROADCAST_OPTION",
				 "options":[
						 [{"type": "field_image", "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/event_when-broadcast-received_coral.svg","width": 36, "height": 36, "alt": Defs.translation.editor.blocks["menu_coral"], "flip_rtl": true}, '0'],
							[{"type": "field_image", "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/event_when-broadcast-received_yellow.svg", "width": 36, "height": 36, "alt": Defs.translation.editor.blocks["menu_yellow"], "flip_rtl": true}, '1'],
							[{"type": "field_image", "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/event_when-broadcast-received_green.svg","width": 36, "height": 36,"alt": Defs.translation.editor.blocks["menu_green"], "flip_rtl": true}, '2'],
						 	[{"type": "field_image", "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/event_when-broadcast-received_blue.svg","width": 36, "height": 36, "alt": Defs.translation.editor.blocks["menu_blue"],"flip_rtl": true}, '3'],
						 	[{"type": "field_image", "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/event_when-broadcast-received_purple.svg","width": 36, "height": 36, "alt": Defs.translation.editor.blocks["menu_purple"],"flip_rtl": true}, '4'],
					 		[{"type": "field_image", "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/event_when-broadcast-received_magenta.svg","width": 36, "height": 36, "alt": Defs.translation.editor.blocks["menu_magenta"],"flip_rtl": true}, '5']
							]
    		}
      ],
      "category": Blockly.Categories.event,
      "extensions": ["colours_event",  "shape_hat"]
    });
  }
};



Blockly.Blocks['events_broadcast'] = {
  init: function() {
    this.jsonInit({
      "id": "events_broadcast",
      "message0": Defs.translation.editor.blocks["broadcast"],
      "args0": [
        {
				 "type": "field_dropdown",
				 "name": "BROADCAST_OPTION",
				 "options":[
						 [{"type": "field_image", "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/event_broadcast_coral.svg","width": 36, "height": 36, "alt": Defs.translation.editor.blocks["menu_coral"], "flip_rtl": true}, '0'],
							 [{"type": "field_image", "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/event_broadcast_yellow.svg", "width": 36, "height": 36, "alt": Defs.translation.editor.blocks["menu_yellow"], "flip_rtl": true}, '1'],
					 [{"type": "field_image", "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/event_broadcast_green.svg","width": 36, "height": 36,"alt": Defs.translation.editor.blocks["menu_green"], "flip_rtl": true}, '2'],
								 [{"type": "field_image", "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/event_broadcast_blue.svg","width": 36, "height": 36, "alt":Defs.translation.editor.blocks["menu_blue"],"flip_rtl": true}, '3'],
						 [{"type": "field_image", "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/event_broadcast_purple.svg","width": 36, "height": 36, "alt": Defs.translation.editor.blocks["menu_purple"],"flip_rtl": true}, '4'],
				 [{"type": "field_image", "src": Blockly.mainWorkspace.options.pathToMedia + "microbit/event_broadcast_magenta.svg","width": 36, "height": 36, "alt": Defs.translation.editor.blocks["menu_magenta"],"flip_rtl": true}, '5']
						]
    		}
      ],
      "category": Blockly.Categories.event,
      "extensions": ["colours_event",  "shape_statement"]
    });
  }
};



