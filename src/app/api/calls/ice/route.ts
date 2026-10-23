import { json, withUser } from "@/lib/api";
import { iceServers } from "@/lib/calls";

export const GET = withUser(async () => json({ iceServers: iceServers() }));
