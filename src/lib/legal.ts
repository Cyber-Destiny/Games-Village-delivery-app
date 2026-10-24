import { APP_NAME, ESTATE_NAME } from "./brand";

// Shared legal wording. Set NEXT_PUBLIC_LEGAL_NAME to your registered business name.
export const LEGAL_NAME = process.env.NEXT_PUBLIC_LEGAL_NAME || APP_NAME;
export const LEGAL_UPDATED = "24 October 2026";

/** The off-platform disclaimer, shown wherever people might be tempted to deal directly. */
export const OFF_PLATFORM_NOTICE = `Keep errands, payments and meet-ups on ${APP_NAME}. Anything you arrange directly with a runner or shop outside the app, including paying a runner cash or by transfer, isn't covered, and ${APP_NAME} isn't responsible for any loss, damage or dispute that comes from it.`;

export const SERVICE_AREA = `${ESTATE_NAME}, Abuja`;
