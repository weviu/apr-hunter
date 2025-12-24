type ApiResponse<T = unknown> = {
  data: T;
};

async function request<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
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
};
