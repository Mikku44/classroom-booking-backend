const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(options.headers || {}) };
  const response = await fetch(base + path, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Request failed');
  return body.data as T;
}
export const get = <T,>(path: string) => api<T>(path);
export const post = <T,>(path: string, data: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(data) });
export const patch = <T,>(path: string, data: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
export const remove = <T,>(path: string) => api<T>(path, { method: 'DELETE' });
export async function uploadImage(file: File): Promise<{ key: string; url: string }> {
  const token = localStorage.getItem('token');
  const form = new FormData();
  form.append('image', file);
  const response = await fetch(base + '/admin/uploads/images', { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {}, body: form });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Upload failed');
  return body.data;
}
export async function downloadReport() {
  const token = localStorage.getItem('token');
  const response = await fetch(base + '/admin/reports/export', { headers: token ? { Authorization: 'Bearer ' + token } : {} });
  if (!response.ok) throw new Error('Export failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'booking-report.csv';
  link.click();
  URL.revokeObjectURL(url);
}
