// All sound is synthesised with the Web Audio API: zero audio files.
export class Sfx {
  // Browsers only allow audio after a user gesture (our start click).
  start() {
    this.ctx = new AudioContext();
    const comp = this.ctx.createDynamicsCompressor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(comp).connect(this.ctx.destination);
    this.noise = this.makeNoise();
  }

  makeNoise() {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // Deep, bass-boosted "thud": a sine wave sweeping down in pitch.
  thud(weight = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.45);
    gain.gain.setValueAtTime(Math.min(1, 0.4 + weight * 0.3), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  // Glass shatter: filtered noise burst + random high "tinkles".
  shatter(weight = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    src.connect(hp).connect(gain).connect(this.master);
    src.start(t, Math.random() * 0.5, 0.4);

    const tinkles = Math.min(14, 4 + Math.floor(weight * 3));
    for (let i = 0; i < tinkles; i++) {
      const at = t + Math.random() * 0.25;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.frequency.value = 2000 + Math.random() * 5000;
      g.gain.setValueAtTime(0.06, at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
      osc.connect(g).connect(this.master);
      osc.start(at);
      osc.stop(at + 0.12);
    }
  }
}
