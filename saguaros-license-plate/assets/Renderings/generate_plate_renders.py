#!/usr/bin/env python3
"""
Blackout Plate — Nano Banana Pro Rendering Pipeline
====================================================
Generates photorealistic plate mockups using Google's Gemini image generation.

SETUP (one time):
  pip install google-genai Pillow

USAGE:
  python generate_plate_renders.py                    # Generate all default renders
  python generate_plate_renders.py --prompt "custom"  # Generate from custom prompt
  python generate_plate_renders.py --list             # List available presets
  python generate_plate_renders.py --preset truck     # Generate a specific preset

API KEY:
  Set your Gemini API key as an environment variable:
  export GOOGLE_API_KEY="your-key-here"

  Or pass it directly:
  python generate_plate_renders.py --api-key "your-key-here"
"""

import os
import sys
import argparse
import base64
from pathlib import Path
from datetime import datetime

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Missing dependency. Run: pip install google-genai")
    sys.exit(1)

# ─── PRESET PROMPTS ───────────────────────────────────────────────────────────
# Each preset generates a specific marketing-ready plate rendering.
# All prompts emphasize: all-black plate, white "ARIZONA" header, clean/minimal.

PRESETS = {
    "truck_black": {
        "name": "Black Truck - Desert",
        "prompt": (
            "Photorealistic image of an all-black Arizona specialty license plate "
            "with white 'ARIZONA' text at the top, mounted on the rear of a matte black "
            "Ford F-150 truck. The truck is parked on a desert road at golden hour with "
            "saguaro cacti and Arizona mountains in the background. The plate is the focal "
            "point — clean, minimal, completely black with white characters. Professional "
            "automotive photography, shallow depth of field on the plate. 8K quality."
        ),
    },
    "tesla_white": {
        "name": "White Tesla - Scottsdale",
        "prompt": (
            "Photorealistic image of an all-black Arizona specialty license plate "
            "with white 'ARIZONA' text at the top, mounted on the rear of a white "
            "Tesla Model Y. The car is parked on a clean modern street in Scottsdale, "
            "Arizona. The black plate creates a striking contrast against the white car. "
            "Professional automotive photography, warm afternoon light. 8K quality."
        ),
    },
    "jeep_trail": {
        "name": "Jeep Wrangler - Trail",
        "prompt": (
            "Photorealistic image of an all-black Arizona specialty license plate "
            "with white 'ARIZONA' text at the top, mounted on the rear of a Jeep "
            "Wrangler Rubicon on a red rock trail. Arizona desert landscape with "
            "saguaro cacti visible. The plate stands out against the rugged backdrop. "
            "Adventure lifestyle photography, golden hour lighting. 8K quality."
        ),
    },
    "luxury_night": {
        "name": "Luxury Sedan - Night",
        "prompt": (
            "Photorealistic image of an all-black Arizona specialty license plate "
            "with white 'ARIZONA' text at the top, mounted on the rear of a black "
            "BMW M5 or Mercedes-AMG sedan. The car is parked in front of an upscale "
            "Scottsdale restaurant at night, with warm ambient lighting reflecting off "
            "the car. The black plate blends seamlessly with the luxury aesthetic. "
            "High-end automotive photography, cinematic lighting. 8K quality."
        ),
    },
    "suv_family": {
        "name": "SUV - Family",
        "prompt": (
            "Photorealistic image of an all-black Arizona specialty license plate "
            "with white 'ARIZONA' text at the top, mounted on the rear of a white "
            "Chevrolet Tahoe or similar full-size SUV. Parked in front of a beautiful "
            "Arizona home with desert landscaping. Clean, aspirational, family-oriented "
            "lifestyle shot. Warm natural lighting. 8K quality."
        ),
    },
    "closeup_detail": {
        "name": "Close-Up Detail Shot",
        "prompt": (
            "Extreme close-up photorealistic image of an all-black Arizona specialty "
            "license plate with white embossed 'ARIZONA' text at the top. The plate "
            "has white embossed characters on a completely black background. Shot with "
            "macro lens, showing the texture and premium quality of the plate material. "
            "Dark moody lighting with a subtle spotlight on the plate. Product photography "
            "style, 8K quality, shallow depth of field."
        ),
    },
    "billboard_hero": {
        "name": "Billboard Hero Shot",
        "prompt": (
            "Dramatic product shot of an all-black Arizona specialty license plate "
            "with white 'ARIZONA' text at the top, floating against a pure black "
            "background with subtle gray gradient. The plate is angled slightly, "
            "lit with dramatic studio lighting that highlights the embossed white "
            "characters against the black plate. Clean, bold, billboard-ready. "
            "High-end product photography, 8K quality."
        ),
    },
    "desert_highway": {
        "name": "Desert Highway - Driving Shot",
        "prompt": (
            "Photorealistic image of the rear of a car driving on an Arizona desert "
            "highway (Route 66 or I-17 style), showing an all-black Arizona specialty "
            "license plate with white 'ARIZONA' text at the top. Saguaro cacti line "
            "the road, dramatic Arizona sunset sky with oranges and purples. The plate "
            "is clearly visible and is the focal point. Cinematic wide-angle shot, "
            "motion blur on the road. 8K quality."
        ),
    },
}

# ─── RENDERING ENGINE ─────────────────────────────────────────────────────────

def generate_image(client, prompt, output_path, model="gemini-2.0-flash-exp"):
    """Generate an image using Nano Banana Pro and save it."""
    print(f"  Generating: {output_path.name}...")

    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            )
        )

        # Extract image from response
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                image_data = part.inline_data.data
                with open(output_path, "wb") as f:
                    f.write(image_data)
                print(f"  ✓ Saved: {output_path}")
                return True

        print(f"  ✗ No image in response. Text: {response.text[:100] if response.text else 'None'}")
        return False

    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Blackout Plate Rendering Pipeline")
    parser.add_argument("--api-key", help="Gemini API key (or set GOOGLE_API_KEY env var)")
    parser.add_argument("--prompt", help="Custom prompt for generation")
    parser.add_argument("--preset", help="Generate a specific preset (use --list to see options)")
    parser.add_argument("--list", action="store_true", help="List available presets")
    parser.add_argument("--all", action="store_true", help="Generate all presets (default)")
    parser.add_argument("--output-dir", default=".", help="Output directory (default: current)")
    parser.add_argument("--model", default="gemini-2.0-flash-exp",
                       help="Model to use (default: gemini-2.0-flash-exp)")
    args = parser.parse_args()

    # List presets
    if args.list:
        print("\nAvailable presets:\n")
        for key, val in PRESETS.items():
            print(f"  {key:20s} — {val['name']}")
        print(f"\nUsage: python {sys.argv[0]} --preset truck_black")
        print(f"       python {sys.argv[0]} --all")
        return

    # Get API key
    api_key = args.api_key or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("Error: No API key. Set GOOGLE_API_KEY or use --api-key flag.")
        sys.exit(1)

    # Initialize client
    client = genai.Client(api_key=api_key)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Custom prompt
    if args.prompt:
        filename = f"custom_{timestamp}.png"
        generate_image(client, args.prompt, output_dir / filename, args.model)
        return

    # Specific preset
    if args.preset:
        if args.preset not in PRESETS:
            print(f"Unknown preset: {args.preset}")
            print(f"Use --list to see available presets.")
            sys.exit(1)
        preset = PRESETS[args.preset]
        filename = f"{args.preset}_{timestamp}.png"
        print(f"\n🎨 Generating: {preset['name']}")
        generate_image(client, preset["prompt"], output_dir / filename, args.model)
        return

    # All presets (default)
    print(f"\n🎨 Blackout Plate — Rendering Pipeline")
    print(f"   Model: {args.model}")
    print(f"   Output: {output_dir.resolve()}")
    print(f"   Presets: {len(PRESETS)}\n")

    results = {"success": 0, "failed": 0}
    for key, preset in PRESETS.items():
        print(f"\n[{key}] {preset['name']}")
        filename = f"{key}_{timestamp}.png"
        if generate_image(client, preset["prompt"], output_dir / filename, args.model):
            results["success"] += 1
        else:
            results["failed"] += 1

    print(f"\n{'='*50}")
    print(f"Done! {results['success']} generated, {results['failed']} failed.")
    print(f"Output: {output_dir.resolve()}")


if __name__ == "__main__":
    main()
