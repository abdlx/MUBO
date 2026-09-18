"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { usePlayer } from "../context/PlayerContext";
import styles from "./BeatBackdrop.module.css";

const audioAnalysers = new WeakMap<HTMLAudioElement, { context: AudioContext; analyser: AnalyserNode }>();

export default function BeatBackdrop({ coverImage }: { coverImage?: string | null }) {
  const imageRef = useRef<HTMLDivElement>(null);
  const { getAudioElement, isPlaying } = usePlayer();

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
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        analyser.connect(context.destination);
        connection = { context, analyser };
        audioAnalysers.set(audio, connection);
      }
    } catch {
      return;
    }

    const { context, analyser } = connection;
    if (isPlaying) void context.resume().catch(() => {});
    const resume = () => void context.resume().catch(() => {});
    audio.addEventListener("play", resume);
    const frequencies = new Uint8Array(analyser.frequencyBinCount);
    let average = 28;
    let pulse = 0;
    let scale = 1.12;
    let previousBeat = 0;
    let frame = 0;
    const animate = (time: number) => {
      if (!audio.paused && context.state === "running") {
        analyser.getByteFrequencyData(frequencies);
        let bass = 0;
        for (let index = 1; index <= 5; index++) bass += frequencies[index];
        bass /= 5;
        average = average * 0.96 + bass * 0.04;
        if (bass > Math.max(40, average * 1.22) && time - previousBeat > 220) {
          pulse = Math.min(1, (bass - average) / 65 + 0.35);
          previousBeat = time;
        }
      }
      pulse *= 0.91;
      scale += (1.12 + pulse * 0.075 - scale) * 0.13;
      image.style.transform = `scale(${scale.toFixed(4)})`;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      audio.removeEventListener("play", resume);
    };
  }, [coverImage, getAudioElement, isPlaying]);

  return <div className={styles.backdrop} aria-hidden="true">
    {coverImage && <div className={styles.image} ref={imageRef}><Image src={coverImage} alt="" fill sizes="100vw" /></div>}
    <div className={styles.scrim} />
  </div>;
}
