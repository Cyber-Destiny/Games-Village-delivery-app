import { eq, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/dal";
import { isStaff } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { orders, uploads, vendors } from "@/lib/db/schema";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const [file] = await db.select().from(uploads).where(eq(uploads.id, id));
  if (!file) return new Response("Not found", { status: 404 });

  let allowed = isStaff(user) || file.ownerId === user.id;
  if (!allowed) {
    // Shop cover photos are shown to everyone who's signed in.
    const [shop] = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.image, `/api/uploads/${id}`)).limit(1);
    allowed = !!shop;
  }
  if (!allowed) {
    const linked = await db
      .select({ residentId: orders.residentId, runnerId: orders.runnerId })
      .from(orders)
      .where(or(eq(orders.photoId, id), eq(orders.receiptId, id), eq(orders.deliveryPhotoId, id)));
    allowed = linked.some((o) => o.residentId === user.id || o.runnerId === user.id);
  }
  if (!allowed) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
