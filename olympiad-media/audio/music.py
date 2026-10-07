import numpy as np, soundfile as sf, sys
SR=48000; BPM=104; beat=60/BPM; bar=4*beat; DUR=33.0
N=int(SR*DUR); L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(7)
def midi(n): return 440*2**((n-69)/12)
def add(sig,t,pan=0.0,gain=1.0):
    i=int(t*SR); j=min(N,i+len(sig))
    if i>=N: return
    s=sig[:j-i]*gain
    L[i:j]+=s*np.cos((pan+1)*np.pi/4); R[i:j]+=s*np.sin((pan+1)*np.pi/4)
def env(n,a,d,s,r,length):
    t=np.arange(int(length*SR))/SR; e=np.ones_like(t)*s
    e[t<a]=t[t<a]/a; m=(t>=a)&(t<a+d); e[m]=1-(1-s)*(t[m]-a)/d
    rel=int(r*SR); 
    if rel<len(e): e[-rel:]*=np.linspace(1,0,rel)
    return e
def lowpass(x,cut):
    a=np.exp(-2*np.pi*cut/SR); y=np.zeros_like(x); p=0.0
    for i in range(len(x)): p=(1-a)*x[i]+a*p; y[i]=p
    return y
def lp_fast(x,cut,passes=2):
    # one-pole via cumulative filtering using scipy-free recursion in blocks
    from numpy.lib.stride_tricks import sliding_window_view
    k=int(SR/cut); k=max(1,k)
    for _ in range(passes):
        c=np.cumsum(np.insert(x,0,0)); x=(c[k:]-c[:-k])/k; x=np.concatenate([x,np.zeros(k-1)])
    return x
# chords: D A Bm G (I V vi IV), voicings
prog=[[62,66,69,74],[61,64,69,73],[59,62,66,71],[59,62,67,74]]
roots=[38,33,35,31]
nb=int(np.ceil(DUR/bar))
# pad: detuned saws, lowpassed, swelling
for b in range(nb):
    t0=b*bar; ch=prog[b%4]; ln=bar+0.4
    tt=np.arange(int(ln*SR))/SR; sig=np.zeros_like(tt)
    for n in ch:
        f=midi(n)
        for det in (-0.08,0.0,0.08):
            ph=(f*2**(det/12))*tt; sig+=2*(ph%1)-1
    sig=lp_fast(sig,1800 if b>=2 else 900)
    sig*=env(0,0.6,0.3,0.8,0.5,ln)
    add(sig*0.05,t0,pan=-0.2); add(sig*0.05,t0+0.012,pan=0.2)
# bass from bar 2
for b in range(2,nb):
    f=midi(roots[b%4]); 
    for k,off in enumerate([0,1.5,2,3.5] if b>=4 else [0,2]):
        ln=beat*0.9; tt=np.arange(int(ln*SR))/SR
        s=np.sin(2*np.pi*f*tt)+0.3*np.sin(4*np.pi*f*tt)
        add(s*env(0,0.005,0.2,0.6,0.08,ln)*0.22,b*bar+off*beat)
# pluck arp from bar 1, 8ths
for b in range(1,nb):
    ch=prog[b%4]; pattern=[0,2,1,3,2,1,3,2]
    for k in range(8):
        n=ch[pattern[k]]+12; f=midi(n); ln=0.45; tt=np.arange(int(ln*SR))/SR
        s=(np.sin(2*np.pi*f*tt)+0.4*np.sin(4*np.pi*f*tt)+0.15*np.sin(6*np.pi*f*tt))*np.exp(-tt*9)
        add(s*0.07,b*bar+k*beat/2,pan=0.35 if k%2 else -0.35)
# drums
def kick():
    ln=0.35; tt=np.arange(int(ln*SR))/SR; f=50+90*np.exp(-tt*35)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*9)
def clap():
    ln=0.25; tt=np.arange(int(ln*SR))/SR; n=rng.standard_normal(len(tt))
    n=n-lp_fast(n,900,1); return n*np.exp(-tt*22)
def hat():
    ln=0.06; tt=np.arange(int(ln*SR))/SR; n=rng.standard_normal(len(tt)); n=n-lp_fast(n,6000,1)
    return n*np.exp(-tt*70)
HIT=24.6
for b in range(2,nb):
    for q in range(4):
        t=b*bar+q*beat
        if t>=HIT-0.05: continue
        if q in (0,2): add(kick()*0.55,t)
        if b>=4 and q in (1,3): add(clap()*0.18,t,pan=0.05)
    if b>=3:
        for e in range(8):
            if b*bar+e*beat/2<HIT-0.05: add(hat()*(0.05 if e%2 else 0.03),b*bar+e*beat/2,pan=0.25)
# riser into the closing section (~bar 10)
rs=HIT-2.0; ln=2.0; tt=np.arange(int(ln*SR))/SR; n=rng.standard_normal(len(tt))
n=n-lp_fast(n,2000,1); add(n*(tt/ln)**2*0.08,rs)
# final hit and ring-out at end
end_t=HIT; ch=[50,62,66,69,74,78]; ln=DUR-HIT; tt=np.arange(int(ln*SR))/SR
s=sum(np.sin(2*np.pi*midi(n)*tt) for n in ch)*np.exp(-tt*0.45)
add(s*0.05,end_t); add(kick()*0.6,end_t)
# silence drums/arp after final hit by fading bed before it
x=np.stack([L,R],1)
# simple reverb: feedback comb mix
ir_len=int(1.6*SR); ir=rng.standard_normal(ir_len)*np.exp(-np.arange(ir_len)/SR*3.2)*0.015
for c in range(2):
    wet=np.convolve(x[:,c],ir)[:N]; x[:,c]=x[:,c]+wet*0.6
# fade in/out
fi=int(0.8*SR); x[:fi]*=np.linspace(0,1,fi)[:,None]
fo=int(2.0*SR); x[-fo:]*=np.linspace(1,0,fo)[:,None]
x/=np.max(np.abs(x))*1.12
sf.write(sys.argv[1],x,SR)
print("ok",x.shape)
