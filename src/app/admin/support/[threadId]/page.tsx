import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { UserError } from "@/lib/errors";
import { adminSupportChat } from "@/lib/support";
import { AdminSupportChat } from "./admin-support-chat";

export const metadata = { title: "Support chat" };

export default async function AdminSupportChatPage({ params }: { params: Promise<{ threadId: string }> }) {
  await requireRole("admin");
  const { threadId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) notFound();
  const initial = await adminSupportChat(threadId).catch((err) => {
    if (err instanceof UserError) notFound();
    throw err;
  });
  return <AdminSupportChat threadId={threadId} initial={initial} />;
}
