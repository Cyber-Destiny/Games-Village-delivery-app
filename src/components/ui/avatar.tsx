import { cn } from "@/lib/cn";

const palettes = [
  ["#E3F3EA", "#0D5236"],
  ["#FFF1D1", "#7A4F00"],
  ["#E1E9FB", "#2F56C4"],
  ["#FFE4D2", "#B4441C"],
  ["#ECE4FB", "#6B43C9"],
  ["#DCF0F6", "#1B7895"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "•";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Avatar({ name, size = 40, className, ring }: { name: string | null | undefined; size?: number; className?: string; ring?: boolean }) {
  const [bg, fg] = palettes[hash(name ?? "") % palettes.length];
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-display font-semibold",
        ring && "ring-[3px] ring-surface",
        className,
      )}
      style={{ width: size, height: size, background: bg, color: fg, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
