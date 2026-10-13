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
  const [row] = await db
    .insert(uploads)
    .values({ ownerId: user.id, mime: file.type, size: file.size, data })
    .returning({ id: uploads.id });
  return json({ id: row.id, url: `/api/uploads/${row.id}` });
});
