# Technical Documentation

## Architecture Overview

IndicaLuna is a Stream Deck plugin that communicates with 3D printers through the Moonraker API. It uses the Stream Deck JavaScript SDK v2 with Node.js 20 runtime.

## Plugin Structure

```
com.kainazzzo.indicaluna.sdPlugin/
├── manifest.json                 # Plugin configuration and action definitions
├── plugin.js                     # Main plugin logic (434 lines)
├── imgs/                         # Icons and images for actions
│   ├── plugin-icon.png           # Plugin icon
│   ├── category-icon.png         # Category icon
│   ├── preheat-icon.png          # Preheat action icon
│   ├── preheat-key.png           # Preheat key image
│   ├── gcode-icon.png            # G-code action icon
│   ├── gcode-key.png             # G-code key image
│   ├── display-icon.png          # Display action icon
│   └── display-key.png           # Display key image
└── ui/                           # Property Inspectors
    ├── sdpi.css                  # Shared styles
    ├── sdpi.js                   # Shared PI logic (141 lines)
    ├── preheat.html              # Preheat action settings
    ├── gcode.html                # G-code action settings
    └── display.html              # Display action settings
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
- `handlePreheat()` - Sends M140/M104 commands for temperature control
- `handleCustomGcode()` - Sends arbitrary G-code
- `startDisplayPolling()` - Begins periodic HTTP polling
- `updateDisplay()` - Fetches and displays data

### 2. Property Inspectors (UI)

Each action has its own HTML-based Property Inspector for configuration:

**Common Elements (sdpi.js)**
- WebSocket connection to Stream Deck
- Settings persistence
- Auto-save on input change
- Two-way data binding

**Preheat PI**
- Moonraker URL input
- Bed temperature (numeric)
- Nozzle temperature (numeric)

**Custom G-code PI**
- Moonraker URL input
- G-code textarea (multiline)

**Display PI**
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

### Preheat Action

1. User presses Stream Deck key
2. `keyDown` event received
3. `handlePreheat()` called
4. Settings retrieved (bed temp, nozzle temp, URL)
5. G-code constructed: `M140 S{bed}\nM104 S{nozzle}`
6. HTTP POST to Moonraker `/printer/gcode/script`
7. Visual feedback sent to Stream Deck (showOk/showAlert)

### Custom G-code Action

1. User presses Stream Deck key
2. `keyDown` event received
3. `handleCustomGcode()` called
4. Settings retrieved (gcode, URL)
5. HTTP POST to Moonraker `/printer/gcode/script`
6. Visual feedback sent to Stream Deck

### Display Action

1. Key appears on Stream Deck
2. `willAppear` event received
3. `startDisplayPolling()` called
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
const displayPollers = new Map();
// Key: context (unique per Display action key)
// Value: interval timer ID
```

Each Display action maintains its own polling timer.

## Error Handling

### Network Errors
- Caught in async/await blocks
- Logged to console
- Visual feedback via `showAlert()`
- Display shows "Error" text

### Invalid Configuration
- Empty/missing URL → showAlert
- Empty G-code → showAlert
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

1. **Preheat Action**
   - [ ] Key press sends correct G-code
   - [ ] Success feedback displayed
   - [ ] Error feedback on network failure
   - [ ] Settings persist across restarts

2. **Custom G-code Action**
   - [ ] Single command execution
   - [ ] Multi-line commands
   - [ ] Success/error feedback
   - [ ] Settings persistence

3. **Display Action**
   - [ ] Initial data fetch on key appear
   - [ ] Periodic updates at correct interval
   - [ ] JSONPath extraction accuracy
   - [ ] Template formatting
   - [ ] Cleanup on key removal
   - [ ] Multiple display keys simultaneously

4. **Property Inspectors**
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
- Total plugin code: ~434 lines
- Property Inspector code: ~141 lines
- HTML templates: ~163 lines
- Zero external dependencies
- Zero security vulnerabilities (CodeQL verified)

## License

MIT License - See LICENSE file for details
