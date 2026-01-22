/**
 * IndicaLuna Stream Deck Plugin
 * Controls 3D printers via Moonraker API
 */

// Action UUIDs
const ACTIONS = {
  BUTTON: 'com.kainazzzo.indicaluna.button'
};

// Store for button polling intervals
const buttonPollers = new Map();

// Store for press/hold timers
const holdTimers = new Map();

// Store for key settings
const keySettings = new Map();

// WebSocket connection to Stream Deck
let websocket = null;
let pluginUUID = null;

/**
 * Connect to the Stream Deck
 */
function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
  pluginUUID = inPluginUUID;
  
  // Create WebSocket
  websocket = new WebSocket('ws://127.0.0.1:' + inPort);
  
  // WebSocket opened
  websocket.onopen = function() {
    console.log('WebSocket connected');
    
    // Register plugin
    const json = {
      event: inRegisterEvent,
      uuid: inPluginUUID
    };
    
    websocket.send(JSON.stringify(json));
  };
  
  // WebSocket message received
  websocket.onmessage = function(evt) {
    try {
      const jsonObj = JSON.parse(evt.data);
      const event = jsonObj.event;
      const action = jsonObj.action;
      const context = jsonObj.context;
      
      console.log('Received event:', event, 'action:', action);
      
      // Handle events
      if (event === 'keyDown') {
        handleKeyDown(action, context, jsonObj.payload);
      } else if (event === 'keyUp') {
        handleKeyUp(action, context, jsonObj.payload);
      } else if (event === 'willAppear') {
        handleWillAppear(action, context, jsonObj.payload);
      } else if (event === 'willDisappear') {
        handleWillDisappear(action, context);
      } else if (event === 'didReceiveSettings') {
        handleDidReceiveSettings(action, context, jsonObj.payload);
      } else if (event === 'propertyInspectorDidAppear') {
        handlePropertyInspectorDidAppear(action, context);
      } else if (event === 'sendToPlugin') {
        handleSendToPlugin(action, context, jsonObj.payload);
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  };
  
  // WebSocket error
  websocket.onerror = function(evt) {
    console.error('WebSocket error:', evt);
  };
  
  // WebSocket closed
  websocket.onclose = function() {
    console.log('WebSocket closed');
  };
}

/**
 * Handle key down event
 */
function handleKeyDown(action, context, payload) {
  const settings = payload.settings || {};
  
  if (action === ACTIONS.BUTTON) {
    handleButtonKeyDown(context, settings);
  }
}

/**
 * Handle key up event
 */
function handleKeyUp(action, context, payload) {
  const settings = payload.settings || {};
  
  if (action === ACTIONS.BUTTON) {
    handleButtonKeyUp(context, settings);
  }
}

/**
 * Handle will appear event
 */
function handleWillAppear(action, context, payload) {
  const settings = payload.settings || {};
  keySettings.set(context, settings);
  
  console.log('Action appeared:', action, 'settings:', settings);
  
  if (action === ACTIONS.BUTTON) {
    startButtonPolling(context, settings);
  }
}

/**
 * Handle will disappear event
 */
function handleWillDisappear(action, context) {
  console.log('Action disappeared:', action);
  
  if (action === ACTIONS.BUTTON) {
    stopButtonPolling(context);
  }
  
  clearHoldTimer(context);
  keySettings.delete(context);
}

/**
 * Handle settings received event
 */
function handleDidReceiveSettings(action, context, payload) {
  const settings = payload.settings || {};
  keySettings.set(context, settings);
  
  console.log('Received settings:', settings);
  
  if (action === ACTIONS.BUTTON) {
    // Restart polling with new settings
    stopButtonPolling(context);
    startButtonPolling(context, settings);
  }
}

/**
 * Handle property inspector appeared event
 */
function handlePropertyInspectorDidAppear(action, context) {
  console.log('Property inspector appeared for action:', action);
}

/**
 * Handle message from property inspector
 */
function handleSendToPlugin(action, context, payload) {
  console.log('Received from PI:', payload);
  
  // Update settings if needed
  if (payload.settings) {
    keySettings.set(context, payload.settings);
  }
}

/**
 * Handle button key down
 */
function handleButtonKeyDown(context, settings) {
  clearHoldTimer(context);
  
  const holdDelay = getHoldDelay(settings);
  const holdGcode = (settings.holdGcode || '').trim();
  
  if (!holdGcode) {
    holdTimers.set(context, { timerId: null, fired: false });
    return;
  }
  
  const timerId = setTimeout(() => {
    const timerState = holdTimers.get(context);
    if (!timerState) {
      return;
    }
    
    timerState.fired = true;
    sendConfiguredGcode(context, settings, holdGcode, 'hold');
  }, holdDelay);
  
  holdTimers.set(context, { timerId, fired: false });
}

/**
 * Handle button key up
 */
function handleButtonKeyUp(context, settings) {
  const timerState = holdTimers.get(context);
  const pressGcode = (settings.pressGcode || '').trim();
  
  if (timerState && timerState.timerId) {
    clearTimeout(timerState.timerId);
  }
  
  if (!timerState || !timerState.fired) {
    sendConfiguredGcode(context, settings, pressGcode, 'press');
  }
  
  holdTimers.delete(context);
}

/**
 * Clear hold timer for context
 */
function clearHoldTimer(context) {
  const timerState = holdTimers.get(context);
  
  if (timerState && timerState.timerId) {
    clearTimeout(timerState.timerId);
  }
  
  holdTimers.delete(context);
}

/**
 * Get hold delay from settings
 */
function getHoldDelay(settings) {
  let holdDelay = parseInt(settings.holdDelay, 10);

  if (isNaN(holdDelay)) {
    // Default hold delay when not configured or invalid
    holdDelay = 750;
  } else if (holdDelay < 300) {
    // Clamp to minimum allowed by the HTML min attribute
    holdDelay = 300;
  } else if (holdDelay > 5000) {
    // Clamp to maximum allowed by the HTML max attribute
    holdDelay = 5000;
  }
  return holdDelay;
}

/**
 * Send configured G-code if present
 */
async function sendConfiguredGcode(context, settings, gcode, label) {
  const moonrakerUrl = settings.moonrakerUrl || '';
  
  if (!gcode) {
    console.log(`No ${label} G-code configured`);
    return;
  }
  
  if (!moonrakerUrl) {
    showAlert(context);
    console.error('Moonraker URL not configured');
    return;
  }
  
  try {
    await sendGcode(moonrakerUrl, gcode);
    showOk(context);
    console.log(`${label} G-code sent successfully`);
  } catch (error) {
    showAlert(context);
    console.error(`Error sending ${label} G-code:`, error);
  }
}

/**
 * Send G-code via Moonraker API
 */
async function sendGcode(moonrakerUrl, gcode) {
  const url = `${moonrakerUrl}/printer/gcode/script`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      script: gcode
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Start polling for button action
 */
function startButtonPolling(context, settings) {
  const url = settings.url || '';
  let interval = parseInt(settings.interval || '5000', 10);
  
  // Validate interval (minimum 1000ms, maximum 60000ms)
  if (isNaN(interval) || interval < 1000) {
    interval = 5000;
  } else if (interval > 60000) {
    interval = 60000;
  }
  
  if (!url) {
    console.log('URL not configured for button action');
    return;
  }
  
  // Initial update
  updateButtonDisplay(context, settings);
  
  // Start polling
  const pollerId = setInterval(() => {
    updateButtonDisplay(context, settings);
  }, interval);
  
  buttonPollers.set(context, pollerId);
  console.log('Started polling for context:', context, 'interval:', interval);
}

/**
 * Stop polling for button action
 */
function stopButtonPolling(context) {
  const pollerId = buttonPollers.get(context);
  
  if (pollerId) {
    clearInterval(pollerId);
    buttonPollers.delete(context);
    console.log('Stopped polling for context:', context);
  }
}

/**
 * Update button display
 */
async function updateButtonDisplay(context, settings) {
  const url = settings.url || '';
  const jsonPath = settings.jsonPath || '$';
  const template = settings.template || '{value}';
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract value using JSONPath
    const value = extractJsonPath(data, jsonPath);
    
    // Apply template
    const title = applyTemplate(template, value);
    
    // Update key title
    setTitle(context, title);
    
    console.log('Button display updated:', title);
  } catch (error) {
    setTitle(context, 'Error');
    console.error('Error updating display:', error);
  }
}

/**
 * Extract value using JSONPath (simplified implementation)
 */
function extractJsonPath(data, path) {
  if (path === '$') {
    return data;
  }
  
  // Simple JSONPath implementation
  // Remove leading '$.' or '$' if present
  let cleanPath = path.replace(/^\$\.?/, '');
  
  // Parse path into parts handling both dot notation and bracket notation
  const parts = [];
  let current = '';
  let inBracket = false;
  
  for (let i = 0; i < cleanPath.length; i++) {
    const char = cleanPath[i];
    
    if (char === '[') {
      if (current) {
        parts.push(current);
        current = '';
      }
      inBracket = true;
    } else if (char === ']') {
      if (current) {
        parts.push(current);
        current = '';
      }
      inBracket = false;
    } else if (char === '.' && !inBracket) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    parts.push(current);
  }
  
  // Navigate through the data structure
  let result = data;
  for (const part of parts) {
    if (result === null || result === undefined) {
      return null;
    }
    
    // Handle array indices and object properties
    if (/^\d+$/.test(part)) {
      result = result[parseInt(part, 10)];
    } else {
      result = result[part];
    }
  }
  
  return result;
}

/**
 * Apply template to value
 */
function applyTemplate(template, value) {
  if (typeof value === 'object') {
    // If value is object, try to stringify it
    value = JSON.stringify(value);
  }
  
  // Simple template replacement
  return template.replace(/\{value\}/g, value);
}

/**
 * Set title on key
 */
function setTitle(context, title) {
  const json = {
    event: 'setTitle',
    context: context,
    payload: {
      title: String(title),
      target: 0
    }
  };
  
  websocket.send(JSON.stringify(json));
}

/**
 * Show OK feedback on key
 */
function showOk(context) {
  const json = {
    event: 'showOk',
    context: context
  };
  
  websocket.send(JSON.stringify(json));
}

/**
 * Show alert feedback on key
 */
function showAlert(context) {
  const json = {
    event: 'showAlert',
    context: context
  };
  
  websocket.send(JSON.stringify(json));
}
