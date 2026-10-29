import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { UserError } from "@/lib/errors";
import { adminSupportChat } from "@/lib/support";
import { AdminSupportChat } from "./admin-support-chat";

export const metadata = { title: "Support chat" };

export default async function AdminSupportChatPage({ params }: { params: Promise<{ threadId: string }> }) {
  await requireRole(...STAFF_ROLES);
  const { threadId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) notFound();
  const initial = await adminSupportChat(threadId).catch((err) => {
    if (err instanceof UserError) notFound();
    throw err;
  });
  return <AdminSupportChat threadId={threadId} initial={initial} />;
}
