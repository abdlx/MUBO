"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { usePlayer } from "../context/PlayerContext";
import { BeatDetector } from "../lib/beat-detector";
import styles from "./BeatBackdrop.module.css";

const audioAnalysers = new WeakMap<HTMLAudioElement, { context: AudioContext; analyser: AnalyserNode }>();

export default function BeatBackdrop({ coverImage }: { coverImage?: string | null }) {
  const imageRef = useRef<HTMLDivElement>(null);
  const { getAudioElement } = usePlayer();

  useEffect(() => {
    const image = imageRef.current;
    const audio = getAudioElement();
    if (!image || !audio || !coverImage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let connection = audioAnalysers.get(audio);
    try {
      if (!connection) {
        const context = new AudioContext();
        const source = context.createMediaElementSource(audio);
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.18;
        source.connect(analyser);
        analyser.connect(context.destination);
        connection = { context, analyser };
        audioAnalysers.set(audio, connection);
      }
    } catch {
      return;
    }

    const { context, analyser } = connection;
    if (!audio.paused) void context.resume().catch(() => {});
    const resume = () => void context.resume().catch(() => {});
    audio.addEventListener("play", resume);
    const detector = new BeatDetector();
    const reset = () => detector.reset();
    audio.addEventListener("seeking", reset);
    audio.addEventListener("loadstart", reset);
    document.addEventListener("visibilitychange", reset);
    const frequencies = new Uint8Array(analyser.frequencyBinCount);
    let pulse = 0;
    let scale = 1.12;
    let previousFrame = 0;
    let frame = 0;
    const animate = (time: number) => {
      const elapsed = Math.min(64, previousFrame ? time - previousFrame : 16);
      previousFrame = time;
      if (!audio.paused && context.state === "running") {
        analyser.getByteFrequencyData(frequencies);
        const hit = detector.sample(frequencies, context.sampleRate, time);
        if (hit) pulse = hit;
      }
      const target = 1.12 + pulse * 0.11;
      const response = target > scale ? 30 : 80;
      scale += (target - scale) * (1 - Math.exp(-elapsed / response));
      pulse *= Math.exp(-elapsed / 105);
      image.style.transform = `scale(${scale.toFixed(4)})`;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      audio.removeEventListener("play", resume);
      audio.removeEventListener("seeking", reset);
      audio.removeEventListener("loadstart", reset);
      document.removeEventListener("visibilitychange", reset);
    };
  }, [coverImage, getAudioElement]);

  return <div className={styles.backdrop} aria-hidden="true">
    {coverImage && <div className={styles.image} ref={imageRef}><Image src={coverImage} alt="" fill sizes="100vw" /></div>}
    <div className={styles.scrim} />
  </div>;
}
