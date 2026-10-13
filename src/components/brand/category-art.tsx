"use client";

import { motion, type Variants } from "motion/react";
import type { CategoryId } from "@/lib/categories";
import { cn } from "@/lib/cn";

// Hand-drawn category illustrations. Parent elements can drive the hover
// animations by setting `initial="rest" whileHover="hover" whileTap="hover"`.

const W = "#fffaf2";

const steam: Variants = {
  rest: { y: 0, opacity: 0.55 },
  hover: { y: -3, opacity: 1, transition: { repeat: Infinity, repeatType: "mirror", duration: 0.7 } },
};

function Food() {
  return (
    <>
      {[22, 32, 42].map((x, i) => (
        <motion.path
          key={x}
          variants={steam}
          transition={{ delay: i * 0.1 }}
          d={`M${x} 22c-2.4-2.6 2.4-4.4 0-7.2`}
          fill="none"
          stroke="var(--cat-food-ink)"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.6"
        />
      ))}
      <path d="M13 31c3.5-8 34.5-8 38 0z" fill={W} />
      <circle cx="25" cy="27.5" r="2.4" fill="#e8553a" />
      <path d="M36 25.5c2-2.8 5.6-2.6 6.6-.6-1.9 1.3-4.6 1.6-6.6.6z" fill="#3e9a4a" />
      <path d="M10 31h44c0 10.5-9.8 18-22 18s-22-7.5-22-18z" fill="var(--cat-food-ink)" />
      <path d="M14.5 35h35" stroke={W} strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
      <rect x="23" y="48" width="18" height="5" rx="2.5" fill="var(--cat-food-ink)" opacity="0.75" />
    </>
  );
}

function Groceries() {
  return (
    <>
      <motion.g variants={{ rest: { y: 0, rotate: 0 }, hover: { y: -4, rotate: -4 } }} style={{ originX: "40px", originY: "30px" }}>
        <rect x="33" y="6" width="8" height="30" rx="4" transform="rotate(14 37 21)" fill="#e9a94a" />
        <path d="m35.2 12.5 4.6 1.2m-5.6 3.7 4.6 1.2m-5.6 3.7 4.6 1.2" stroke="#b9772a" strokeWidth="1.6" strokeLinecap="round" />
      </motion.g>
      <motion.g variants={{ rest: { y: 0 }, hover: { y: -2 } }}>
        <path d="M18 27c-1-6 3.5-10 8-9 .5 4.5-3 8.5-8 9z" fill="#3e9a4a" />
        <path d="M24 26c1-5.5 6-7.5 9.5-5.5-1.2 4-5 6.3-9.5 5.5z" fill="#57b562" />
      </motion.g>
      <path d="M14 27h36l-2.6 23.6A4 4 0 0 1 43.4 54H20.6a4 4 0 0 1-4-3.4z" fill="var(--cat-groceries-ink)" />
      <rect x="12" y="24" width="40" height="6" rx="3" fill="var(--cat-groceries-ink)" />
      <rect x="12" y="24" width="40" height="6" rx="3" fill={W} opacity="0.22" />
      <path d="M25 37v8m14-8v8" stroke={W} strokeOpacity="0.5" strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
}

function Gas() {
  return (
    <>
      <motion.path
        variants={{ rest: { scale: 0, opacity: 0 }, hover: { scale: 1, opacity: 1 } }}
        style={{ originX: "52px", originY: "52px" }}
        d="M52 54c-4.2 0-6.5-2.8-6.5-6 0-3.6 3-5 3.6-8.6 2.4 1.6 3.4 3.5 3.4 5.2 1-.8 1.6-2 1.8-3.2 2 1.8 4.2 4 4.2 6.6 0 3.4-2.3 6-6.5 6z"
        fill="var(--accent)"
      />
      <rect x="22" y="8" width="20" height="5" rx="2.5" fill="var(--cat-gas-ink)" opacity="0.8" />
      <rect x="28.5" y="12" width="7" height="7" rx="1.5" fill="var(--cat-gas-ink)" opacity="0.8" />
      <rect x="17" y="18" width="30" height="38" rx="11" fill="var(--cat-gas-ink)" />
      <rect x="17" y="33" width="30" height="8" fill={W} opacity="0.92" />
      <rect x="21" y="35.5" width="14" height="3" rx="1.5" fill="var(--cat-gas-ink)" opacity="0.5" />
      <path d="M22 24.5c2.5-1.6 5-2 7.5-2" stroke={W} strokeOpacity="0.45" strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
}

function Pickup() {
  return (
    <>
      <motion.ellipse variants={{ rest: { scaleX: 1, opacity: 0.18 }, hover: { scaleX: 0.8, opacity: 0.1 } }} cx="32" cy="56" rx="18" ry="3" fill="var(--cat-pickup-ink)" />
      <motion.g variants={{ rest: { y: 0 }, hover: { y: -5 } }} transition={{ type: "spring", stiffness: 500, damping: 12 }}>
        <path d="M32 10 54 20v24L32 54 10 44V20z" fill="var(--cat-pickup-ink)" />
        <path d="M32 10 54 20 32 30 10 20z" fill={W} opacity="0.32" />
        <path d="M32 30v24L10 44V20z" fill="#000" opacity="0.08" />
        <path d="m21 15 22 10v8" stroke="var(--accent)" strokeWidth="4.4" strokeLinejoin="round" fill="none" />
        <path d="M14.5 34.5 20 37" stroke={W} strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" />
      </motion.g>
    </>
  );
}

function Laundry() {
  return (
    <>
      <path d="M32 13.5c0-2.4 1.6-4 3.8-4s3.6 1.6 3.6 3.6c0 2.6-2.8 3.2-6 5.6L12 30" fill="none" stroke="var(--cat-laundry-ink)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <path d="M33.5 18.6 52 30H12" fill="none" stroke="var(--cat-laundry-ink)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <motion.g variants={{ rest: { rotate: 0 }, hover: { rotate: [0, 6, -5, 3, 0] } }} transition={{ duration: 0.9 }} style={{ originX: "32px", originY: "28px" }}>
        <path
          d="M24 28h16l9.5 6.2-4.5 7.3-4.5-2.6V56H23.5V38.9L19 41.5l-4.5-7.3z"
          fill="var(--cat-laundry-ink)"
        />
        <path d="M27 28c1.2 3 2.8 4.4 5 4.4s3.8-1.4 5-4.4" fill={W} opacity="0.4" />
        <circle cx="32" cy="44" r="3" fill={W} opacity="0.55" />
      </motion.g>
    </>
  );
}

function Other() {
  const twinkle = (d: number): Variants => ({
    rest: { scale: 1, rotate: 0 },
    hover: { scale: [1, 1.35, 1], rotate: 45, transition: { delay: d, duration: 0.6 } },
  });
  return (
    <>
      <motion.path variants={twinkle(0)} style={{ originX: "47px", originY: "15px" }} d="M47 7c.8 4.6 3.4 7.2 8 8-4.6.8-7.2 3.4-8 8-.8-4.6-3.4-7.2-8-8 4.6-.8 7.2-3.4 8-8z" fill="var(--accent)" />
      <motion.path variants={twinkle(0.12)} style={{ originX: "13px", originY: "21px" }} d="M13 15.5c.5 3 2.2 4.8 5.2 5.3-3 .5-4.7 2.2-5.2 5.3-.5-3.1-2.2-4.8-5.2-5.3 3-.5 4.7-2.3 5.2-5.3z" fill="var(--cat-other-ink)" opacity="0.6" />
      <g transform="rotate(-38 32 38)">
        <rect x="16" y="29" width="32" height="18" rx="9" fill={W} />
        <path d="M32 29h7a9 9 0 0 1 0 18h-7z" fill="var(--cat-other-ink)" />
        <rect x="16" y="29" width="32" height="18" rx="9" fill="none" stroke="var(--cat-other-ink)" strokeWidth="2.4" />
        <path d="M21 34.5c1.5-1.2 3.4-1.8 5.4-1.8" stroke="var(--cat-other-ink)" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
      </g>
    </>
  );
}

const ART: Record<CategoryId, () => React.ReactElement> = {
  food: Food,
  groceries: Groceries,
  gas: Gas,
  pickup: Pickup,
  laundry: Laundry,
  other: Other,
};

export function CategoryArt({ id, className, size = 56 }: { id: string; className?: string; size?: number }) {
  const Art = ART[id as CategoryId] ?? Other;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={cn("overflow-visible", className)} aria-hidden>
      <Art />
    </svg>
  );
}

export const CATEGORY_TINT: Record<string, { bg: string; ink: string }> = {
  food: { bg: "var(--cat-food)", ink: "var(--cat-food-ink)" },
  groceries: { bg: "var(--cat-groceries)", ink: "var(--cat-groceries-ink)" },
  gas: { bg: "var(--cat-gas)", ink: "var(--cat-gas-ink)" },
  pickup: { bg: "var(--cat-pickup)", ink: "var(--cat-pickup-ink)" },
  laundry: { bg: "var(--cat-laundry)", ink: "var(--cat-laundry-ink)" },
  other: { bg: "var(--cat-other)", ink: "var(--cat-other-ink)" },
};

export function tintFor(id: string) {
  return CATEGORY_TINT[id] ?? CATEGORY_TINT.other;
}

/** Small round category icon used in lists. */
export function CategoryBadge({ id, size = 44, className }: { id: string; size?: number; className?: string }) {
  const t = tintFor(id);
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-2xl", className)} style={{ width: size, height: size, background: t.bg }}>
      <CategoryArt id={id} size={Math.round(size * 0.72)} />
    </span>
  );
}
