// Central API configuration
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  
  // Si estamos en Render.com o similar, intentamos apuntar a la URL de producción del backend
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  if (hostname.includes('onrender.com')) {
    return 'https://autocobro-api-z368.onrender.com/api';
  }
  
  // Fallback para desarrollo local
  return 'http://localhost:4000/api';
};

export const API_URL = getApiUrl();
