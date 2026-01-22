# IndicaLuna

IndicaLuna = ([it] points to the moon). A Stream Deck plugin that works with Moonraker API for controlling 3D printers.

## Features

This plugin provides three actions for controlling and monitoring your 3D printer via Moonraker:

### 1. Preheat Action
Send preheat G-code commands to set bed and nozzle temperatures.
- Configure bed temperature (°C)
- Configure nozzle/extruder temperature (°C)
- Sends `M140 S{bed}` and `M104 S{nozzle}` G-code commands
- Visual feedback on success/failure

### 2. Custom G-code Action
Send arbitrary G-code commands to your printer.
- Enter any G-code commands (one per line)
- Useful for custom sequences like homing, leveling, or cleanup
- Visual feedback on success/failure

### 3. Display Action
Periodically fetch data via HTTP and display it on the Stream Deck key.
- Configure any HTTP endpoint (typically Moonraker API)
- Use JSONPath to extract specific values from JSON responses
- Apply custom templates to format the display
- Configurable polling interval (minimum 1 second)
- Automatically updates in the background

## Installation

1. Download the release package
2. Double-click the `.streamDeckPlugin` file
3. Stream Deck software will install it automatically

## Configuration

### Moonraker URL Format
All actions require a Moonraker URL in the format:
```
http://YOUR_PRINTER_IP:7125
```

For example: `http://192.168.1.100:7125`

### Preheat Configuration
1. Add the Preheat action to a key
2. In the Property Inspector:
   - Enter your Moonraker URL
   - Set desired bed temperature (e.g., 60°C)
   - Set desired nozzle temperature (e.g., 200°C)

### Custom G-code Configuration
1. Add the Custom G-code action to a key
2. In the Property Inspector:
   - Enter your Moonraker URL
   - Enter G-code commands (one per line or use \n)
   
Example G-code:
```
G28
G1 Z10
```

### Display Configuration
1. Add the Display action to a key
2. In the Property Inspector:
   - Enter the URL to fetch (e.g., `http://192.168.1.100:7125/printer/objects/query?heater_bed`)
   - Set polling interval in milliseconds (e.g., 5000 for 5 seconds)
   - Enter JSONPath to extract value (e.g., `$.result.status.heater_bed.temperature`)
   - Enter display template (e.g., `Bed: {value}°C`)

#### JSONPath Examples
- `$` - Root object
- `$.result.status` - Nested property
- `$.data[0]` - Array element
- `$.result.status.heater_bed.temperature` - Deep nested property

#### Template Format
Use `{value}` as a placeholder for the extracted value:
- `{value}°C` - Display temperature with unit
- `Bed: {value}` - Display with label
- `{value}` - Display raw value

## Development

### Structure
```
com.kainazzzo.indicaluna.sdPlugin/
├── manifest.json           # Plugin manifest
├── plugin.js              # Main plugin code
├── imgs/                  # Icons and images
│   ├── plugin-icon.png
│   ├── category-icon.png
│   └── ...
└── ui/                    # Property Inspectors
    ├── sdpi.css           # Shared styles
    ├── sdpi.js            # Shared JavaScript
    ├── preheat.html       # Preheat PI
    ├── gcode.html         # Custom G-code PI
    └── display.html       # Display PI
```

### Dependencies
- Node.js 20+ (for Stream Deck plugin runtime)
- JSONPath support (built-in simplified implementation)

### API Reference

#### Moonraker G-code API
The plugin uses the Moonraker API endpoint:
```
POST /printer/gcode/script
{
  "script": "G-code commands here"
}
```

## Error Handling

The plugin includes basic error handling:
- Shows alert (red X) on Stream Deck key when requests fail
- Shows OK (green checkmark) on successful G-code execution
- Logs errors to console for debugging
- Display action shows "Error" when data fetch fails

## Troubleshooting

### Connection Issues
- Verify Moonraker is running and accessible
- Check that the URL is correct and includes port 7125
- Ensure your computer can reach the printer's IP address
- Check firewall settings

### Display Not Updating
- Verify the URL returns valid JSON
- Check that JSONPath expression matches your JSON structure
- Ensure polling interval is at least 1000ms
- Check browser console in Stream Deck for errors

### G-code Not Executing
- Verify printer is powered on and connected
- Check that Moonraker is running
- Ensure G-code commands are valid for your printer
- Check Moonraker logs for errors

## License

MIT License - See LICENSE file for details
