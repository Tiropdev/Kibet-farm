import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

export const CountUp = ({ value, decimals = 0, duration = 800, suffix = "", prefix = "" }: Props) => {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    startRef.current = null;
    let raf = 0;
    const step = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = from + (value - from) * eased;
      setDisplay(next);
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{prefix}{display.toFixed(decimals)}{suffix}</>;
};
