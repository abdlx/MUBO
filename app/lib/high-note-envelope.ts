/** Tracks sustained, prominent notes above the midrange while ignoring bass and broadband noise. */
export class HighNoteEnvelope {
  private noiseFloor = 0;
  private consecutiveFrames = 0;
  private level = 0;
  private ready = false;

  reset() {
    this.noiseFloor = 0;
    this.consecutiveFrames = 0;
    this.level = 0;
    this.ready = false;
  }

  sample(spectrum: Uint8Array, sampleRate: number, elapsed: number): number {
    const hzPerBin = sampleRate / (spectrum.length * 2);
    const first = Math.max(6, Math.ceil(700 / hzPerBin));
    const last = Math.min(spectrum.length - 7, Math.floor(4000 / hzPerBin));
    let strongest = 0;
    let second = 0;
    let third = 0;
    let dominantFrequency = 700;

    for (let bin = first; bin <= last; bin++) {
      const peak = spectrum[bin];
      if (peak <= spectrum[bin - 1] || peak <= spectrum[bin + 1]) continue;
      const surroundings = (spectrum[bin - 6] + spectrum[bin - 4]
        + spectrum[bin + 4] + spectrum[bin + 6]) / 4;
      const prominence = Math.max(0, peak - surroundings);
      if (prominence > strongest) {
        third = second;
        second = strongest;
        strongest = prominence;
        dominantFrequency = bin * hzPerBin;
      } else if (prominence > second) {
        third = second;
        second = prominence;
      } else if (prominence > third) {
        third = prominence;
      }
    }

    const tone = (strongest * 0.65 + second * 0.25 + third * 0.1) / 255;
    if (!this.ready) {
      this.noiseFloor = tone * 0.35;
      this.ready = true;
    }
    const threshold = Math.max(0.038, this.noiseFloor + 0.025);
    const present = tone > threshold * 1.1;
    this.consecutiveFrames = present ? this.consecutiveFrames + 1 : 0;

    // Learn the background only when a high note is absent; a held note stays enlarged.
    if (!present) this.noiseFloor += (tone - this.noiseFloor) * 0.035;
    const pitch = Math.max(0, Math.min(1, (dominantFrequency - 700) / 2300));
    const strength = Math.max(0, Math.min(1, (tone - threshold) / 0.14));
    const target = this.consecutiveFrames >= 2 ? strength * (0.5 + pitch * 0.5) : 0;
    const response = target > this.level ? 90 : 900;
    this.level += (target - this.level) * (1 - Math.exp(-elapsed / response));
    return this.level;
  }

  release(elapsed: number): number {
    this.consecutiveFrames = 0;
    this.level *= Math.exp(-elapsed / 900);
    return this.level;
  }
}
