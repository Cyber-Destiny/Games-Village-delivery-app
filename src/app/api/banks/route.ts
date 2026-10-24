import { json, withUser } from "@/lib/api";
import { listBanks, typedAccountNames } from "@/lib/paystack";

export const GET = withUser(async () => json({ banks: await listBanks(), typeName: typedAccountNames() }));
