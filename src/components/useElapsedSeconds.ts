"use client";

import { useEffect, useState } from "react";

export function useElapsedSeconds() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(
      () => setSeconds((value) => value + 1),
      1_000,
    );
    return () => window.clearInterval(interval);
  }, []);

  return seconds;
}

export function formatElapsed(seconds: number) {
  return `${seconds} ${seconds === 1 ? "second" : "seconds"} elapsed`;
}
