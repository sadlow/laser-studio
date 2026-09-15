import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laser Studio",
  description: "Entwurfswerkzeug fuer Lasercut-Karten",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
