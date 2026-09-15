"use client";

import { usePathname } from "next/navigation";
import BottomDock from "./BottomDock";
import DesktopSidebar from "./DesktopSidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const playerRoute = pathname.startsWith("/player/");
  return <div className={`app-frame ${playerRoute ? "player-route" : ""}`}>
    {!playerRoute && <DesktopSidebar />}
    {children}
    {!playerRoute && <BottomDock />}
  </div>;
}
