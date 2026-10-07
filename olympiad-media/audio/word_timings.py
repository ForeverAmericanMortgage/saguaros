import sys
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
segs,_ = m.transcribe(sys.argv[1], beam_size=5, word_timestamps=True)
for s in segs:
    for w in s.words: print(f"{w.start:6.2f} {w.end:6.2f} {w.word}")
