"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { trackConversion } from "@/lib/conversion";

export default function ConversionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/devis/accept")
    ) {
      return;
    }
    trackConversion("PAGE_VIEW");
  }, [pathname]);

  useEffect(() => {
    function trackClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const element = target?.closest<HTMLElement>("[data-conversion]");
      if (!element) return;
      trackConversion("CTA_CLICKED", {
        cta: element.dataset.conversion || "unknown",
      });
    }
    document.addEventListener("click", trackClick);
    return () => document.removeEventListener("click", trackClick);
  }, []);

  // Bearer links to signed copies must not be sent as analytics page URLs.
  return <Analytics beforeSend={event => event.url.includes("/devis/accept/") ? null : event} />;
}
