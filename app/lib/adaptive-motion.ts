const bands = [
  { start: 45, end: 200, release: 1.12 },
  { start: 200, end: 1500, release: 1 },
  { start: 1500, end: 6500, release: 0.72 },
] as const;

type BandState = {
  energy: number;
  novelty: number;
  average: number;
  variation: number;
  activity: number;
};

/** Adapts backdrop motion to the dominant rhythmic frequencies and tempo of the audio. */
export class AdaptiveMotion {
  private previous = new Uint8Array(0);
  private states: BandState[] = [];
  private ready = false;
  private lastAccent = -Infinity;
  private interval = 420;
  private pulse = 0;
  private pulseRelease = 140;
  private level = 0;

  reset() {
    this.previous.fill(0);
    this.states = [];
    this.ready = false;
    this.lastAccent = -Infinity;
    this.interval = 420;
    this.pulse = 0;
    this.level = 0;
  }

  sample(spectrum: Uint8Array, sampleRate: number, time: number, elapsed: number): number {
    if (this.previous.length !== spectrum.length) {
      this.previous = new Uint8Array(spectrum.length);
      this.ready = false;
    }

    const hzPerBin = sampleRate / (spectrum.length * 2);
    const observations = bands.map((band) => {
      const first = Math.max(1, Math.ceil(band.start / hzPerBin));
      const last = Math.min(spectrum.length - 1, Math.floor(band.end / hzPerBin));
      let energy = 0;
      let flux = 0;
      for (let bin = first; bin <= last; bin++) {
        energy += spectrum[bin];
        flux += Math.max(0, spectrum[bin] - this.previous[bin]);
      }
      const count = Math.max(1, last - first + 1);
      return { energy: energy / count / 255, flux: flux / count / 255 };
    });
    this.previous.set(spectrum);

    if (!this.ready) {
      this.states = observations.map(({ energy }) => ({
        energy, novelty: 0, average: 0.005, variation: 0.003, activity: 0.005,
      }));
      this.ready = true;
      return this.advance(elapsed);
    }

    const activityFade = 1 - Math.exp(-elapsed / 3000);
    let bestBand = -1;
    let bestStrength = 0;
    const activityPeak = Math.max(0.005, ...this.states.map((state) => state.activity));
    observations.forEach(({ energy, flux }, index) => {
      const state = this.states[index];
      const rise = Math.max(0, energy - state.energy);
      const novelty = flux + rise * 0.35;
      const threshold = Math.max(0.008, state.average + state.variation * 1.15);
      const followsAttack = novelty > state.novelty * 1.12 || rise > state.energy * 0.07;
      if (energy > 0.012 && novelty > threshold && followsAttack) {
        const emphasis = 0.6 + 0.4 * Math.min(1, state.activity / activityPeak);
        const strength = Math.min(1, 0.55 + (novelty / threshold - 1) * 0.2) * emphasis;
        if (strength > bestStrength) {
          bestStrength = strength;
          bestBand = index;
        }
      }

      // Keep learning even during bright, busy sections so they become the new baseline.
      const deviation = Math.abs(novelty - state.average);
      state.average += (novelty - state.average) * 0.06;
      state.variation += (deviation - state.variation) * 0.06;
      state.activity += (novelty - state.activity) * activityFade;
      state.energy = energy;
      state.novelty = novelty;
    });

    if (bestBand >= 0 && time - this.lastAccent >= 85) {
      const gap = time - this.lastAccent;
      if (gap >= 85 && gap <= 1200) this.interval += (gap - this.interval) * 0.35;
      this.lastAccent = time;
      this.pulse = Math.max(0.58, bestStrength);
      this.pulseRelease = Math.max(45, Math.min(170, this.interval * 0.34)) * bands[bestBand].release;
    }
    return this.advance(elapsed);
  }

  release(elapsed: number): number {
    this.pulse = 0;
    return this.advance(elapsed);
  }

  private advance(elapsed: number): number {
    const target = this.pulse;
    const response = target > this.level ? 32 : 95;
    this.level += (target - this.level) * (1 - Math.exp(-elapsed / response));
    this.pulse *= Math.exp(-elapsed / this.pulseRelease);
    return this.level;
  }
}
