import type { Metadata } from "next";
import localFont from "next/font/local";
import { PlayerProvider } from "./context/PlayerContext";
import PlayerOverlay from "./components/PlayerOverlay";
import ScrollRestoration from "./components/ScrollRestoration";
import AppShell from "./components/AppShell";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mubo — Listen your way",
  description: "Your music, mixes, and favorite artists in one place.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <PlayerProvider><AppShell>{children}</AppShell><PlayerOverlay /><ScrollRestoration /></PlayerProvider>
      </body>
    </html>
  );
}
