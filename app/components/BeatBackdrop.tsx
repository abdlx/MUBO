"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { usePlayer } from "../context/PlayerContext";
import { AdaptiveMotion } from "../lib/adaptive-motion";
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
    const motion = new AdaptiveMotion();
    const reset = () => motion.reset();
    audio.addEventListener("seeking", reset);
    audio.addEventListener("loadstart", reset);
    document.addEventListener("visibilitychange", reset);
    const frequencies = new Uint8Array(analyser.frequencyBinCount);
    let previousFrame = 0;
    let frame = 0;
    const animate = (time: number) => {
      const elapsed = Math.min(64, previousFrame ? time - previousFrame : 16);
      previousFrame = time;
      let motionLevel = 0;
      if (!audio.paused && context.state === "running") {
        analyser.getByteFrequencyData(frequencies);
        motionLevel = motion.sample(frequencies, context.sampleRate, time, elapsed);
      } else {
        motionLevel = motion.release(elapsed);
      }
      image.style.transform = `scale(${(1.08 + motionLevel * 0.14).toFixed(4)})`;
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
