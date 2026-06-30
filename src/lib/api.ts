/**
 * V2 API client  no token injection. Auth cookies are sent automatically
 * by the browser on every same-origin request.
 */

type ApiResponse<T = unknown> = { data: T };

async function request<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const headers = new Headers(init?.headers);

  if (!headers.has('Content-Type') && init?.method !== 'DELETE') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
    credentials: 'include', // ensure cookies are sent
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with status ${response.status}`);
  }

  const data = (await response.json()) as T;
  return { data };
}

export const api = {
  get<T>(url: string, init?: RequestInit) {
    return request<T>(url, init);
  },
  post<T>(url: string, body?: unknown, init?: RequestInit) {
    return request<T>(url, {
      ...init,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  patch<T>(url: string, body?: unknown, init?: RequestInit) {
    return request<T>(url, {
      ...init,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(url: string, init?: RequestInit) {
    return request<T>(url, {
      ...init,
      method: 'DELETE',
    });
  },
};
