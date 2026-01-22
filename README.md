# IndicaLuna

IndicaLuna = ([it] points to the moon). A Stream Deck plugin that works with Moonraker API for controlling 3D printers.

## Features

This plugin provides a single Smart Button action for controlling and monitoring your 3D printer via Moonraker:

### Smart Button Action
One button that can poll HTTP data for display and send G-code on press or hold.
- Configure an HTTP endpoint (typically Moonraker API)
- Use JSONPath to extract specific values from JSON responses
- Apply custom templates to format the display
- Configurable polling interval (minimum 1 second)
- Send custom G-code on press (e.g., heat-up like `M190`/`M109`)
- Send custom G-code on hold (e.g., cooldown or cleanup)
- Visual feedback on success/failure

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

### Smart Button Configuration
1. Add the Smart Button action to a key
2. In the Property Inspector:
   - Enter your Moonraker URL
   - Enter press G-code commands (one per line or use \n)
   - Optionally enter hold G-code commands and hold duration
   - Enter the URL to fetch (e.g., `http://192.168.1.100:7125/printer/objects/query?heater_bed`)
   - Set polling interval in milliseconds (e.g., 5000 for 5 seconds)
   - Enter JSONPath to extract value (e.g., `$.result.status.heater_bed.temperature`)
   - Enter display template (e.g., `Bed: {value}°C`)

Example press G-code:
```
M190 S60
M109 S200
```

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
    └── button.html        # Smart Button PI
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
- Smart Button display shows "Error" when data fetch fails

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
