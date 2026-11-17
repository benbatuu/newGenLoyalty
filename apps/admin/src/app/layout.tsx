import type { Metadata } from "next";
import { DM_Sans, Space_Mono } from "next/font/google";
import { AuthProvider } from "../lib/auth";
import { PanelChrome } from "../components/panel-chrome";
import { RangeFill } from "../components/range-fill";
import "./globals.css";

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
});

const mono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "StampWell — Panel",
  description: "StampWell operasyon paneli",
  icons: { icon: "/favicon.png", apple: "/favicon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${sans.variable} ${mono.variable} antialiased`}>
        <AuthProvider>
          <RangeFill />
          <PanelChrome>{children}</PanelChrome>
        </AuthProvider>
      </body>
    </html>
  );
}
