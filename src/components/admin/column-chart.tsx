"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

type Point = { key: string; label: string; value: number };

/** Rounds the axis up so all four tick steps are clean numbers (1, 2, 5 × 10ⁿ). */
function niceMax(v: number) {
  if (v <= 0) return 4;
  const raw = v / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
  return Math.max(step, 1) * 4;
}

function compact(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

/**
 * Single-series column chart: ≤24px columns, 4px rounded tops, hairline grid,
 * per-column hover tooltip. The title above names the series (no legend needed).
 */
export function ColumnChart({
  data,
  format = (v) => String(v),
  axisFormat = compact,
  height = 240,
  highlightLast = true,
}: {
  data: Point[];
  format?: (v: number) => string;
  axisFormat?: (v: number) => string;
  height?: number;
  highlightLast?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { top: 16, right: 4, bottom: 28, left: 36 };
  const innerW = Math.max(10, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const max = useMemo(() => niceMax(Math.max(...data.map((d) => d.value), 0)), [data]);
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max];
  const band = innerW / data.length;
  const barW = Math.min(24, band * 0.62);
  const labelEvery = band < 34 ? 2 : 1;
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      <svg width={width} height={height} role="img" aria-label="Column chart">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} shapeRendering="crispEdges" />
            <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tnum fill-[var(--muted)] text-[11px]">
              {axisFormat(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = Math.max(0, innerH - (y(d.value) - pad.top));
          const x = pad.left + i * band + (band - barW) / 2;
          const r = Math.min(4, barW / 2, h);
          const top = pad.top + innerH - h;
          const isLast = highlightLast && i === data.length - 1;
          const dim = hover !== null && hover !== i;
          // Rounded data-end, square at the baseline.
          const path =
            h <= 0
              ? ""
              : `M${x},${pad.top + innerH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${pad.top + innerH} Z`;
          return (
            <g key={d.key}>
              <motion.path
                d={path}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: dim ? 0.45 : 1, scaleY: 1 }}
                transition={{ scaleY: { duration: 0.7, delay: i * 0.025, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.15 } }}
                style={{ originY: 1, transformBox: "fill-box" }}
                fill={isLast ? "var(--accent)" : "var(--primary)"}
              />
              {i % labelEvery === (data.length - 1) % labelEvery ? (
                <text x={pad.left + i * band + band / 2} y={height - 8} textAnchor="middle" className="fill-[var(--muted)] text-[11px]">
                  {d.label}
                </text>
              ) : null}
              {/* hit target: the whole band */}
              <rect
                x={pad.left + i * band}
                y={pad.top}
                width={band}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(i)}
              />
            </g>
          );
        })}
      </svg>
      <AnimatePresence>
        {hover !== null ? (
          <motion.div
            key="tip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-bg shadow-[var(--shadow-raised)]"
            style={{
              left: Math.min(Math.max(pad.left + hover * band + band / 2, 60), width - 60),
              top: Math.max(0, y(data[hover].value) - 58),
            }}
          >
            <p className="whitespace-nowrap text-[11.5px] opacity-70">{data[hover].label}</p>
            <p className="whitespace-nowrap text-[14px] font-semibold">{format(data[hover].value)}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
