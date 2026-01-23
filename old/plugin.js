/**
 * IndicaLuna Stream Deck Plugin
 * Controls 3D printers via Moonraker API
 */

// Log helpers
const LOG_PREFIX = '[IndicaLuna]';

function logInfo(...args) {
  console.log(LOG_PREFIX, ...args);
}

function logWarn(...args) {
  console.warn(LOG_PREFIX, ...args);
}

function logError(...args) {
  console.error(LOG_PREFIX, ...args);
}

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
    logInfo('WebSocket connected');
    
    // Register plugin
    const json = {
      event: inRegisterEvent,
      uuid: inPluginUUID
    };
    
    safeSend(json, 'registerPlugin');
  };
  
  // WebSocket message received
  websocket.onmessage = function(evt) {
    try {
      const jsonObj = JSON.parse(evt.data);
      const event = jsonObj.event;
      const action = jsonObj.action;
      const context = jsonObj.context;
      
      logInfo('Received event:', event, 'action:', action);
      
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
      logError('Error parsing message:', e);
    }
  };
  
  // WebSocket error
  websocket.onerror = function(evt) {
    logError('WebSocket error:', evt);
  };
  
  // WebSocket closed
  websocket.onclose = function() {
    logWarn('WebSocket closed');
  };
}

/**
 * Handle key down event
 */
function handleKeyDown(action, context, payload) {
  const settings = payload.settings || {};
  
  logInfo('Handle keyDown', { action, context, payload });
  if (action === ACTIONS.BUTTON) {
    handleButtonKeyDown(context, settings);
  } else {
    logWarn('Unhandled keyDown action', action);
  }
}

/**
 * Handle key up event
 */
function handleKeyUp(action, context, payload) {
  const settings = payload.settings || {};
  
  logInfo('Handle keyUp', { action, context, payload });
  if (action === ACTIONS.BUTTON) {
    handleButtonKeyUp(context, settings);
  } else {
    logWarn('Unhandled keyUp action', action);
  }
}

/**
 * Handle will appear event
 */
function handleWillAppear(action, context, payload) {
  const settings = payload.settings || {};
  keySettings.set(context, settings);
  
  logInfo('Action appeared', { action, context, settings, payload });
  
  if (action === ACTIONS.BUTTON) {
    startButtonPolling(context, settings);
  } else {
    logWarn('Unhandled willAppear action', action);
  }
}

/**
 * Handle will disappear event
 */
function handleWillDisappear(action, context) {
  logInfo('Action disappeared', { action, context });
  
  if (action === ACTIONS.BUTTON) {
    stopButtonPolling(context);
  } else {
    logWarn('Unhandled willDisappear action', action);
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
  
  logInfo('Received settings', { action, context, settings, payload });
  
  if (action === ACTIONS.BUTTON) {
    // Restart polling with new settings
    stopButtonPolling(context);
    startButtonPolling(context, settings);
  } else {
    logWarn('Unhandled didReceiveSettings action', action);
  }
}

/**
 * Handle property inspector appeared event
 */
function handlePropertyInspectorDidAppear(action, context) {
  logInfo('Property inspector appeared', { action, context });
}

/**
 * Handle message from property inspector
 */
function handleSendToPlugin(action, context, payload) {
  logInfo('Received from PI', { action, context, payload });
  
  // Update settings if needed
  if (payload.settings) {
    keySettings.set(context, payload.settings);
  }
}

/**
 * Handle button key down
 */
function handleButtonKeyDown(context, settings) {
  logInfo('Button key down', { context, settings });
  clearHoldTimer(context);
  
  const holdDelay = getHoldDelay(settings);
  const holdGcode = (settings.holdGcode || '').trim();
  
  if (!holdGcode) {
    logInfo('No hold G-code configured', { context });
    holdTimers.set(context, { timerId: null, fired: false });
    return;
  }
  
  const timerId = setTimeout(() => {
    const timerState = holdTimers.get(context);
    if (!timerState) {
      logWarn('Hold timer fired but state missing', { context });
      return;
    }
    
    timerState.fired = true;
    sendConfiguredGcode(context, settings, holdGcode, 'hold');
    logInfo('Hold G-code dispatched', { context, holdDelay });
  }, holdDelay);
  
  holdTimers.set(context, { timerId, fired: false });
  logInfo('Hold timer started', { context, holdDelay });
}

/**
 * Handle button key up
 */
function handleButtonKeyUp(context, settings) {
  const timerState = holdTimers.get(context);
  const pressGcode = (settings.pressGcode || '').trim();
  
  logInfo('Button key up', { context, settings, timerState });
  if (timerState && timerState.timerId) {
    clearTimeout(timerState.timerId);
    logInfo('Cleared hold timer', { context });
  }
  
  if (!timerState || !timerState.fired) {
    sendConfiguredGcode(context, settings, pressGcode, 'press');
    logInfo('Press G-code dispatched', { context });
  }
  
  holdTimers.delete(context);
  logInfo('Hold timer state cleared', { context });
}

/**
 * Clear hold timer for context
 */
function clearHoldTimer(context) {
  const timerState = holdTimers.get(context);
  
  if (timerState && timerState.timerId) {
    clearTimeout(timerState.timerId);
    logInfo('Cleared hold timer from clearHoldTimer', { context });
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
  logInfo('Computed hold delay', { holdDelay, settings });
  return holdDelay;
}

/**
 * Send configured G-code if present
 */
async function sendConfiguredGcode(context, settings, gcode, label) {
  const moonrakerUrl = settings.moonrakerUrl || '';
  
  if (!gcode) {
    logInfo(`No ${label} G-code configured`, { context, settings });
    return;
  }
  
  if (!moonrakerUrl) {
    showAlert(context);
    logError('Moonraker URL not configured', { context, settings });
    return;
  }
  
  try {
    logInfo(`Preparing to send ${label} G-code`, { moonrakerUrl, gcode });
    await sendGcode(moonrakerUrl, gcode);
    showOk(context);
    logInfo(`${label} G-code sent successfully`);
  } catch (error) {
    showAlert(context);
    logError(`Error sending ${label} G-code:`, error, { context, settings });
  }
}

/**
 * Send G-code via Moonraker API
 */
async function sendGcode(moonrakerUrl, gcode) {
  const url = `${moonrakerUrl}/printer/gcode/script`;
  const payload = {
    script: gcode
  };
  
  logInfo('Sending request to Moonraker', url);
  logInfo('Moonraker payload', JSON.stringify(payload));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    logInfo('Moonraker response status', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    logError('Moonraker request failed', error);
    throw error;
  }
}

/**
 * Start polling for button action
 */
function startButtonPolling(context, settings) {
  const url = settings.url || '';
  let interval = parseInt(settings.interval || '5000', 10);
  
  logInfo('Start button polling requested', { context, settings });
  // Validate interval (minimum 1000ms, maximum 60000ms)
  if (isNaN(interval) || interval < 1000) {
    interval = 5000;
  } else if (interval > 60000) {
    interval = 60000;
  }
  
  if (!url) {
    logInfo('URL not configured for button action', { context, settings });
    return;
  }
  
  // Initial update
  updateButtonDisplay(context, settings);
  logInfo('Initial button display update queued', { context });
  
  // Start polling
  const pollerId = setInterval(() => {
    updateButtonDisplay(context, settings);
  }, interval);
  
  buttonPollers.set(context, pollerId);
  logInfo('Started polling for context:', context, 'interval:', interval);
}

/**
 * Stop polling for button action
 */
function stopButtonPolling(context) {
  const pollerId = buttonPollers.get(context);
  
  if (pollerId) {
    clearInterval(pollerId);
    buttonPollers.delete(context);
    logInfo('Stopped polling for context:', context);
  } else {
    logWarn('Stop polling requested but no poller found', { context });
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
    logInfo('Updating button display', { url, jsonPath, template });
    const response = await fetch(url);
    
    logInfo('Display response status', response.status);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    logInfo('Display response payload received', { context, url });
    
    // Extract value using JSONPath
    const value = extractJsonPath(data, jsonPath);
    logInfo('Extracted JSONPath value', { jsonPath, value });
    
    // Apply template
    const title = applyTemplate(template, value);
    logInfo('Applied template for title', { template, title });
    
    // Update key title
    setTitle(context, title);
    
    logInfo('Button display updated:', title);
  } catch (error) {
    setTitle(context, 'Error');
    logError('Error updating display:', error);
  }
}

/**
 * Extract value using JSONPath (simplified implementation)
 */
function extractJsonPath(data, path) {
  logInfo('Extracting JSONPath', { path });
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
      logWarn('JSONPath traversal hit null/undefined', { part, path });
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
  logInfo('Applying template', { template, value });
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
  logInfo('Setting title', { context, title });
  const json = {
    event: 'setTitle',
    context: context,
    payload: {
      title: String(title),
      target: 0
    }
  };
  
  safeSend(json, 'setTitle');
}

/**
 * Show OK feedback on key
 */
function showOk(context) {
  logInfo('Showing OK', { context });
  const json = {
    event: 'showOk',
    context: context
  };
  
  safeSend(json, 'showOk');
}

/**
 * Show alert feedback on key
 */
function showAlert(context) {
  logInfo('Showing alert', { context });
  const json = {
    event: 'showAlert',
    context: context
  };
  
  safeSend(json, 'showAlert');
}

/**
 * Safely send message to Stream Deck
 */
function safeSend(payload, label) {
  if (!websocket) {
    logError('WebSocket not initialized for send', label);
    return;
  }
  if (websocket.readyState !== WebSocket.OPEN) {
    logWarn('WebSocket not open for send', label, 'state:', websocket.readyState);
    return;
  }
  
  try {
    const message = JSON.stringify(payload);
    logInfo('Sending Stream Deck message', label, message);
    websocket.send(message);
  } catch (error) {
    logError('Failed to send Stream Deck message', label, error);
  }
}
