// Client-side: shrink a photo before upload so it's fast on mobile data.

async function compress(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a photo.");
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  return blob ?? file;
}

export async function uploadPhoto(file: File): Promise<{ id: string; url: string }> {
  const blob = await compress(file);
  const body = new FormData();
  body.append("file", new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" }));
  const res = await fetch("/api/uploads", { method: "POST", body });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || "Upload failed");
  return json;
}
