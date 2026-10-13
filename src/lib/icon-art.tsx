// Brand mark for generated PNG icons (next/og). `inset` leaves room for maskable icons.
export function IconArt({ size, inset = 0, rounded = true }: { size: number; inset?: number; rounded?: boolean }) {
  const inner = size - inset * 2;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#137049",
        borderRadius: rounded ? size * 0.3 : 0,
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 40 40">
        <path d="M13.5 29V17.2c0-2.4 1.9-4.2 4.3-4.2h3.4" fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21.6 9.3 27.4 13l-5.8 3.7" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="27.6" cy="27.6" r="3.2" fill="#ffb21e" />
      </svg>
    </div>
  );
}
