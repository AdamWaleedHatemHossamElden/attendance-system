import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
