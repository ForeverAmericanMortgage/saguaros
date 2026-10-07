import sys, json, soundfile as sf, numpy as np
from kokoro_onnx import Kokoro
k = Kokoro(sys.argv[1]+"/models/kokoro-v1.0.onnx", sys.argv[1]+"/models/voices-v1.0.bin")
lines = [
 "Every spring, Arizona businesses trade the office... for the field.",
 "This is the Olympiad. A corporate field day at Scottsdale Stadium, hosted by the Suh-WAHR-ohs.",
 "Every team raises at least three thousand dollars for Arizona's kids. Last year? Nearly seven hundred thousand.",
 "Getting in is simple. Register your team. Bring six or more coworkers. And fundraise your way.",
 "Cups for top fundraisers. Medals for game winners. Register today, at Scottsdale Olympiad dot com.",
]
out = {}
for voice in sys.argv[2:]:
    durs=[]
    for i,l in enumerate(lines):
        a, sr = k.create(l, voice=voice, speed=float(__import__("os").environ.get("SPD","1.05")), lang="en-us")
        sf.write(f"{sys.argv[1]}/out/{voice}_{i}.wav", a, sr)
        durs.append(round(len(a)/sr,2))
    out[voice]=durs
print(json.dumps(out))
