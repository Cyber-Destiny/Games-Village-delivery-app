"use client";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  back,
  right,
  subtitle,
  className,
}: {
  title?: React.ReactNode;
  back?: string | true;
  right?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const { scrollY } = useScroll();
  const [stuck, setStuck] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setStuck(y > 8));

  return (
    <header
      className={cn(
        "safe-top sticky top-0 z-30 -mx-5 px-5 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        stuck ? "bg-bg/80 shadow-[0_1px_0_var(--line)] backdrop-blur-xl" : "bg-transparent",
        className,
      )}
    >
      <div className="flex h-14 items-center gap-2">
        {back ? (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => (back === true ? router.back() : router.push(back))}
            aria-label="Back"
            className="-ml-2 grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-sunken"
          >
            <ChevronLeft className="size-6" strokeWidth={2.2} />
          </motion.button>
        ) : null}
        <div className="min-w-0 flex-1">
          {title ? <h1 className="truncate font-display text-[19px] font-semibold text-ink">{title}</h1> : null}
          {subtitle ? <p className="-mt-0.5 truncate text-[12.5px] text-muted">{subtitle}</p> : null}
        </div>
        {right}
      </div>
    </header>
  );
}
