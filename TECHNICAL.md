# Technical Documentation

## Architecture Overview

IndicaLuna is a Stream Deck plugin that communicates with 3D printers through the Moonraker API. It uses the Stream Deck JavaScript SDK v2 with Node.js 20 runtime.

## Plugin Structure

```
com.kainazzzo.indicaluna.sdPlugin/
├── manifest.json                 # Plugin configuration and action definitions
├── plugin.js                     # Main plugin logic (488 lines)
├── imgs/                         # Icons and images for actions
│   ├── plugin-icon.png           # Plugin icon
│   ├── category-icon.png         # Category icon
│   ├── display-icon.png          # Smart button icon
│   └── display-key.png           # Smart button key image
└── ui/                           # Property Inspectors
    ├── sdpi.css                  # Shared styles
    ├── sdpi.js                   # Shared PI logic (141 lines)
    └── button.html               # Smart button settings
```

## Components

### 1. Plugin Entry Point (plugin.js)

The main plugin file handles:
- WebSocket connection to Stream Deck
- Event handling (keyDown, willAppear, willDisappear, etc.)
- Action implementations
- State management
- API communication

#### Key Functions

**Connection Management**
```javascript
connectElgatoStreamDeckSocket(port, uuid, registerEvent, info)
```
Establishes WebSocket connection with Stream Deck software.

**Event Handlers**
- `handleKeyDown()` - Processes key press events
- `handleWillAppear()` - Initializes action when key appears
- `handleWillDisappear()` - Cleanup when key is removed
- `handleDidReceiveSettings()` - Updates settings

**Action Implementations**
- `handleButtonKeyDown()` / `handleButtonKeyUp()` - Handle press and hold G-code
- `startButtonPolling()` - Begins periodic HTTP polling
- `updateButtonDisplay()` - Fetches and displays data

### 2. Property Inspector (UI)

The Smart Button uses a single HTML-based Property Inspector for configuration:

**Common Elements (sdpi.js)**
- WebSocket connection to Stream Deck
- Settings persistence
- Auto-save on input change
- Two-way data binding

**Smart Button PI**
- Moonraker URL input
- Press G-code textarea (multiline)
- Hold G-code textarea (multiline)
- Hold duration input
- URL input
- Polling interval (numeric, validated 1000-60000ms)
- JSONPath expression
- Display template

### 3. Communication Flow

```
Stream Deck Software
         ↕ WebSocket
    Plugin (plugin.js)
         ↓ HTTP/JSON
    Moonraker API
         ↓
    3D Printer (Klipper)
```

## API Integration

### Moonraker G-code Endpoint

**Endpoint**: `POST /printer/gcode/script`

**Request Format**:
```json
{
  "script": "M140 S60\nM104 S200"
}
```

**Response Format**:
```json
{
  "result": "ok"
}
```

### Moonraker Query Endpoint

**Endpoint**: `GET /printer/objects/query?heater_bed`

**Response Format**:
```json
{
  "result": {
    "status": {
      "heater_bed": {
        "temperature": 65.3,
        "target": 60.0,
        "power": 0.5
      }
    }
  }
}
```

## Data Flow

### Smart Button Press/Hold Action

1. User presses Stream Deck key
2. `keyDown` event received
3. Hold timer starts
4. If held long enough, hold G-code is sent
5. If released before hold duration, press G-code is sent
6. HTTP POST to Moonraker `/printer/gcode/script`
7. Visual feedback sent to Stream Deck

### Smart Button Display

1. Key appears on Stream Deck
2. `willAppear` event received
3. `startButtonPolling()` called
4. Interval timer started
5. Every interval:
   a. HTTP GET to configured URL
   b. JSON response parsed
   c. JSONPath extraction applied
   d. Template applied to value
   e. Title updated on key
6. When key removed:
   - `willDisappear` event received
   - Polling stopped
   - Timer cleared

## JSONPath Implementation

A simplified JSONPath parser is implemented to extract data from JSON responses:

**Supported Syntax**:
- `$` - Root object
- `$.property` - Object property access
- `$.nested.property` - Nested property access
- `$.array[0]` - Array index access
- `$.object.array[1]` - Combined access

**Parser Algorithm**:
1. Remove leading `$` or `$.`
2. Parse path character by character
3. Handle brackets `[]` for array indices
4. Handle dots `.` for property access
5. Navigate through object structure
6. Return extracted value or null

**Example**:
```javascript
data = {
  result: {
    status: {
      heater_bed: {
        temperature: 65.3
      }
    }
  }
}

path = "$.result.status.heater_bed.temperature"
result = 65.3
```

## State Management

### Key Settings Storage

```javascript
const keySettings = new Map();
// Key: context (unique per Stream Deck key)
// Value: settings object
```

Settings include:
- Moonraker URL
- Action-specific parameters
- User preferences

### Polling Management

```javascript
const buttonPollers = new Map();
// Key: context (unique per Smart Button key)
// Value: interval timer ID
```

Each Smart Button maintains its own polling timer.

## Error Handling

### Network Errors
- Caught in async/await blocks
- Logged to console
- Visual feedback via `showAlert()`
- Display shows "Error" text

### Invalid Configuration
- Empty/missing URL → showAlert when G-code is sent
- Empty G-code → no action
- Invalid polling interval → defaults to 5000ms

### JSON Parsing Errors
- Caught in try-catch blocks
- Logged to console
- Returns null or error state

## Performance Considerations

### Polling Optimization
- Minimum interval: 1000ms (enforced)
- Maximum interval: 60000ms (enforced)
- Individual timers per key
- Automatic cleanup on key removal

### Memory Management
- Maps cleared on key removal
- Timers cleared on key removal
- No memory leaks from orphaned pollers

### Network Efficiency
- Uses native fetch API
- No external HTTP libraries
- Minimal payload sizes
- Configurable polling intervals

## Security Considerations

### Input Validation
- Polling interval validated and clamped
- JSONPath limited to safe operations
- No eval() or code execution

### Network Security
- HTTPS support (depends on Moonraker config)
- No authentication credentials stored
- Local network communication assumed

### Dependencies
- Zero npm dependencies
- No external libraries
- Native browser APIs only

## Testing Strategy

### Manual Testing Checklist

1. **Smart Button Press/Hold**
   - [ ] Short press sends press G-code
   - [ ] Hold sends hold G-code
   - [ ] Success feedback displayed
   - [ ] Error feedback on network failure
   - [ ] Settings persist across restarts

2. **Smart Button Display**
   - [ ] Initial data fetch on key appear
   - [ ] Periodic updates at correct interval
   - [ ] JSONPath extraction accuracy
   - [ ] Template formatting
   - [ ] Cleanup on key removal
   - [ ] Multiple display keys simultaneously

3. **Property Inspector**
   - [ ] Settings load correctly
   - [ ] Auto-save on change
   - [ ] Input validation
   - [ ] UI responsiveness

### Integration Testing

Test with real Moonraker instance:
- Temperature queries
- G-code execution
- Error scenarios (printer off, network down)
- Multiple concurrent operations

## Future Enhancements

Potential features for future versions:
1. WebSocket support for real-time updates
2. Authentication support (API keys)
3. Multiple printer profiles
4. Advanced JSONPath (filters, functions)
5. Custom icons per action
6. Conditional display formatting
7. Action chaining/macros
8. Print job management
9. Camera integration
10. Alert/notification system

## Debugging

### Enable Debug Mode

Stream Deck logs are available in:
- **Windows**: `%appdata%\Elgato\StreamDeck\logs`
- **macOS**: `~/Library/Logs/ElgatoStreamDeck`

Plugin-specific logs:
- Console.log statements throughout code
- WebSocket message logging
- Error stack traces

### Common Issues

1. **Plugin not loading**
   - Check manifest.json syntax
   - Verify Node.js version compatibility
   - Check Stream Deck software version

2. **Actions not responding**
   - Verify WebSocket connection
   - Check event handler registration
   - Review console logs

3. **API calls failing**
   - Test Moonraker endpoint directly
   - Verify network connectivity
   - Check CORS settings (if applicable)

## Code Quality

### Standards
- ES6+ JavaScript
- Async/await for asynchronous operations
- Consistent error handling
- Descriptive function names
- Inline documentation

### Metrics
- Total plugin code: ~488 lines
- Property Inspector code: ~141 lines
- HTML templates: ~105 lines
- Zero external dependencies
- Zero security vulnerabilities (CodeQL verified)

## License

MIT License - See LICENSE file for details
