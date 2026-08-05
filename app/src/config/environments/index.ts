const APP_NAME = "HeroUI Starter";
const LANDING_URL = import.meta.env.VITE_LANDING_URL;
const APP_URL = import.meta.env.VITE_APP_URL;
const rawApiUrl =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "http://localhost:3000" : "");
const API_URL = rawApiUrl.endsWith("/") ? rawApiUrl : `${rawApiUrl}/`;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const environments = {
    APP_NAME,
    LANDING_URL,
    APP_URL,
    API_URL,
    GOOGLE_MAPS_API_KEY,
}
