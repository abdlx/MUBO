"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ children, className, ariaLabel = "Go back" }: { children: React.ReactNode; className?: string; ariaLabel?: string }) {
  const router = useRouter();
  return <button type="button" className={className} aria-label={ariaLabel} onClick={() => {
    if (window.history.length > 1) router.back(); else router.push("/");
  }}>{children}</button>;
}
