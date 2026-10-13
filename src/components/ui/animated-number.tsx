"use client";

import { animate, useInView, useMotionValue, useTransform, motion } from "motion/react";
import { useEffect, useRef } from "react";

/** Counts up/down to `value`. `format` renders the number. */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString("en-NG"),
  className,
  duration = 0.9,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [inView, value, mv, duration]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}

/** Kobo → animated "₦1,500" */
export function AnimatedNaira({ kobo, className }: { kobo: number; className?: string }) {
  return <AnimatedNumber value={kobo / 100} format={(n) => `₦${Math.round(n).toLocaleString("en-NG")}`} className={className} />;
}
