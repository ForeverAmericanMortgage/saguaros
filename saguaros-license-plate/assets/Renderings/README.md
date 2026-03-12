# Blackout Plate — Rendering Pipeline

## Quick Start

```bash
# Install dependencies (one time)
pip install google-genai Pillow

# Set your API key
export GOOGLE_API_KEY="your-key-here"

# Generate all preset renders
cd ~/Desktop/Saguaros\ License\ Plate/Assets/Renderings
python generate_plate_renders.py --all

# Generate a specific preset
python generate_plate_renders.py --preset truck_black

# Custom prompt
python generate_plate_renders.py --prompt "Your custom description here"

# List all available presets
python generate_plate_renders.py --list
```

## Available Presets

| Preset | Description |
|--------|-------------|
| `truck_black` | Black F-150 in Arizona desert at golden hour |
| `tesla_white` | White Tesla Model Y in Scottsdale |
| `jeep_trail` | Jeep Wrangler on red rock trail |
| `luxury_night` | BMW/Mercedes at upscale Scottsdale restaurant |
| `suv_family` | White Tahoe in front of Arizona home |
| `closeup_detail` | Macro product shot of plate texture |
| `billboard_hero` | Studio-lit plate on black background |
| `desert_highway` | Driving shot on Arizona highway at sunset |

## Notes

- Images generate at high resolution (8K prompts)
- Each render takes ~10-30 seconds depending on the model
- Default model: `gemini-2.0-flash-exp`
- Output: PNG files with timestamp in filename
