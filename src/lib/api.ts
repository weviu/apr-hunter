type ApiResponse<T = unknown> = {
  data: T;
};

// Get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('apr_finder_token');
}

async function request<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers || {});
  
  // Set content type if not already set
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Add auth token if available and not already set
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
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
