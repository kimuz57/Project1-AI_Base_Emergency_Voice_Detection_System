"use client";

import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function GlassCard({ children, className = "", hover = true }: GlassCardProps) {
  return (
    <div
      className={`lucid-glass rounded-3xl ${hover ? "floating-layer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
