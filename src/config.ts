const isProd = import.meta.env.PROD;

// Auto-detect production domain from the browser's current location so the app works
// seamlessly across both workhub.vibecopilot.ai and workhub.vibesandbox.live
const getAutoDetectedBase = (): string | null => {
  if (typeof window !== "undefined" && window.location) {
    const { hostname, origin } = window.location;
    if (hostname.includes("vibecopilot.ai")) {
      return "https://workhub.vibecopilot.ai";
    }
    if (hostname.includes("vibesandbox.live")) {
      return "https://workhub.vibesandbox.live";
    }
    // Support custom production domains or server IP access (excluding localhost/127.0.0.1)
    if (isProd && hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "") {
      return origin;
    }
  }
  return null;
};

const detected = getAutoDetectedBase();

export const API_BASE = detected
  ? `${detected}/api`
  : (import.meta.env.VITE_API_BASE_URL ?? (isProd ? "https://workhub.vibecopilot.ai/api" : "http://127.0.0.1:8000/api"));

export const MEDIA_BASE = detected
  ? detected
  : (import.meta.env.VITE_MEDIA_BASE_URL ?? (isProd ? "https://workhub.vibecopilot.ai" : "http://127.0.0.1:8000"));

