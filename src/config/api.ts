/**
 * LabelLens API Configuration
 * 
 * Defaults to the live production Render backend.
 * Automatically trims trailing slashes to prevent malformed API routes.
 */

export const PRODUCTION_URL = "https://labellens-backend-hgtm.onrender.com";
export const LOCAL_DEV_URL = "http://192.168.29.101:5000";

const rawUrl = process.env.EXPO_PUBLIC_API_URL || PRODUCTION_URL;

export const API_BASE_URL = rawUrl.replace(/\/+$/, "");

console.log("[LabelLens] Active API URL:", API_BASE_URL);
