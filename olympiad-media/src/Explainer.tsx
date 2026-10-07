import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { C, sans, serif, sec, SCENES } from './theme';
import { BallIcon, BoardIcon, Chalk, ClipboardIcon, CupIcon, Eyebrow, FieldWipe, HeartIcon, HoopIcon, MedalIcon, PeopleIcon, Reveal, useCount, useLayout } from './parts';

// Every `at` below is in frames from the start of its scene, cued to the voiceover
// word timings (see audio/README.md).
const scene = (k: keyof typeof SCENES) => ({ from: sec(SCENES[k][0]), durationInFrames: sec(SCENES[k][1] - SCENES[k][0]) });
const cue = (k: keyof typeof SCENES, s: number) => sec(s - SCENES[k][0]);

export const Explainer: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.cream, fontFamily: sans }}>
      <Audio src={staticFile('audio/explainer-mix.wav')} />
      <Sequence {...scene('open')}><Open /></Sequence>
      <Sequence {...scene('what')}><What /></Sequence>
      <Sequence {...scene('impact')}><Impact /></Sequence>
      <Sequence {...scene('how')}><How /></Sequence>
      <Sequence {...scene('close')}><Close /></Sequence>
      {(['what', 'impact', 'how', 'close'] as const).map(k => <FieldWipe key={k} at={sec(SCENES[k][0])} />)}
    </AbsoluteFill>
  );
};

/** 0–5s · "Every spring, Arizona businesses trade the office… for the field." */
const Open: React.FC = () => {
  const { u, vertical } = useLayout();
  const frame = useCurrentFrame();
  const fieldAt = cue('open', 3.2);
  const reveal = interpolate(frame - fieldAt, [0, 16], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const zoom = interpolate(frame, [fieldAt, 150], [1.12, 1.02], { extrapolateLeft: 'clamp' });
  return (
    <AbsoluteFill>
      <Chalk viewBox="0 0 1000 100" d="M-20 60 C 250 40, 600 80, 1020 50" at={0} dur={40} width={3} color={C.mint} style={{ position: 'absolute', left: 0, right: 0, bottom: (vertical ? 120 : 90) * u, width: '100%', height: 80 * u, opacity: 0.6 }} />
      <AbsoluteFill style={vertical
        ? { padding: `${180 * u}px ${80 * u}px`, justifyContent: 'flex-start' }
        : { padding: `0 ${150 * u}px`, justifyContent: 'center', width: '64%' }}>
        <Reveal at={4}><Eyebrow size={22}>The Saguaros present</Eyebrow></Reveal>
        <div style={{ marginTop: 34 * u, fontWeight: 700, fontSize: (vertical ? 96 : 104) * u, lineHeight: 1.04, letterSpacing: -2.5 * u, color: C.navy }}>
          <Reveal at={8}>Every spring,</Reveal>
          <Reveal at={cue('open', 1.8)}>Arizona businesses</Reveal>
          <Reveal at={cue('open', 2.3)}>
            <span>trade </span>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              the office
              <Chalk viewBox="0 0 100 10" d="M0 6 L100 4" at={cue('open', 3.0)} dur={8} width={5} color={C.green} style={{ position: 'absolute', left: -6 * u, right: -6 * u, top: '52%', width: 'calc(100% + 12px)', height: 12 * u }} />
            </span>
          </Reveal>
        </div>
        <Reveal at={cue('open', 3.4)} style={{ marginTop: 18 * u }}>
          <div style={{ fontFamily: serif, fontStyle: 'italic', fontWeight: 500, fontSize: (vertical ? 120 : 128) * u, lineHeight: 1, color: C.green }}>for the field.</div>
        </Reveal>
      </AbsoluteFill>
      <div style={{
        position: 'absolute', overflow: 'hidden', borderRadius: 18 * u, boxShadow: '0 30px 80px #14201c33',
        ...(vertical ? { left: 80 * u, right: 80 * u, bottom: 260 * u, height: 640 * u } : { right: 120 * u, top: 140 * u, bottom: 140 * u, width: 640 * u }),
        clipPath: `inset(0 ${100 - reveal}% 0 0 round ${18 * u}px)`,
      }}>
        <Img src={staticFile('img/event-field.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }} />
      </div>
    </AbsoluteFill>
  );
};

/** 5–11s · "This is the Olympiad. A corporate field day at Scottsdale Stadium, hosted by the Saguaros." */
const What: React.FC = () => {
  const { u, vertical } = useLayout();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [1.16, 1.04]);
  const games: [React.FC<{ size: number; color?: string }>, string][] = [[BoardIcon, 'Cornhole'], [HoopIcon, 'Pop-a-Shot'], [BallIcon, 'Dodgeball']];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Img src={staticFile('img/stadium.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: vertical ? '62% center' : 'center 45%', transform: `scale(${zoom})` }} />
      <AbsoluteFill style={{ background: vertical
        ? 'linear-gradient(180deg, rgba(17,34,35,.15) 0%, rgba(17,34,35,.55) 40%, rgba(17,34,35,.95) 70%)'
        : 'linear-gradient(90deg, rgba(17,34,35,.96) 0%, rgba(17,34,35,.82) 38%, rgba(17,34,35,.1) 75%)' }} />
      <AbsoluteFill style={vertical
        ? { padding: `0 ${80 * u}px ${200 * u}px`, justifyContent: 'flex-end' }
        : { padding: `0 ${150 * u}px`, justifyContent: 'center' }}>
        <Reveal at={2}><Eyebrow color="#cadfc2" size={22}>This is the</Eyebrow></Reveal>
        <Reveal at={cue('what', 5.6)} y={60}>
          <div style={{ marginTop: 10 * u, fontWeight: 800, fontSize: (vertical ? 138 : 196) * u, letterSpacing: -6 * u, lineHeight: 0.95, color: C.chalk }}>
            OLYMPIAD<span style={{ color: C.gold, fontWeight: 500, letterSpacing: -2 * u, fontSize: '0.42em', marginLeft: 14 * u, verticalAlign: 'top', position: 'relative', top: 18 * u }}>2027</span>
          </div>
        </Reveal>
        <Chalk viewBox="0 0 600 20" d="M4 12 C 150 4, 380 18, 596 8" at={cue('what', 6.1)} dur={14} width={6} color={C.gold} style={{ width: (vertical ? 640 : 820) * u, height: 22 * u, marginTop: 8 * u }} />
        <Reveal at={cue('what', 6.75)} style={{ marginTop: 34 * u }}>
          <div style={{ fontWeight: 600, fontSize: 52 * u, color: C.chalk, lineHeight: 1.2 }}>A corporate field day</div>
        </Reveal>
        <Reveal at={cue('what', 7.8)}>
          <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 64 * u, color: '#d9e7d4', lineHeight: 1.15 }}>at Scottsdale Stadium.</div>
        </Reveal>
        <div style={{ display: 'flex', gap: 18 * u, marginTop: 40 * u, flexWrap: 'wrap' }}>
          {games.map(([Icon, label], i) => (
            <Reveal key={label} at={cue('what', 8.4) + i * 5} y={20}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 * u, padding: `${12 * u}px ${22 * u}px`, borderRadius: 999, border: `${2 * u}px solid #ffffff40`, background: '#ffffff14', color: C.chalk, fontSize: 26 * u, fontWeight: 500 }}>
                <Icon size={34 * u} />{label}
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal at={cue('what', 9.85)} style={{ marginTop: 46 * u }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 * u, color: '#cadfc2', fontSize: 24 * u, letterSpacing: 3 * u, fontWeight: 600 }}>
            <Img src={staticFile('img/saguaros-logo.png')} style={{ height: 96 * u, filter: 'brightness(0) invert(1)', opacity: 0.95 }} />
            HOSTED BY THE SAGUAROS · EST. 1987
          </div>
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** 11.1–18.5s · "Every team raises at least $3,000 for Arizona's kids. Last year? Nearly $700,000." */
const Impact: React.FC = () => {
  const { u, vertical } = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const minimum = useCount(3000, cue('impact', 12.6), cue('impact', 13.4));
  const raised = useCount(700, cue('impact', 16.5), cue('impact', 17.6));
  const swap = spring({ frame: frame - cue('impact', 15.4), fps, config: { damping: 200 } });
  const money = (n: number) => '$' + n.toLocaleString('en-US');
  return (
    <AbsoluteFill style={{ background: C.deep, color: C.chalk, padding: vertical ? `0 ${80 * u}px` : `0 ${150 * u}px`, justifyContent: 'center' }}>
      {Array.from({ length: 5 }, (_, i) => <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${10 + i * 20}%`, width: 2 * u, background: '#ffffff12' }} />)}
      <div style={{ position: 'relative', height: (vertical ? 1100 : 640) * u }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: 1 - swap, transform: `translateY(${-swap * 80 * u}px)` }}>
          <Reveal at={4}><Eyebrow color="#cadfc2" size={22}>Every team raises at least</Eyebrow></Reveal>
          <div style={{ fontWeight: 800, fontSize: (vertical ? 210 : 230) * u, letterSpacing: -8 * u, lineHeight: 1, color: C.gold, marginTop: 10 * u }}>{money(minimum)}</div>
          <Reveal at={cue('impact', 13.9)}>
            <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 84 * u, lineHeight: 1.1 }}>for Arizona’s kids.</div>
          </Reveal>
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: swap, transform: `translateY(${(1 - swap) * 80 * u}px)` }}>
          <Eyebrow color="#cadfc2" size={22}>Last year, together</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 26 * u, flexWrap: 'wrap', marginTop: 10 * u }}>
            <span style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 96 * u }}>nearly</span>
            <span style={{ fontWeight: 800, fontSize: (vertical ? 230 : 260) * u, letterSpacing: -9 * u, lineHeight: 1, color: C.gold }}>${raised}K</span>
          </div>
          <Reveal at={cue('impact', 17.6)} y={20}>
            <div style={{ display: 'flex', gap: 16 * u, marginTop: 30 * u, flexWrap: 'wrap' }}>
              {['raised at the 2026 Olympiad', '91 business teams'].map(t => (
                <span key={t} style={{ padding: `${12 * u}px ${24 * u}px`, borderRadius: 999, background: '#ffffff18', border: `${2 * u}px solid #ffffff30`, fontSize: 28 * u, fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** 18.5–24.5s · "Getting in is simple. Register your team. Bring six or more coworkers. And fundraise your way." */
const How: React.FC = () => {
  const { u, vertical } = useLayout();
  const steps: [React.FC<{ size: number; color?: string }>, string, string, number][] = [
    [ClipboardIcon, 'Register your team', 'Your business takes the field.', 20.3],
    [PeopleIcon, 'Bring 6+ coworkers', 'Teammates add their own details.', 21.35],
    [HeartIcon, 'Fundraise your way', 'Sponsorships, events and your network.', 23.05],
  ];
  return (
    <AbsoluteFill style={{ background: C.cream, padding: vertical ? `0 ${80 * u}px` : `0 ${150 * u}px`, justifyContent: 'center' }}>
      <Reveal at={2}><Eyebrow size={22}>How to get involved</Eyebrow></Reveal>
      <Reveal at={4}>
        <div style={{ fontWeight: 700, fontSize: (vertical ? 100 : 96) * u, letterSpacing: -2.5 * u, color: C.navy, marginTop: 16 * u, lineHeight: 1.05 }}>
          Getting in is <span style={{ fontFamily: serif, fontStyle: 'italic', fontWeight: 500, color: C.green }}>simple.</span>
        </div>
      </Reveal>
      <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: 28 * u, marginTop: 64 * u }}>
        {steps.map(([Icon, title, body, at], i) => (
          <Reveal key={title} at={cue('how', at)} y={50} style={{ flex: 1 }}>
            <div style={{ background: '#fff', borderRadius: 18 * u, border: `${2 * u}px solid #dcded4`, padding: `${36 * u}px ${36 * u}px ${40 * u}px`, boxShadow: '0 20px 50px #263c2512', display: 'flex', flexDirection: vertical ? 'row' : 'column', gap: 24 * u, alignItems: vertical ? 'center' : 'flex-start' }}>
              <div style={{ width: 96 * u, height: 96 * u, borderRadius: 24 * u, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={56 * u} /></div>
              <div>
                <div style={{ fontSize: 22 * u, fontWeight: 700, color: C.green, letterSpacing: 3 * u }}>0{i + 1}</div>
                <div style={{ fontSize: 44 * u, fontWeight: 700, color: C.navy, lineHeight: 1.15, marginTop: 6 * u }}>{title}</div>
                <div style={{ fontSize: 26 * u, color: C.grey, lineHeight: 1.45, marginTop: 10 * u }}>{body}</div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** 24.5–33s · "Cups for top fundraisers. Medals for game winners. Register today at scottsdaleolympiad.com." */
const Close: React.FC = () => {
  const { u, vertical } = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const toEnd = spring({ frame: frame - cue('close', 27.3), fps, config: { damping: 200 } });
  const awards: [React.FC<{ size: number; color?: string }>, string, string, number][] = [
    [CupIcon, 'Industry cups', 'for top fundraisers', 24.8],
    [MedalIcon, 'Medals', 'for game winners', 26.5],
  ];
  return (
    <AbsoluteFill style={{ background: C.navy, color: C.chalk }}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: 1 - toEnd, transform: `scale(${1 - toEnd * 0.08})` }}>
        <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: (vertical ? 90 : 180) * u }}>
          {awards.map(([Icon, title, body, at]) => (
            <Reveal key={title} at={cue('close', at)} y={60} style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 220 * u, height: 220 * u, borderRadius: '50%', border: `${4 * u}px solid ${C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={130 * u} color={C.gold} /></div>
                <div style={{ fontWeight: 700, fontSize: 64 * u, marginTop: 34 * u }}>{title}</div>
                <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 52 * u, color: '#d9e7d4' }}>{body}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', opacity: toEnd, transform: `translateY(${(1 - toEnd) * 60 * u}px)` }}>
        <Eyebrow color="#cadfc2" size={22}>The Saguaros present</Eyebrow>
        <div style={{ fontWeight: 800, fontSize: (vertical ? 138 : 200) * u, letterSpacing: -6 * u, lineHeight: 1, marginTop: 18 * u }}>
          OLYMPIAD<span style={{ color: C.gold, fontWeight: 500, fontSize: '0.42em', letterSpacing: -2 * u, marginLeft: 14 * u, verticalAlign: 'top', position: 'relative', top: 18 * u }}>2027</span>
        </div>
        <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 58 * u, color: '#d9e7d4', marginTop: 12 * u }}>Rally for the Valley.</div>
        <div style={{ marginTop: 56 * u, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 * u }}>
          <div style={{ background: C.gold, color: C.navy, fontWeight: 700, fontSize: 36 * u, padding: `${22 * u}px ${46 * u}px`, borderRadius: 10 * u }}>Register your team  ↗</div>
          <div style={{ position: 'relative', fontWeight: 600, fontSize: 44 * u, letterSpacing: 0.5 * u }}>
            scottsdaleolympiad.com
            <Chalk viewBox="0 0 600 20" d="M4 10 C 180 4, 420 16, 596 8" at={cue('close', 29.3)} dur={18} width={6} color={C.gold} style={{ position: 'absolute', left: 0, right: 0, bottom: -24 * u, width: '100%', height: 20 * u }} />
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 70 * u, display: 'flex', alignItems: 'center', gap: 16 * u, fontSize: 20 * u, letterSpacing: 3 * u, color: '#cadfc2', fontWeight: 600 }}>
          <Img src={staticFile('img/saguaros-logo.png')} style={{ height: 80 * u, filter: 'brightness(0) invert(1)', opacity: 0.95 }} />
          SCOTTSDALE STADIUM · FOR ARIZONA’S KIDS
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
