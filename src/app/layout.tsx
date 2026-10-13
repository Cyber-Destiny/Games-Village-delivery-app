import type { Metadata, Viewport } from "next";
import { APP_NAME, ESTATE_NAME } from "@/lib/brand";
import { bricolage, geist } from "./fonts";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${APP_NAME} · Errands in ${ESTATE_NAME}`, template: `%s · ${APP_NAME}` },
  description: `Food, groceries, gas refills and parcels from the gate — ${APP_NAME} runners handle errands inside ${ESTATE_NAME}, Abuja.`,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2eb" },
    { media: "(prefers-color-scheme: dark)", color: "#090f0c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${geist.variable} ${bricolage.variable}`} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
