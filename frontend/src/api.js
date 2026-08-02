import axios from 'axios';
import { dispatchUnauthorized } from './auth/events';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) dispatchUnauthorized();
    return Promise.reject(error);
  },
);

/* ===== Admins API ===== */
export function getAdmins() {
  return api.get('/admins');              // GET /api/admins
}
export function createAdmin(payload) {
  return api.post('/admins', payload);    // POST /api/admins
}
export function deleteAdmin(id) {
  return api.delete(`/admins/${id}`);     // DELETE /api/admins/:id
}
