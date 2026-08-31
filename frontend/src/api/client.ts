import axios from 'axios'

// When Account 3 wires up the real backend, set VITE_API_BASE_URL and
// swap the service functions in api/service.ts to call this client
// instead of mockApi. Shapes already match the shared contract.
export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
