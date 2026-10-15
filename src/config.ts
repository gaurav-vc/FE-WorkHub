const isProd = import.meta.env.PROD;

// Auto-detect production domain or live server from browser's current location so the app works
// seamlessly across workhub.vibecopilot.ai, workhub.vibesandbox.live, cloud hosts, and remote LAN/server IPs
const getAutoDetectedBase = (): string | null => {
  if (typeof window !== "undefined" && window.location) {
    const { hostname, origin, protocol, port } = window.location;
    if (hostname.includes("vibecopilot.ai")) {
      return "https://workhub.vibecopilot.ai";
    }
    if (hostname.includes("vibesandbox.live")) {
      return "https://workhub.vibesandbox.live";
    }
    // Support custom production domains or server IP access (excluding local machine loopback)
    if (hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "::1" && hostname !== "") {
      if (port === "8080" || port === "5173") {
        return `${protocol}//${hostname}:8000`;
      }
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

