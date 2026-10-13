import type { MetadataRoute } from "next";
import { APP_NAME, ESTATE_NAME } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} · ${ESTATE_NAME}`,
    short_name: APP_NAME,
    description: `Errands inside ${ESTATE_NAME}, done for you.`,
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f2eb",
    theme_color: "#137049",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New errand", url: "/new", icons: [{ src: "/pwa-icon/96", sizes: "96x96" }] },
      { name: "My errands", url: "/orders", icons: [{ src: "/pwa-icon/96", sizes: "96x96" }] },
    ],
  };
}
