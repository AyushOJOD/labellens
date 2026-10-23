/**
 * LabelLens API Configuration
 * 
 * Automatically strips trailing slashes to prevent malformed API endpoints.
 */

export const LOCAL_DEV_URL = "http://192.168.29.101:5000";

const rawUrl = process.env.EXPO_PUBLIC_API_URL || LOCAL_DEV_URL;

export const API_BASE_URL = rawUrl.replace(/\/+$/, "");
