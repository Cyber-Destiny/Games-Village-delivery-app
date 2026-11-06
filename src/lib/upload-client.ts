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

/** `purpose: "id_document"` keeps more detail so the text stays readable, and makes the photo admin-only. */
export async function uploadPhoto(file: File, opts: { purpose?: "id_document" } = {}): Promise<{ id: string; url: string }> {
  const blob = opts.purpose === "id_document" ? await compress(file, 2000, 0.88) : await compress(file);
  const body = new FormData();
  body.append("file", new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" }));
  if (opts.purpose) body.append("purpose", opts.purpose);
  const res = await fetch("/api/uploads", { method: "POST", body });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || "Upload failed");
  return json;
}
