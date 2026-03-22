// Central API configuration
// Uses VITE_API_URL env var in production, falls back to localhost in dev
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
