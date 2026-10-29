/**
 * Dynamic Backend URL and API Base URL resolver.
 *
 * Automatically resolves the correct backend and API URL dynamically:
 * - If running locally (localhost / 127.0.0.1): uses local backend or dev proxy
 * - If running in production (Vercel / live domain): connects to live production backend
 * - Requires zero manual changes when switching between local dev and production builds.
 */

const LOCAL_BACKEND = "http://localhost:5000";
const PROD_BACKEND = "https://nokia-quality-b2b-platform-bfrq.vercel.app";

/**
 * Returns the backend root URL (e.g. for uploads/photos or absolute API calls).
 */
export const getBackendUrl = () => {
  // If running in browser, dynamically check current host
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0";

    if (isLocalhost) {
      const configured = import.meta.env.VITE_BACKEND_URL;
      if (configured && (configured.includes("localhost") || configured.includes("127.0.0.1"))) {
        return configured.replace(/\/+$/, "");
      }
      return LOCAL_BACKEND;
    }

    // In production (Vercel or custom domain)
    const configured = import.meta.env.VITE_BACKEND_URL;
    if (configured && !configured.includes("localhost") && !configured.includes("127.0.0.1")) {
      return configured.replace(/\/+$/, "");
    }
    return PROD_BACKEND;
  }

  // Non-browser fallback
  return import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? LOCAL_BACKEND : PROD_BACKEND);
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

