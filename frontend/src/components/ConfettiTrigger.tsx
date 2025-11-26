"use client";

import { useEffect, useCallback } from "react";
import confetti from "canvas-confetti";

interface ConfettiTriggerProps {
  trigger: boolean;
}

export function ConfettiTrigger({ trigger }: ConfettiTriggerProps) {
  const fireConfetti = useCallback(() => {
    // 紙吹雪エフェクト
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    // 緑色をメインにした紙吹雪
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ["#10b981", "#22c55e", "#4ade80"],
    });
    fire(0.2, {
      spread: 60,
      colors: ["#14b8a6", "#2dd4bf", "#5eead4"],
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
      colors: ["#84cc16", "#a3e635", "#d9f99d"],
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
      colors: ["#fbbf24", "#fcd34d", "#fef08a"],
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
      colors: ["#10b981", "#22c55e"],
    });
  }, []);

  useEffect(() => {
    if (trigger) {
      fireConfetti();
    }
  }, [trigger, fireConfetti]);

  return null;
}
