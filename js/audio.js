'use strict';
// ============================================================
//  AUDIO: eigene Musik-Engine (Sequencer + Synths) & Soundeffekte
//  Alles wird live per WebAudio erzeugt – keine Audiodateien.
// ============================================================
(function () {
  let ac = null, master = null, sfxBus = null, musBus = null, comp = null, reverb = null, delay = null, noiseBuf = null;
  let sfxOn = SC.store.get('sound', true);
  let musOn = SC.store.get('music', true);
  const last = {};
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const n2m = (s) => {
    const m = s.match(/^([A-G]#?)(-?\d)$/);
    return NOTE[m[1]] + (+m[2] + 1) * 12;
  };

  function makeIR(sec, decay) {
    const len = ac.sampleRate * sec;
    const b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  function init() {
    if (ac) {
      if (ac.state === 'suspended') ac.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master = ac.createGain();
    master.gain.value = 0.9;
    comp.connect(master);
    master.connect(ac.destination);
    sfxBus = ac.createGain();
    sfxBus.gain.value = sfxOn ? 0.55 : 0;
    sfxBus.connect(comp);
    musBus = ac.createGain();
    musBus.gain.value = musOn ? 0.5 : 0;
    musBus.connect(comp);
    reverb = ac.createConvolver();
    reverb.buffer = makeIR(2.2, 3);
    const rv = ac.createGain();
    rv.gain.value = 0.35;
    reverb.connect(rv);
    rv.connect(musBus);
    delay = ac.createDelay(1);
    const fb = ac.createGain();
    fb.gain.value = 0.32;
    const dl = ac.createGain();
    dl.gain.value = 0.28;
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(dl);
    dl.connect(musBus);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    document.addEventListener('visibilitychange', () => {
      if (!ac) return;
      if (document.hidden) ac.suspend();
      else ac.resume();
    });
    if (SC.music._want) SC.music.play(SC.music._want);
  }

  // ---------------- Bausteine ----------------
  function env(g, t, a, peak, dec, sus, rel, len) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + dec);
    if (len != null) {
      g.gain.setValueAtTime(Math.max(0.0001, peak * sus), t + len);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len + rel);
    }
  }
  function osc(type, f, t, stop, dest, detune) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (detune) o.detune.value = detune;
    o.connect(dest);
    o.start(t);
    o.stop(stop);
    return o;
  }
  function noise(t, dur, dest, filterType, freq, q) {
    const s = ac.createBufferSource();
    s.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = filterType || 'bandpass';
    f.frequency.value = freq || 1000;
    f.Q.value = q || 1;
    s.connect(f);
    f.connect(dest);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
    return f;
  }
  function gainTo(dest, v) {
    const g = ac.createGain();
    g.gain.value = v == null ? 1 : v;
    g.connect(dest);
    return g;
  }

  // ---------------- Instrumente (Musik) ----------------
  const I = {
    kick(t, v, dest) {
      const g = gainTo(dest, 0);
      env(g, t, 0.002, v, 0.32, 0.001);
      const o = osc('sine', 160, t, t + 0.4, g);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
      const c = gainTo(dest, 0);
      env(c, t, 0.001, v * 0.5, 0.02, 0.001);
      noise(t, 0.03, c, 'highpass', 3000, 0.7);
    },
    clap(t, v, dest) {
      for (let i = 0; i < 3; i++) {
        const g = gainTo(dest, 0);
        env(g, t + i * 0.011, 0.001, v * (i === 2 ? 1 : 0.6), i === 2 ? 0.16 : 0.012, 0.001);
        noise(t + i * 0.011, 0.2, g, 'bandpass', 1300, 1.2);
      }
    },
    hat(t, v, dest, open) {
      const g = gainTo(dest, 0);
      env(g, t, 0.001, v, open ? 0.2 : 0.035, 0.001);
      noise(t, open ? 0.25 : 0.06, g, 'highpass', 8000, 0.8);
    },
    shaker(t, v, dest) {
      const g = gainTo(dest, 0);
      env(g, t, 0.008, v, 0.05, 0.001);
      noise(t, 0.08, g, 'bandpass', 6500, 1.5);
    },
    rim(t, v, dest) {
      const g = gainTo(dest, 0);
      env(g, t, 0.001, v, 0.04, 0.001);
      osc('triangle', 1700, t, t + 0.06, g);
      noise(t, 0.03, g, 'bandpass', 2500, 3);
    },
    bass(t, m, dur, v, dest) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.Q.value = 6;
      f.frequency.setValueAtTime(1400, t);
      f.frequency.exponentialRampToValueAtTime(220, t + dur * 0.9);
      const g = gainTo(dest, 0);
      f.connect(g);
      env(g, t, 0.005, v, 0.1, 0.7, 0.05, dur);
      osc('sawtooth', mtof(m), t, t + dur + 0.1, f);
      osc('square', mtof(m - 12), t, t + dur + 0.1, f);
    },
    supersaw(t, ms, dur, v, dest, send) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(5200, t);
      f.frequency.exponentialRampToValueAtTime(1600, t + dur);
      const g = gainTo(dest, 0);
      f.connect(g);
      if (send) f.connect(send);
      env(g, t, 0.006, v, 0.12, 0.5, 0.08, dur);
      for (const m of ms) for (const dt of [-14, 0, 13]) osc('sawtooth', mtof(m), t, t + dur + 0.2, f, dt);
    },
    pluck(t, m, v, dest, sends) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.Q.value = 3;
      f.frequency.setValueAtTime(6000, t);
      f.frequency.exponentialRampToValueAtTime(700, t + 0.22);
      const g = gainTo(dest, 0);
      f.connect(g);
      for (const s of sends || []) g.connect(s);
      env(g, t, 0.003, v, 0.28, 0.001);
      osc('square', mtof(m), t, t + 0.35, f);
      osc('sawtooth', mtof(m + 12), t, t + 0.35, f, 6);
    },
    pad(t, ms, dur, v, dest, send) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1700;
      const g = gainTo(dest, 0);
      f.connect(g);
      if (send) f.connect(send);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.4);
      g.gain.setValueAtTime(v, t + dur - 0.2);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.3);
      for (const m of ms) {
        osc('triangle', mtof(m), t, t + dur + 0.4, f, -8);
        osc('sawtooth', mtof(m), t, t + dur + 0.4, f, 9);
      }
    },
    marimba(t, m, v, dest, send) {
      const g = gainTo(dest, 0);
      if (send) g.connect(send);
      env(g, t, 0.002, v, 0.55, 0.001);
      osc('sine', mtof(m), t, t + 0.7, g);
      const g2 = gainTo(g, 0);
      env(g2, t, 0.001, 0.5, 0.05, 0.001);
      osc('sine', mtof(m) * 4, t, t + 0.1, g2);
    },
    steel(t, m, v, dest, send) {
      const g = gainTo(dest, 0);
      if (send) g.connect(send);
      env(g, t, 0.004, v, 0.7, 0.001);
      const f = mtof(m);
      osc('sine', f, t, t + 0.9, g);
      const h = gainTo(g, 0.35);
      osc('sine', f * 2.01, t, t + 0.9, h);
      const h2 = gainTo(g, 0.18);
      osc('sine', f * 3.03, t, t + 0.5, h2);
    },
    riser(t, dur, v, dest) {
      const g = gainTo(dest, 0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + dur);
      const f = noise(t, dur, g, 'bandpass', 400, 2);
      f.frequency.exponentialRampToValueAtTime(8000, t + dur);
    },
  };

  // ---------------- Tracks ----------------
  const parse = (str) => str.split(/\s+/).map((x) => (x === '-' ? null : n2m(x)));

  // „Krabben-Rave“ – A-Moll, 126 BPM, eigene Komposition
  const RAVE = {
    bpm: 126,
    bars: 16,
    chords: [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['C4', 'E4', 'G4'], ['G3', 'B3', 'D4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['C4', 'E4', 'G4'], ['E3', 'G#3', 'B3']].map((c) => c.map(n2m)),
    roots: ['A1', 'F1', 'C2', 'G1', 'A1', 'F1', 'C2', 'E1'].map(n2m),
    lead: [
      'A5 - - C6 - - E6 - D6 - C6 - A5 - G5 -',
      'A5 - - C6 - - F6 - E6 - C6 - A5 - - -',
      'G5 - - C6 - - E6 - D6 - C6 - G5 - E5 -',
      'G5 - - B5 - - D6 - C6 - B5 - G5 - D6 -',
      'A5 - - C6 - - E6 - A6 - G6 - E6 - C6 -',
      'A5 - - C6 - - F6 - A6 - G6 - F6 - E6 -',
      'G5 - - C6 - - E6 - G6 - E6 - C6 - D6 -',
      'G#5 - - B5 - - E6 - D6 - B5 - G#5 - E5 -',
    ].map(parse),
    step(i, t, bus, sd) {
      const bar = Math.floor(i / 16) % this.bars, s = i % 16, b8 = bar % 8;
      const drop = bar >= 8;
      const ch = this.chords[b8];
      // Drums
      if (drop) {
        if (s % 4 === 0) {
          I.kick(t, 0.95, bus.drums);
          duck(bus.duck, t, sd * 3);
        }
        if (s === 4 || s === 12) I.clap(t, 0.5, bus.drums);
        if (s % 4 === 2) I.hat(t, 0.22, bus.drums, true);
        if (s % 2 === 1) I.hat(t, 0.09, bus.drums);
      } else {
        if (s === 0 && b8 % 2 === 0) I.kick(t, 0.6, bus.drums);
        if (s % 2 === 0) I.hat(t, 0.1, bus.drums);
        if (bar === 7 && s === 0) I.riser(t, sd * 16, 0.25, bus.drums);
        if (bar === 7 && s >= 8 && s % 2 === 0) I.clap(t, 0.12 + (s - 8) * 0.04, bus.drums);
      }
      // Bass
      if (drop && [0, 3, 6, 8, 11, 14].includes(s)) I.bass(t, this.roots[b8] + (s === 6 || s === 14 ? 12 : 0), sd * 1.6, 0.42, bus.bass);
      // Akkord-Stabs (Offbeat, gesidechaint)
      if (drop && s % 4 === 2) I.supersaw(t, ch, sd * 1.4, 0.07, bus.duck, bus.rev);
      if (!drop && s === 0) I.pad(t, ch, sd * 16, 0.05, bus.duck, bus.rev);
      // Lead
      const n = this.lead[b8][s];
      if (n != null && (drop || bar >= 2)) I.pluck(t, n, drop ? 0.13 : 0.09, bus.lead, [bus.rev, bus.dly]);
    },
  };

  // „Strandpatrouille“ – C-Dur, 104 BPM, entspannt
  const BEACH = {
    bpm: 104,
    bars: 8,
    chords: [['C4', 'E4', 'G4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4'], ['C4', 'E4', 'G4'], ['A3', 'C4', 'E4'], ['D4', 'F4', 'A4'], ['G3', 'B3', 'D4']].map((c) => c.map(n2m)),
    roots: ['C2', 'A1', 'F1', 'G1', 'C2', 'A1', 'D2', 'G1'].map(n2m),
    mel: [
      'E5 - G5 - - - C6 - - - A5 - G5 - - -',
      'A5 - - - G5 - E5 - - - C5 - D5 - - -',
      'C5 - F5 - - - A5 - - - G5 - F5 - - -',
      'D5 - - - G5 - B5 - - - A5 - G5 - - -',
      'E5 - G5 - - - C6 - - - D6 - E6 - - -',
      'C6 - - - A5 - G5 - - - E5 - G5 - - -',
      'F5 - - - A5 - D6 - - - C6 - A5 - - -',
      'B5 - - - A5 - G5 - - - D5 - G5 - - -',
    ].map(parse),
    step(i, t, bus, sd) {
      const bar = Math.floor(i / 16) % this.bars, s = i % 16;
      const ch = this.chords[bar];
      if (s === 0 || s === 8) I.kick(t, 0.45, bus.drums);
      if (s === 4 || s === 12) I.rim(t, 0.16, bus.drums);
      I.shaker(t, s % 2 ? 0.05 : 0.08, bus.drums);
      if (s === 0 || s === 6 || s === 8 || s === 14) I.bass(t, this.roots[bar] + (s === 6 || s === 14 ? 7 : 0), sd * 1.8, 0.3, bus.bass);
      if (s === 2 || s === 6 || s === 10 || s === 14) for (const m of ch) I.steel(t, m + 12, 0.035, bus.lead, bus.rev);
      const n = this.mel[bar][s];
      if (n != null) I.marimba(t, n, 0.16, bus.lead, bus.rev);
    },
  };

  // Sidechain-Ducking
  function duck(node, t, len) {
    node.gain.cancelScheduledValues(t);
    node.gain.setValueAtTime(0.25, t);
    node.gain.linearRampToValueAtTime(1, t + len);
  }

  // ---------------- Sequencer ----------------
  const music = {
    _want: null,
    cur: null,
    step: 0,
    next: 0,
    timer: null,
    t0: 0,
    bus: null,
    play(name, opts) {
      this._want = name;
      if (!ac) return;
      if (this.cur && this.curName === name && !(opts && opts.restart)) return;
      this.stop(0.6);
      const track = name === 'menu' ? RAVE : BEACH;
      const out = ac.createGain();
      out.gain.value = 0.0001;
      out.gain.linearRampToValueAtTime(name === 'menu' ? 1 : 0.8, ac.currentTime + 0.8);
      out.connect(musBus);
      const mk = (v) => gainTo(out, v);
      const bus = { out, drums: mk(0.9), bass: mk(0.8), lead: mk(0.9), duck: mk(1), rev: reverb, dly: delay };
      this.bus = bus;
      this.cur = track;
      this.curName = name;
      this.step = ((opts && opts.startBar) || 0) * 16;
      this.next = ac.currentTime + 0.1;
      this.t0 = this.next - (this.step * 60) / track.bpm / 4;
      const sd = 60 / track.bpm / 4;
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        if (!this.cur) return;
        while (this.next < ac.currentTime + 0.15) {
          try {
            track.step(this.step, this.next, bus, sd);
          } catch (e) {}
          this.step++;
          this.next += sd;
        }
      }, 25);
    },
    stop(fade) {
      clearInterval(this.timer);
      if (this.bus && ac) {
        const o = this.bus.out;
        o.gain.cancelScheduledValues(ac.currentTime);
        o.gain.setValueAtTime(o.gain.value, ac.currentTime);
        o.gain.linearRampToValueAtTime(0.0001, ac.currentTime + (fade || 0.3));
        setTimeout(() => o.disconnect(), ((fade || 0.3) + 0.5) * 1000);
      }
      this.cur = null;
      this.curName = null;
      this.bus = null;
    },
    // Taktposition für tanzende Krebse (0..1 je Schlag)
    beat() {
      if (!ac || !this.cur) return (performance.now() / 1000) * 2;
      return ((ac.currentTime - this.t0) * this.cur.bpm) / 60;
    },
    get playing() {
      return !!this.cur;
    },
  };
  SC.music = music;

  // ---------------- Soundeffekte ----------------
  function gate(key, ms) {
    const now = performance.now();
    if (last[key] && now - last[key] < ms) return false;
    last[key] = now;
    return true;
  }
  const T = () => ac.currentTime;
  const sfx = (v) => gainTo(sfxBus, v);
  function tone(type, f0, f1, dur, v, delayS) {
    if (!ac) return;
    const t = T() + (delayS || 0);
    const g = sfx(0);
    env(g, t, 0.004, v, dur, 0.001);
    const o = osc(type, f0, t, t + dur + 0.05, g);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  }
  function nz(dur, v, type, freq, q, delayS, f1) {
    if (!ac) return;
    const t = T() + (delayS || 0);
    const g = sfx(0);
    env(g, t, 0.002, v, dur, 0.001);
    const f = noise(t, dur, g, type, freq, q);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  }

  SC.audio = {
    init,
    get on() {
      return sfxOn;
    },
    get musicOn() {
      return musOn;
    },
    toggle() {
      sfxOn = !sfxOn;
      SC.store.set('sound', sfxOn);
      if (sfxBus) sfxBus.gain.value = sfxOn ? 0.55 : 0;
      return sfxOn;
    },
    toggleMusic() {
      musOn = !musOn;
      SC.store.set('music', musOn);
      if (musBus) musBus.gain.value = musOn ? 0.5 : 0;
      return musOn;
    },
    ctx: () => ac,
    master: () => master,
    // Für Video-Aufnahmen: Gesamtmix als MediaStream
    recordStream() {
      init();
      const d = ac.createMediaStreamDestination();
      master.connect(d);
      return d.stream;
    },
    // Sprecher abspielen; Musik wird währenddessen abgesenkt
    voice(buf, when, gain) {
      init();
      const t = Math.max(ac.currentTime, when || 0);
      const s = ac.createBufferSource();
      s.buffer = buf;
      const g = ac.createGain();
      g.gain.value = gain || 1.6;
      s.connect(g);
      g.connect(comp);
      s.start(t);
      if (musBus && musOn) {
        musBus.gain.setTargetAtTime(0.16, t - 0.05, 0.05);
        musBus.gain.setTargetAtTime(0.5, t + buf.duration + 0.1, 0.25);
      }
      return s;
    },
    decode(arr) {
      init();
      return ac.decodeAudioData(arr);
    },
    pop(big) {
      if (!ac) return;
      if (big) return this.bigPop();
      if (!gate('pop', 28)) return;
      const p = 0.85 + Math.random() * 0.4;
      nz(0.05, 0.42, 'bandpass', 2600 * p, 1.4);
      tone('sine', 900 * p, 380 * p, 0.05, 0.12);
    },
    bigPop() {
      if (!gate('popbig', 120)) return;
      tone('sine', 120, 35, 0.6, 0.6);
      nz(0.5, 0.5, 'lowpass', 1800, 0.7, 0, 200);
      nz(0.15, 0.4, 'bandpass', 3000, 1, 0.02);
      tone('square', 300, 80, 0.3, 0.08, 0.03);
    },
    snap() {
      if (!gate('snap', 55)) return;
      nz(0.03, 0.45, 'highpass', 4500, 1);
      tone('sine', 2200, 700, 0.04, 0.08);
    },
    punch() {
      if (!gate('punch', 60)) return;
      tone('sine', 220, 70, 0.09, 0.35);
      nz(0.04, 0.3, 'lowpass', 1200, 1);
    },
    whoosh() {
      if (gate('whoosh', 110)) nz(0.2, 0.18, 'bandpass', 500, 1.2, 0, 2500);
    },
    boom() {
      if (!gate('boom', 80)) return;
      tone('sine', 140, 40, 0.35, 0.45);
      nz(0.3, 0.35, 'lowpass', 1400, 0.8, 0, 150);
    },
    freeze(hot) {
      if (!gate('freeze', 140)) return;
      if (hot) {
        nz(0.35, 0.25, 'lowpass', 900, 1, 0, 300);
        tone('sawtooth', 200, 90, 0.3, 0.06);
      } else {
        for (let i = 0; i < 4; i++) tone('sine', 2400 + i * 500, 2400 + i * 500, 0.12, 0.05, i * 0.03);
        nz(0.25, 0.12, 'highpass', 6000, 1);
      }
    },
    stomp() {
      if (gate('stomp', 80)) {
        tone('sine', 95, 40, 0.14, 0.45);
        nz(0.06, 0.15, 'lowpass', 600, 1);
      }
    },
    coin() {
      if (!gate('coin', 45)) return;
      tone('square', 1318, 1318, 0.07, 0.08);
      tone('square', 1760, 1760, 0.16, 0.08, 0.06);
      tone('sine', 3520, 3520, 0.12, 0.04, 0.06);
    },
    leak() {
      if (!gate('leak', 220)) return;
      tone('sawtooth', 220, 110, 0.25, 0.14);
      tone('sawtooth', 165, 82, 0.3, 0.12, 0.12);
    },
    whale() {
      tone('sawtooth', 110, 70, 1.0, 0.18);
      tone('sine', 220, 140, 0.9, 0.2, 0.1);
      nz(0.9, 0.3, 'lowpass', 600, 0.6, 0, 150);
    },
    place() {
      tone('sine', 180, 90, 0.12, 0.4);
      nz(0.08, 0.2, 'lowpass', 900, 1);
      tone('triangle', 900, 1400, 0.08, 0.06, 0.05);
    },
    upgrade() {
      [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.09, 0.07, i * 0.055));
      nz(0.4, 0.08, 'highpass', 7000, 1, 0.1);
    },
    tier4() {
      [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone('sawtooth', f, f, 0.14, 0.06, i * 0.06));
      tone('sine', 80, 40, 0.8, 0.4, 0.3);
      nz(1.0, 0.12, 'highpass', 5000, 1, 0.3);
    },
    ability() {
      nz(0.35, 0.3, 'bandpass', 300, 1, 0, 6000);
      tone('sawtooth', 110, 880, 0.35, 0.1);
      tone('sine', 60, 30, 0.7, 0.55, 0.32);
      nz(0.5, 0.3, 'lowpass', 2000, 0.8, 0.32, 200);
    },
    click() {
      tone('triangle', 1200, 800, 0.035, 0.12);
    },
    send() {
      nz(0.18, 0.18, 'bandpass', 600, 1.5, 0, 3500);
      tone('triangle', 400, 900, 0.15, 0.1);
    },
    error() {
      tone('square', 200, 160, 0.09, 0.08);
      tone('square', 160, 130, 0.12, 0.08, 0.08);
    },
    round() {
      tone('sawtooth', 392, 392, 0.14, 0.09);
      tone('sawtooth', 523, 523, 0.28, 0.1, 0.13);
      tone('square', 784, 784, 0.28, 0.04, 0.13);
    },
    vs() {
      nz(0.5, 0.35, 'bandpass', 200, 1, 0, 5000);
      tone('sine', 70, 30, 1.0, 0.6, 0.45);
      nz(0.8, 0.35, 'lowpass', 1500, 0.8, 0.45, 100);
    },
    win() {
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone('square', f, f, i === 5 ? 0.6 : 0.15, 0.08, i * 0.14));
      [262, 330, 392].forEach((f) => tone('sawtooth', f, f, 1.2, 0.04, 0.7));
    },
    lose() {
      [392, 370, 349, 294].forEach((f, i) => tone('sawtooth', f, f * 0.97, i === 3 ? 0.8 : 0.28, 0.09, i * 0.3));
    },
  };
})();
