"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./SkyBackground.module.css";

export interface SkySlot {
  id: string;
  name: string;
  startMinute: number;
  endMinute: number;
  file: string;
  greeting: string;
}

export const SKY_SLOTS: SkySlot[] = [
  {
    id: "01-midnight",
    name: "Midnight",
    startMinute: 0,
    endMinute: 269, // 12:00 AM - 4:29 AM
    file: "/asstes/sky_backgrounds_time_pack/01 - Midnight - deep night sky - 12.00 AM to 4.29 AM.png",
    greeting: "Good evening",
  },
  {
    id: "02-pre-dawn",
    name: "Pre-dawn",
    startMinute: 270,
    endMinute: 314, // 4:30 AM - 5:14 AM
    file: "/asstes/sky_backgrounds_time_pack/02 - Pre-dawn - blue-black glow - 4.30 AM to 5.14 AM.png",
    greeting: "Early dawn",
  },
  {
    id: "03-dawn",
    name: "Dawn",
    startMinute: 315,
    endMinute: 349, // 5:15 AM - 5:49 AM
    file: "/asstes/sky_backgrounds_time_pack/03 - Dawn - first warm light - 5.15 AM to 5.49 AM.png",
    greeting: "Good morning",
  },
  {
    id: "04-sunrise",
    name: "Sunrise",
    startMinute: 350,
    endMinute: 399, // 5:50 AM - 6:39 AM
    file: "/asstes/sky_backgrounds_time_pack/04 - Sunrise - soft pastel morning - 5.50 AM to 6.39 AM.png",
    greeting: "Good morning",
  },
  {
    id: "05-early-morning",
    name: "Early morning",
    startMinute: 400,
    endMinute: 629, // 6:40 AM - 10:29 AM
    file: "/asstes/sky_backgrounds_time_pack/05 - Early morning - airy soft blue - 6.40 AM to 10.29 AM.png",
    greeting: "Good morning",
  },
  {
    id: "06-midday",
    name: "Midday",
    startMinute: 630,
    endMinute: 959, // 10:30 AM - 3:59 PM
    file: "/asstes/sky_backgrounds_time_pack/06 - Midday - bright clear blue - 10.30 AM to 3.59 PM.png",
    greeting: "Good afternoon",
  },
  {
    id: "07-late-afternoon",
    name: "Late afternoon",
    startMinute: 960,
    endMinute: 1034, // 4:00 PM - 5:14 PM
    file: "/asstes/sky_backgrounds_time_pack/07 - Late afternoon - soft sunlit clouds - 4.00 PM to 5.14 PM.png",
    greeting: "Good afternoon",
  },
  {
    id: "08-golden-hour",
    name: "Golden hour",
    startMinute: 1035,
    endMinute: 1084, // 5:15 PM - 6:04 PM
    file: "/asstes/sky_backgrounds_time_pack/08 - Golden hour - rich warm sky - 5.15 PM to 6.04 PM.png",
    greeting: "Good evening",
  },
  {
    id: "09-pink-hour",
    name: "Pink hour",
    startMinute: 1085,
    endMinute: 1124, // 6:05 PM - 6:44 PM
    file: "/asstes/sky_backgrounds_time_pack/09 - Pink hour - rosy sunset afterglow - 6.05 PM to 6.44 PM.png",
    greeting: "Good evening",
  },
  {
    id: "10-twilight",
    name: "Twilight",
    startMinute: 1125,
    endMinute: 1439, // 6:45 PM - 11:59 PM
    file: "/asstes/sky_backgrounds_time_pack/10 - Twilight - violet-to-night transition - 6.45 PM to 11.59 PM.png",
    greeting: "Good evening",
  },
];

export function getSkySlotForDate(date: Date = new Date()): SkySlot {
  const currentMinute = date.getHours() * 60 + date.getMinutes();
  return (
    SKY_SLOTS.find(
      (slot) => currentMinute >= slot.startMinute && currentMinute <= slot.endMinute
    ) || SKY_SLOTS[0]
  );
}

interface SkyBackgroundProps {
  onSlotChange?: (slot: SkySlot) => void;
}

export default function SkyBackground({ onSlotChange }: SkyBackgroundProps) {
  // Start with current browser time
  const [activeSlotId, setActiveSlotId] = useState<string>(() => getSkySlotForDate().id);

  useEffect(() => {
    function updateSlot() {
      const slot = getSkySlotForDate();
      setActiveSlotId(slot.id);
      onSlotChange?.(slot);
    }

    // Check every 15 seconds so changes at boundary minutes cross-fade automatically
    const interval = window.setInterval(updateSlot, 15000);
    return () => window.clearInterval(interval);
  }, [onSlotChange]);

  return (
    <div className={styles.skyContainer} aria-hidden="true">
      {SKY_SLOTS.map((slot) => {
        const isActive = slot.id === activeSlotId;
        return (
          <div
            key={slot.id}
            className={`${styles.skyLayer} ${isActive ? styles.activeLayer : styles.inactiveLayer}`}
          >
            <Image
              src={slot.file}
              alt=""
              fill
              priority={isActive}
              sizes="100vw"
              className={styles.skyImage}
            />
          </div>
        );
      })}
      {/* Cinematic dark scrim overlay to ensure UI elements and glass cards remain high-contrast and legible */}
      <div className={styles.skyScrim} />
    </div>
  );
}
