"use client";

import { useEffect, useRef } from "react";

export default function WaveformAnimation() {
  const barsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!barsRef.current) return;
      const bars = barsRef.current.querySelectorAll("div");
      bars.forEach((bar) => {
        const h = Math.random() * 40 + 8;
        bar.style.height = `${h}px`;
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={barsRef}
      className="absolute bottom-10 md:bottom-16 inset-x-0 h-16 flex items-center justify-center gap-2 opacity-30"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 bg-primary rounded-full transition-[height] duration-400"
          style={{
            height: "8px",
            transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      ))}
    </div>
  );
}
