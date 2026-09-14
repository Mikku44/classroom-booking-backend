export const apiBase =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: { field: string; message: string }[],
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("token");
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: "Bearer " + token } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(apiBase + path, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token)
      window.dispatchEvent(new Event("auth-expired"));
    throw new ApiError(
      response.status,
      body.message || "Request failed",
      body.errors,
    );
  }
  return body.data as T;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, data?: unknown) =>
  api<T>(path, {
    method: "POST",
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
export const patch = <T>(path: string, data?: unknown) =>
  api<T>(path, {
    method: "PATCH",
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
export const remove = <T>(path: string, data?: unknown) =>
  api<T>(path, {
    method: "DELETE",
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });

export async function uploadImage(
  file: File,
): Promise<{ key: string; url: string }> {
  const token = localStorage.getItem("token");
  const form = new FormData();
  form.append("image", file);
  const response = await fetch(apiBase + "/admin/uploads/images", {
    method: "POST",
    headers: token ? { Authorization: "Bearer " + token } : {},
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token)
      window.dispatchEvent(new Event("auth-expired"));
    throw new ApiError(
      response.status,
      body.message || "Upload failed",
      body.errors,
    );
  }
  return body.data;
}

export async function downloadReport(query = "") {
  const token = localStorage.getItem("token");
  const response = await fetch(apiBase + "/admin/reports/export" + query, {
    headers: token ? { Authorization: "Bearer " + token } : {},
  });
  if (!response.ok) throw new ApiError(response.status, "Export failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "booking-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}
