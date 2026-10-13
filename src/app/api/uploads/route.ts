import { json, withUser } from "@/lib/api";
import { db } from "@/lib/db";
import { uploads } from "@/lib/db/schema";
import { UserError } from "@/lib/errors";

const MAX = 2.5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export const POST = withUser(async (req, user) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new UserError("No photo received.");
  if (!TYPES.includes(file.type)) throw new UserError("Please upload a JPG, PNG or WebP photo.");
  if (file.size > MAX) throw new UserError("That photo is too large.");
  const data = Buffer.from(await file.arrayBuffer());
  if (!matchesImageType(data, file.type)) throw new UserError("That file isn't a valid photo.");
  const [row] = await db
    .insert(uploads)
    .values({ ownerId: user.id, mime: file.type, size: file.size, data })
    .returning({ id: uploads.id });
  return json({ id: row.id, url: `/api/uploads/${row.id}` });
});

/** Checks the file's leading bytes really are the image type it claims to be. */
function matchesImageType(b: Buffer, mime: string) {
  if (mime === "image/jpeg") return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mime === "image/png") return b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/webp") return b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
  return false;
}
