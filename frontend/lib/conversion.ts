const SESSION_KEY = "qc_conversion_session";

type ConversionEvent =
  | "PAGE_VIEW"
  | "CTA_CLICKED"
  | "SIMULATOR_STARTED"
  | "SIMULATOR_COMPLETED"
  | "LEAD_CREATED"
  | "CONTACT_SUBMITTED";

export function getConversionSessionId() {
  if (typeof window === "undefined") return undefined;
  let sessionId = window.sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function trackConversion(
  name: ConversionEvent,
  metadata?: Record<string, string | number | boolean | null>,
) {
  if (typeof window === "undefined") return;
  const sessionId = getConversionSessionId();
  if (!sessionId) return;

  const query = new URLSearchParams(window.location.search);
  const width = window.innerWidth;
  const payload = {
    sessionId,
    name,
    path: `${window.location.pathname}${window.location.search}`,
    landingPage: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || undefined,
    source: query.get("utm_source") || undefined,
    medium: query.get("utm_medium") || undefined,
    campaign: query.get("utm_campaign") || undefined,
    term: query.get("utm_term") || undefined,
    content: query.get("utm_content") || undefined,
    device: width < 768 ? "mobile" : width < 1100 ? "tablet" : "desktop",
    metadata,
  };

  fetch("/api/conversion/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}
