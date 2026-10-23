/**
 * LabelLens API Configuration
 * 
 * To switch between local network testing and production:
 * 1. Set EXPO_PUBLIC_API_URL in a .env file (e.g. EXPO_PUBLIC_API_URL=https://labellens-backend.onrender.com)
 * 2. Or update LOCAL_DEV_URL below.
 */

export const LOCAL_DEV_URL = "http://192.168.29.101:5000";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || LOCAL_DEV_URL;
