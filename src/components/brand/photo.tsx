import Image from "next/image";
import type { CategoryId } from "@/lib/categories";
import { cn } from "@/lib/cn";

// Photography for categories and shops. Static images live in /public/images and go
// through the image optimiser; shop photos uploaded by the admin come from
// /api/uploads (behind auth), so those are served as-is.

const CATEGORY_PHOTO: Record<CategoryId, string> = {
  food: "/images/categories/food.webp",
  groceries: "/images/categories/groceries.webp",
  gas: "/images/categories/gas.webp",
  pickup: "/images/categories/pickup.webp",
  laundry: "/images/categories/laundry.webp",
  other: "/images/categories/other.webp",
};

export function categoryPhoto(id: string): string {
  return CATEGORY_PHOTO[id as CategoryId] ?? CATEGORY_PHOTO.other;
}

export function shopPhoto(shop: { image?: string | null; category: string }): string {
  return shop.image || categoryPhoto(shop.category);
}

/** Fills its (relatively positioned) parent with a cover-cropped photo. */
export function Photo({
  src,
  alt = "",
  sizes,
  className,
  preload,
}: {
  src: string;
  alt?: string;
  sizes: string;
  className?: string;
  preload?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      unoptimized={!src.startsWith("/images/")}
      className={cn("object-cover", className)}
    />
  );
}

/** Square photo thumbnail for a category, used in lists. */
export function CategoryThumb({ id, size = 44, className, radius }: { id: string; size?: number; className?: string; radius?: number }) {
  return (
    <span
      className={cn("relative block shrink-0 overflow-hidden bg-sunken", className)}
      style={{ width: size, height: size, borderRadius: radius ?? Math.round(size * 0.28) }}
    >
      <Photo src={categoryPhoto(id)} sizes={`${size * 2}px`} />
    </span>
  );
}
