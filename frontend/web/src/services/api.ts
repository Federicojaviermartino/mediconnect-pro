import axios from 'axios'
import Cookies from 'js-cookie'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('access_token')
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)

export default api

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/v1/auth/login', { email, password }),
  register: (data: any) => api.post('/api/v1/auth/register', data),
  logout: () => api.post('/api/v1/auth/logout'),
}

// Patient API
export const patientApi = {
  list: (params?: any) => api.get('/api/v1/patients', { params }),
  get: (id: string) => api.get(`/api/v1/patients/${id}`),
  create: (data: any) => api.post('/api/v1/patients', data),
  update: (id: string, data: any) => api.patch(`/api/v1/patients/${id}`, data),
}

// Vitals API
export const vitalsApi = {
  list: (patientId: string, params?: any) =>
    api.get(`/api/v1/vitals/patient/${patientId}`, { params }),
  trends: (patientId: string, type: string, days?: number) =>
    api.get(`/api/v1/vitals/patient/${patientId}/trends/${type}`, { params: { days } }),
}

// Consultation API
export const consultationApi = {
  list: (params?: any) => api.get('/api/v1/consultations', { params }),
  get: (id: string) => api.get(`/api/v1/consultations/${id}`),
  create: (data: any) => api.post('/api/v1/consultations', data),
  start: (id: string, userId: string) =>
    api.post(`/api/v1/consultations/${id}/start`, { userId }),
  end: (id: string) => api.post(`/api/v1/consultations/${id}/end`),
}

// ML API
export const mlApi = {
  predictRisk: (data: any) => api.post('/api/v1/predictions/comprehensive', data),
  analyzeVitals: (data: any) => api.post('/api/v1/predictions/vitals-trend', data),
}
