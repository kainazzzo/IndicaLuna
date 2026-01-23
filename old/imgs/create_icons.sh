#!/bin/bash

# Create a simple PNG icon using ImageMagick (if available) or create a placeholder
create_icon() {
  local name=$1
  local text=$2
  local color=$3
  
  # Create a simple colored square with text
  convert -size 144x144 xc:"$color" \
    -gravity center \
    -pointsize 20 \
    -fill white \
    -annotate +0+0 "$text" \
    "${name}.png" 2>/dev/null || \
  convert -size 144x144 xc:"$color" "${name}.png" 2>/dev/null || \
  echo "ImageMagick not available, using base64 placeholder" && \
  echo "iVBORw0KGgoAAAANSUhEUgAAAJAAAACQCAYAAADnRuK4AAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAB3RJTUUH4wIJBhUvBm6VuQAAAAd0RVh0QXV0aG9yAKmuzEgAAAAMdEVYdERlc2NyaXB0aW9uABMJISMAAAAKdEVYdENvcHlyaWdodACsD8w6AAAADnRFWHRDcmVhdGlvbiB0aW1lADX3DwkAAAAJdEVYdFNvZnR3YXJlAF1w/zoAAAALdEVYdERpc2NsYWltZXIAt8C0jwAAAAh0RVh0V2FybmluZwDAG+aHAAAAB3RFWHRTb3VyY2UA9f+D6wAAAAh0RVh0Q29tbWVudAD2zJa/AAAABnRFWHRUaXRsZQCo7tInAAABV0lEQVR4nO3QMQ0AAAgEIL/6R7oHJ4KFBNWS1c0OgP8zEGEMRBgDEcZAhDEQYQxEGAMRxkCEMRBhDEQYAxHGQIQxEGEMRBgDEcZAhDEQYQxEGAMRxkCEMRBhDEQYAxHGQIQxEGEMRBgDEcZAhDEQYQxEGAMRxkCEMRBhDEQYAxHGQIQxEGEMRBgDEcZAhDEQYQxEGAMRxkCEMRBhDEQYAxHGQIQxEGEMRBgDEcZAhDEQYQxEGAMRxkCEMRBhDEQYAxHGQIQxEGEMRBgDEcZAhDEQYQxEGAMRxkCEMRBhDEQYAxHGQIQxEGEMRBgDEcZAhDEQYQxEGAMRxkCEMRBhDEQYAxHGQIQxEGEMRBgDEcZAhDEQYQxEGAMRxkCEMRBhDEQYAxHGQIQxEGEMRBgDEcZAhDEQYQxEGAMRxkCEMRBhDEQYAxHGQIQxEGEMRBgDEcZAhDEQYQxEGAMRxkCEuQAhXwKXXPK9VQAAAABJRU5ErkJggg==" | base64 -d > "${name}.png"
}

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
  echo "ImageMagick not installed, creating minimal placeholder images"
  # Create minimal valid PNG files
  for name in plugin-icon category-icon preheat-icon preheat-key gcode-icon gcode-key display-icon display-key; do
    # Create a minimal 144x144 PNG (red square)
    printf '\x89\x50\x4e\x47\x0d\x0a\x1a\x0a\x00\x00\x00\x0d\x49\x48\x44\x52\x00\x00\x00\x90\x00\x00\x00\x90\x08\x02\x00\x00\x00\x1e\x3f\x88\xb4\x00\x00\x00\x0c\x49\x44\x41\x54\x78\x9c\x63\x60\x18\x05\x00\x00\x00\x10\x00\x01\x76\xbf\xfa\x62\x00\x00\x00\x00\x49\x45\x4e\x44\xae\x42\x60\x82' > "${name}.png"
  done
else
  echo "Creating icons with ImageMagick"
  create_icon "plugin-icon" "IL" "#4A90E2"
  create_icon "category-icon" "IL" "#4A90E2"
  create_icon "preheat-icon" "Heat" "#E24A4A"
  create_icon "preheat-key" "Heat" "#E24A4A"
  create_icon "gcode-icon" "G" "#4AE290"
  create_icon "gcode-key" "G" "#4AE290"
  create_icon "display-icon" "Disp" "#E2B84A"
  create_icon "display-key" "Disp" "#E2B84A"
fi

echo "Icons created"
