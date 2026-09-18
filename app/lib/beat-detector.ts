/** Detects percussive onsets from successive FFT snapshots. Returns 0 when there is no hit. */
export class BeatDetector {
  private previous = new Uint8Array(0);
  private energyAverage = 0;
  private fluxAverage = 0;
  private fluxVariation = 0;
  private previousEnergy = 0;
  private previousFlux = 0;
  private lastBeat = -Infinity;
  private ready = false;

  reset() {
    this.previous.fill(0);
    this.ready = false;
    this.lastBeat = -Infinity;
  }

  sample(spectrum: Uint8Array, sampleRate: number, time: number): number {
    if (this.previous.length !== spectrum.length) {
      this.previous = new Uint8Array(spectrum.length);
      this.ready = false;
    }

    const hzPerBin = sampleRate / (spectrum.length * 2);
    const bands = [
      { start: 45, end: 180, weight: 0.52 },
      { start: 180, end: 1200, weight: 0.34 },
      { start: 1200, end: 4500, weight: 0.14 },
    ];
    let energy = 0;
    let flux = 0;
    for (const band of bands) {
      const first = Math.max(1, Math.floor(band.start / hzPerBin));
      const last = Math.min(spectrum.length - 1, Math.ceil(band.end / hzPerBin));
      let level = 0;
      let rise = 0;
      for (let bin = first; bin <= last; bin++) {
        level += spectrum[bin];
        rise += Math.max(0, spectrum[bin] - this.previous[bin]);
      }
      const count = Math.max(1, last - first + 1);
      energy += band.weight * level / count / 255;
      flux += band.weight * rise / count / 255;
    }

    this.previous.set(spectrum);
    if (!this.ready) {
      this.energyAverage = energy;
      this.fluxAverage = flux;
      this.fluxVariation = flux * 0.5;
      this.previousEnergy = energy;
      this.previousFlux = flux;
      this.ready = true;
      return 0;
    }

    const threshold = Math.max(0.006, this.fluxAverage + Math.max(0.005, this.fluxVariation * 1.05));
    const risingFlux = flux > this.previousFlux * 1.08;
    const energyRise = energy - this.previousEnergy;
    const clearTransient = flux > threshold && risingFlux;
    const strongAttack = energyRise > Math.max(0.012, this.energyAverage * 0.1)
      && flux > Math.max(0.005, this.fluxAverage * 0.7);
    const beat = time - this.lastBeat >= 85 && energy > 0.014 && (clearTransient || strongAttack);

    // Adapt after the comparison so a new hit does not raise its own threshold.
    this.energyAverage += (energy - this.energyAverage) * (energy > this.energyAverage ? 0.025 : 0.06);
    const difference = Math.abs(flux - this.fluxAverage);
    this.fluxAverage += (flux - this.fluxAverage) * 0.07;
    this.fluxVariation += (difference - this.fluxVariation) * 0.07;
    this.previousEnergy = energy;
    this.previousFlux = flux;

    if (!beat) return 0;
    this.lastBeat = time;
    return Math.min(1, Math.max(0.6, flux / threshold * 0.42));
  }
}
