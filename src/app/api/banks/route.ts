import { json, withUser } from "@/lib/api";
import { listBanks } from "@/lib/paystack";

export const GET = withUser(async () => json({ banks: await listBanks() }));
