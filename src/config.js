// API Configuration
// Update this file to change the backend API endpoint

export const API_CONFIG = {
  // For development with proxy, use relative path
  // For production or direct connection, use full URL like 'http://localhost:5000'
  BASE_URL: '', // Empty string uses relative paths (works with Vite proxy)
  PREDICT_ENDPOINT: '/predict'
}

export const getApiUrl = (endpoint) => {
  return API_CONFIG.BASE_URL + endpoint
}
