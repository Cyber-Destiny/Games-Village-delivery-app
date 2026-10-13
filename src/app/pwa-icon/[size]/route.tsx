import { ImageResponse } from "next/og";
import { IconArt } from "@/lib/icon-art";

const SIZES = [96, 192, 512];

// /pwa-icon/192 and /pwa-icon/512 (full-bleed so they work as maskable icons too)
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = SIZES.includes(Number(raw)) ? Number(raw) : 192;
  return new ImageResponse(<IconArt size={size} inset={Math.round(size * 0.14)} rounded={false} />, {
    width: size,
    height: size,
    headers: { "Cache-Control": "public, max-age=604800, immutable" },
  });
}
