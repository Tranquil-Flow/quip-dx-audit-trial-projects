import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quip WOTS+ browser signing demo",
  description: "Sign in a browser and verify on a Next.js backend",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
