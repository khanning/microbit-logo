
'use strict';

  
Blockly.Blocks['lights_clean'] = {
  init: function() {
    this.jsonInit({
      "message0": "clean",
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });
  }
};

Blockly.Blocks['lights_nextshape'] = {
  init: function() {
    this.jsonInit({
      "message0": "next shape",
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });
  }
};

Blockly.Blocks['lights_previousshape'] = {
  init: function() {
    this.jsonInit({
      "message0": "previous shape",
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });
  }
};



Blockly.Blocks['lights_scroll'] = {
  init: function() {
    this.jsonInit({
      "message0": "scroll %1",
        "args0": [
          {
            "type": "field_dropdown",
            "name": "SCROLL_OPTION",
            "options": [
              ['right', 'right'],
              ['left', 'left'],
              ['up', 'up'],
              ['down', 'down']
            ]
          }
        ],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });
  }
};

Blockly.Blocks['lights_setshape'] = {
  init: function() {
    this.jsonInit({
      "message0": "set shape %1",
      "args0": [
        {
          "type": "input_value",
          "name": "NUM"
        }
      ],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });
    
  }

};

Blockly.Blocks['lights_doton'] = {
  init: function() {
    this.jsonInit({
      "message0": "turn on x: %1 y: %2",
      "args0": [
        {
          "type": "input_value",
          "name": "X"
        },   
        {
          "type": "input_value",
          "name": "Y"
        }
      ],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });   
  }
};

Blockly.Blocks['lights_dotoff'] = {
  init: function() {
    this.jsonInit({
      "message0": "turn off x: %1 y: %2",
      "args0": [
        {
          "type": "input_value",
          "name": "X"
        },   
        {
          "type": "input_value",
          "name": "Y"
        }
      ],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });   
  }
};

Blockly.Blocks['lights_setpace'] = {
  init: function() {
    this.jsonInit({
      "message0": "set pace %1",
      "args0": [
        {
          "type": "input_value",
          "name": "NUM"
        }
      ],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });
    
  }

};

Blockly.Blocks['lights_brightness'] = {
  /**
   * Block for positive number value, with decimal.
   * @this Blockly.Block
   */
  init: function() {
  	let fcn  = function(option) {return Math.max (1, Math.min(option, 100));}  
    this.jsonInit({
      "message0": "%1",
      "args0": [
        {
          "type": "field_number",
          "name": "NUM",
          "min": 1,
          "max": 100,
          "value": 100,
          'precision': 1,
          "validator": fcn
        }
      ],
      "output": "Number",
      "outputShape": Blockly.OUTPUT_SHAPE_ROUND,
      "colour": Blockly.Colours.motion.primary,
      "colourSecondary": Blockly.Colours.textField,
      "colourTertiary": Blockly.Colours.textField
    });
  }
};

Blockly.Blocks['lights_shape'] = {
  init: function() {
    this.jsonInit({
      "message0": "shape",
      "category": Blockly.Categories.motion,
      "checkboxInFlyout": false,
   	  "extensions": ["colours_motion", "output_number"]  
    });
 
  }

};


Blockly.Blocks['lights_setbrightness'] = {
  init: function() {
    this.jsonInit({
      "message0": "set brightness %1",
      "args0": [
        {
          "type": "input_value",
          "name": "NUM"
        }
      ],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });
    
  }

};

Blockly.Blocks['lights_print'] = {
  init: function() {
    this.jsonInit({
      "message0": "print %1",
      "args0": [
        {
          "type": "input_value",
          "name": "TEXT"
        }
      ],
      "category": Blockly.Categories.motion,
      "extensions": ["colours_motion", "shape_statement"]
    });
    
  }

};
