/**
 * Property Inspector Common Functions
 */

let websocket = null;
let uuid = null;
let actionInfo = {};
let inInfo = {};
let settings = {};

/**
 * Connect to Stream Deck
 */
function connectElgatoStreamDeckSocket(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
  uuid = inPropertyInspectorUUID;
  
  if (inActionInfo) {
    try {
      actionInfo = JSON.parse(inActionInfo);
      settings = actionInfo.payload.settings || {};
    } catch (e) {
      console.error('Error parsing action info:', e);
    }
  }
  
  if (inInfo) {
    try {
      inInfo = JSON.parse(inInfo);
    } catch (e) {
      console.error('Error parsing info:', e);
    }
  }
  
  // Create WebSocket
  websocket = new WebSocket('ws://127.0.0.1:' + inPort);
  
  websocket.onopen = function() {
    // Register property inspector
    const json = {
      event: inRegisterEvent,
      uuid: inPropertyInspectorUUID
    };
    websocket.send(JSON.stringify(json));
    
    // Load settings into form
    loadSettings();
  };
  
  websocket.onmessage = function(evt) {
    try {
      const jsonObj = JSON.parse(evt.data);
      
      if (jsonObj.event === 'didReceiveSettings') {
        settings = jsonObj.payload.settings || {};
        loadSettings();
      } else if (jsonObj.event === 'sendToPropertyInspector') {
        // Handle messages from plugin
        if (jsonObj.payload) {
          console.log('Received from plugin:', jsonObj.payload);
        }
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  };
  
  websocket.onerror = function(evt) {
    console.error('WebSocket error:', evt);
  };
  
  websocket.onclose = function() {
    console.log('WebSocket closed');
  };
}

/**
 * Save settings to Stream Deck
 */
function saveSettings(newSettings) {
  settings = Object.assign({}, settings, newSettings);
  
  const json = {
    event: 'setSettings',
    context: uuid,
    payload: settings
  };
  
  if (websocket && websocket.readyState === 1) {
    websocket.send(JSON.stringify(json));
  }
}

/**
 * Send data to plugin
 */
function sendToPlugin(payload) {
  const json = {
    action: actionInfo.action,
    event: 'sendToPlugin',
    context: uuid,
    payload: payload
  };
  
  if (websocket && websocket.readyState === 1) {
    websocket.send(JSON.stringify(json));
  }
}

/**
 * Load settings into form (to be implemented by each PI)
 */
function loadSettings() {
  // Override this in each property inspector
  console.log('Loading settings:', settings);
}

/**
 * Setup auto-save on input change
 */
function setupAutoSave() {
  const inputs = document.querySelectorAll('input, textarea, select');
  
  inputs.forEach(input => {
    input.addEventListener('change', function() {
      const key = this.getAttribute('data-setting');
      if (key) {
        const value = this.value;
        const newSettings = {};
        newSettings[key] = value;
        saveSettings(newSettings);
      }
    });
  });
}

// Setup auto-save when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAutoSave);
} else {
  setupAutoSave();
}
