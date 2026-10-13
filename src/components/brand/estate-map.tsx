"use client";

import { animate, motion, useMotionValue, useMotionValueEvent } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

// A stylised map of the estate used to visualise an errand's progress.
// It is illustrative (we don't track GPS): the runner moves between the shop
// and your door as the errand changes status.

const ROUTE = "M 26 200 C 66 200, 78 160, 118 156 L 168 152 C 210 149, 226 122, 240 96 C 252 74, 274 62, 318 60";
const SHOP_AT = 0.42;

const HOUSES: Array<[number, number, number]> = [
  [36, 40, 0],
  [78, 34, 1],
  [124, 44, 0],
  [170, 30, 2],
  [52, 104, 2],
  [104, 96, 1],
  [196, 196, 0],
  [246, 190, 1],
  [296, 150, 2],
  [300, 104, 0],
  [150, 208, 2],
  [214, 34, 1],
];

const TREES: Array<[number, number, number]> = [
  [18, 80, 9],
  [146, 100, 8],
  [272, 220, 10],
  [330, 196, 8],
  [96, 216, 7],
  [262, 28, 7],
  [338, 112, 7],
  [184, 112, 6],
];

function House({ x, y, v }: { x: number; y: number; v: number }) {
  const roof = ["var(--map-roof-a)", "var(--map-roof-b)", "var(--map-roof-c)"][v];
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-12" y="-6" width="24" height="18" rx="3" fill="var(--map-house)" />
      <path d="M-15 -4 0 -15 15 -4z" fill={roof} strokeLinejoin="round" stroke={roof} strokeWidth="3" />
      <rect x="-3" y="4" width="6" height="8" rx="1" fill={roof} opacity="0.55" />
    </g>
  );
}

type Stage = "searching" | "moving" | "still" | "done";

export function EstateMap({
  progress,
  stage = "moving",
  demo = false,
  className,
  height = 220,
}: {
  /** 0 → at the runner base, SHOP_AT → at the shop, 1 → at your door */
  progress: number;
  stage?: Stage;
  /** Loop the full journey forever (landing page). */
  demo?: boolean;
  className?: string;
  height?: number;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);
  const [shop, setShop] = useState({ x: 160, y: 152 });
  const [home, setHome] = useState({ x: 318, y: 60 });
  const p = useMotionValue(demo ? 0 : progress);
  const rx = useMotionValue(26);
  const ry = useMotionValue(200);
  const trail = useMotionValue(0);

  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const L = path.getTotalLength();
    setLen(L);
    const s = path.getPointAtLength(L * SHOP_AT);
    const h = path.getPointAtLength(L);
    setShop({ x: s.x, y: s.y });
    setHome({ x: h.x, y: h.y });
    const start = path.getPointAtLength(L * p.get());
    rx.set(start.x);
    ry.set(start.y);
    trail.set(p.get());
  }, [p, rx, ry, trail]);

  useMotionValueEvent(p, "change", (v) => {
    const path = pathRef.current;
    if (!path || !len) return;
    const pt = path.getPointAtLength(len * Math.max(0, Math.min(1, v)));
    rx.set(pt.x);
    ry.set(pt.y);
    trail.set(v);
  });

  useEffect(() => {
    if (demo) {
      const controls = animate(p, [0, SHOP_AT, SHOP_AT, 1, 1], {
        duration: 9,
        times: [0, 0.3, 0.45, 0.88, 1],
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 0.6,
      });
      return () => controls.stop();
    }
    // While "moving", creep forward towards the target so the map feels alive.
    const controls = animate(p, progress, { duration: 1.6, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [demo, progress, p]);

  return (
    <div
      className={cn("relative overflow-hidden rounded-[22px]", className)}
      style={
        {
          height,
          background: "var(--map-land)",
          "--map-land": "color-mix(in oklab, var(--primary) 7%, var(--surface-2))",
          "--map-road": "var(--surface)",
          "--map-house": "color-mix(in oklab, var(--line-strong) 55%, var(--surface))",
          "--map-roof-a": "color-mix(in oklab, var(--primary) 30%, var(--line-strong))",
          "--map-roof-b": "color-mix(in oklab, var(--accent) 45%, var(--line-strong))",
          "--map-roof-c": "color-mix(in oklab, var(--danger) 28%, var(--line-strong))",
          "--map-tree": "color-mix(in oklab, var(--primary) 26%, var(--surface-2))",
        } as React.CSSProperties
      }
    >
      <svg viewBox="0 0 360 240" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        {/* side roads */}
        <path d="M118 -10 L118 156" stroke="var(--map-road)" strokeWidth="11" fill="none" strokeLinecap="round" />
        <path d="M240 96 L 252 250" stroke="var(--map-road)" strokeWidth="11" fill="none" strokeLinecap="round" />
        <path d="M-10 70 L 118 70" stroke="var(--map-road)" strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M240 96 L 370 128" stroke="var(--map-road)" strokeWidth="9" fill="none" strokeLinecap="round" />
        {/* main route road */}
        <path d={ROUTE} stroke="var(--map-road)" strokeWidth="15" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {TREES.map(([x, y, r], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={r} fill="var(--map-tree)" />
            <circle cx={x - r * 0.25} cy={y - r * 0.25} r={r * 0.45} fill="var(--surface)" opacity="0.25" />
          </g>
        ))}
        {HOUSES.map(([x, y, v], i) => (
          <House key={i} x={x} y={y} v={v} />
        ))}

        {/* full route, dashed */}
        <path
          ref={pathRef}
          d={ROUTE}
          stroke="var(--primary)"
          strokeOpacity="0.28"
          strokeWidth="3"
          strokeDasharray="2 7"
          strokeLinecap="round"
          fill="none"
        />
        {/* travelled part */}
        {stage !== "searching" ? (
          <motion.path
            d={ROUTE}
            stroke="var(--primary)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            style={{ pathLength: trail }}
          />
        ) : null}

        {/* shop pin */}
        <g transform={`translate(${shop.x} ${shop.y})`}>
          <circle r="15" fill="var(--surface)" stroke="var(--line)" strokeWidth="1" />
          <path d="M-7 -3h14l-1.6-4.6h-10.8z" fill="var(--accent)" />
          <path d="M-6 -3v8h12v-8" fill="none" stroke="var(--ink-2)" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="-1.8" y="0.5" width="3.6" height="4.5" rx="0.6" fill="var(--ink-2)" />
        </g>

        {/* home pin */}
        <g transform={`translate(${home.x} ${home.y})`}>
          {stage === "done" ? null : (
            <circle r="15" fill="var(--primary)" opacity="0.18">
              <animate attributeName="r" values="15;26;15" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.25;0;0.25" dur="2.4s" repeatCount="indefinite" />
            </circle>
          )}
          <circle r="15" fill="var(--hero)" />
          <path d="M-6.5 -0.5 0 -6.5 6.5 -0.5V6h-13z" fill="var(--hero-ink)" />
          <rect x="-1.8" y="1.5" width="3.6" height="4.5" rx="0.5" fill="var(--hero)" />
        </g>

        {/* runner */}
        {stage === "searching" ? (
          <g transform={`translate(${shop.x} ${shop.y})`}>
            {[0, 0.8, 1.6].map((d) => (
              <circle key={d} r="16" fill="none" stroke="var(--primary)" strokeWidth="2">
                <animate attributeName="r" values="16;70" dur="2.4s" begin={`${d}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0" dur="2.4s" begin={`${d}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
        ) : (
          <motion.g style={{ x: rx, y: ry }}>
            <circle r="18" fill="var(--primary)" opacity="0.16">
              <animate attributeName="r" values="11;20;11" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle r="10.5" fill="var(--primary)" stroke="var(--surface)" strokeWidth="3" />
            <path d="M-3.6 -1.6h7.2l-.6 5.2h-6z" fill="var(--primary-ink)" />
            <path d="M-1.8 -1.6c0-1.4.8-2.4 1.8-2.4s1.8 1 1.8 2.4" stroke="var(--primary-ink)" strokeWidth="1.2" fill="none" />
          </motion.g>
        )}
      </svg>
    </div>
  );
}

export const MAP_SHOP_AT = SHOP_AT;

/** Where the runner sits on the map for each order status. */
export function mapProgress(status: string, kind: "buy" | "pickup"): { progress: number; stage: Stage } {
  switch (status) {
    case "awaiting_payment":
    case "searching":
      return { progress: 0, stage: "searching" };
    case "assigned":
      return { progress: 0.06, stage: "moving" };
    case "to_vendor":
      return { progress: SHOP_AT * 0.62, stage: "moving" };
    case "at_vendor":
      return { progress: SHOP_AT, stage: "still" };
    case "on_the_way":
      return { progress: 0.8, stage: "moving" };
    case "arrived":
      return { progress: 1, stage: "still" };
    case "delivered":
      return { progress: 1, stage: "done" };
    default:
      return { progress: kind === "buy" ? 0 : 0, stage: "still" };
  }
}
