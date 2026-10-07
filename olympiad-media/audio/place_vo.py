import numpy as np, soundfile as sf, sys
from math import gcd
starts=[0.6,5.0,11.3,18.6,24.6]; DUR=33.0; SR=48000
v=sys.argv[1]; out=np.zeros(int(DUR*SR))
for i,s in enumerate(starts):
    a,sr=sf.read(f"{v}_{i}.wav")
    # resample 24k->48k linear
    x=np.interp(np.arange(0,len(a),sr/SR),np.arange(len(a)),a)
    j=int(s*SR); out[j:j+len(x)]+=x[:len(out)-j]
sf.write(f"vo_{v}.wav",out,SR); print("ok")
