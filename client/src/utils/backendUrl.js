/**
 * Dynamic Backend URL and API Base URL resolver.
 *
 * Automatically resolves the correct backend and API URL dynamically:
 * - If running locally (localhost / 127.0.0.1): uses local backend (http://localhost:5000) or Vite dev proxy
 * - If running on Hostinger (e.g. *.hostingersite.com): connects to Hostinger backend (https://cornflowerblue-emu-279959.hostingersite.com)
 * - If running on Vercel (e.g. *.vercel.app): connects to Vercel backend (https://nokia-quality-b2b-platform-bfrq.vercel.app)
 * - Handles protocols gracefully (automatically prepends https:// if missing).
 * - Requires zero manual changes when switching between local dev, Hostinger, or Vercel.
 */

const LOCAL_BACKEND = "http://localhost:5000";
const HOSTINGER_BACKEND = "https://cornflowerblue-emu-279959.hostingersite.com";
const VERCEL_BACKEND = "https://nokia-quality-b2b-platform-bfrq.vercel.app";

const normalizeUrl = (rawUrl) => {
  if (!rawUrl) return "";
  let url = rawUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) {
    if (url.includes("localhost") || url.includes("127.0.0.1")) {
      url = `http://${url}`;
    } else {
      url = `https://${url}`;
    }
  }
  return url;
};

/**
 * Returns the backend root URL (e.g. for uploads/photos or absolute API calls).
 */
export const getBackendUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0";

    // 1. Localhost environment
    if (isLocalhost) {
      const configured = import.meta.env.VITE_BACKEND_URL;
      if (configured && (configured.includes("localhost") || configured.includes("127.0.0.1"))) {
        return normalizeUrl(configured);
      }
      return LOCAL_BACKEND;
    }

    // 2. Explicit remote VITE_BACKEND_URL override (if configured and not pointing to localhost)
    const configured = import.meta.env.VITE_BACKEND_URL;
    if (configured && !configured.includes("localhost") && !configured.includes("127.0.0.1")) {
      return normalizeUrl(configured);
    }

    // 3. Dynamic cloud platform resolution
    if (hostname.includes("hostingersite.com")) {
      return HOSTINGER_BACKEND;
    }

    if (hostname.includes("vercel.app")) {
      return VERCEL_BACKEND;
    }

    // Default fallback
    return HOSTINGER_BACKEND;
  }

  // Non-browser fallback
  const fallback = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? LOCAL_BACKEND : HOSTINGER_BACKEND);
  return normalizeUrl(fallback);
};

/**
 * Returns the base URL for API requests.
 * In Vite dev mode, uses '/api' to leverage Vite dev proxy.
 * In production or preview mode, uses '${getBackendUrl()}/api'.
 */
export const getApiBaseUrl = () => {
  if (import.meta.env.DEV) {
    return "/api";
  }
  return `${getBackendUrl()}/api`;
};
