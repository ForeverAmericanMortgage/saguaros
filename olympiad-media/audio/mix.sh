#!/usr/bin/env bash
# Mixes the voiceover over the music bed (music ducks under the voice) and levels to -16 LUFS,
# the standard for web and social video. Output feeds the video at public/audio/explainer-mix.wav.
set -euo pipefail
cd "$(dirname "$0")"
VO=${1:-stems/voiceover.wav}
MUSIC=${2:-stems/music-bed.wav}
ffmpeg -y -loglevel error -i "$VO" -i "$MUSIC" -filter_complex \
 "[0:a]highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,equalizer=f=3500:t=q:w=1:g=2,aformat=channel_layouts=stereo,asplit=2[vo][sc];\
  [1:a]volume=-15dB[mus];[mus][sc]sidechaincompress=threshold=0.02:ratio=4:attack=30:release=400[duck];\
  [vo][duck]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-16:TP=-1.5:LRA=11" \
 -ar 48000 ../public/audio/explainer-mix.wav
echo "Wrote public/audio/explainer-mix.wav"
