# Installation and Setup Guide

## Prerequisites

1. **Elgato Stream Deck** device
2. **Stream Deck Software** (version 6.0 or higher)
   - Download from: https://www.elgato.com/downloads
3. **3D Printer** with Moonraker API enabled
4. **Network access** to your printer

## Installation Steps

### Method 1: From Release Package (Recommended)

1. Download the latest `.streamDeckPlugin` file from the Releases page
2. Double-click the file
3. Stream Deck software will automatically install the plugin
4. The plugin will appear in the Stream Deck actions list

### Method 2: Manual Installation

1. Clone or download this repository
2. Navigate to the repository folder
3. Right-click on `com.kainazzzo.indicaluna.sdPlugin` folder
4. Select "Open with Stream Deck"
5. The plugin will be installed in development mode

## Creating a Release Package

To create a distributable `.streamDeckPlugin` file:

1. Navigate to the repository directory
2. Zip the `com.kainazzzo.indicaluna.sdPlugin` folder
3. Rename the `.zip` file to `com.kainazzzo.indicaluna.streamDeckPlugin`

## First-Time Setup

### Find Your Moonraker URL

1. Determine your printer's IP address (check your router or printer display)
2. Default Moonraker port is `7125`
3. Your URL will be: `http://YOUR_PRINTER_IP:7125`
4. Example: `http://192.168.1.100:7125`

### Test Connection

Before configuring the plugin, test your Moonraker connection:

```bash
curl http://YOUR_PRINTER_IP:7125/server/info
```

If successful, you'll receive JSON data about your printer.

## Configuring Actions

### Smart Button Setup

1. Drag the "Smart Button" action from the plugin list to a Stream Deck key
2. Click the key to open Property Inspector
3. Configure:
   - **Moonraker URL**: Your printer's Moonraker URL
   - **Press G-code**: Commands to send on a quick press (one per line)
   - **Hold G-code**: Commands to send on a long press (optional)
   - **Hold Duration**: Time in milliseconds to trigger the hold action
   - **URL**: Moonraker API endpoint for display (optional)
   - **Polling Interval**: Update frequency (5000 = 5 seconds)
   - **JSONPath Expression**: Path to extract data
   - **Display Template**: How to format the display
4. Press the key to execute press G-code, or hold to execute hold G-code
5. Green checkmark = success, Red X = error

#### Example Configurations

**Display Bed Temperature:**
- URL: `http://192.168.1.100:7125/printer/objects/query?heater_bed`
- JSONPath: `$.result.status.heater_bed.temperature`
- Template: `Bed: {value}°C`
- Interval: `5000`

**Display Nozzle Temperature:**
- URL: `http://192.168.1.100:7125/printer/objects/query?extruder`
- JSONPath: `$.result.status.extruder.temperature`
- Template: `Hot: {value}°C`
- Interval: `5000`

**Display Print Progress:**
- URL: `http://192.168.1.100:7125/printer/objects/query?display_status`
- JSONPath: `$.result.status.display_status.progress`
- Template: `{value}%`
- Interval: `10000`

**Display Z Height:**
- URL: `http://192.168.1.100:7125/printer/objects/query?toolhead`
- JSONPath: `$.result.status.toolhead.position[2]`
- Template: `Z: {value}`
- Interval: `5000`

## Moonraker API Reference

### Common Endpoints

- **Server Info**: `/server/info`
- **Printer Status**: `/printer/objects/query?heater_bed&extruder`
- **G-code Script**: `/printer/gcode/script` (POST)

### Query Objects

You can query multiple objects in one request:
```
/printer/objects/query?heater_bed&extruder&toolhead&display_status
```

### JSONPath Tips

- Start with `$` for root
- Use `.` for nested properties: `$.result.status.heater_bed.temperature`
- Use `[index]` for arrays: `$.data[0]`
- Combine: `$.result.status.toolhead.position[2]`

## Troubleshooting

### Plugin Not Appearing

1. Restart Stream Deck software
2. Check that plugin folder is in correct location:
   - Windows: `%appdata%\Elgato\StreamDeck\Plugins`
   - macOS: `~/Library/Application Support/com.elgato.StreamDeck/Plugins`

### Connection Errors

1. Verify printer IP address
2. Ensure Moonraker is running: `http://PRINTER_IP:7125/server/info`
3. Check firewall settings
4. Ensure printer and computer are on same network

### Display Shows "Error"

1. Test URL in browser - should return JSON
2. Verify JSONPath expression matches JSON structure
3. Check Stream Deck console for detailed errors
4. Ensure polling interval is at least 1000ms

### G-code Not Executing

1. Check printer is powered on
2. Verify Moonraker is accessible
3. Test G-code in printer console first
4. Check Moonraker logs for errors

## Advanced Usage

### Multiple Printers

You can configure multiple actions with different Moonraker URLs to control multiple printers from one Stream Deck.

### Macros

Use the Smart Button press or hold G-code to create complex macros:
```
G28                    ; Home all
G1 Z10 F5000          ; Lift nozzle
M104 S0               ; Turn off hotend
M140 S0               ; Turn off bed
M106 S0               ; Turn off fan
```

### Custom Displays

Combine multiple data points by making separate Smart Buttons or use Moonraker's multi-object query feature.

## Security Considerations

1. Moonraker API has no authentication by default
2. Only use on trusted networks
3. Consider enabling API key authentication in Moonraker
4. Don't expose Moonraker to the internet without proper security

## Support

For issues, feature requests, or contributions:
- GitHub Issues: https://github.com/kainazzzo/IndicaLuna/issues
- Check Moonraker documentation: https://moonraker.readthedocs.io/

## License

MIT License - See LICENSE file for details
