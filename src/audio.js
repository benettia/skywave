// the thin shell: wire pure outputs to oscillators. nothing in here is
// decidable by a machine — keep it dumb, keep the logic in tune.js/band.js.
import { morseEncode, morseTiming } from './morse.js';
import { rttyEncode, rttyText, freqOf, UNIT, MARK_HZ } from './rtty.js';
import { intervalMelody, numbersScript, beepFreqs, SIGNOFF_HZ } from './numbers.js';

// deps come from the panel: srng(st) per-station rng, voiceFor(st) a speech
// voice or null, speechVol(st) current spoken loudness, audible() whether the
// signal is strong enough for speech to surface from the noise.
export function createRadio({ srng, voiceFor, speechVol, audible }) {
  let ctx = null, master, bus, noiseG, crackG, hetOsc, hetG, act = null, on = false;

  function tone(dest, type, f, t, dur, peak) { const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f; o.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + .02);
    g.gain.setTargetAtTime(0, t + dur * .6, dur * .25); o.start(t); o.stop(t + dur + 1); }
  function chainBase(st) { const g = ctx.createGain(); g.gain.value = 0; g.connect(bus);
    const c = { st, g, tm: [], osc: [], dead: false };
    c.stop = () => { c.dead = true; c.tm.forEach(clearTimeout);
      c.osc.forEach(o => { try { o.stop(); } catch (e) {} });
      setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 100);
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); };
    return c; }
  function buildMorse(st) { const c = chainBase(st);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 600;
    const kg = ctx.createGain(); kg.gain.value = 0; o.connect(kg); kg.connect(c.g); o.start(); c.osc.push(o);
    const seq = morseTiming(morseEncode(st.msg)), u = .09; let next = 0;
    (function loop() { if (c.dead) return; let t = Math.max(next, ctx.currentTime + .1);
      for (const [on_, off] of seq) { kg.gain.setTargetAtTime(.8, t, .004);
        kg.gain.setTargetAtTime(0, t + on_ * u, .004); t += (on_ + off) * u; }
      next = t; c.tm.push(setTimeout(loop, Math.max(200, (t - ctx.currentTime - 2) * 1000))); })();
    return c; }
  function buildRtty(st) { const c = chainBase(st);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = MARK_HZ;
    const kg = ctx.createGain(); kg.gain.value = .55; o.connect(kg); kg.connect(c.g); o.start(); c.osc.push(o);
    const bits = rttyEncode(rttyText(srng(st))); let next = 0;  // the station repeats its tape
    (function loop() { if (c.dead) return; let t = Math.max(next, ctx.currentTime + .1);
      for (const b of bits) { o.frequency.setValueAtTime(freqOf(b), t); t += UNIT; }
      o.frequency.setValueAtTime(MARK_HZ, t); t += UNIT * 32;   // idle on mark between repeats
      next = t; c.tm.push(setTimeout(loop, Math.max(200, (t - ctx.currentTime - 2) * 1000))); })();
    return c; }
  function buildCarrier(st) { const c = chainBase(st);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    const mg = ctx.createGain(); mg.gain.value = .5; lp.connect(mg); mg.connect(c.g);
    const rs = srng(st), pent = [0, 2, 4, 7, 9, 12]; let next = 0;
    (function loop() { if (c.dead) return; let t = Math.max(next, ctx.currentTime + .1);
      for (let i = 0; i < 12; i++) { if (rs() < .18) { t += .5; continue; }
        const f = 196 * Math.pow(2, (pent[(rs() * 6) | 0] + (rs() < .3 ? 12 : 0)) / 12);
        tone(lp, 'triangle', f, t, .55, .5); t += .42 + .21 * ((rs() * 2) | 0); }
      next = t; c.tm.push(setTimeout(loop, Math.max(200, (t - ctx.currentTime - 2) * 1000))); })();
    return c; }
  function buildNumbers(st) { const c = chainBase(st); const rs = srng(st);
    const tune = intervalMelody(rs);
    const sched = (fn, ms) => { if (!c.dead) c.tm.push(setTimeout(fn, ms)); };
    function melody(t0) { let t = t0;
      for (let k = 0; k < 2; k++) { for (const n of tune) {
        for (const [ty, det, pk] of [['sine', 0, .4], ['triangle', 3, .12]]) {
          const o = ctx.createOscillator(), og = ctx.createGain(); o.type = ty;
          o.frequency.value = 880 * Math.pow(2, n / 12) + det; o.connect(og); og.connect(c.g);
          og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(pk, t + .008);
          og.gain.setTargetAtTime(0, t + .03, .22); o.start(t); o.stop(t + 1.2); }
        t += .42; } t += .6; }
      return t + .5; }
    function beeps(digits, done) { let t = ctx.currentTime + .05;  // two-tone fallback
      for (const d of digits) { const [lo, hi] = beepFreqs(d);
        tone(c.g, 'sine', lo, t, .09, .5); tone(c.g, 'sine', hi, t + .1, .09, .5); t += .32; }
      sched(done, (t - ctx.currentTime) * 1000 + 250); }
    function speak(list, i) { if (c.dead) return;
      if (i >= list.length) return phaseOff();
      const voice = voiceFor(st);
      if (!voice) return beeps(list[i].split('').map(Number), () => speak(list, i + 1));
      if (!audible()) return sched(() => speak(list, i + 1), 2800); // too weak / detuned: lost in noise
      const u = new SpeechSynthesisUtterance(list[i].split('').join(' '));
      u.voice = voice; u.lang = voice.lang; u.rate = .72; u.pitch = .85;
      u.volume = speechVol(st);
      let fired = false; const nx = () => { if (!fired) { fired = true; sched(() => speak(list, i + 1), 400); } };
      u.onend = nx; u.onerror = nx; sched(nx, 6000); speechSynthesis.speak(u); }
    function phaseMelody() { if (c.dead) return; const end = melody(ctx.currentTime + .1);
      sched(phaseDigits, (end - ctx.currentTime) * 1000 + 300); }
    function phaseDigits() { if (c.dead) return; speak(numbersScript(rs).spoken, 0); }
    function phaseOff() { if (c.dead) return; let t = ctx.currentTime + .4;
      for (const f of SIGNOFF_HZ) tone(c.g, 'sine', f, t, .28, .5), t += .42;
      sched(phaseMelody, (t - ctx.currentTime) * 1000 + 2200); }
    phaseMelody();
    if (st.jam) { // jammer parked on this frequency — harsh swept buzz
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.2;
      const jg = ctx.createGain(); jg.gain.value = .5; bp.connect(jg); jg.connect(c.g);
      for (const f of [88, 88.9]) { const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.value = f; o.connect(bp); o.start(); c.osc.push(o); }
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .31;
      lg.gain.value = 420; lfo.connect(lg); lg.connect(bp.frequency); lfo.start(); c.osc.push(lfo); }
    return c; }
  const BUILD = { n: buildNumbers, m: buildMorse, r: buildRtty, c: buildCarrier };

  function initAudio() { ctx = new AudioContext();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    bus = hp; hp.connect(lp); lp.connect(master);
    const len = 2 * ctx.sampleRate, buf = ctx.createBuffer(1, len, ctx.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const nsrc = ctx.createBufferSource(); nsrc.buffer = buf; nsrc.loop = true;
    noiseG = ctx.createGain(); noiseG.gain.value = .1; nsrc.connect(noiseG); noiseG.connect(bus); nsrc.start();
    const csrc = ctx.createBufferSource(); csrc.buffer = buf; csrc.loop = true; csrc.playbackRate.value = 1.7;
    crackG = ctx.createGain(); crackG.gain.value = 0; csrc.connect(crackG); crackG.connect(bus); csrc.start();
    hetOsc = ctx.createOscillator(); hetOsc.type = 'sine'; hetOsc.frequency.value = 1;
    hetG = ctx.createGain(); hetG.gain.value = 0; hetOsc.connect(hetG); hetG.connect(bus); hetOsc.start();
    (function crackle() { if (on) { const t = ctx.currentTime, a = .1 + Math.random() * .5; // poisson-ish ticks
        crackG.gain.setValueAtTime(0, t); crackG.gain.linearRampToValueAtTime(a, t + .004);
        crackG.gain.setTargetAtTime(0, t + .01, .02); }
      setTimeout(crackle, 250 + Math.random() * 4800); })(); }

  return {
    now: () => ctx ? ctx.currentTime : 0,
    station: () => act && act.st,
    power(onNow, vol) { on = onNow;
      if (on) { if (!ctx) initAudio(); ctx.resume();
        master.gain.setTargetAtTime(vol, ctx.currentTime, .3); }       // soft ramp, no pop
      else if (ctx) { master.gain.setTargetAtTime(0, ctx.currentTime, .15);
        if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
        setTimeout(() => { if (!on) ctx.suspend(); }, 800); } },
    setVol(v) { if (ctx && on) master.gain.setTargetAtTime(v, ctx.currentTime, .05); },
    retune(st) { if (act) { const old = act;
        old.g.gain.setTargetAtTime(0, ctx.currentTime, .04); setTimeout(() => old.stop(), 300); act = null; }
      if (st) act = BUILD[st.ty](st); },
    apply({ beat, het, noise, level }) { const t = ctx.currentTime; // targets from tune.js, pure
      hetOsc.frequency.setTargetAtTime(Math.max(beat, .01), t, .02); // continuous glide
      hetG.gain.setTargetAtTime(het, t, .05);
      noiseG.gain.setTargetAtTime(noise, t, .08);
      if (act) act.g.gain.setTargetAtTime(level, t, .06); },
  };
}
